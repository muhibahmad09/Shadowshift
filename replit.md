# ShadowShift

A neon-styled arcade game ("slip between light and shadow") with a Vite-based game client, an Express API server, and Postgres/Drizzle for persistence.

## Run & Operate

- The game, API server, and mockup/canvas preview all run as Replit workflows and start automatically — no manual run command needed.
- `pnpm --filter @workspace/shadowshift run dev` — run the game client directly if needed
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (runtime-managed by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + ws (WebSocket rooms)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/shadowshift/` — Vite game client (vanilla JS, Canvas 2D)
- `artifacts/api-server/` — Express API + WebSocket multiplayer server
- `artifacts/api-server/src/multiplayer/` — room manager + WS server
- `artifacts/shadowshift/game/multiplayerClient.js` — WS client wrapper
- `artifacts/shadowshift/game/multiplayerLobbyPanel.js` — lobby UI
- `artifacts/shadowshift/game/multiplayerPlayScene.js` — multiplayer game scene
- `artifacts/shadowshift/game/ghostPlayer.js` — remote player rendering with interpolation
- `lib/db/src/schema/` — DB schema (Drizzle)
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- **Multiplayer authority**: each client simulates their own physics (no server authority). The server relays 20 Hz position snapshots between players. Collisions and scoring are client-side; server only tracks alive/dead state and final scores.
- **Interpolation**: ghost players render 100 ms behind wall clock by buffering received snapshots and interpolating between the two that straddle the render time, smoothing over network jitter.
- **Single-player untouched**: `PlayScene` is unchanged. `MultiplayerPlayScene` extends it; the two share the same game loop and physics code.
- **WebSocket endpoint**: `wss://<host>/api/ws` — attached to the Express HTTP server's upgrade event; routed by the Replit proxy via the `/api` path prefix.
- **Room codes**: 4-char alphanumeric (no ambiguous chars O/0/I/1), generated server-side, in-memory only.

## Product

- Single-player endless runner with Light/Shadow world-switching mechanic, obstacle dodging, coin collection, shop, missions, and achievements.
- Online multiplayer: up to 4 players per room, room codes for joining, live ghost rendering of all players, last-one-standing race with final leaderboard.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After importing/cloning, run `pnpm install` at the repo root before starting workflows — `node_modules` isn't checked in.
- The `@workspace/api-zod` and `@workspace/db` libs need `tsc --build` at the root before the api-server typecheck will pass (pre-existing, doesn't affect runtime).
- `bufferutil` and `utf-8-validate` are optional native deps for `ws` — they're already in the esbuild external list and ws works fine without them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
