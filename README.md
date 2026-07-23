# thesis-lab

An agent-assisted task pipeline for turning rough ideas into implementation-ready work and preserving what shipped.

## Pipeline

| Folder | Purpose |
| --- | --- |
| `01-ideas/` | Raw ideas, research notes, and rough plans |
| `02-specs/` | Technical approaches, trade-offs, action items, and open questions |
| `03-ready/` | Fully actionable implementation tasks with verification plans |
| `04-shipped/` | Completed work with outcomes and links |

The authoritative workflow, frontmatter convention, and two-model sign-off gate live in [`AGENTS.md`](AGENTS.md). Read it before creating, advancing, or shipping a task.

## Agent support

Claude Code, Codex, and Cursor expose the same `advance-task` workflow through thin, repository-scoped adapters:

- Claude Code: `.claude/skills/advance-task/SKILL.md`
- Codex: `.agents/skills/advance-task/SKILL.md`
- Cursor: `.cursor/skills/advance-task/SKILL.md`

In Claude Code, invoke `/advance-task <task-path>`. In Codex, ask it to advance the named task or explicitly mention `$advance-task`. In Cursor, ask to advance/promote the named task (the project skill is auto-discovered), or `@` the skill if you want to force it.

All three adapters delegate to `AGENTS.md`; none define their own transition rules. Cursor also has always-apply / path-scoped rules under `.cursor/rules/` that point at the same pipeline without duplicating procedure.

## Sign-off rule

Moving a task from ideas to specs or from specs to ready requires approvals from two genuinely different models. The first model elevates and signs the content; the second reviews it, adds a distinct sign-off, and moves the file if it approves.

## Development

Monorepo layout: `backend/` (NestJS + Prisma) and `frontend/` (Next.js). **Run everything from the repository root** — workspace scripts start both apps together.

The generator READMEs under `backend/README.md` and `frontend/README.md` are Nest/Next defaults. **This file is the source of truth** for local setup and day-to-day commands.

### What runs where

| Piece | Local runtime | Notes |
| --- | --- | --- |
| Frontend (Next.js) | `npm run dev` → http://localhost:3000 | Not containerized |
| Backend (NestJS) | `npm run dev` → http://localhost:3001 | Not containerized |
| PostgreSQL | Docker Compose **or** any Postgres you configure | Only the database uses Docker in this repo; deployment later uses hosted services (Neon, Vercel, Render, etc.) |

### Prerequisites

- Node.js `24.18.0` — run `nvm use` (reads `.nvmrc`)
- npm (workspaces at the repo root)
- **A PostgreSQL database** — either:
  - **Option A:** Docker, to run `compose.yaml` (local Postgres only), or
  - **Option B:** a hosted dev database (e.g. Neon) — set `DATABASE_URL` and `DIRECT_URL` in `backend/.env`

### First-time setup

From the repository root:

```bash
nvm use
cp .env.example backend/.env
npm install --legacy-peer-deps
npm run db:generate
```

**Database (pick one):**

```bash
# Option A — local Postgres via Docker Compose (dev credentials only)
docker compose up -d db
npm run db:migrate

# Option B — hosted Postgres (Neon, etc.)
# Edit backend/.env with your DATABASE_URL and DIRECT_URL, then:
npm run db:migrate
```

If you use Option A, `compose.yaml` and `.env.example` use `postgres` / `postgres`, database `thesis_lab`, port `5432`. These values are for local development only.

### Run both services locally

```bash
npm run dev
```

This starts the backend and frontend concurrently:

- Frontend: http://localhost:3000
- Backend health check: http://localhost:3001/health — expect `{"status":"ok","database":"up"}` when Postgres is reachable

Stop with `Ctrl+C`.

To run a single workspace instead:

```bash
npm run start:dev --workspace backend
npm run dev --workspace frontend
```

### Deployments

- Frontend (Vercel): https://thesis-lab-frontend.vercel.app
- Backend (Render): https://thesis-lab-backend-s8dj.onrender.com
- Backend health check: https://thesis-lab-backend-s8dj.onrender.com/health

For deployed frontend server-side calls, set `BACKEND_URL=https://thesis-lab-backend-s8dj.onrender.com` in Vercel and in local `frontend/.env.local` when you want the frontend to call the deployed backend.

### Backend notes (auth, errors, bootstrap)

- **No auth by design** — single-user research demo; API writes are open. See `backend/README.md`.
- **Prisma → HTTP mapping** — `P2002` → 409, `P2025` → 404; unexpected DB errors are not masked as 404 (`prisma-errors.ts`).
- **Shared Nest bootstrap** — `configureApp` applies `ValidationPipe` (+ optional `CORS_ORIGIN`) for both `main.ts` and e2e so test/prod wiring does not drift.

### Frontend data & state

Intentional split — no global client store (Redux/Zustand):

| Concern | Approach |
| --- | --- |
| Remote list/detail data | React Server Components fetch via `backend-client`; mutations call `router.refresh()` to revalidate |
| Shareable dashboard filters | URL search params (bookmarkable, no client cache needed) |
| Ephemeral UI (forms, drafts) | Local `useState` |
| Client islands (search, notes, enrichment, summary, conviction) | TanStack Query for request lifecycle, caching, cancellation, and optimistic note/conviction updates |

TanStack Query is scoped to interactive client components only — not a second source of truth for RSC pages. Shared browser → `/api/*` calls go through `frontend/src/lib/api/client-fetch.ts`.

### Product talking points

- Thesis-first company workspace: conviction, research notes, moat patterns, business models, and current-thinking synthesis live together.
- Source-aware enrichment: SEC EDGAR and Finnhub provide the core profile, with Alpha Vantage as an optional enrichment source.
- Resilient external calls: provider requests use timeouts, pacing/budget controls, normalized outcomes, and safe structured logs.
- Astryx Neutral UI: the dashboard uses Astryx reset/theme/card/badge/skeleton primitives alongside Tailwind for a consistent, accessible research workspace.
- Honest states: partial or failed enrichment stays visible and can be retried without losing notes; activity surfaces the company’s research trail.
- Frontend data layer: RSC for server-owned reads, URL for filters, TanStack Query on client islands with optimistic note mutations — no global store.

### Other commands

| Command | Description |
| --- | --- |
| `npm run build` | Production build for both workspaces |
| `npm run lint` | Lint backend and frontend |
| `npm test` | Backend + frontend unit tests |
| `npm run test --workspace frontend` | Frontend Vitest + RTL suite |
| `npm run test:watch --workspace frontend` | Frontend Vitest watch mode |
| `npm run test:e2e` | Backend health endpoint e2e tests |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:status` | Check migration status |
