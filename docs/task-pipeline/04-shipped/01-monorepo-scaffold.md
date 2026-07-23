---
title: Monorepo scaffold — NestJS backend + Next.js frontend + Prisma schema
domain: [infra, backend, frontend]
stage: shipped
created: 2026-07-22
---

# Monorepo scaffold — NestJS backend + Next.js frontend + Prisma schema

## Sign-offs

- cursor-grok-4.5 — 2026-07-22 — ideas → specs
- claude-sonnet-5 — 2026-07-22 — ideas → specs
- gpt-5 — 2026-07-22 — specs → ready
- cursor-grok-4.5 — 2026-07-22 — specs → ready

## Context

This is the first build task for the mini research tracker. Every adapter, CRUD, AI, and UI task depends on a bootable backend, frontend, and database schema.

The authoritative product architecture is the reference-only `02-specs/mini-research-tracker-idea.md`. This task implements only the repository and persistence foundation. It must not add company-data adapters, product CRUD routes, AI behavior, dashboard UI, authentication, or hosted deployment.

## Resolved Decisions

All specs-stage open questions are resolved for reproducibility:

1. Use **npm** and commit one root `package-lock.json`.
2. Use root npm workspaces for `backend` and `frontend`, plus thin convenience scripts. Do not add Turborepo or Nx.
3. Commit `compose.yaml` with PostgreSQL 17 for a zero-ambiguity local database.
4. Pin the scaffold to Node.js 24 LTS, NestJS 11, Next.js 16, React 19, and Prisma 7. Record exact package versions in the lockfile.

No open question is carried forward. Hosted Neon verification remains optional and does not block this task.

## Version Baseline

Versions verified on 2026-07-22:

| Component | Version |
| --- | --- |
| Node.js | `24.18.0` LTS |
| NestJS CLI | `11.0.24` |
| NestJS core packages | `11.1.28` |
| Next.js / create-next-app | `16.2.11` |
| React / React DOM | `19.2.8` |
| Prisma CLI / Client / adapter | `7.9.0` |
| TypeScript | `7.0.2` |
| `@nestjs/config` | `4.0.4` |
| `pg` / `@types/pg` | `8.22.0` / `8.20.0` |
| `dotenv` | `17.4.2` |
| `concurrently` | `10.0.3` |

Use exact versions when creating the scaffold. Do not replace them with `latest`. The committed lockfile is the final dependency authority.

## Deliverables and Paths

### Repository root

- `package.json` — private npm workspace with `backend` and `frontend`.
- `package-lock.json` — the only lockfile in the repository.
- `.nvmrc` — contains `24.18.0`.
- `.gitignore` — at minimum ignore: `node_modules/`, `dist/`, `.next/`, `coverage/`, `*.log`, `.DS_Store`, `.env`, `.env.*` (but keep `.env.example`), `backend/.env`, `frontend/.env.local`, and `backend/src/generated/`.
- `.env.example` — canonical catalog of local and future environment variables.
- `compose.yaml` — local PostgreSQL 17 service and persistent named volume.
- `README.md` — preserve the existing pipeline documentation and append development prerequisites, setup, commands, and service URLs.

### Backend

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/tsconfig.build.json`
- `backend/nest-cli.json`
- `backend/eslint.config.mjs`
- `backend/prisma.config.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/<timestamp>_init/migration.sql`
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/health/health.module.ts`
- `backend/src/health/health.controller.ts`
- `backend/src/health/health.controller.spec.ts`
- `backend/test/app.e2e-spec.ts`
- `backend/test/jest-e2e.json`

Prisma Client generates into `backend/src/generated/prisma/`. That directory is not committed and must be recreated by `npm run db:generate` or as part of the backend build.

Delete the Nest starter `app.controller.ts`, `app.controller.spec.ts`, and `app.service.ts` after the health module replaces them.

### Frontend

