const RESOURCE_NAME_RE = /^[a-z][a-z0-9_-]{0,49}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const DEFAULT_LIMITS = {
  maxCollections: 100,
  maxRecordsPerCollection: 500,
  maxRecordBytes: 5 * 1024 * 1024,
};

function isValidResourceName(name) {
  return typeof name === 'string' && RESOURCE_NAME_RE.test(name);
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (DANGEROUS_KEYS.has(k)) continue;
      clean[k] = sanitize(v);
    }
    return clean;
  }
  return value;
}

function byteSize(obj) {
  const str = JSON.stringify(obj);
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(str, 'utf-8');
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
  return str.length;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function nextId(records) {
  let max = 0;
  for (const r of records) {
    const id = Number(r && r.id);
    if (Number.isFinite(id) && id > max) max = id;
  }
  return max + 1;
}

function respond(status, body, headers) {
  return { status, headers: { 'content-type': 'application/json', ...(headers || {}) }, body };
}

function error(status, message, extra) {
  return respond(status, { error: message, ...(extra || {}) });
}

function parsePath(path) {
  const clean = String(path || '').split('?')[0];
  const segments = clean.split('/').filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  return segments;
}

function createEngine(storage, options = {}) {
  if (!storage) throw new Error('createEngine requires a storage adapter');
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };

  async function listCollections() {
    return storage.getCollections();
  }

  async function createCollection(rawName) {
    const name = String(rawName || '').trim().toLowerCase();
    if (!isValidResourceName(name)) {
      return error(422, 'Invalid name. Use 1-50 chars: lowercase letters, digits, "-" or "_", starting with a letter.');
    }
    const existing = await storage.getCollections();
    if (existing.includes(name)) return respond(200, { message: `Resource '${name}' already exists`, name });
    if (existing.length >= limits.maxCollections) return error(429, 'Collection limit reached');
    await storage.createCollection(name);
    return respond(201, { message: `Resource '${name}' created`, name });
  }

  async function deleteCollection(rawName) {
    const name = String(rawName || '').toLowerCase();
    if (!isValidResourceName(name)) return error(422, 'Invalid resource name');
    const removed = await storage.deleteCollection(name);
    if (!removed) return error(404, 'Resource not found');
    return respond(200, { message: `Resource '${name}' deleted`, name });
  }

  async function handle(req) {
    const method = String(req.method || 'GET').toUpperCase();
    const segments = parsePath(req.path);

    if (segments.length === 0) {
      if (method !== 'GET') return error(405, 'Method not allowed');
      return respond(200, await storage.getCollections());
    }
    if (segments.length > 2) return error(404, 'Not found');

    const [rawResource, rawId] = segments;
    const resource = rawResource.toLowerCase();
    if (!isValidResourceName(resource)) return error(422, 'Invalid resource name');

    const collections = await storage.getCollections();
    if (!collections.includes(resource)) return error(404, 'Resource not found');

    if (segments.length === 1) {
      if (method === 'GET') return respond(200, await storage.getAll(resource));
      if (method === 'POST') return create(resource, req.body);
      return error(405, 'Method not allowed');
    }

    const id = Number.parseInt(rawId, 10);
    if (!Number.isFinite(id) || String(id) !== String(rawId).trim()) {
      return error(422, 'Invalid id');
    }
    if (method === 'GET') {
      const item = await storage.get(resource, id);
      return item ? respond(200, item) : error(404, 'Item not found');
    }
    if (method === 'PUT') return replace(resource, id, req.body);
    if (method === 'PATCH') return patch(resource, id, req.body);
    if (method === 'DELETE') return remove(resource, id);
    return error(405, 'Method not allowed');
  }

  async function create(resource, body) {
    if (body === undefined || body === null) body = {};
    if (!isPlainObject(body)) return error(422, 'Body must be a JSON object');
    const existing = await storage.getAll(resource);
    if (existing.length >= limits.maxRecordsPerCollection) {
      return error(429, 'Record limit reached for this collection');
    }
    const clean = sanitize(body);
    const record = { ...clean, id: nextId(existing) };
    if (byteSize(record) > limits.maxRecordBytes) return error(413, 'Record too large');
    await storage.put(resource, record);
    return respond(201, record);
  }

  async function replace(resource, id, body) {
    if (!isPlainObject(body)) return error(422, 'Body must be a JSON object');
    const current = await storage.get(resource, id);
    if (!current) return error(404, 'Item not found');
    const record = { ...sanitize(body), id }; // id is immutable
    if (byteSize(record) > limits.maxRecordBytes) return error(413, 'Record too large');
    await storage.put(resource, record);
    return respond(200, record);
  }

  async function patch(resource, id, body) {
    if (!isPlainObject(body)) return error(422, 'Body must be a JSON object');
    const current = await storage.get(resource, id);
    if (!current) return error(404, 'Item not found');
    const record = { ...current, ...sanitize(body), id };
    if (byteSize(record) > limits.maxRecordBytes) return error(413, 'Record too large');
    await storage.put(resource, record);
    return respond(200, record);
  }

  async function remove(resource, id) {
    const current = await storage.get(resource, id);
    if (!current) return error(404, 'Item not found');
    await storage.delete(resource, id);
    return respond(200, { message: 'Deleted', deleted: current });
  }

  return { handle, listCollections, createCollection, deleteCollection, limits };
}

function createMemoryStorage(initial = {}) {
  const data = new Map();
  for (const [name, records] of Object.entries(initial)) {
    data.set(name, new Map((records || []).map((r) => [r.id, { ...r }])));
  }
  return {
    getCollections: () => [...data.keys()],
    createCollection: (name) => { if (!data.has(name)) data.set(name, new Map()); },
    deleteCollection: (name) => data.delete(name),
    getAll: (c) => [...(data.get(c) || new Map()).values()].map((r) => ({ ...r })),
    get: (c, id) => { const r = (data.get(c) || new Map()).get(id); return r ? { ...r } : null; },
    put: (c, record) => { data.get(c).set(record.id, { ...record }); return { ...record }; },
    delete: (c, id) => (data.get(c) || new Map()).delete(id),

    dump: () => Object.fromEntries([...data].map(([k, v]) => [k, [...v.values()]])),
  };
}

module.exports = {
  createEngine,
  createMemoryStorage,
  sanitize,
  isValidResourceName,
  byteSize,
  RESOURCE_NAME_RE,
  DEFAULT_LIMITS,
};
