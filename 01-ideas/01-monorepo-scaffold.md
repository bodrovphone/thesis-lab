---
title: Monorepo scaffold — NestJS backend + Next.js frontend + Prisma schema
domain: [infra, backend, frontend]
stage: ideas
created: 2026-07-22
---

# Monorepo scaffold — NestJS backend + Next.js frontend + Prisma schema

## Sign-offs
- cursor-grok-4.5 — 2026-07-22 — ideas → specs

## Context

First build task for the mini research tracker. Nothing else is buildable until both services exist and the DB schema can migrate against a real Postgres. No upstream task dependencies; every later adapter/CRUD/AI task depends on this.

Authoritative product architecture is `02-specs/mini-research-tracker-idea.md` (service boundary, persistence concepts, Neon dual-URL guidance). The older Part B draft in `01-ideas/task-pipeline-and-research-tracker-plan.md` supplies a concrete first-pass schema and repo tree to reconcile against that spec — it does not override it.

## Goal

Produce a bootable TypeScript monorepo where:

1. A NestJS API process starts and can talk to Postgres through Prisma.
2. A Next.js App Router app starts as a bare shell (no product pages yet).
3. The first Prisma migration creates the core domain enums/models needed by later tasks.
4. Root hygiene (`.gitignore`, `.env.example`, README quick-start skeleton) exists so subsequent tasks do not reinvent local setup.

Out of scope for this task: business logic, HTTP domain routes beyond Nest's default health/hello, adapters, AI routes, UI features, and any hosted deployment.

## Technical approach

### Service layout (chosen)

Keep the already-approved NestJS + Next.js + Prisma/Postgres split from the master architecture spec.

- **NestJS** owns persistence and (later) domain HTTP. Prisma Client and `schema.prisma` live with the backend service so migrations and the API share one datasource config.
- **Next.js** owns the browser UI and (later) server-only AI orchestration. For this scaffold it is a stock App Router app that boots and can later call the backend only from server code (`BACKEND_URL`, never `NEXT_PUBLIC_*`).
- **Postgres** is the system of record. Local Docker (or any local Postgres) is enough to prove migrate + boot. Neon remains the intended hosted target; env shape should anticipate pooled runtime URL + direct migration URL from day one.

### Monorepo packaging options

| Option | Pros | Cons |
| --- | --- | --- |
| **Separate `backend/` and `frontend/` package.jsons, no root workspace** | Simplest; each service's CLI (`nest`, `next`, `prisma`) stays obvious | Two install/run commands; duplicated TS tooling config |
| **Root npm/pnpm workspaces with convenience scripts** | One `npm i`; unified `dev` scripts | Slightly more root config; must keep workspace boundaries clean |
| **Turborepo / Nx** | Strong caching and task graphs | Heavy for a two-package learning project |

**Recommendation:** start with two independent packages plus a thin root README/`package.json` of convenience scripts only if it stays trivial. Prefer **not** introducing Turborepo/Nx in this task — the learning goal is the FE/BE contract, not a build-orchestrator.

### Database connectivity

Follow Prisma's pooled-vs-direct pattern (also called out in the master architecture spec for Neon):

- Runtime Prisma Client uses a pooled URL (`DATABASE_URL`).
- Migrations / introspection use a direct URL (`DIRECT_URL` / `directUrl` in the datasource).

For local Docker Postgres both values can point at the same non-pooled instance. For Neon they diverge. Document both in `.env.example` so later hosted work does not require reshaping env vars.

### Schema scope for the first migration

Reconcile the Part B draft against the approved persistence model:

**Include now (core product tables):**