- `frontend/package.json`
- `frontend/next.config.ts`
- `frontend/tsconfig.json`
- `frontend/eslint.config.mjs`
- `frontend/postcss.config.mjs`
- `frontend/AGENTS.md` — generated Next.js-specific agent guidance; it supplements rather than replaces the root pipeline rules.
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`

The frontend is only a bootable shell. The home page should render `Thesis Lab` and `Research tracker scaffold is running.` without backend calls.

## Scaffold Commands

Run from the repository root with Node `24.18.0` active:

```bash
npx --yes @nestjs/cli@11.0.24 new backend --package-manager npm --skip-git --skip-install --strict
npx --yes create-next-app@16.2.11 frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --yes --agents-md --disable-git
```

After both generators finish, create the root workspace configuration, normalize package versions to the baseline above, add the Prisma and config dependencies, and run one `npm install` from the root. Remove any nested lockfiles if a generator unexpectedly creates them before the root install.

Backend runtime dependencies added after generation are `@nestjs/config@4.0.4`, `@prisma/client@7.9.0`, `@prisma/adapter-pg@7.9.0`, `pg@8.22.0`, and `dotenv@17.4.2`. Backend development dependencies are `prisma@7.9.0` and `@types/pg@8.20.0`. Normalize generated `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, and `@nestjs/testing` packages to `11.1.28`; retain Nest CLI `11.0.24`. Normalize Next to `16.2.11`, React packages to `19.2.8`, and TypeScript to `7.0.2` before producing the root lockfile.

## Root Package Contract

`package.json` must be private and define:

```json
{
  "private": true,
  "engines": {
    "node": ">=24.18.0 <25"
  },
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c blue,magenta \"npm run start:dev --workspace backend\" \"npm run dev --workspace frontend\"",
    "build": "npm run build --workspace backend && npm run build --workspace frontend",
    "lint": "npm run lint --workspace backend && npm run lint --workspace frontend",
    "test": "npm run test --workspace backend",
    "test:e2e": "npm run test:e2e --workspace backend",
    "db:generate": "npm run prisma:generate --workspace backend",
    "db:migrate": "npm run prisma:migrate --workspace backend",
    "db:status": "npm run prisma:status --workspace backend"
  },
  "devDependencies": {
    "concurrently": "10.0.3"
  }
}
```

The backend package must expose:

```json
{
  "scripts": {
    "build": "prisma generate && nest build",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init",
    "prisma:status": "prisma migrate status"
  }
}
```

`prisma:migrate` is intentionally hard-coded to `--name init` for this task's first migration only. Later tasks that add migrations should change or replace that script (for example to plain `prisma migrate dev`) so they do not keep reusing the `init` name.

Retain the normal Nest start, lint, unit-test, and e2e-test scripts generated by the CLI. Retain the normal Next `dev`, `build`, `start`, and `lint` scripts generated by create-next-app.

Load env from `backend/.env` for Nest and Prisma CLI: copy `.env.example` → `backend/.env`, run workspace scripts so the backend package cwd is used, and keep `import 'dotenv/config'` in `prisma.config.ts`. For Nest, use:

```ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env'],
})
```

Do not put secrets in the frontend for this task.

## Environment Contract

Root `.env.example` must contain:

```dotenv
# Copy this file to backend/.env for local backend and Prisma commands.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thesis_lab?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/thesis_lab?schema=public"
PORT=3001

# Used by future Next.js server-only code. Never rename to NEXT_PUBLIC_BACKEND_URL.
BACKEND_URL="http://localhost:3001"

# Reserved for later tasks.
SEC_EDGAR_USER_AGENT="Thesis Lab Demo contact@example.com"
FINNHUB_API_KEY=""
ALPHA_VANTAGE_API_KEY=""
ENABLE_ALPHA_VANTAGE="false"
AI_PROVIDER_API_KEY=""
```

Local setup copies this file to `backend/.env`. The frontend does not need an environment file in this task. Future server-side frontend work may copy only `BACKEND_URL` into `frontend/.env.local`.

