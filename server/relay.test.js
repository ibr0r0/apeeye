const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createRelayServer } = require('./app');
const { createEngine, createMemoryStorage } = require('../shared/mockEngine');

const WS_ID = 'abcDEF1234';
const OTHER_ID = 'zzzZZZ9999';

let relay, base, wsBase;

before(async () => {
  relay = createRelayServer({
    requestTimeoutMs: 300,
    registerTimeoutMs: 400,
    maxInflightPerWorkspace: 2,
    staticDir: null,
    trustProxy: false,
  });
  await new Promise((r) => relay.server.listen(0, '127.0.0.1', r));
  const { port } = relay.server.address();
  base = `http://127.0.0.1:${port}`;
  wsBase = `ws://127.0.0.1:${port}/ws`;
});

after(async () => { await relay.close(); });

function connectTab(workspace, { engine, onRequest, answer = true } = {}) {
  const eng = engine || createEngine(createMemoryStorage({ users: [{ id: 1, name: 'ada' }] }));
  const ws = new WebSocket(wsBase);
  const events = [];
  const registered = new Promise((resolve, reject) => {
    ws.on('message', async (raw) => {
      const msg = JSON.parse(raw.toString());
      events.push(msg);
      if (msg.type === 'registered') resolve(msg);
      if (msg.type === 'error') reject(new Error(msg.message));
      if (msg.type === 'request') {
        if (onRequest) onRequest(msg);
        if (!answer) return;
        const r = await eng.handle(msg);
        ws.send(JSON.stringify({ type: 'response', reqId: msg.reqId, ...r }));
      }
    });
    ws.on('error', reject);
  });
  ws.on('open', () => ws.send(JSON.stringify({ type: 'register', workspace })));
  return { ws, registered, events, close: () => new Promise((r) => { ws.on('close', r); ws.close(); }) };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('relay', () => {
  test('health reports online workspaces', async () => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.workspacesOnline, 'number');
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
    assert.equal((await fetch(`${base}/mock/abc-def-12/users`)).status, 404);
  });

  test('relays GET / POST / PATCH / DELETE to the tab and returns its answer verbatim', async () => {
    const tab = connectTab(WS_ID);
    await tab.registered;

    let r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type').includes('application/json'), true);
    assert.deepEqual(await r.json(), [{ id: 1, name: 'ada' }]);

    r = await fetch(`${base}/mock/${WS_ID}/users`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'bob' }),
    });
    assert.equal(r.status, 201);
    assert.deepEqual(await r.json(), { name: 'bob', id: 2 });

    r = await fetch(`${base}/mock/${WS_ID}/users/2`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'bobby' }),
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).name, 'bobby');

    r = await fetch(`${base}/mock/${WS_ID}/users/2`, { method: 'DELETE' });
    assert.equal(r.status, 200);

    r = await fetch(`${base}/mock/${WS_ID}/users/2`);
    assert.equal(r.status, 404);

    r = await fetch(`${base}/mock/${WS_ID}/nope`);
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error, 'Resource not found');

    await tab.close();
  });

  test('forwards path, query, method and parsed body to the tab', async () => {
    let seen;
    const tab = connectTab(WS_ID, { onRequest: (m) => { seen = m; } });
    await tab.registered;
    await fetch(`${base}/mock/${WS_ID}/users/1?x=1&y=two`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k: 'v' }),
    });
    assert.equal(seen.method, 'PATCH');
    assert.equal(seen.path, '/users/1');
    assert.deepEqual(seen.query, { x: '1', y: 'two' });
    assert.deepEqual(seen.body, { k: 'v' });
    assert.equal(typeof seen.reqId, 'string');
    await tab.close();
  });

  test('CORS is wide open on /mock so other apps can call it', async () => {
    const r = await fetch(`${base}/mock/${OTHER_ID}/users`, {
      method: 'OPTIONS',
      headers: { origin: 'https://someone-elses-app.example', 'access-control-request-method': 'POST' },
    });
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    assert.match(r.headers.get('access-control-allow-methods') || '', /POST/);
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
    const results = await Promise.all([1, 2, 3, 4].map(() => fetch(`${base}/mock/${WS_ID}/users`)));
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [429, 429, 504, 504]);
    await tab.close();
  });

  test('newest tab wins; old one receives "replaced"', async () => {
    const first = connectTab(WS_ID);
    await first.registered;
    const second = connectTab(WS_ID);
    await second.registered;
    await wait(50);
    assert.ok(first.events.some((e) => e.type === 'replaced'), 'first tab told it was replaced');
    assert.equal(first.ws.readyState, WebSocket.CLOSED);
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 200);
    await second.close();
    const r2 = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r2.status, 503);
  });

  test('a tab cannot answer another workspace\'s request', async () => {
    const victim = connectTab(WS_ID, { answer: false });
    await victim.registered;
    const attacker = connectTab(OTHER_ID, { answer: false });
    await attacker.registered;
    const pendingReq = fetch(`${base}/mock/${WS_ID}/users`);
    await wait(30);
    const reqMsg = victim.events.find((e) => e.type === 'request');
    attacker.ws.send(JSON.stringify({ type: 'response', reqId: reqMsg.reqId, status: 200, body: { hacked: true } }));
    const r = await pendingReq;
    assert.equal(r.status, 504); // forged reply ignored
    await victim.close();
    await attacker.close();
  });

  test('socket that never registers is dropped', async () => {
    const ws = new WebSocket(wsBase);
    const code = await new Promise((resolve) => ws.on('close', (c) => resolve(c)));
    assert.equal(code, 4000);
  });

  test('invalid workspace id on register is rejected', async () => {
    const ws = new WebSocket(wsBase);
    const closed = new Promise((resolve) => ws.on('close', (c) => resolve(c)));
    ws.on('open', () => ws.send(JSON.stringify({ type: 'register', workspace: '../etc' })));
    assert.equal(await closed, 4001);
  });

  function rawTab(reply) {
    const ws = new WebSocket(wsBase);
    const ready = new Promise((resolve) => {
      ws.on('open', () => ws.send(JSON.stringify({ type: 'register', workspace: WS_ID })));
      ws.on('message', (raw) => {
        const m = JSON.parse(raw.toString());
        if (m.type === 'registered') resolve();
        if (m.type === 'request') ws.send(JSON.stringify({ type: 'response', reqId: m.reqId, ...reply }));
      });
    });
    return { ready, close: () => new Promise((r) => { ws.on('close', r); ws.close(); }) };
  }

  test('tab-supplied dangerous headers are stripped, safe ones pass through', async () => {
    const tab = rawTab({
      status: 418,
      headers: { 'set-cookie': 'evil=1', 'x-custom': 'yes', 'content-security-policy': 'x', location: 'https://evil.example' },
      body: { teapot: true },
    });
    await tab.ready;
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 418);
    assert.equal(r.headers.get('set-cookie'), null);
    assert.equal(r.headers.get('location'), null);
    assert.equal(r.headers.get('x-custom'), 'yes');
    assert.deepEqual(await r.json(), { teapot: true });
    await tab.close();
  });

  test('a tab cannot make the relay serve HTML on the app origin', async () => {
    const tab = rawTab({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: '<h1>fake login</h1><script>alert(1)</script>',
    });
    await tab.ready;
    const r = await fetch(`${base}/mock/${WS_ID}/login`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /^application\/json/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await r.json(), '<h1>fake login</h1><script>alert(1)</script>'); // still just a JSON string
    await tab.close();
  });

  test('a tab cannot turn the relay into an open redirect', async () => {
    const tab = rawTab({ status: 302, headers: { location: 'https://evil.example' }, body: null });
    await tab.ready;
    const r = await fetch(`${base}/mock/${WS_ID}/go`, { redirect: 'manual' });
    assert.equal(r.status, 502);
    assert.equal(r.headers.get('location'), null);
    await tab.close();
  });

  test('malformed header values from a tab are skipped, not fatal', async () => {
    const tab = rawTab({ status: 200, headers: { 'x-bad': 'a\r\nInjected: 1', 'bad name': 'x', 'x-ok': 'fine' }, body: { ok: true } });
    await tab.ready;
    const r = await fetch(`${base}/mock/${WS_ID}/users`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('injected'), null);
    assert.equal(r.headers.get('x-ok'), 'fine');
    assert.deepEqual(await r.json(), { ok: true });
    assert.equal((await fetch(`${base}/health`)).status, 200);
    await tab.close();
  });

  test('bad JSON body -> 400, oversized body -> 413', async () => {
    const tab = connectTab(WS_ID);
    await tab.registered;
    let r = await fetch(`${base}/mock/${WS_ID}/users`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad',
    });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, 'invalid_json');
    r = await fetch(`${base}/mock/${WS_ID}/users`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ big: 'x'.repeat(7 * 1024 * 1024) }),
    });
    assert.equal(r.status, 413);
    await tab.close();
  });

  test('old /api storage routes are gone (410)', async () => {
    assert.equal((await fetch(`${base}/api/endpoints`)).status, 410);
  });

  test('security headers present, x-powered-by absent', async () => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.match(r.headers.get('content-security-policy') || '', /connect-src 'self' ws: wss:/);
  });
});
