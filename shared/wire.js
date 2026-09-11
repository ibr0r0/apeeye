const MAX_CHARS = 250000;
const MAX_TOTAL_CHARS = 12 * 1024 * 1024;
const MAX_PARTS = 64;

function frameId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function encodeFrames(obj) {
  const text = JSON.stringify(obj);
  if (text.length <= MAX_CHARS) return [text];
  const id = frameId();
  const n = Math.ceil(text.length / MAX_CHARS);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(JSON.stringify({ type: 'chunk', id, i, n, data: text.slice(i * MAX_CHARS, (i + 1) * MAX_CHARS) }));
  }
  return out;
}

class Reassembler {
  constructor(maxTotalChars = MAX_TOTAL_CHARS) {
    this.max = maxTotalChars;
    this.parts = new Map();
  }

  push(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return null; }
    if (!msg || typeof msg !== 'object') return null;
    if (msg.type !== 'chunk') return msg;

    const { id, i, n, data } = msg;
    if (typeof id !== 'string' || !Number.isInteger(i) || !Number.isInteger(n) || n < 1 || n > MAX_PARTS || i < 0 || i >= n || typeof data !== 'string') {
      return null;
    }
    let p = this.parts.get(id);
    if (!p) {
      if (this.parts.size >= 4) this.parts.clear();
      p = { n, got: 0, size: 0, chunks: new Array(n) };
      this.parts.set(id, p);
    }
    if (p.chunks[i] === undefined) {
      p.chunks[i] = data;
      p.got += 1;
      p.size += data.length;
    }
    let total = 0;
    for (const q of this.parts.values()) total += q.size;
    if (p.size > this.max || total > this.max) {
      this.parts.clear();
      throw new Error('message too large');
    }
    if (p.got < p.n) return null;
    this.parts.delete(id);
    try { return JSON.parse(p.chunks.join('')); } catch { return null; }
  }
}

module.exports = { encodeFrames, Reassembler, MAX_CHARS, MAX_TOTAL_CHARS };