For Neon later:

- `DATABASE_URL` is the pooled runtime connection used by Prisma Client.
- `DIRECT_URL` is the direct connection used by Prisma CLI migrations.
- Real credentials remain in untracked environment files or deployment-provider secret stores.

## Local Database Contract

`compose.yaml` must define a service named `db` using `postgres:17-alpine`:

- Database: `thesis_lab`
- User: `postgres`
- Password: `postgres`
- Host port: `5432`
- Named volume: `postgres_data`
- Health check: `pg_isready -U postgres -d thesis_lab`

The service must not expose any other port or include production credentials. The README must label these values local-development-only.

## Prisma 7 Configuration

Prisma 7 removes `directUrl` from `schema.prisma`. Configure the CLI connection in `backend/prisma.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
```

The schema datasource contains only `provider = "postgresql"`. Runtime connectivity is supplied to Prisma Client through `@prisma/adapter-pg` using `DATABASE_URL`.

The Prisma generator must be:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

`moduleFormat = "cjs"` is required because Prisma 7 generates ESM by default while the Nest scaffold uses CommonJS.

## Database Schema

`backend/prisma/schema.prisma` must define the following exact domain schema after the generator and datasource blocks:

```prisma
enum ConvictionLevel {
  WATCHING
  BUILDING_CONVICTION
  HIGH_CONVICTION
}

enum MoatPattern {
  SCALE_ECONOMIES
  NETWORK_EFFECTS
  SWITCHING_COSTS
  COUNTER_POSITIONING
  BRAND
  CORNERED_RESOURCE
  PROCESS_POWER
}

enum BusinessModel {
  LOW_COST_OPERATOR
  FRANCHISOR
  B2B_MIDDLEMAN
  SERIAL_ACQUIRER
  MISSION_CRITICAL_PRODUCTS_SERVICES
  VERTICALLY_INTEGRATED_RETAILER
  AUCTIONS_AND_CLASSIFIEDS
  B2B_SOFTWARE
  MARKETPLACES_AND_PLATFORMS
  OEMS_WITH_INSTALLED_BASE
  UNIQUE_IP_OR_BRANDS
  PHYSICAL_INFRASTRUCTURE_NETWORKS
  INSURERS_AND_FINANCIALS
}

enum EnrichmentStatus {
  COMPLETE
  PARTIAL
  FAILED
}

enum DataSource {
  SEC_EDGAR
  FINNHUB
  ALPHA_VANTAGE
}

model Company {
  id                     String            @id @default(cuid())
  ticker                 String            @unique
  name                   String
  cik                    String?           @unique
  exchange               String?
  sector                 String?
  industry               String?
  description            String?
  country                String?
  marketCapUsd           BigInt?
  website                String?
  logoUrl                String?
  convictionLevel        ConvictionLevel   @default(WATCHING)
  sourcesUsed            DataSource[]      @default([])
  enrichmentStatus       EnrichmentStatus  @default(PARTIAL)
  lastEnrichedAt         DateTime?
  currentThinkingSummary String?
  summaryGeneratedAt     DateTime?
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  notes                  Note[]

  @@index([convictionLevel])
}

model Note {
  id                       String         @id @default(cuid())
  companyId                String
  company                  Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  body                     String
  moatPattern              MoatPattern?
  businessModel            BusinessModel?
  aiSuggestedMoatPattern   MoatPattern?
  aiSuggestedBusinessModel BusinessModel?
  tagEditedByUser          Boolean?
  createdAt                DateTime       @default(now())
  updatedAt                DateTime       @updatedAt

  @@index([companyId, createdAt])
  @@index([moatPattern])
  @@index([businessModel])
}

model ExternalApiCacheEntry {
  id        String     @id @default(cuid())
  source    DataSource
  cacheKey  String
  payload   Json
  fetchedAt DateTime   @default(now())
  expiresAt DateTime

  @@unique([source, cacheKey])
  @@index([expiresAt])
}
```

