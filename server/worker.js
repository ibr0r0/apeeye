import { WorkspaceDO } from './workspace-do.js';
import { WORKSPACE_ID_RE, LIMITS, json, securityHeaders, corsHeaders } from './relay-core.js';

export { WorkspaceDO };

const ipHits = new Map();

function localIpLimit(ip) {
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < LIMITS.ipWindowMs);
  if (arr.length >= LIMITS.ipLimit) { ipHits.set(ip, arr); return false; }
  arr.push(now);
  ipHits.set(ip, arr);
  if (ipHits.size > 5000) ipHits.clear();
  return true;
}

async function ipAllowed(env, ip) {
  if (env.IP_LIMITER && typeof env.IP_LIMITER.limit === 'function') {
    try {
      const { success } = await env.IP_LIMITER.limit({ key: ip });
      return success;
    } catch {}
  }
  return localIpLimit(ip);
}

async function readBody(request, max) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { try { await reader.cancel(); } catch {} return null; }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(all);
}

function finalize(res, { cors = false } = {}) {
  const out = new Response(res.body, res);
  securityHeaders(out.headers);
  if (cors) corsHeaders(out.headers);
  return out;
}

function workspaceStub(env, id) {
  return env.WORKSPACES.get(env.WORKSPACES.idFromName(id));
}

async function handleMock(request, env, id, rest, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(securityHeaders(new Headers())) });
  }
  if (!WORKSPACE_ID_RE.test(id)) return finalize(json({ error: 'not_found' }, 404), { cors: true });

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await ipAllowed(env, ip))) {
    return finalize(json({ error: 'rate_limited', hint: 'Too many requests from this address' }, 429), { cors: true });
  }

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > LIMITS.maxBodyBytes) return finalize(json({ error: 'payload_too_large' }, 413), { cors: true });

  let body;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await readBody(request, LIMITS.maxBodyBytes);
    if (text === null) return finalize(json({ error: 'payload_too_large' }, 413), { cors: true });
    const ct = request.headers.get('content-type') || '';
    if (text.length && /json/i.test(ct)) {
      try { body = JSON.parse(text); } catch { return finalize(json({ error: 'invalid_json' }, 400), { cors: true }); }
    }
  }

  const msg = {
    method: request.method,
    path: rest || '/',
    query: Object.fromEntries(url.searchParams),
    headers: {
      'content-type': request.headers.get('content-type') || undefined,
      accept: request.headers.get('accept') || undefined,
      'user-agent': request.headers.get('user-agent') || undefined,
    },
    body,
  };

  const res = await workspaceStub(env, id).fetch('https://workspace/relay', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(msg),
  });
  return finalize(res, { cors: true });
}

async function handleAssets(request, env, url) {
  const res = await env.ASSETS.fetch(request);
  const out = finalize(res);
  const ct = out.headers.get('content-type') || '';
  if (ct.includes('text/html')) out.headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  else if (url.pathname.startsWith('/_expo/static/')) out.headers.set('cache-control', 'public, max-age=31536000, immutable');
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') return finalize(json({ status: 'ok', service: 'apeeye-relay' }));

    let m;
    if ((m = path.match(/^\/ws\/([^/]+)$/))) {
      const id = m[1];
      if (!WORKSPACE_ID_RE.test(id)) return finalize(json({ error: 'not_found' }, 404));
      if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') {
        return finalize(json({ error: 'expected_websocket' }, 426));
      }
      return workspaceStub(env, id).fetch(request);
    }
    if (path === '/ws' || path.startsWith('/ws/')) return finalize(json({ error: 'not_found' }, 404));

    if ((m = path.match(/^\/mock\/([^/]+)(\/.*)?$/))) {
      return handleMock(request, env, m[1], m[2] || '/', url);
    }

    if (path === '/api' || path.startsWith('/api/')) {
      return finalize(json({ error: 'gone', hint: 'Apeeye no longer stores data server-side' }, 410));
    }

    if (!env.ASSETS) return finalize(json({ error: 'not_found' }, 404));
    return handleAssets(request, env, url);
  },
};
