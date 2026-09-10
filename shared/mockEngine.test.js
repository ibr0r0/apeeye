const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, createMemoryStorage, sanitize } = require('./mockEngine');

function make(initial, limits) {
  return createEngine(createMemoryStorage(initial), { limits });
}

describe('collections', () => {
  test('root GET lists collections', async () => {
    const e = make({ users: [], posts: [] });
    const r = await e.handle({ method: 'GET', path: '/' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, ['users', 'posts']);
  });

  test('createCollection normalises and validates names', async () => {
    const e = make();
    assert.equal((await e.createCollection('  Users ')).status, 201);
    assert.deepEqual(await e.listCollections(), ['users']);
    assert.equal((await e.createCollection('users')).status, 200); // idempotent
    assert.equal((await e.createCollection('9bad')).status, 422);
    assert.equal((await e.createCollection('../etc')).status, 422);
    assert.equal((await e.createCollection('')).status, 422);
    assert.equal((await e.createCollection('a'.repeat(51))).status, 422);
  });

  test('collection limit enforced', async () => {
    const e = make({ a: [] }, { maxCollections: 1 });
    assert.equal((await e.createCollection('b')).status, 429);
  });

  test('deleteCollection 404s on missing', async () => {
    const e = make({ users: [] });
    assert.equal((await e.deleteCollection('nope')).status, 404);
    assert.equal((await e.deleteCollection('users')).status, 200);
    assert.deepEqual(await e.listCollections(), []);
  });
});

describe('list & get', () => {
  test('GET /:resource returns records', async () => {
    const e = make({ users: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });
    const r = await e.handle({ method: 'GET', path: '/users' });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 2);
    assert.equal(r.headers['content-type'], 'application/json');
  });

  test('GET /:resource 404 on unknown collection', async () => {
    const r = await make().handle({ method: 'GET', path: '/nope' });
    assert.equal(r.status, 404);
    assert.equal(r.body.error, 'Resource not found');
  });

  test('GET /:resource/:id returns record or 404', async () => {
    const e = make({ users: [{ id: 7, name: 'z' }] });
    assert.equal((await e.handle({ method: 'GET', path: '/users/7' })).body.name, 'z');
    assert.equal((await e.handle({ method: 'GET', path: '/users/8' })).status, 404);
  });

  test('path is case-insensitive for resource, tolerates query string', async () => {
    const e = make({ users: [{ id: 1 }] });
    assert.equal((await e.handle({ method: 'GET', path: '/Users?x=1' })).status, 200);
    assert.equal((await e.handle({ method: 'GET', path: '/users/1?y=2' })).status, 200);
  });

  test('invalid resource name -> 422, invalid id -> 422, too-deep path -> 404', async () => {
    const e = make({ users: [] });
    assert.equal((await e.handle({ method: 'GET', path: '/9bad' })).status, 422);
    assert.equal((await e.handle({ method: 'GET', path: '/users/abc' })).status, 422);
    assert.equal((await e.handle({ method: 'GET', path: '/users/1.5' })).status, 422);
    assert.equal((await e.handle({ method: 'GET', path: '/users/1/extra' })).status, 404);
  });
});