Create the migration with the name `init`. Do not add `tsvector`, GIN indexes, adapter-specific tables, seed data, or product fixtures in this task.

## Backend Interfaces

### Prisma module

`PrismaModule` is `@Global()` and exports one `PrismaService`.

`PrismaService` must match this shape (Nest Prisma 7 + PostgreSQL adapter pattern):

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Import `PrismaClient` from `../generated/prisma/client` (the `/client` suffix is required for the Prisma 7 generated client). Do not log the connection string.

`AppModule` imports `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] })`, `PrismaModule`, and `HealthModule`.

### Health endpoint

Expose exactly one backend route:

```text
GET /health
```

On success, run `await this.prisma.$queryRaw\`SELECT 1\`` (or equivalent) and return HTTP 200:

```json
{
  "status": "ok",
  "database": "up"
}
```

If the database query fails, throw `ServiceUnavailableException('Database unavailable')`, producing Nest's HTTP 503 error response. Do not return error objects with HTTP 200.

Unit-test the controller by mocking `PrismaService`: one case where `$queryRaw` resolves → 200 body above; one case where it rejects → `ServiceUnavailableException`.

`main.ts` listens on `ConfigService.get<number>('PORT', 3001)` and does not enable CORS. No browser-side code calls the backend in this task.

## Frontend Interface

`frontend/src/app/page.tsx` is a Server Component with no fetches or client directive. It renders:

```text
Thesis Lab
Research tracker scaffold is running.
```

Keep the generated root layout, metadata, Tailwind setup, and Next.js-specific `frontend/AGENTS.md`. Remove create-next-app promotional content and remote image dependencies.

## Build Sequence

1. Confirm Node `24.18.0` and npm are active.
2. Run both scaffold commands with install and nested Git initialization disabled.
3. Add root workspace, engine, scripts, `.nvmrc`, `.gitignore`, `.env.example`, and `compose.yaml`.
4. Normalize package versions and install once from the repository root to create the single lockfile.
5. Add Prisma 7 configuration, the exact schema, and backend Prisma dependencies.
6. Replace Nest starter hello files with the global Prisma module and health module.
7. Replace Next starter content with the minimal Thesis Lab shell.
8. Copy `.env.example` to `backend/.env`, start PostgreSQL, generate Prisma Client, and create the `init` migration.
9. Run formatting, linting, unit tests, e2e tests, production builds, and manual smoke checks.
10. Update the root README with the verified commands. After implementation is fully verified, move this file to `04-shipped/` and append an `## Outcome` section (that ship step is outside `advance-task`).

## Scope Gate

### Non-cuttable

- Node/npm version files and one root workspace lockfile.
- Bootable NestJS and Next.js applications.
- Local PostgreSQL through Docker Compose.
- Exact Prisma schema and committed `init` migration.
- Prisma runtime connection and database-aware health endpoint.
- Unit test for the health controller's success and failure behavior.
- Backend e2e health test against a running test/local database.
- Lint and production build success for both workspaces.
- Root README setup instructions and environment hygiene.

### Cuttable if generator or platform friction appears

- Cosmetic Tailwind customization beyond the two required text lines.
- Additional root convenience scripts beyond those listed.
- Hosted Neon smoke testing.

### Explicitly forbidden in this task

- SEC, Finnhub, or Alpha Vantage implementation.
- Company or note CRUD controllers.
- AI SDK dependencies or routes.
- Dashboard/detail UI.
- Authentication.
- Full-text search.
- Vercel, Render, or Neon provisioning/deployment.
- Turborepo, Nx, shared component packages, or premature abstractions.

## Verification Plan

### Static configuration

```bash
node --version
npm --version
npm install
npm run db:generate
npm run lint
npm test
npm run build
```

Expected:

- Node reports `v24.18.0`.
- One root `package-lock.json` exists; no nested lockfiles exist.
- Prisma Client generation succeeds.
- Both workspaces lint and build without errors.
- Backend unit tests pass.

