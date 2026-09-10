# Changelog

All notable changes to Apeeye are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.0.0] - 2026-09-10

A ground-up rewrite. The server no longer stores anything: every visitor's
data lives in their own browser, and a stateless relay makes their endpoints
reachable at a real URL. The interface was redesigned from scratch.

### Added
- **Browser-side workspaces.** Each visitor gets a random, unguessable
  10-character workspace ID on first visit, kept in localStorage. All
  collections and records are stored in IndexedDB.
- **Stateless relay server.** Requests to `/mock/<workspace>/*` are forwarded
  over WebSocket to the tab that owns the workspace, and its answer is
  returned to the caller. Endpoints are callable from any app, curl or Postman.
- **Shared mock engine** (`shared/mockEngine.js`) used by both the UI and
  relayed requests, so page behaviour and endpoint behaviour can't drift.
  Supports `GET`, `POST`, `PUT`, `PATCH` and `DELETE` with proper status codes
  (404, 405, 413, 422, 429).
- **Export and import** of the whole workspace as JSON, entirely client-side.
- **Live request feed** showing calls to your endpoints as they arrive.
- **Multi-tab handling.** The newest tab wins; the older one is told it was
  replaced and can take back over in one click.
- **Connection status** indicator with automatic reconnect and backoff.
- **Redesigned interface.** System typography, pill controls, inset grouped
  lists, a floating frosted navigation bar, light and dark themes, real SVG
  icons, toasts, empty states, inline copy confirmation, and a responsive
  three, two or one column layout.
- **Motion, used sparingly.** A staged hero entrance on the Home page, a flash
  when a live request lands, a settle-in when a record is created, and a
  circular reveal that expands from the button when switching themes.
- **Raw JSON mode** in the record form alongside the field builder, plus a
  `json` field type for nested values.
- **Test suite** using Node's built-in runner: unit tests for the engine,
  workspace ID generation and import validation, and integration tests that
  boot the real relay and drive it with a fake tab over WebSocket.
  Run with `npm test`.
- **Health endpoint** at `/health` and a Render blueprint (`render.yaml`).
- In-app Docs page covering endpoints, examples, limits and the security model.

### Changed
- Endpoint URLs now include the workspace ID:
  `https://<host>/mock/<workspace>/users`.
- The relay serves the built frontend, so Apeeye deploys as a single
  long-lived Node service. Serverless hosts (Vercel/Netlify functions) are
  not supported; Fly, Railway and Render are.
- The HTML shell is never cached, so a new deploy is picked up on the next
  refresh. Hashed bundles cache for a year.
- The record form sizes itself from its container rather than the window.
- Removed the deprecated image-picker API usage and added a client-side
  image size cap.
- README and `docs/data-storage-issue.md` rewritten for the new design.

### Removed
- **All server-side persistence.** `db.json`, `DB_PATH`, atomic-write code and
  the `/api/endpoints` routes are gone. `/api/*` now returns `410 Gone`.
- The `netlify.toml` frontend-only deployment config.
- A stray Python virtual environment that had been committed to the repo.

### Security
- Relayed responses are always served as `application/json`. Dangerous
  headers from a tab (`content-type`, `location`, `set-cookie`, CSP, HSTS and
  others) are stripped, and redirect statuses are neutralised, so a workspace
  owner cannot render HTML or redirects on the app's origin.
- A socket can only answer requests addressed to its own workspace; forged
  replies from other sockets are ignored.
- Malformed header values from a tab are skipped instead of crashing the relay.
- Helmet with a strict Content Security Policy allowing only same-origin
  scripts and `ws`/`wss` connections; `x-powered-by` disabled.
- Per-IP and per-workspace rate limits, request body cap, cap on relayed
  frame size, maximum in-flight requests per workspace, and sockets that
  never register are dropped after five seconds.
- Prototype-polluting keys (`__proto__`, `constructor`, `prototype`) are
  stripped from every payload, on both the relay and import paths.
- Workspace IDs are generated with a cryptographic random source using
  rejection sampling to avoid modulo bias.
- Cleared all npm audit advisories in the server dependencies.

## [1.0.0] - 2025-08-06

Initial release.

### Added
- Local mock API server (Express) storing collections and records in a
  single `db.json` file.
- Web interface (Expo / React Native Web) for creating collections and
  adding, editing and deleting records as JSON.
- Dynamic field builder for records and base64 image upload.
- Light and dark theme toggle.
- Demo video and MIT license.


