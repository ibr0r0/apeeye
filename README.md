# 🐒 Apeeye

**Apeeye** is a zero-bullshit mock API tool.
Create fake REST endpoints in seconds. No setup. No login. No database.

- Define collections like `/users` or `/posts` and get a live REST URL instantly
- Full GET, POST, PUT, PATCH, DELETE with sensible status codes
- **Your data never leaves your browser.** The server stores nothing.
- Call your endpoints from your app, curl, Postman, or a teammate's machine
- Export and import your whole workspace as JSON

## 📽 Demo

<video src="https://github.com/user-attachments/assets/049737bb-333d-42d5-8c18-15667a7fe080" width="600" autoplay loop muted playsinline></video>

## How it works

Your browser mints a random, unguessable **workspace ID** on first visit and stores
all your collections and records in IndexedDB. A tiny **stateless relay** server
makes them reachable at a real URL:

```
https://<host>/mock/<workspace>/users
```

When anything calls that URL, the relay forwards the request over a WebSocket to
your open tab, the tab answers from IndexedDB, and the relay returns the response.
Nothing is ever written on the server.

**The one trade-off:** endpoints answer only while a tab with your workspace is
open. Close it and callers get a clear `503`. Reopen it and everything is back.

See [`docs/data-storage-issue.md`](docs/data-storage-issue.md) for the full design
and security model.

## ⚙️ Run it locally

```
git clone https://github.com/ibr0r0/apeeye.git
cd apeeye
npm install
cd server && npm install && cd ..
```

**Option A — single process (what production runs):**

```
npm run build:web        # builds the frontend into dist/
npm run server           # relay serves dist/ and the /mock endpoints
```

Open http://localhost:34567.

**Option B — hot-reloading frontend during development:**

```
# terminal 1
npm run server

# terminal 2
npm run web              # Expo dev server on :8081, talks to the relay on :34567
```

The frontend finds the relay automatically when served by it. When running Expo
separately, it defaults to `http://localhost:34567`; override with
`EXPO_PUBLIC_RELAY_URL` (see `.env.example`).

## Usage

1. Open the **Playground**. Your workspace URL is shown at the top; copy it.
2. Add a collection (e.g. `users`). It is a live endpoint immediately.
3. Add records with the field builder or paste raw JSON. Or just `POST` to the URL.
4. Point your app at `https://<host>/mock/<workspace>/users` and fetch.
5. Watch calls arrive in the live **Requests** feed.

```js
const res = await fetch("https://<host>/mock/<workspace>/users");
const users = await res.json();
```

Endpoint reference, examples and limits are in the in-app **Docs** tab.

## 🚀 Deployment

Apeeye is **one service**: the relay serves the built frontend and the `/mock`
endpoints. It needs a long-lived Node process because of WebSockets, so
**serverless hosts (Vercel/Netlify functions) are not supported.** Fly, Railway
and Render work. A `render.yaml` blueprint is included.

Build and start:

```
npm install && npx expo export --platform web && (cd server && npm install)
node server/index.js
```

No disk, no database, no storage env vars. Health check at `/health`. Optional
transport-level tuning (rate limits, timeouts, body caps) is in
`server/.env.example`.

## 🔒 Security

There are no accounts. The workspace ID (10 chars, base62, CSPRNG) is a
capability: anyone with the URL can read and write that workspace. Reset rotates it.

The relay is hardened for public exposure:

- Helmet security headers with a strict CSP; `x-powered-by` disabled
- Per-IP and per-workspace rate limits, body size cap, relayed-frame cap,
  max in-flight requests per workspace, unregistered sockets dropped in 5 s
- A tab can only answer requests for its own workspace; forged replies are ignored
- Dangerous response headers from tabs are stripped (`set-cookie`, CSP, HSTS…)
- Prototype-polluting keys are stripped from every payload
- Nothing is persisted server-side, so there is nothing to leak

This is a mocking tool. Do not put real user data in it.

## 🧪 Tests

```
npm test
```

Unit tests for the shared mock engine, workspace ID and import validation, plus
integration tests that boot the real relay and drive it with a fake tab over
WebSocket. Zero test dependencies; uses Node's built-in runner.

## Tech Stack

- **Frontend:** React Native Web via Expo, IndexedDB, WebSocket
- **Relay:** Express 5 + `ws`, stateless
- **Shared:** a storage-agnostic mock engine used by both the UI and relayed requests

## Roadmap

- [x] Local mock API with a web UI
- [x] Browser-side storage, per-visitor workspaces, stateless relay
- [x] Shareable endpoints with unique URLs
- [x] Import/export workspaces as JSON
- [x] Live request feed
- [ ] Delay and error simulation (e.g. 404, 500, timeout)
- [ ] Testing presets for frontend devs (auth flow, search, pagination)
- [ ] Optional Service Worker mode for fully offline in-page mocking

**Contributions are welcome.** Open an issue or a PR for anything on the list.

## Contributing

- Keep it simple and clean.
- Run `npm test` and make sure the app still works locally.
- If you add a feature, explain it clearly in your PR.

Thanks for helping improve **Apeeye** 🙌

---

- ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
- ![Relay: Express.js](https://img.shields.io/badge/Relay-Express.js-brightgreen)
- ![Frontend: Expo](https://img.shields.io/badge/Frontend-Expo-blue)
- ![Storage: your browser](https://img.shields.io/badge/Storage-your%20browser-yellow)
- ![REST Support](https://img.shields.io/badge/API-RESTful-c42)

---

For support, suggestions, or general inquiries,
please reach out via **X** at [**@ibr0r**](https://x.com/ibr0r).
