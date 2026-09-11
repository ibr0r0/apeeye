const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildResponse, securityHeaders, corsHeaders, originAllowed, WORKSPACE_ID_RE } = require('./relay-core');

describe('buildResponse', () => {
  test('passes status and JSON body, forces content-type', async () => {
    const r = buildResponse({ status: 201, headers: { 'content-type': 'text/html', 'x-custom': 'yes' }, body: { ok: 1 } });
    assert.equal(r.status, 201);
    assert.equal(r.headers.get('content-type'), 'application/json');
    assert.equal(r.headers.get('x-custom'), 'yes');
    assert.deepEqual(await r.json(), { ok: 1 });
  });

  test('strips dangerous headers', () => {
    const r = buildResponse({ status: 200, headers: { 'set-cookie': 'a=1', location: 'https://evil', 'content-security-policy': 'x', 'strict-transport-security': 'y', 'cache-control': 'public', 'access-control-allow-origin': 'https://evil' }, body: null });
    for (const h of ['set-cookie', 'location', 'content-security-policy', 'strict-transport-security', 'cache-control', 'access-control-allow-origin']) assert.equal(r.headers.get(h), null);
  });

  test('neutralises redirects and bad statuses', () => {
    assert.equal(buildResponse({ status: 302, body: null }).status, 502);
    assert.equal(buildResponse({ status: 101, body: null }).status, 502);
    assert.equal(buildResponse({ status: 'x', body: null }).status, 502);
    assert.equal(buildResponse({ status: 999, body: null }).status, 502);
    assert.equal(buildResponse({ status: 418, body: null }).status, 418);
  });

  test('skips malformed header values instead of throwing', () => {
    const r = buildResponse({ status: 200, headers: { 'x-bad': 'a\r\nInjected: 1', 'bad name': 'x', 'x-ok': 'fine', 'x-num': 5, 'x-obj': {} }, body: {} });
    assert.equal(r.headers.get('injected'), null);
    assert.equal(r.headers.get('x-ok'), 'fine');
    assert.equal(r.headers.get('x-num'), '5');
    assert.equal(r.headers.get('x-obj'), null);
  });

  test('string bodies stay JSON strings', async () => {
    const r = buildResponse({ status: 200, body: '<script>alert(1)</script>' });
    assert.equal(await r.text(), '"<script>alert(1)</script>"');
  });

  test('undefined body and 204 have no body', async () => {
    assert.equal(await buildResponse({ status: 200 }).text(), '');
    assert.equal(buildResponse({ status: 204, body: { x: 1 } }).body, null);
  });
});

describe('headers', () => {
  test('security headers', () => {
    const h = securityHeaders(new Headers(), 'apeeye.example');
    assert.equal(h.get('x-content-type-options'), 'nosniff');
    assert.match(h.get('content-security-policy'), /connect-src 'self' wss:\/\/apeeye\.example ws:\/\/apeeye\.example/);
    assert.match(h.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(h.get('strict-transport-security'), /max-age=31536000/);
  });
  test('origin allowlist for the websocket endpoint', () => {
    assert.equal(originAllowed(null, 'apeeye.example'), true);
    assert.equal(originAllowed('https://apeeye.example', 'apeeye.example'), true);
    assert.equal(originAllowed('http://localhost:8081', 'apeeye.example'), true);
    assert.equal(originAllowed('https://evil.example', 'apeeye.example'), false);
    assert.equal(originAllowed('https://apeeye.example.evil.com', 'apeeye.example'), false);
    assert.equal(originAllowed('garbage', 'apeeye.example'), false);
  });
  test('cors headers', () => {
    const h = corsHeaders(new Headers());
    assert.equal(h.get('access-control-allow-origin'), '*');
    assert.match(h.get('access-control-allow-methods'), /PATCH/);
  });
});

describe('workspace id', () => {
  test('regex', () => {
    assert.ok(WORKSPACE_ID_RE.test('abcDEF1234'));
    assert.ok(!WORKSPACE_ID_RE.test('short'));
    assert.ok(!WORKSPACE_ID_RE.test('abc-DEF123'));
    assert.ok(!WORKSPACE_ID_RE.test('abcDEF12345'));
  });
});
