import { DurableObject } from 'cloudflare:workers';
import { LIMITS, json, buildResponse } from './relay-core.js';
import { encodeFrames, Reassembler, MAX_TOTAL_CHARS } from '../shared/wire.js';

function safeSend(ws, obj) {
  try { for (const f of encodeFrames(obj)) ws.send(f); return true; } catch { return false; }
}

export class WorkspaceDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.pending = new Map();
    this.reassemblers = new WeakMap();
    this.hits = [];
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
  }

  get workspace() {
    return this.ctx.id.name;
  }

  active() {
    return this.ctx.getWebSockets().find((w) => w.readyState === 1) || null;
  }

  async fetch(request) {
    if ((request.headers.get('upgrade') || '').toLowerCase() === 'websocket') return this.connect();
    const url = new URL(request.url);
    if (url.pathname === '/relay' && request.method === 'POST') return this.relay(await request.json());
    return json({ error: 'not_found' }, 404);
  }

  connect() {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    for (const old of this.ctx.getWebSockets()) {
      safeSend(old, { type: 'replaced' });
      try { old.close(4002, 'replaced'); } catch {}
    }
    this.failPending(503, { error: 'workspace_offline', hint: 'The workspace tab was replaced' });

    this.ctx.acceptWebSocket(server);
    safeSend(server, { type: 'registered', workspace: this.workspace });
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    if (typeof raw !== 'string') return;
    let r = this.reassemblers.get(ws);
    if (!r) { r = new Reassembler(MAX_TOTAL_CHARS); this.reassemblers.set(ws, r); }

    let msg;
    try { msg = r.push(raw); } catch { try { ws.close(1009, 'too_large'); } catch {} return; }
    if (!msg) return;

    if (msg.type === 'register') {
      if (msg.workspace !== this.workspace) {
        safeSend(ws, { type: 'error', message: 'invalid_workspace' });
        try { ws.close(4001, 'invalid_workspace'); } catch {}
        return;
      }
      safeSend(ws, { type: 'registered', workspace: this.workspace });
      return;
    }
    if (msg.type === 'ping') { safeSend(ws, { type: 'pong' }); return; }
    if (msg.type === 'response') {
      if (ws !== this.active()) return;
      const p = this.pending.get(msg.reqId);
      if (p) p.resolve(msg);
    }
  }

  webSocketClose(ws) {
    if (!this.active()) this.failPending(503, { error: 'workspace_offline', hint: 'The workspace tab disconnected' });
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }

  failPending(status, body) {
    for (const p of this.pending.values()) p.reject(status, body);
    this.pending.clear();
  }

  async relay(msg) {
    const ws = this.active();
    if (!ws) return json({ error: 'workspace_offline', hint: 'Open your Apeeye workspace in a browser tab' }, 503);

    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < LIMITS.workspaceWindowMs);
    if (this.hits.length >= LIMITS.workspaceLimit) {
      return json({ error: 'rate_limited', hint: 'Too many requests to this workspace' }, 429);
    }
    this.hits.push(now);

    if (this.pending.size >= LIMITS.maxInflight) return json({ error: 'too_many_inflight', hint: 'Workspace is busy' }, 429);

    const reqId = crypto.randomUUID();
    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(reqId); resolve({ timeout: true }); }, LIMITS.requestTimeoutMs);
      this.pending.set(reqId, {
        resolve: (m) => { clearTimeout(timer); this.pending.delete(reqId); resolve({ msg: m }); },
        reject: (status, body) => { clearTimeout(timer); this.pending.delete(reqId); resolve({ fail: { status, body } }); },
      });
      if (!safeSend(ws, { type: 'request', reqId, ...msg })) {
        this.pending.get(reqId)?.reject(502, { error: 'workspace_send_failed' });
      }
    });

    if (result.timeout) return json({ error: 'workspace_timeout', hint: 'The workspace tab did not answer in time' }, 504);
    if (result.fail) return json(result.fail.body, result.fail.status);
    return buildResponse(result.msg);
  }
}
