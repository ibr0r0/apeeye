const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseImport, buildExport } = require('./importExport');
const { DEFAULT_LIMITS } = require('../shared/mockEngine');

const L = DEFAULT_LIMITS;

describe('buildExport', () => {
  test('wraps snapshot with version and timestamp', () => {
    const out = buildExport({ users: [{ id: 1 }] });
    assert.equal(out.apeeye, 1);
    assert.ok(Date.parse(out.exportedAt));
    assert.deepEqual(out.collections, { users: [{ id: 1 }] });
  });
});

describe('parseImport', () => {
  test('accepts wrapped export format', () => {
    const out = parseImport({ apeeye: 1, collections: { users: [{ id: 1, a: 1 }] } }, L);
    assert.deepEqual(out, { users: [{ id: 1, a: 1 }] });
  });

  test('accepts bare { name: [records] } map and JSON strings', () => {
    assert.deepEqual(parseImport('{"posts":[{"id":2}]}', L), { posts: [{ id: 2 }] });
  });

  test('assigns ids when missing or duplicated, sorts by id', () => {
    const out = parseImport({ users: [{ a: 1 }, { id: 5 }, { id: 5, b: 2 }, { id: 'x' }] }, L);
    const ids = out.users.map((r) => r.id);
    assert.deepEqual(ids, [1, 5, 6, 7]);
    assert.equal(new Set(ids).size, 4);
  });

  test('lowercases collection names, rejects invalid ones', () => {
    assert.deepEqual(Object.keys(parseImport({ Users: [] }, L)), ['users']);
    assert.throws(() => parseImport({ '9bad': [] }, L), /Invalid collection name/);
    assert.throws(() => parseImport({ '../x': [] }, L), /Invalid collection name/);
  });

  test('rejects malformed shapes', () => {
    assert.throws(() => parseImport('not json', L), /not valid JSON/);
    assert.throws(() => parseImport([], L), /must be a JSON object/);
    assert.throws(() => parseImport({ users: 'nope' }, L), /must be an array/);
    assert.throws(() => parseImport({ users: [1] }, L), /non-object record/);
    assert.throws(() => parseImport({ users: [[1]] }, L), /non-object record/);
  });

  test('strips prototype-polluting keys', () => {
    const out = parseImport(JSON.parse('{"u":[{"__proto__":{"p":1},"ok":1}]}'), L);
    assert.deepEqual(out.u, [{ ok: 1, id: 1 }]);
    assert.equal(({}).p, undefined);
  });

  test('enforces limits', () => {
    const small = { ...L, maxCollections: 1, maxRecordsPerCollection: 1, maxRecordBytes: 30 };
    assert.throws(() => parseImport({ a: [], b: [] }, small), /Too many collections/);
    assert.throws(() => parseImport({ a: [{}, {}] }, small), /too many records/);
    assert.throws(() => parseImport({ a: [{ x: 'y'.repeat(100) }] }, small), /exceeds the size limit/);
  });
});
