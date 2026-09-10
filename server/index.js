const { createRelayServer } = require('./app');

const PORT = Number(process.env.PORT || 34567);

const relay = createRelayServer({
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 2000),
  maxBodySize: process.env.MAX_BODY_SIZE || '6mb',
  ipRateLimitMax: Number(process.env.RATE_LIMIT_MAX || 600),
  workspaceRateLimitMax: Number(process.env.WORKSPACE_RATE_LIMIT_MAX || 300),
  maxInflightPerWorkspace: Number(process.env.MAX_INFLIGHT || 20),
  log: (level, err) => console.error(`[${level}]`, err?.message || err),
});

relay.server.listen(PORT, () => {
  console.log(`✅ Apeeye relay ready at http://localhost:${PORT}`);
  console.log('   storage: none (workspaces live in the browser)');
});

function shutdown() {
  console.log('\nshutting down…');
  relay.close().then(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
