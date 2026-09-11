const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const WebSocket = require('ws');
const { createEngine, createMemoryStorage } = require('../shared/mockEngine');
const { encodeFrames, Reassembler } = require('../shared/wire');

const PORT = 8799;
const base = `http://127.0.0.1:${PORT}`;
const wsBase = `ws://127.0.0.1:${PORT}/ws`;
const WS_ID = 'abcDEF1234';
const OTHER_ID = 'zzzZZZ9999';

let dev;

async function waitFor(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`relay did not start on ${url}`);
}

before(async () => {
  const bin = path.join(__dirname, '..', 'node_modules', '.bin', 'wrangler');
  dev = spawn(bin, ['dev', '--port', String(PORT), '--inspector-port', '9399', '--log-level', 'error', '--show-interactive-dev-session', 'false'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  dev.stdout.on('data', (d) => { log += d; });
  dev.stderr.on('data', (d) => { log += d; });
  try { await waitFor(`${base}/health`, 60000); }
  catch (e) { throw new Error(`${e.message}\n${log}`); }
});

after(() => {
  if (dev) dev.kill('SIGTERM');
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function connectTab(workspace, { engine, onRequest, answer = true, reply } = {}) {
  const eng = engine || createEngine(createMemoryStorage({ users: [{ id: 1, name: 'ada' }] }));
  const ws = new WebSocket(`${wsBase}/${workspace}`);
  const events = [];
  const re = new Reassembler();
  const send = (obj) => { for (const f of encodeFrames(obj)) ws.send(f); };
  const registered = new Promise((resolve, reject) => {
    ws.on('message', async (raw) => {
      const msg = re.push(raw.toString());
      if (!msg) return;
      events.push(msg);
      if (msg.type === 'registered') resolve(msg);
      if (msg.type === 'error') reject(new Error(msg.message));
      if (msg.type === 'request') {
        if (onRequest) onRequest(msg);
        if (!answer) return;
        if (reply) { send({ type: 'response', reqId: msg.reqId, ...reply }); return; }
        const r = await eng.handle(msg);
        send({ type: 'response', reqId: msg.reqId, ...r });
      }
    });
    ws.on('error', reject);
  });
  return { ws, send, registered, events, close: () => new Promise((r) => { ws.on('close', r); ws.close(); }) };
}

describe('relay (workers)', () => {
  test('health', async () => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).status, 'ok');
  });

  test('503 workspace_offline when no tab is connected', async () => {
    const r = await fetch(`${base}/mock/${OTHER_ID}/users`);
    assert.equal(r.status, 503);
    const body = await r.json();
    assert.equal(body.error, 'workspace_offline');
    assert.match(body.hint, /browser tab/i);
  });

  test('404 for malformed workspace ids', async () => {
    assert.equal((await fetch(`${base}/mock/short/users`)).status, 404);
    assert.equal((await fetch(`${base}/mock/${'x'.repeat(11)}/users`)).status, 404);
    assert.equal((await fetch(`${base}/ws/short`)).status, 404);
  });

  test('relays GET / POST / PATCH / DELETE and returns the tab answer', async () => {
    const tab = connectTab(WS_ID);
    await tab.registered;

    let r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await r.json(), [{ id: 1, name: 'ada' }]);

    r = await fetch(`${base}/mock/${WS_ID}/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'bob' }) });
    assert.equal(r.status, 201);
    assert.deepEqual(await r.json(), { name: 'bob', id: 2 });

    r = await fetch(`${base}/mock/${WS_ID}/users/2`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'bobby' }) });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).name, 'bobby');

    r = await fetch(`${base}/mock/${WS_ID}/users/2`, { method: 'DELETE' });
    assert.equal(r.status, 200);
    assert.equal((await fetch(`${base}/mock/${WS_ID}/users/2`)).status, 404);
    assert.equal((await fetch(`${base}/mock/${WS_ID}/nope`)).status, 404);
    await tab.close();
  });

  test('forwards path, query, method and parsed body', async () => {
    let seen;
    const tab = connectTab(WS_ID, { onRequest: (m) => { seen = m; } });
    await tab.registered;
    await fetch(`${base}/mock/${WS_ID}/users/1?x=1&y=two`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k: 'v' }) });
    assert.equal(seen.method, 'PATCH');
    assert.equal(seen.path, '/users/1');
    assert.deepEqual(seen.query, { x: '1', y: 'two' });
    assert.deepEqual(seen.body, { k: 'v' });
    assert.equal(typeof seen.reqId, 'string');
    await tab.close();
  });

  test('large responses are chunked over the socket and reassembled', async () => {
    const big = 'x'.repeat(1_600_000);
    const tab = connectTab(WS_ID, { engine: createEngine(createMemoryStorage({ blobs: [{ id: 1, big }] })) });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/blobs/1`);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).big.length, big.length);
    await tab.close();
  });

  test('CORS is open on /mock', async () => {
    const r = await fetch(`${base}/mock/${OTHER_ID}/users`, { method: 'OPTIONS', headers: { origin: 'https://elsewhere.example', 'access-control-request-method': 'POST' } });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    assert.match(r.headers.get('access-control-allow-methods'), /POST/);
  });

  test('504 workspace_timeout when the tab never answers', async () => {
    const tab = connectTab(WS_ID, { answer: false });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 504);
    assert.equal((await r.json()).error, 'workspace_timeout');
    await tab.close();
  });

  test('429 when a workspace has too many in-flight requests', async () => {
    const tab = connectTab(WS_ID, { answer: false });
    await tab.registered;
    const results = await Promise.all(Array.from({ length: 24 }, () => fetch(`${base}/mock/${WS_ID}/users`)));
    const statuses = results.map((r) => r.status);
    assert.ok(statuses.includes(429));
    assert.ok(statuses.includes(504));
    await tab.close();
  });

  test('newest tab wins; old one receives "replaced"', async () => {
    const first = connectTab(WS_ID);
    await first.registered;
    const firstClosed = new Promise((r) => first.ws.on('close', r));
    const second = connectTab(WS_ID);
    await second.registered;
    await firstClosed;
    assert.ok(first.events.some((e) => e.type === 'replaced'));
    assert.equal(first.ws.readyState, WebSocket.CLOSED);
    assert.equal((await fetch(`${base}/mock/${WS_ID}/users`)).status, 200);
    await second.close();
    await wait(100);
    assert.equal((await fetch(`${base}/mock/${WS_ID}/users`)).status, 503);
  });

  test('a tab cannot answer another workspace\'s request', async () => {
    const victim = connectTab(WS_ID, { answer: false });
    await victim.registered;
    const attacker = connectTab(OTHER_ID, { answer: false });
    await attacker.registered;
    const pendingReq = fetch(`${base}/mock/${WS_ID}/users`);
    await wait(150);
    const reqMsg = victim.events.find((e) => e.type === 'request');
    assert.ok(reqMsg);
    attacker.send({ type: 'response', reqId: reqMsg.reqId, status: 200, body: { hacked: true } });
    const r = await pendingReq;
    assert.equal(r.status, 504);
    await victim.close();
    await attacker.close();
  });

  test('register with the wrong workspace id is rejected', async () => {
    const ws = new WebSocket(`${wsBase}/${WS_ID}`);
    const closed = new Promise((resolve) => ws.on('close', (c) => resolve(c)));
    ws.on('open', () => ws.send(JSON.stringify({ type: 'register', workspace: OTHER_ID })));
    assert.equal(await closed, 4001);
  });

  test('dangerous headers stripped, safe ones pass', async () => {
    const tab = connectTab(WS_ID, { reply: { status: 418, headers: { 'set-cookie': 'evil=1', 'x-custom': 'yes', 'content-security-policy': 'x', location: 'https://evil.example' }, body: { teapot: true } } });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 418);
    assert.equal(r.headers.get('set-cookie'), null);
    assert.equal(r.headers.get('location'), null);
    assert.equal(r.headers.get('x-custom'), 'yes');
    assert.deepEqual(await r.json(), { teapot: true });
    await tab.close();
  });

  test('a tab cannot make the relay serve HTML on the app origin', async () => {
    const tab = connectTab(WS_ID, { reply: { status: 200, headers: { 'content-type': 'text/html' }, body: '<h1>fake login</h1><script>alert(1)</script>' } });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/login`);
    assert.match(r.headers.get('content-type'), /^application\/json/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await r.json(), '<h1>fake login</h1><script>alert(1)</script>');
    await tab.close();
  });

  test('a tab cannot turn the relay into an open redirect', async () => {
    const tab = connectTab(WS_ID, { reply: { status: 302, headers: { location: 'https://evil.example' }, body: null } });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/go`, { redirect: 'manual' });
    assert.equal(r.status, 502);
    assert.equal(r.headers.get('location'), null);
    await tab.close();
  });

  test('malformed header values are skipped', async () => {
    const tab = connectTab(WS_ID, { reply: { status: 200, headers: { 'x-bad': 'a\r\nInjected: 1', 'x-ok': 'fine' }, body: { ok: true } } });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('injected'), null);
    assert.equal(r.headers.get('x-ok'), 'fine');
    assert.equal((await fetch(`${base}/health`)).status, 200);
    await tab.close();
  });

  test('bad JSON body -> 400, oversized body -> 413', async () => {
    const tab = connectTab(WS_ID);
    await tab.registered;
    let r = await fetch(`${base}/mock/${WS_ID}/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
    assert.equal(r.status, 400);
    r = await fetch(`${base}/mock/${WS_ID}/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ big: 'x'.repeat(7 * 1024 * 1024) }) });
    assert.equal(r.status, 413);
    await tab.close();
  });

  test('cross-site Origin on /ws is refused; same-origin and no-origin are fine', async () => {
    const evil = new WebSocket(`${wsBase}/${WS_ID}`, { headers: { origin: 'https://evil.example' } });
    const status = await new Promise((resolve) => {
      evil.on('unexpected-response', (req, res) => resolve(res.statusCode));
      evil.on('open', () => resolve('open'));
      evil.on('error', () => {});
    });
    assert.equal(status, 403);
    const same = new WebSocket(`${wsBase}/${WS_ID}`, { headers: { origin: base } });
    await new Promise((resolve, reject) => { same.on('open', resolve); same.on('error', reject); });
    same.close();
  });

  test('tab-controlled caching and CORS headers are stripped', async () => {
    const tab = connectTab(WS_ID, { reply: { status: 200, headers: { 'cache-control': 'public, max-age=99999', 'access-control-allow-origin': 'https://evil.example', expires: 'Thu, 01 Jan 2099 00:00:00 GMT' }, body: { ok: true } } });
    await tab.registered;
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.headers.get('cache-control'), null);
    assert.equal(r.headers.get('expires'), null);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    await tab.close();
  });

  test('per-IP limiter refuses a burst', async () => {
    const results = await Promise.all(Array.from({ length: 75 }, () => fetch(`${base}/mock/${OTHER_ID}/burst`)));
    const codes = results.map((r) => r.status);
    assert.ok(codes.includes(429), `expected some 429s, got ${JSON.stringify(codes.reduce((a, c) => ({ ...a, [c]: (a[c] || 0) + 1 }), {}))}`);
  });

  test('old /api routes are gone (410)', async () => {
    assert.equal((await fetch(`${base}/api/endpoints`)).status, 410);
  });

  test('security headers on every response; SPA served for unknown paths', async () => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    const csp = r.headers.get('content-security-policy');
    assert.match(csp, /connect-src 'self' wss:\/\/[^ ;]+ ws:\/\/[^ ;]+/);
    assert.doesNotMatch(csp, /connect-src[^;]*\swss:\s/);
    assert.match(r.headers.get('strict-transport-security'), /max-age=31536000/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    const page = await fetch(`${base}/some/deep/link`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(page.headers.get('cache-control'), /no-cache/);
    const html = await page.text();
    assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+\/og\.jpg">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, /<title>Apeeye — Fake APIs\. Real endpoints\.<\/title>/);
    assert.equal((await fetch(`${base}/og.jpg`)).headers.get('content-type'), 'image/jpeg');
  });
});
