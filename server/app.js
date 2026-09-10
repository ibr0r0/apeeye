const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');

const WORKSPACE_ID_RE = /^[0-9A-Za-z]{10}$/;

const DEFAULTS = {
  requestTimeoutMs: 2_000,
  registerTimeoutMs: 5_000,
  heartbeatMs: 30_000,
  maxBodySize: '6mb',
  maxRelayBytes: 10 * 1024 * 1024, // max ws frame size
  maxInflightPerWorkspace: 20,
  ipRateLimitMax: 600,
  workspaceRateLimitMax: 300,
  rateLimitWindowMs: 15 * 60 * 1000,
  staticDir: path.join(__dirname, '..', 'dist'),
  trustProxy: 1,
  log: () => {},
};

const STRIPPED_RESPONSE_HEADERS = new Set([
  'set-cookie', 'transfer-encoding', 'connection', 'content-length',
  'content-encoding', 'keep-alive', 'upgrade', 'host',
  'strict-transport-security', 'content-security-policy',
  'content-type', 'content-disposition', 'location', 'refresh',
  'x-frame-options', 'x-content-type-options', 'link',
]);

function createRelayServer(options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const app = express();
  const server = http.createServer(app);

  const sockets = new Map();

  const pending = new Map();

  const inflight = new Map();

  app.disable('x-powered-by');
  if (opts.trustProxy !== false) app.set('trust proxy', opts.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'connect-src': ["'self'", 'ws:', 'wss:'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'style-src': ["'self'", "'unsafe-inline'"],
          'script-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'apeeye-relay', workspacesOnline: sockets.size });
  });

  const mockRouter = express.Router({ mergeParams: true });

  mockRouter.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 600,
    })
  );

  mockRouter.use(
    rateLimit({
      windowMs: opts.rateLimitWindowMs,
      max: opts.ipRateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'rate_limited', hint: 'Too many requests from this address' },
    })
  );
  mockRouter.use(
    rateLimit({
      windowMs: opts.rateLimitWindowMs,
      max: opts.workspaceRateLimitMax,
      standardHeaders: false,
      legacyHeaders: false,
      keyGenerator: (req) => `ws:${req.params.workspace}`,
      message: { error: 'rate_limited', hint: 'Too many requests to this workspace' },
    })
  );

  mockRouter.use(express.json({ limit: opts.maxBodySize, strict: false, type: ['application/json', 'application/*+json'] }));

  mockRouter.all(/.*/, (req, res) => {
    const workspace = req.params.workspace;
    if (!WORKSPACE_ID_RE.test(workspace)) {
      return res.status(404).json({ error: 'not_found' });
    }

    const ws = sockets.get(workspace);
    if (!ws || ws.readyState !== ws.OPEN) {
      return res.status(503).json({
        error: 'workspace_offline',
        hint: 'Open your Apeeye workspace in a browser tab',
      });
    }

    const current = inflight.get(workspace) || 0;
    if (current >= opts.maxInflightPerWorkspace) {
      return res.status(429).json({ error: 'too_many_inflight', hint: 'Workspace is busy' });
    }
    inflight.set(workspace, current + 1);

    const reqId = crypto.randomUUID();
    const [relPath, qs] = req.url.split('?');
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    const headers = {
      'content-type': req.headers['content-type'],
      accept: req.headers.accept,
      'user-agent': req.headers['user-agent'],
    };

    const finish = () => {
      pending.delete(reqId);
      inflight.set(workspace, Math.max(0, (inflight.get(workspace) || 1) - 1));
    };

    const timer = setTimeout(() => {
      finish();
      if (!res.headersSent) {
        res.status(504).json({ error: 'workspace_timeout', hint: 'The workspace tab did not answer in time' });
      }
    }, opts.requestTimeoutMs);

    pending.set(reqId, {
      workspace,
      timer,
      resolve: (msg) => {
        clearTimeout(timer);
        finish();
        if (res.headersSent) return;
        let status = Number.isInteger(msg.status) && msg.status >= 100 && msg.status <= 599 ? msg.status : 502;
        if (status >= 300 && status <= 399) status = 502;
        if (msg.headers && typeof msg.headers === 'object') {
          for (const [k, v] of Object.entries(msg.headers)) {
            const key = String(k).toLowerCase();
            if (STRIPPED_RESPONSE_HEADERS.has(key)) continue;
            if (typeof v !== 'string' && typeof v !== 'number') continue;
            try { res.setHeader(key, String(v)); } catch { /* skip invalid header */ }
          }
        }
        res.status(status).type('application/json');
        if (msg.body === undefined) return res.end();
        res.json(msg.body);
      },
      reject: (status, body) => {
        clearTimeout(timer);
        finish();
        if (!res.headersSent) res.status(status).json(body);
      },
    });

    try {
      ws.send(JSON.stringify({
        type: 'request',
        reqId,
        method: req.method,
        path: relPath || '/',
        query,
        headers,
        body: req.body,
      }));
    } catch {
      pending.get(reqId)?.reject(502, { error: 'workspace_send_failed' });
    }
  });

  app.use('/mock/:workspace', mockRouter);

  app.all(/^\/api(\/.*)?$/, (req, res) => res.status(410).json({ error: 'gone', hint: 'Apeeye no longer stores data server-side' }));

  if (opts.staticDir && fs.existsSync(opts.staticDir)) {
    const noCache = (res) => res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    app.use(express.static(opts.staticDir, {
      index: 'index.html',
      maxAge: '1y',
      setHeaders: (res, filePath) => { if (filePath.endsWith('.html')) noCache(res); },
    }));
    app.get(/.*/, (req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/mock/') || req.path === '/ws') return next();
      noCache(res);
      res.sendFile(path.join(opts.staticDir, 'index.html'));
    });
  }

  app.use((req, res) => res.status(404).json({ error: 'not_found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'payload_too_large' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
    opts.log('error', err);
    res.status(500).json({ error: 'internal_error' });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: opts.maxRelayBytes });

  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { /* fallthrough */ }
    if (pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  function failPendingFor(workspace, status, body) {
    for (const [id, p] of pending) {
      if (p.workspace === workspace) p.reject(status, body);
      pending.delete(id);
    }
  }

  function unregister(ws) {
    const id = ws.workspace;
    if (id && sockets.get(id) === ws) {
      sockets.delete(id);
      inflight.delete(id);
      failPendingFor(id, 503, { error: 'workspace_offline', hint: 'The workspace tab disconnected' });
    }
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.workspace = null;

    const registerTimer = setTimeout(() => {
      if (!ws.workspace) ws.close(4000, 'register_timeout');
    }, opts.registerTimeoutMs);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'register') {
        const id = msg.workspace;
        if (!WORKSPACE_ID_RE.test(String(id))) {
          ws.send(JSON.stringify({ type: 'error', message: 'invalid_workspace' }));
          ws.close(4001, 'invalid_workspace');
          return;
        }
        clearTimeout(registerTimer);
        const previous = sockets.get(id);
        if (previous && previous !== ws) {
          try { previous.send(JSON.stringify({ type: 'replaced' })); } catch { /* ignore */ }
          previous.workspace = null; // so its close handler skips unregister
          try { previous.close(4002, 'replaced'); } catch { /* ignore */ }
        }
        ws.workspace = id;
        sockets.set(id, ws);
        ws.send(JSON.stringify({ type: 'registered', workspace: id }));
        return;
      }

      if (msg.type === 'ping') {
        ws.isAlive = true;
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'response') {
        const p = pending.get(msg.reqId);
        if (!p) return;
        if (p.workspace !== ws.workspace) return; // never answer another workspace's request
        p.resolve(msg);
        return;
      }
    });

    ws.on('close', () => { clearTimeout(registerTimer); unregister(ws); });
    ws.on('error', () => {});
  });

  const sweep = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) { ws.terminate(); continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch { /* ignore */ }
    }
  }, opts.heartbeatMs);
  sweep.unref?.();

  function close() {
    clearInterval(sweep);
    for (const p of pending.values()) clearTimeout(p.timer);
    pending.clear();
    for (const ws of wss.clients) { try { ws.terminate(); } catch { /* ignore */ } }
    return new Promise((resolve) => {
      wss.close(() => server.close(() => resolve()));
    });
  }

  return { app, server, wss, sockets, close, options: opts };
}

module.exports = { createRelayServer, WORKSPACE_ID_RE };
