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

### Other commands

| Command | Description |
| --- | --- |
| `npm run build` | Production build for both workspaces |
| `npm run lint` | Lint backend and frontend |
| `npm test` | Backend unit tests |
| `npm run test:e2e` | Backend health endpoint e2e tests |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:status` | Check migration status |