- Enums: `ConvictionLevel`, `MoatPattern`, `BusinessModel`, `EnrichmentStatus`, `DataSource`
- Models: `Company`, `Note`, and a cache table for external API payloads (Part B's `ExternalApiCacheEntry` — matches the approved "External Data Cache" concept)

**Defer from the first migration:**

- `tsvector` / GIN full-text columns — the approved spec treats Postgres FTS as optional later enhancement; ordinary indexed filters are enough for the first release. Including `Unsupported("tsvector")` now forces hand-edited migration SQL for a feature this scaffold does not need.
- Any adapter-specific tables beyond the generic cache entry.

**Modeling choices to lock in at specs (without freezing every column name yet):**

- Fixed DB enums for conviction + the two taxonomies (not user-editable lookup tables) — matches the master trade-off: type safety and AI schema constraints over runtime taxonomy editing.
- Unique ticker within the current U.S.-centric scope, with the known limitation that global uniqueness later needs exchange+ticker or a vendor id.
- Cascade delete from Company → Notes so company deletion is explicitly destructive of note history.
- Company-level conviction and persisted "current thesis summary" fields exist on Company even though UI/AI that writes them comes later — later tasks should not need a second schema rewrite for basics.

Exact Prisma field lists, index names, and migration filenames belong in `03-ready`, not here.

### What "boot" means

Success for this task is operational, not product:

- `backend` process listens on a configured port (example: 3001).
- `frontend` process listens on its port (example: 3000).
- `prisma migrate` applies cleanly against local Postgres.
- Prisma Client generates and can be imported from a Nest Prisma module/service stub.
- No requirement that Nest expose company/note controllers yet — empty or hello modules are fine.
- No requirement that Next have dashboard/detail routes yet — default scaffold page is fine.

### Env / secrets hygiene

Root `.env.example` should declare at least: `DATABASE_URL`, `DIRECT_URL`, `BACKEND_URL`, `PORT`, plus placeholders for later keys (`SEC_EDGAR_USER_AGENT`, `FINNHUB_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `ENABLE_ALPHA_VANTAGE`, AI provider key) so subsequent tasks fill values rather than invent env naming. Real secrets stay in gitignored `.env` files only.

### Relationship to later tasks

This scaffold must not preempt vertical-slice work: SEC adapter, company controllers, and real pages land in subsequent tasks. It should, however, make those tasks mechanical (add modules/pages against an existing schema and bootable processes).

## Trade-offs

### Split services vs single Next.js app

Already decided in the master architecture: split is intentional for the learning goal. This scaffold pays the duplicated-config cost up front. Do not collapse to a single service during this task unless the human reopens that product decision.

### Full domain schema now vs incremental migrations per feature

Putting Company/Note/enums/cache in migration #1 means later tasks share one coherent model and avoid thrash. The risk is shipping unused columns early. That risk is acceptable here because the model is already cross-model-approved at the architecture level and is small.

### Local Postgres first vs Neon-required for scaffold

Local-first keeps this task unblocked by account creation. Neon dual-URL env shape is prepared now; creating the Neon project is an Action Item for hosted verification, not a hard gate on "services boot."

### Workspace tooling depth

Minimal root scripts beat introducing a monorepo framework. Revisit only if dual-package DX becomes painful after several tasks.

## Action Items

- Install Node.js LTS locally if not already available; confirm `node`/`npm` (or chosen package manager) work.
- Provide a local Postgres instance for the first migration (Docker Compose Postgres is fine; any reachable Postgres works).
- (Optional for this task, required before hosted integration testing) Create a Neon project and obtain both pooled runtime and direct migration connection strings — same item as in the master architecture Action Items.
- Decide package manager for the repo (`npm`, `pnpm`, or `yarn`) if not already standardized on the machine — see Open Questions.

## Open Questions

1. Package manager for the monorepo: stick with npm, or prefer pnpm/yarn for the two packages?
2. Should the root get npm/pnpm workspaces + convenience `dev` scripts in this task, or keep `backend/` and `frontend/` fully independent until DX friction appears?
3. Is Docker Compose for local Postgres in-repo for this task, or is "any local Postgres URL in `.env`" sufficient documentation?
4. NestJS / Next.js major versions: pin to current stable at implementation time, or intentionally target specific majors for talking-point consistency?

## Research references

- Master architecture: `02-specs/mini-research-tracker-idea.md` — Chosen service boundary, Persistence model, Deployment Approach
- Draft schema / tree: `01-ideas/task-pipeline-and-research-tracker-plan.md` — Data model, Repo scaffold
- [Prisma + Neon / pooled vs direct connections](https://www.prisma.io/docs/orm/overview/databases/neon)
- [Prisma datasource `directUrl` / pooled setup](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [NestJS CLI new project](https://docs.nestjs.com/cli/overview)
- [Next.js App Router getting started](https://nextjs.org/docs/app/getting-started)
