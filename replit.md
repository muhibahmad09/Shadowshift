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
- Required env: `DATABASE_URL` — Postgres connection string (already configured)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After importing/cloning, run `pnpm install` at the repo root before starting workflows — `node_modules` isn't checked in, so `vite`/`esbuild` etc. are missing until installed.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
