const STORAGE_KEY = 'apeeye.workspace';
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 10;
const WORKSPACE_ID_RE = /^[0-9A-Za-z]{10}$/;

function generateWorkspaceId() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Secure random generator unavailable');
  }
  const LIMIT = 248;
  let out = '';
  const buf = new Uint8Array(32);
  while (out.length < ID_LENGTH) {
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < ID_LENGTH; i++) {
      if (buf[i] < LIMIT) out += ALPHABET[buf[i] % 62];
    }
  }
  return out;
}

function isValidWorkspaceId(id) {
  return typeof id === 'string' && WORKSPACE_ID_RE.test(id);
}

function readStored() {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isValidWorkspaceId(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStored(id) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
  } catch {

  }
}

function getOrCreateWorkspaceId() {
  const existing = readStored();
  if (existing) return existing;
  const fresh = generateWorkspaceId();
  writeStored(fresh);
  return fresh;
}

function rotateWorkspaceId() {
  const fresh = generateWorkspaceId();
  writeStored(fresh);
  return fresh;
}

module.exports = {
  generateWorkspaceId,
  isValidWorkspaceId,
  getOrCreateWorkspaceId,
  rotateWorkspaceId,
  WORKSPACE_ID_RE,
  ID_LENGTH,
};
