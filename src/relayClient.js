const { encodeFrames, Reassembler } = require('../shared/wire');

const STATUS = {
  CONNECTING: 'connecting',
  ONLINE: 'online',
  RECONNECTING: 'reconnecting',
  OFFLINE: 'offline',
  REPLACED: 'replaced',
};

const HEARTBEAT_MS = 25_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

function getRelayHttpBase() {
  const env = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_RELAY_URL : undefined;
  if (env) return env.replace(/\/+$/, '');
  const loc = globalThis.location;
  if (loc && loc.origin && !/localhost:(8081|19006|3000)$/.test(loc.host)) {
    return loc.origin;
  }
  return 'http://localhost:8787';
}

function toWsUrl(httpBase, workspaceId) {
  return httpBase.replace(/^http/, 'ws') + '/ws/' + encodeURIComponent(workspaceId);
}

function createRelayClient({ workspaceId, engine, onStatus, onRequest }) {
  let ws = null;
  let status = STATUS.OFFLINE;
  let attempts = 0;
  let heartbeat = null;
  let reconnectTimer = null;
  let closedByUser = false;
  let currentWorkspace = workspaceId;
  let reassembler = new Reassembler();
  const listeners = new Set();
  if (onStatus) listeners.add(onStatus);

  function setStatus(next) {
    if (status === next) return;
    status = next;
    for (const l of listeners) {
      try { l(status); } catch {}
    }
  }

  function send(msg) {
    if (!ws || ws.readyState !== 1) return;
    for (const f of encodeFrames(msg)) ws.send(f);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeat = setInterval(() => send({ type: 'ping' }), HEARTBEAT_MS);
  }
  function stopHeartbeat() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  }

  async function handleRequest(msg) {
    const { reqId, method, path, query, headers, body } = msg;
    let response;
    try {
      response = await engine.handle({ method, path, query, headers, body });
      if (onRequest) {
        try { onRequest({ method, path, status: response.status }); } catch {}
      }
    } catch {
      response = { status: 500, headers: { 'content-type': 'application/json' }, body: { error: 'Workspace failed to handle request' } };
    }
    send({ type: 'response', reqId, status: response.status, headers: response.headers, body: response.body });
  }

  function onMessage(event) {
    let msg;
    try { msg = reassembler.push(event.data); } catch { return; }
    if (!msg) return;
    switch (msg.type) {
      case 'registered':
        attempts = 0;
        setStatus(STATUS.ONLINE);
        break;
      case 'request':
        handleRequest(msg);
        break;
      case 'replaced':
        closedByUser = true; // don't fight the other tab
        setStatus(STATUS.REPLACED);
        try { ws.close(); } catch {}
        break;
      case 'pong':
        break;
      case 'error':
        setStatus(STATUS.OFFLINE);
        break;
      default:
        break;
    }
  }

  function scheduleReconnect() {
    if (closedByUser) return;
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** attempts) * (0.75 + Math.random() * 0.5);
    attempts += 1;
    setStatus(STATUS.RECONNECTING);
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect() {
    if (closedByUser) return;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (typeof WebSocket === 'undefined') { setStatus(STATUS.OFFLINE); return; }

    setStatus(attempts === 0 ? STATUS.CONNECTING : STATUS.RECONNECTING);
    reassembler = new Reassembler();
    try {
      ws = new WebSocket(toWsUrl(getRelayHttpBase(), currentWorkspace));
    } catch {
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      send({ type: 'register', workspace: currentWorkspace });
      startHeartbeat();
    };
    ws.onmessage = onMessage;
    ws.onerror = () => {};
    ws.onclose = () => {
      stopHeartbeat();
      ws = null;
      if (status !== STATUS.REPLACED) scheduleReconnect();
    };
  }

  function close() {
    closedByUser = true;
    stopHeartbeat();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) { try { ws.close(); } catch {} }
    ws = null;
    setStatus(STATUS.OFFLINE);
  }

  function switchWorkspace(newId) {
    currentWorkspace = newId;
    closedByUser = false;
    attempts = 0;
    if (ws) { try { ws.close(); } catch {} ws = null; }
    connect();
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(status);
    return () => listeners.delete(fn);
  }

  return {
    connect,
    close,
    switchWorkspace,
    subscribe,
    getStatus: () => status,
    getHttpBase: getRelayHttpBase,
  };
}

module.exports = { createRelayClient, getRelayHttpBase, STATUS };
