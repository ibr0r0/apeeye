const WORKSPACE_ID_RE = /^[0-9A-Za-z]{10}$/;

const LIMITS = {
  requestTimeoutMs: 2000,
  maxBodyBytes: 6 * 1024 * 1024,
  maxInflight: 20,
  workspaceWindowMs: 15 * 60 * 1000,
  workspaceLimit: 300,
  ipWindowMs: 60 * 1000,
  ipLimit: 60,
};

const STRIPPED_RESPONSE_HEADERS = new Set([
  'set-cookie', 'transfer-encoding', 'connection', 'content-length',
  'content-encoding', 'keep-alive', 'upgrade', 'host',
  'strict-transport-security', 'content-security-policy',
  'content-type', 'content-disposition', 'location', 'refresh',
  'x-frame-options', 'x-content-type-options', 'link',
]);

const CSP = [
  "default-src 'self'",
  "connect-src 'self' ws: wss:",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self' https: data:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function securityHeaders(h) {
  h.set('content-security-policy', CSP);
  h.set('x-content-type-options', 'nosniff');
  h.set('x-frame-options', 'DENY');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  return h;
}

function corsHeaders(h) {
  h.set('access-control-allow-origin', '*');
  h.set('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  h.set('access-control-allow-headers', 'Content-Type, Authorization, X-Requested-With');
  h.set('access-control-max-age', '600');
  return h;
}

function json(body, status = 200, headers) {
  const h = new Headers(headers);
  h.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers: h });
}

function buildResponse(msg) {
  let status = Number.isInteger(msg.status) && msg.status >= 200 && msg.status <= 599 ? msg.status : 502;
  if (status >= 300 && status <= 399) status = 502;
  const h = new Headers();
  if (msg.headers && typeof msg.headers === 'object') {
    for (const [k, v] of Object.entries(msg.headers)) {
      const key = String(k).toLowerCase();
      if (STRIPPED_RESPONSE_HEADERS.has(key)) continue;
      if (typeof v !== 'string' && typeof v !== 'number') continue;
      try { h.set(key, String(v)); } catch {}
    }
  }
  h.set('content-type', 'application/json');
  const noBody = status === 204 || status === 205 || status === 304 || msg.body === undefined;
  return new Response(noBody ? null : JSON.stringify(msg.body), { status, headers: h });
}

module.exports = { WORKSPACE_ID_RE, LIMITS, STRIPPED_RESPONSE_HEADERS, CSP, securityHeaders, corsHeaders, json, buildResponse };
