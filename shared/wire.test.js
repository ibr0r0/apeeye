const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { encodeFrames, Reassembler, MAX_CHARS } = require('./wire');

describe('wire', () => {
  test('small messages are a single frame', () => {
    const frames = encodeFrames({ type: 'ping' });
    assert.equal(frames.length, 1);
    assert.deepEqual(JSON.parse(frames[0]), { type: 'ping' });
  });

  test('large messages are chunked and reassembled', () => {
    const big = { type: 'response', reqId: 'x', status: 200, body: { blob: 'a'.repeat(MAX_CHARS * 3 + 17) } };
    const frames = encodeFrames(big);
    assert.ok(frames.length > 1);
    const r = new Reassembler();
    let out = null;
    for (const f of frames) out = r.push(f);
    assert.deepEqual(out, big);
  });

  test('out-of-order chunks still reassemble', () => {
    const big = { data: 'b'.repeat(MAX_CHARS * 2 + 5) };
    const frames = encodeFrames(big).reverse();
    const r = new Reassembler();
    let out = null;
    for (const f of frames) out = r.push(f);
    assert.deepEqual(out, big);
  });

  test('garbage and malformed chunks are ignored', () => {
    const r = new Reassembler();
    assert.equal(r.push('not json'), null);
    assert.equal(r.push('42'), null);
    assert.equal(r.push(JSON.stringify({ type: 'chunk', id: 1, i: 0, n: 2, data: 'x' })), null);
    assert.equal(r.push(JSON.stringify({ type: 'chunk', id: 'a', i: 5, n: 2, data: 'x' })), null);
    assert.equal(r.push(JSON.stringify({ type: 'chunk', id: 'a', i: 0, n: 999, data: 'x' })), null);
  });

  test('oversized reassembly throws and drops the buffer', () => {
    const r = new Reassembler(100);
    assert.throws(() => r.push(JSON.stringify({ type: 'chunk', id: 'z', i: 0, n: 2, data: 'q'.repeat(101) })), /too large/);
    assert.equal(r.parts.size, 0);
  });

  test('the cap applies across all partial messages, not just one', () => {
    const r = new Reassembler(100);
    r.push(JSON.stringify({ type: 'chunk', id: 'a', i: 0, n: 2, data: 'q'.repeat(60) }));
    assert.throws(() => r.push(JSON.stringify({ type: 'chunk', id: 'b', i: 0, n: 2, data: 'q'.repeat(60) })), /too large/);
    assert.equal(r.parts.size, 0);
  });
});
