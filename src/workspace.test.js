const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateWorkspaceId, isValidWorkspaceId, WORKSPACE_ID_RE } = require('./workspace');

describe('workspace id', () => {
  test('generates 10-char base62 ids', () => {
    for (let i = 0; i < 200; i++) {
      const id = generateWorkspaceId();
      assert.equal(id.length, 10);
      assert.match(id, WORKSPACE_ID_RE);
    }
  });

  test('ids are unique across many draws', () => {
    const seen = new Set();
    for (let i = 0; i < 2000; i++) seen.add(generateWorkspaceId());
    assert.equal(seen.size, 2000);
  });

  test('uses all character classes (sanity check on alphabet)', () => {
    let digits = 0, upper = 0, lower = 0;
    for (let i = 0; i < 300; i++) {
      for (const ch of generateWorkspaceId()) {
        if (/[0-9]/.test(ch)) digits++;
        else if (/[A-Z]/.test(ch)) upper++;
        else if (/[a-z]/.test(ch)) lower++;
      }
    }
    assert.ok(digits > 0 && upper > 0 && lower > 0);
  });

  test('validator rejects malformed ids', () => {
    assert.equal(isValidWorkspaceId('abcdefghij'), true);
    assert.equal(isValidWorkspaceId('abcdefghi'), false);
    assert.equal(isValidWorkspaceId('abcdefghijk'), false);
    assert.equal(isValidWorkspaceId('abcdefghi-'), false);
    assert.equal(isValidWorkspaceId('../../../a'), false);
    assert.equal(isValidWorkspaceId(123), false);
    assert.equal(isValidWorkspaceId(null), false);
  });
});
