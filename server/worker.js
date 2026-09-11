import { WorkspaceDO } from './workspace-do.js';
import { IpLimitDO } from './ip-limit-do.js';
import { WORKSPACE_ID_RE, LIMITS, json, securityHeaders, corsHeaders, originAllowed } from './relay-core.js';

export { WorkspaceDO, IpLimitDO };

async function ipAllowed(env, ip) {
  if (env.IP_LIMITER && typeof env.IP_LIMITER.limit === 'function') {
    try {
      const { success } = await env.IP_LIMITER.limit({ key: ip });
      if (!success) return false;
    } catch {}
  }
  if (env.IP_LIMITS) {
    try {
      const r = await env.IP_LIMITS.get(env.IP_LIMITS.idFromName(ip)).fetch('https://limit/hit');
      return (await r.text()) === '1';
    } catch {}
  }
  return true;
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

function finalize(res, host, { cors = false } = {}) {
  const out = new Response(res.body, res);
  securityHeaders(out.headers, host);
  if (cors) corsHeaders(out.headers);
  return out;
}

function workspaceStub(env, id) {
  return env.WORKSPACES.get(env.WORKSPACES.idFromName(id));
}

async function handleMock(request, env, id, rest, url) {
  const host = url.host;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(securityHeaders(new Headers(), host)) });
  }
  if (!WORKSPACE_ID_RE.test(id)) return finalize(json({ error: 'not_found' }, 404), host, { cors: true });

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await ipAllowed(env, ip))) {
    return finalize(json({ error: 'rate_limited', hint: 'Too many requests from this address' }, 429), host, { cors: true });
  }

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > LIMITS.maxBodyBytes) return finalize(json({ error: 'payload_too_large' }, 413), host, { cors: true });

  let body;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await readBody(request, LIMITS.maxBodyBytes);
    if (text === null) return finalize(json({ error: 'payload_too_large' }, 413), host, { cors: true });
    const ct = request.headers.get('content-type') || '';
    if (text.length && /json/i.test(ct)) {
      try { body = JSON.parse(text); } catch { return finalize(json({ error: 'invalid_json' }, 400), host, { cors: true }); }
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
  return finalize(res, host, { cors: true });
}

const SITE = {
  title: 'Apeeye — Fake APIs. Real endpoints.',
  description: 'Create mock REST endpoints in seconds. No login, no config, no database. Your data never leaves your browser.',
  image: '/og.jpg',
  imageWidth: '2400',
  imageHeight: '1231',
};

function metaTags(origin) {
  const t = SITE.title;
  const d = SITE.description;
  const img = origin + SITE.image;
  return [
    ['name', 'description', d],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'Apeeye'],
    ['property', 'og:title', t],
    ['property', 'og:description', d],
    ['property', 'og:url', origin + '/'],
    ['property', 'og:image', img],
    ['property', 'og:image:width', SITE.imageWidth],
    ['property', 'og:image:height', SITE.imageHeight],
    ['property', 'og:image:alt', 'Apeeye: fake APIs, real endpoints'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', t],
    ['name', 'twitter:description', d],
    ['name', 'twitter:image', img],
    ['name', 'twitter:site', '@ibr0r'],
  ].map(([attr, key, val]) => `<meta ${attr}="${key}" content="${val.replace(/"/g, '&quot;')}">`).join('\n');
}

async function handleAssets(request, env, url) {
  const res = await env.ASSETS.fetch(request);
  const out = finalize(res, url.host);
  const ct = out.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    out.headers.set('cache-control', 'no-cache, no-store, must-revalidate');
    const tags = metaTags(url.origin);
    return new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(SITE.title); } })
      .on('head', { element(el) { el.append(tags, { html: true }); } })
      .transform(out);
  }
  if (url.pathname.startsWith('/_expo/static/')) out.headers.set('cache-control', 'public, max-age=31536000, immutable');
  else if (url.pathname === SITE.image) out.headers.set('cache-control', 'public, max-age=86400');
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const host = url.host;

    if (path === '/health') return finalize(json({ status: 'ok', service: 'apeeye-relay' }), host);

    let m;
    if ((m = path.match(/^\/ws\/([^/]+)$/))) {
      const id = m[1];
      if (!WORKSPACE_ID_RE.test(id)) return finalize(json({ error: 'not_found' }, 404), host);
      if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') {
        return finalize(json({ error: 'expected_websocket' }, 426), host);
      }
      if (!originAllowed(request.headers.get('origin'), host)) {
        return finalize(json({ error: 'origin_not_allowed' }, 403), host);
      }
      return workspaceStub(env, id).fetch(request);
    }
    if (path === '/ws' || path.startsWith('/ws/')) return finalize(json({ error: 'not_found' }, 404), host);

    if ((m = path.match(/^\/mock\/([^/]+)(\/.*)?$/))) {
      return handleMock(request, env, m[1], m[2] || '/', url);
    }

    if (path === '/api' || path.startsWith('/api/')) {
      return finalize(json({ error: 'gone', hint: 'Apeeye no longer stores data server-side' }, 410), host);
    }

    if (!env.ASSETS) return finalize(json({ error: 'not_found' }, 404), host);
    return handleAssets(request, env, url);
  },
};
