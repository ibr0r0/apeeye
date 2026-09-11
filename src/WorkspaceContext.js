import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createEngine } from '../shared/mockEngine';
import { createIndexedDBStorage } from './storage/idb';
import { getOrCreateWorkspaceId, rotateWorkspaceId } from './workspace';
import { createRelayClient, STATUS } from './relayClient';
import { buildExport, parseImport, downloadJson, pickJsonFile } from './importExport';
import { buildExamples } from './examples';

const WorkspaceContext = createContext(null);
const MAX_ACTIVITY = 50;

export function WorkspaceProvider({ children }) {
  const [workspaceId, setWorkspaceId] = useState(() => getOrCreateWorkspaceId());
  const [relayStatus, setRelayStatus] = useState(STATUS.OFFLINE);
  const [collections, setCollections] = useState([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [activity, setActivity] = useState([]);

  const storage = useMemo(() => createIndexedDBStorage(), []);
  const engine = useMemo(() => createEngine(storage), [storage]);
  const relayRef = useRef(null);

  const refreshCollections = useCallback(async () => {
    try {
      setCollections(await engine.listCollections());
      setStorageError('');
    } catch (e) {
      setStorageError(e?.message || 'Storage unavailable');
    }
  }, [engine]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshCollections();
      if (cancelled) return;
      setReady(true);
    })();

    const relay = createRelayClient({
      workspaceId,
      engine,
      onStatus: setRelayStatus,
      onRequest: (evt) => {
        setActivity((prev) => [{ ...evt, at: Date.now(), key: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, MAX_ACTIVITY));
      },
    });
    relayRef.current = relay;
    relay.connect();

    return () => {
      cancelled = true;
      relay.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const httpBase = relayRef.current?.getHttpBase?.() ?? '';
  const workspaceUrl = `${httpBase}/mock/${workspaceId}`;
  const endpointUrl = useCallback(
    (collection, id) => `${workspaceUrl}/${collection}${id != null ? `/${id}` : ''}`,
    [workspaceUrl]
  );

  const createCollection = useCallback(async (name) => {
    const r = await engine.createCollection(name);
    if (r.status >= 400) throw new Error(r.body.error);
    await refreshCollections();
    return r.body.name;
  }, [engine, refreshCollections]);

  const deleteCollection = useCallback(async (name) => {
    const r = await engine.deleteCollection(name);
    if (r.status >= 400) throw new Error(r.body.error);
    await refreshCollections();
  }, [engine, refreshCollections]);

  const run = useCallback(async (method, path, body) => {
    const r = await engine.handle({ method, path, body });
    if (r.status >= 400) throw new Error(r.body?.error || `Request failed (${r.status})`);
    return r.body;
  }, [engine]);

  const listRecords = useCallback((c) => run('GET', `/${c}`), [run]);
  const createRecord = useCallback((c, body) => run('POST', `/${c}`, body), [run]);
  const replaceRecord = useCallback((c, id, body) => run('PUT', `/${c}/${id}`, body), [run]);
  const patchRecord = useCallback((c, id, body) => run('PATCH', `/${c}/${id}`, body), [run]);
  const deleteRecord = useCallback((c, id) => run('DELETE', `/${c}/${id}`), [run]);

  const resetWorkspace = useCallback(async () => {
    await storage.clear();
    const fresh = rotateWorkspaceId();
    setWorkspaceId(fresh);
    setActivity([]);
    await refreshCollections();
    relayRef.current?.switchWorkspace(fresh);
    return fresh;
  }, [storage, refreshCollections]);

  const reconnect = useCallback(() => {
    relayRef.current?.switchWorkspace(workspaceId);
  }, [workspaceId]);

  const exportWorkspace = useCallback(async () => {
    const snapshot = await storage.dump();
    downloadJson(buildExport(snapshot), `apeeye-${workspaceId}.json`);
  }, [storage, workspaceId]);

  const loadExamples = useCallback(async () => {
    const examples = buildExamples();
    let added = 0;
    for (const [name, records] of Object.entries(examples)) {
      const c = await engine.createCollection(name);
      if (c.status >= 400) throw new Error(c.body.error);
      for (const r of records) {
        const res = await engine.handle({ method: 'POST', path: `/${name}`, body: r });
        if (res.status < 400) added += 1;
      }
    }
    await refreshCollections();
    return { collections: Object.keys(examples).length, records: added };
  }, [engine, refreshCollections]);

  const importWorkspace = useCallback(async () => {
    const text = await pickJsonFile();
    if (text == null) return null; // cancelled
    const parsed = parseImport(text, engine.limits);
    await storage.load(parsed);
    await refreshCollections();
    return Object.keys(parsed).length;
  }, [storage, engine, refreshCollections]);

  const value = useMemo(() => ({
    ready,
    storageError,
    workspaceId,
    workspaceUrl,
    httpBase,
    endpointUrl,
    relayStatus,
    activity,
    collections,
    refreshCollections,
    createCollection,
    deleteCollection,
    listRecords,
    createRecord,
    replaceRecord,
    patchRecord,
    deleteRecord,
    resetWorkspace,
    reconnect,
    exportWorkspace,
    importWorkspace,
    loadExamples,
    limits: engine.limits,
  }), [
    ready, storageError, workspaceId, workspaceUrl, httpBase, endpointUrl, relayStatus, activity,
    collections, refreshCollections, createCollection, deleteCollection, listRecords, createRecord,
    replaceRecord, patchRecord, deleteRecord, resetWorkspace, reconnect, exportWorkspace, importWorkspace,
    loadExamples, engine.limits,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}

export { STATUS as RELAY_STATUS };