describe('create', () => {
  test('POST generates incrementing ids', async () => {
    const e = make({ users: [{ id: 3 }] });
    const r = await e.handle({ method: 'POST', path: '/users', body: { name: 'n' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.id, 4);
    assert.equal(r.body.name, 'n');
    const list = await e.handle({ method: 'GET', path: '/users' });
    assert.equal(list.body.length, 2);
  });

  test('POST with empty body creates a record with just an id', async () => {
    const e = make({ users: [] });
    const r = await e.handle({ method: 'POST', path: '/users' });
    assert.equal(r.status, 201);
    assert.deepEqual(r.body, { id: 1 });
  });

  test('POST with non-object body -> 422', async () => {
    const e = make({ users: [] });
    assert.equal((await e.handle({ method: 'POST', path: '/users', body: [1] })).status, 422);
    assert.equal((await e.handle({ method: 'POST', path: '/users', body: 'str' })).status, 422);
  });

  test('POST 404 on unknown collection', async () => {
    assert.equal((await make().handle({ method: 'POST', path: '/x', body: {} })).status, 404);
  });

  test('POST strips prototype-polluting keys and does not pollute', async () => {
    const e = make({ users: [] });
    const r = await e.handle({
      method: 'POST', path: '/users',
      body: JSON.parse('{"name":"n","__proto__":{"polluted":true},"constructor":1,"nested":{"prototype":2,"ok":3}}'),
    });
    assert.equal(r.status, 201);
    assert.deepEqual(r.body, { name: 'n', nested: { ok: 3 }, id: 1 });
    assert.equal(({}).polluted, undefined);
  });

  test('POST caller cannot choose id', async () => {
    const e = make({ users: [] });
    const r = await e.handle({ method: 'POST', path: '/users', body: { id: 999, a: 1 } });
    assert.equal(r.body.id, 1);
  });

  test('record limit -> 429', async () => {
    const e = make({ users: [{ id: 1 }] }, { maxRecordsPerCollection: 1 });
    assert.equal((await e.handle({ method: 'POST', path: '/users', body: {} })).status, 429);
  });

  test('record size cap -> 413', async () => {
    const e = make({ users: [] }, { maxRecordBytes: 50 });
    const r = await e.handle({ method: 'POST', path: '/users', body: { big: 'x'.repeat(100) } });
    assert.equal(r.status, 413);
    assert.equal((await e.handle({ method: 'GET', path: '/users' })).body.length, 0);
  });
});

describe('replace (PUT)', () => {
  test('PUT replaces whole record, keeps id', async () => {
    const e = make({ users: [{ id: 1, a: 1, b: 2 }] });
    const r = await e.handle({ method: 'PUT', path: '/users/1', body: { c: 3, id: 42 } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { c: 3, id: 1 });
  });

  test('PUT 404 on missing, 422 on bad body', async () => {
    const e = make({ users: [{ id: 1 }] });
    assert.equal((await e.handle({ method: 'PUT', path: '/users/2', body: {} })).status, 404);
    assert.equal((await e.handle({ method: 'PUT', path: '/users/1', body: [] })).status, 422);
  });
});

describe('patch', () => {
  test('PATCH merges fields, keeps id', async () => {
    const e = make({ users: [{ id: 1, a: 1, b: 2 }] });
    const r = await e.handle({ method: 'PATCH', path: '/users/1', body: { b: 9, c: 3, id: 5 } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { id: 1, a: 1, b: 9, c: 3 });
  });

  test('PATCH 404 / 422 / 413', async () => {
    const e = make({ users: [{ id: 1 }] }, { maxRecordBytes: 40 });
    assert.equal((await e.handle({ method: 'PATCH', path: '/users/9', body: {} })).status, 404);
    assert.equal((await e.handle({ method: 'PATCH', path: '/users/1', body: null })).status, 422);
    assert.equal((await e.handle({ method: 'PATCH', path: '/users/1', body: { x: 'y'.repeat(100) } })).status, 413);
  });
});

describe('delete', () => {
  test('DELETE removes and returns the record', async () => {
    const e = make({ users: [{ id: 1, n: 'a' }, { id: 2 }] });
    const r = await e.handle({ method: 'DELETE', path: '/users/1' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.deleted, { id: 1, n: 'a' });
    assert.equal((await e.handle({ method: 'GET', path: '/users' })).body.length, 1);
    assert.equal((await e.handle({ method: 'DELETE', path: '/users/1' })).status, 404);
  });
});

describe('methods', () => {
  test('unsupported methods -> 405', async () => {
    const e = make({ users: [{ id: 1 }] });
    assert.equal((await e.handle({ method: 'DELETE', path: '/users' })).status, 405);
    assert.equal((await e.handle({ method: 'POST', path: '/users/1' })).status, 405);
    assert.equal((await e.handle({ method: 'POST', path: '/' })).status, 405);
    assert.equal((await e.handle({ method: 'TRACE', path: '/users/1' })).status, 405);
  });

  test('method is case-insensitive', async () => {
    const e = make({ users: [] });
    assert.equal((await e.handle({ method: 'get', path: '/users' })).status, 200);
  });
});

describe('sanitize', () => {
  test('handles arrays, nesting and primitives', () => {
    assert.deepEqual(sanitize([{ __proto__: 1, a: [{ constructor: 2, b: 3 }] }, 4]), [{ a: [{ b: 3 }] }, 4]);
    assert.equal(sanitize(5), 5);
    assert.equal(sanitize(null), null);
  });
});