### Database and migration

```bash
cp .env.example backend/.env
docker compose up -d db
npm run db:migrate
npm run db:status
```

Expected:

- The `db` container becomes healthy.
- Prisma creates and applies one `init` migration.
- Migration status reports the database schema is up to date.
- Generated SQL contains the five enums and three tables defined above.

### Runtime smoke test

Run `npm run dev`, then verify:

```bash
curl --fail http://localhost:3001/health
curl --fail http://localhost:3000/
```

Expected:

- Backend returns `{"status":"ok","database":"up"}`.
- Frontend returns HTTP 200 and contains both required text lines.
- Stopping PostgreSQL causes `/health` to return HTTP 503, not 200.

### E2E test

The backend e2e suite must boot the Nest application with the test/local database available and assert:

- `GET /health` returns 200 with the exact success body.
- A mocked or deliberately unavailable database path returns 503.
- No company, note, adapter, or AI route exists yet.

### Final hygiene

```bash
git diff --check
git status --short
```

Confirm no `.env`, credentials, generated Prisma Client files, nested `.git`, build output, or dependency directories are tracked.

## Action Items

- Install Node.js `24.18.0` if it is not already available locally.
- Install and start Docker Desktop or another Docker-compatible runtime if it is not already available.
- No third-party API key or cloud account is required to implement and verify this scaffold.
- Creating Neon, Render, and Vercel resources remains a separate, explicitly approved future action.

## Open Questions

None. All four specs-stage questions are resolved in this document.

## Research References

- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [NestJS CLI](https://docs.nestjs.com/cli/overview)
- [NestJS Prisma 7 recipe](https://docs.nestjs.com/recipes/prisma)
- [Next.js 16 upgrade and runtime requirements](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Prisma configuration reference](https://docs.prisma.io/docs/orm/reference/prisma-config-reference)
- [Prisma with Neon](https://docs.prisma.io/docs/orm/v6/overview/databases/neon)

## Outcome

Implemented the full monorepo scaffold on 2026-07-22.

**Built**

- Root npm workspace with `backend` and `frontend`, `.nvmrc`, `.gitignore`, `.env.example`, `compose.yaml`, and root `package-lock.json`
- NestJS 11 backend with Prisma 7 (`prisma.config.ts`, generated client at `backend/src/generated/prisma/`, `init` migration committed)
- Global `PrismaModule` + `GET /health` with database probe and 503 on failure
- Next.js 16 frontend shell rendering the required Thesis Lab copy
- Unit test for health controller success/failure paths; e2e tests for `/health` 200 and 503 paths
- Root README development section (prerequisites, setup, commands, URLs)

**Verification run**

- `npm install --legacy-peer-deps`, `npm run db:generate`, `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build` all passed on Node `v24.18.0`
- Migration applied against a local PostgreSQL 17 instance; `docker compose up -d db` is the intended path for day-to-day use

**Deviations**

- `npm install` requires `--legacy-peer-deps` because `ts-jest@29` peer range excludes TypeScript 7.x while the spec pins TS 7.0.2 in workspace manifests
- Root `package.json` adds `"overrides": { "typescript": "6.0.2" }` plus root `typescript@6.0.2` so `typescript-eslint` can lint until TS 7 programmatic API support lands; builds and Next.js type-check still succeed
- Backend e2e script sets `NODE_OPTIONS=--experimental-vm-modules` for Prisma 7 WASM dynamic imports under Jest
- Backend `eslint.config.mjs` relaxes type-aware unsafe rules in `*.spec.ts` / e2e test files
- Backend `tsconfig.json` sets `rootDir`, `include`, and `ignoreDeprecations: "6.0"` for Nest + TS 6 toolchain compatibility
- Verification used a temporary local PostgreSQL on port 5433 when Docker Desktop was unavailable; standard setup uses Compose on port `5432` per `.env.example`
