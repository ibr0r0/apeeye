const DB_NAME = 'apeeye';
const DB_VERSION = 1;

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

function openDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: ['collection', 'id'] });
        store.createIndex('byCollection', 'collection', { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked by another tab'));
  });
}

function createIndexedDBStorage() {
  let dbPromise = null;
  const db = () => (dbPromise ||= openDB());

  async function getCollections() {
    const tx = (await db()).transaction('collections', 'readonly');
    const rows = await reqToPromise(tx.objectStore('collections').getAll());
    return rows.map((r) => r.name).sort();
  }

  async function createCollection(name) {
    const tx = (await db()).transaction('collections', 'readwrite');
    tx.objectStore('collections').put({ name });
    await txDone(tx);
  }

  async function deleteCollection(name) {
    const d = await db();
    const tx = d.transaction(['collections', 'records'], 'readwrite');
    const existing = await reqToPromise(tx.objectStore('collections').get(name));
    if (!existing) return false;
    tx.objectStore('collections').delete(name);
    const idx = tx.objectStore('records').index('byCollection');
    const keys = await reqToPromise(idx.getAllKeys(name));
    for (const key of keys) tx.objectStore('records').delete(key);
    await txDone(tx);
    return true;
  }

  async function getAll(collection) {
    const tx = (await db()).transaction('records', 'readonly');
    const rows = await reqToPromise(tx.objectStore('records').index('byCollection').getAll(collection));
    return rows.map((r) => r.record).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }

  async function get(collection, id) {
    const tx = (await db()).transaction('records', 'readonly');
    const row = await reqToPromise(tx.objectStore('records').get([collection, id]));
    return row ? row.record : null;
  }

  async function put(collection, record) {
    const tx = (await db()).transaction('records', 'readwrite');
    tx.objectStore('records').put({ collection, id: record.id, record });
    await txDone(tx);
    return record;
  }

  async function del(collection, id) {
    const d = await db();
    const tx = d.transaction('records', 'readwrite');
    const existing = await reqToPromise(tx.objectStore('records').get([collection, id]));
    if (!existing) return false;
    tx.objectStore('records').delete([collection, id]);
    await txDone(tx);
    return true;
  }

  async function dump() {
    const names = await getCollections();
    const out = {};
    for (const n of names) out[n] = await getAll(n);
    return out;
  }

  async function load(snapshot) {
    const d = await db();
    const tx = d.transaction(['collections', 'records'], 'readwrite');
    tx.objectStore('collections').clear();
    tx.objectStore('records').clear();
    for (const [name, records] of Object.entries(snapshot)) {
      tx.objectStore('collections').put({ name });
      for (const record of records) {
        tx.objectStore('records').put({ collection: name, id: record.id, record });
      }
    }
    await txDone(tx);
  }

  async function clear() {
    const d = await db();
    const tx = d.transaction(['collections', 'records'], 'readwrite');
    tx.objectStore('collections').clear();
    tx.objectStore('records').clear();
    await txDone(tx);
  }

  return { getCollections, createCollection, deleteCollection, getAll, get, put, delete: del, dump, load, clear };
}

module.exports = { createIndexedDBStorage };
