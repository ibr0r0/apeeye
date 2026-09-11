const { isValidResourceName, sanitize, byteSize } = require('../shared/mockEngine');

const FORMAT_VERSION = 1;

function buildExport(snapshot) {
  return {
    apeeye: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    collections: snapshot,
  };
}

function parseImport(input, limits) {
  let data = input;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { throw new Error('File is not valid JSON'); }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Import must be a JSON object');
  }
  const collections = data.collections && typeof data.collections === 'object' ? data.collections : data;

  const names = Object.keys(collections);
  if (names.length > limits.maxCollections) {
    throw new Error(`Too many collections (max ${limits.maxCollections})`);
  }

  const out = {};
  for (const rawName of names) {
    const name = String(rawName).toLowerCase();
    if (!isValidResourceName(name)) throw new Error(`Invalid collection name: "${rawName}"`);
    const records = collections[rawName];
    if (!Array.isArray(records)) throw new Error(`Collection "${name}" must be an array`);
    if (records.length > limits.maxRecordsPerCollection) {
      throw new Error(`Collection "${name}" has too many records (max ${limits.maxRecordsPerCollection})`);
    }
    const seen = new Set();
    let nextId = 1;
    const cleaned = [];
    for (const r of records) {
      if (!r || typeof r !== 'object' || Array.isArray(r)) {
        throw new Error(`Collection "${name}" contains a non-object record`);
      }
      const clean = sanitize(r);
      let id = Number.parseInt(clean.id, 10);
      if (!Number.isFinite(id) || id < 1 || seen.has(id)) {
        while (seen.has(nextId)) nextId += 1;
        id = nextId;
      }
      seen.add(id);
      nextId = Math.max(nextId, id + 1);
      const record = { ...clean, id };
      if (byteSize(record) > limits.maxRecordBytes) {
        throw new Error(`A record in "${name}" exceeds the size limit`);
      }
      cleaned.push(record);
    }
    out[name] = cleaned.sort((a, b) => a.id - b.id);
  }
  return out;
}

function downloadJson(obj, filename) {
  const doc = globalThis.document;
  if (!doc) throw new Error('Download is only supported in the browser');
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickJsonFile() {
  const doc = globalThis.document;
  if (!doc) return Promise.reject(new Error('File import is only supported in the browser'));
  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    let settled = false;
    const finish = (fn, v) => { if (settled) return; settled = true; globalThis.removeEventListener('focus', onFocus); fn(v); };
    const onFocus = () => setTimeout(() => { if (!input.files || !input.files.length) finish(resolve, null); }, 600);
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return finish(resolve, null);
      if (file.size > 50 * 1024 * 1024) return finish(reject, new Error('File is too large (max 50MB)'));
      const reader = new FileReader();
      reader.onload = () => finish(resolve, String(reader.result));
      reader.onerror = () => finish(reject, new Error('Could not read file'));
      reader.readAsText(file);
    };
    input.oncancel = () => finish(resolve, null);
    globalThis.addEventListener('focus', onFocus, { once: true });
    input.click();
  });
}

module.exports = { buildExport, parseImport, downloadJson, pickJsonFile, FORMAT_VERSION };
