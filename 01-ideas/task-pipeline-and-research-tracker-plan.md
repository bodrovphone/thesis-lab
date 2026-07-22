---
title: Task Pipeline + Mini Research Tracker Plan
domain: [backend, frontend, infra]
stage: ideas
created: 2026-07-22
---

# thesis-lab: Task Pipeline + Mini Research Tracker

## Sign-offs

## Context
This session started as a build of a "mini research tracker" app — a personal hobby project to practice full-stack + AI-integration architecture end to end. Mid-session the user paused that build to first formalize their own agentic working process, so that this and future work flows through a consistent pipeline rather than being built ad hoc. The plan below has two parts:

- **Part A** (do now): scaffold the task pipeline itself — folders, a `CLAUDE.md`/`AGENTS.md` describing the flow, and a skill that advances a task file between stages.
- **Part B** (seed content, not built yet): the mini research tracker design, already fully worked out in this session. Once Part A exists, this becomes the pipeline's first real item — the existing `mini-research-tracker-idea.md` moves into `01-ideas/` as-is, and the detailed design in Part B is available to seed `02-specs/` or `03-ready/` directly (or the user can run it through `/advance-task` from scratch to compare against a from-scratch elevation).

## Part A: Task pipeline scaffolding

### Folder structure (confirmed with user)
```
thesis-lab/
  01-ideas/     # raw ideas, research notes, rough plans — unrefined, can be a paragraph
  02-specs/     # deep technical detail: architecture/approach, trade-offs, action items, open questions
  03-ready/     # implementation-ready: file paths, schema/endpoints, sequencing, verification plan
  04-shipped/   # completed tasks, with an appended "## Outcome" section
  CLAUDE.md     # Claude-Code-specific pointer to AGENTS.md + the advance-task skill
  AGENTS.md     # tool-agnostic canonical description of the pipeline + advance-task procedure
  .claude/
    skills/
      advance-task/
        SKILL.md
```
Each of the three empty folders (`02-specs/`, `03-ready/`, `04-shipped/`) gets a short `README.md` explaining its purpose, since git doesn't track empty directories and this doubles as in-repo documentation.

### Frontmatter convention (every task file)
```yaml
---
title: <short title>
domain: [backend]   # any combination of: backend, frontend, infra
stage: ideas        # ideas | specs | ready | shipped — kept in sync with folder location
created: YYYY-MM-DD
---
```
Domain is metadata, not a folder split — avoids a combinatorial folder tree for BE/FE/Infra/combinations. "no matter" per the user — a task can carry one domain or several.

### Stage transitions
- **`01-ideas` → `02-specs`** and **`02-specs` → `03-ready`**: done via the `/advance-task` skill. Elevates the file's content to the next stage's bar, updates frontmatter, `git mv`s it forward.
- **`03-ready` → `04-shipped`**: NOT a skill call — this happens only after the task is actually implemented (a normal build/plan session). Once built and verified, move the file and append an `## Outcome` section (what shipped, deviations from spec, commit/PR links).
- **No automated cross-model verification** is built into `/advance-task` — confirmed with the user. If they want a second model's opinion on a draft before treating a stage as final, that's a manual step they do themselves (e.g. paste the draft to another model). Agents should never assume a file was externally verified just because it changed folders.

### `/advance-task` skill design
Location: `.claude/skills/advance-task/SKILL.md` (repo-scoped). A tool-agnostic version of the same procedure lives in `AGENTS.md` at the repo root, so any LLM coding agent (not just Claude Code) can follow it.

Behavior when invoked on a target file:
1. Read the file + frontmatter; infer current stage from which folder it's in (`01-ideas`, `02-specs`, or `03-ready` — refuse/no-op if invoked on `04-shipped`).
2. Infer/update `domain: [...]` frontmatter from content if not already set.
3. Apply stage-appropriate elevation:
   - **ideas → specs**: research the technical approach (architecture options, trade-offs where relevant — the equivalent of a Plan-mode research+design pass). Add an explicit `## Action Items` section for anything needing manual/external setup (create an account, register an app in a browser console, obtain an API key — things a coding agent can't do autonomously). Add an `## Open Questions` section for anything only the user can decide. Deliberately stop short of file-level implementation specifics — that's the next stage.
   - **specs → ready**: finalize into a fully actionable technical task — concrete file paths/modules, schema/endpoint/interface definitions, build sequencing, a cuttable/non-cuttable split if relevant, and a verification section. Should read like something an implementer (human or agent) could execute with zero further clarification; resolve or explicitly carry forward any unresolved `## Open Questions` from the specs stage.
4. `git mv` the file into the destination folder, preserving filename; update `stage:` frontmatter to match.
5. Report a short summary: what was added, what's still open, where the file now lives.

### Sequencing for Part A
1. Save this plan as `01-ideas/task-pipeline-and-research-tracker-plan.md` (this file).
2. Create `01-ideas/`, `02-specs/`, `03-ready/`, `04-shipped/` (latter three get a short `README.md`).
3. `git mv mini-research-tracker-idea.md 01-ideas/mini-research-tracker-idea.md`, add frontmatter (`stage: ideas`, `domain: [backend, frontend, infra]`).
4. Write `AGENTS.md` (tool-agnostic canonical process doc) and `CLAUDE.md` (Claude-Code-specific pointer) at repo root.
5. Write `.claude/skills/advance-task/SKILL.md`.
6. Commit the scaffolding (ask user before the actual `git commit`, per standing git-safety rules — this is the first commit in the repo).

### Verification for Part A
- `ls` the repo root — confirm the 4 folders + `AGENTS.md` + `CLAUDE.md` + `.claude/skills/advance-task/SKILL.md` exist, and `mini-research-tracker-idea.md` now lives under `01-ideas/`.
- Invoke `/advance-task 01-ideas/mini-research-tracker-idea.md` and confirm it produces a `02-specs/` version with Action Items + Open Questions sections, and the file is gone from `01-ideas/`.
- Re-read `AGENTS.md`/`CLAUDE.md` in a fresh context to sanity-check the flow is understandable without this conversation's history.

---

## Part B: Mini Research Tracker design (seed content for the pipeline, not built now)

A personal hobby project to anchor practice with architecture, trade-off decisions, and system design end to end. The original planning doc (`mini-research-tracker-idea.md`, moved to `01-ideas/` per Part A) describes a "mini research tracker": a personal notebook for tracking how an investor's thesis on a company evolves over time, tagged using a fixed taxonomy of moat and business-model patterns, with two AI-assisted features (tag suggestion, on-demand thesis summary). It intentionally leans into that domain and into "AI tools that help investors learn about businesses," not just a generic CRUD app.

Two decisions already confirmed with the user:
1. **Data sources**: 2-3 public company-data APIs fetched **in parallel**, merged into the richest possible unified profile, with graceful fallback if a source errors/has no data.
2. **Auth**: skipped entirely — single implicit user.

One more confirmed via live research: a real public moat/business-model taxonomy used by investment research platforms is **two independent dimensions**, not one flat list:
- **Moat** (Helmer's 7 Powers): Scale Economies, Network Effects, Switching Costs, Counter-Positioning, Brand, Cornered Resource, Process Power
- **Business Model** (13 tags): Low Cost Operator, Franchisor, B2B Middleman, Serial Acquirer, Mission Critical Products & Services, Vertically Integrated Retailer, Auctions & Classifieds, B2B Software, Marketplaces and Platforms, OEMs with an Installed Base, Unique IP or Brands, Physical Infrastructure & Networks, Insurers & Financials

The user chose to mirror this faithfully (two optional tag fields per note) — a stronger "I actually researched your product" talking point than the doc's simplified single-enum example.

### External data sources
Three adapters, asymmetric roles:
- **SEC EDGAR** — no API key, but requires a custom `User-Agent` header; ~10 req/sec/IP. Always-on. Supplies `cik`, legal name, exchange, SIC industry code (fallback industry signal).
- **Finnhub** — API key required, 60 req/min free tier. Always-on. Supplies `logo`, `website`, `marketCapitalization`, `finnhubIndustry`, `country` — richest single source.
- **Alpha Vantage** — API key required, **25 req/day** free tier (hard cap). Budget-gated, "add-only" enrichment (never called during search-as-you-type), feature-flagged via `ENABLE_ALPHA_VANTAGE`. Supplies the only real free-text `description` and GICS-like sector/industry.

Design:
- **Search** (`GET /companies/search-external?q=`): SEC's `company_tickers.json` (fetched once, cached 24h, local substring match) run in parallel with Finnhub `/search`. Alpha Vantage excluded (budget protection).
- **Add** (`POST /companies`): given a resolved ticker, fires all enabled adapters via `Promise.allSettled`, each wrapped to never throw (`{source, status: 'ok'|'error'|'timeout'|'rate_limited', data?}`), each with a 5s `AbortController` timeout.
- **Merge**: pure, unit-testable `mergeCompanyProfile(results)` function with per-field source precedence. If all sources fail, persist a bare row from user input with `enrichmentStatus: 'FAILED'` rather than hard-failing, plus a `POST /companies/:id/refresh-enrichment` retry endpoint.
- **Caching/rate-limiting**: in-memory `CompanyDataCacheService` (TTL per source) + a `RateLimiterService` enforcing Alpha Vantage's daily cap (budget to ~20/day for safety margin) and a min-interval queue for SEC.

### Data model (Prisma + Postgres, Neon-compatible)
```prisma
enum ConvictionLevel { WATCHING BUILDING_CONVICTION HIGH_CONVICTION }

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

enum EnrichmentStatus { COMPLETE PARTIAL FAILED }
enum DataSource { SEC_EDGAR FINNHUB ALPHA_VANTAGE }

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
  sourcesUsed            DataSource[]
  enrichmentStatus       EnrichmentStatus  @default(PARTIAL)
  lastEnrichedAt         DateTime?
  currentThinkingSummary String?           // overwritten on regenerate, not versioned
  summaryGeneratedAt     DateTime?
  searchVector           Unsupported("tsvector")?
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  notes                  Note[]

  @@index([convictionLevel])
  @@index([searchVector], type: Gin)
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
  tagEditedByUser          Boolean?       // AI-vs-human agreement rate talking point
  searchVector             Unsupported("tsvector")?
  createdAt                DateTime       @default(now())
  updatedAt                DateTime       @updatedAt

  @@index([companyId, createdAt])
  @@index([moatPattern])
  @@index([businessModel])
  @@index([searchVector], type: Gin)
}

model ExternalApiCacheEntry {
  id        String     @id @default(cuid())
  source    DataSource
  cacheKey  String
  payload   Json
  fetchedAt DateTime   @default(now())
  expiresAt DateTime

  @@unique([source, cacheKey])
}
```
Native Postgres enums over a lookup table: both dimensions are small, fixed, curated sets (not user-editable), so enums give compile-time TS safety end-to-end and the same value lists double as the Zod enums for the AI route. Trade-off (adding a value later needs a migration) is worth naming verbally, not solving now.

`tsvector` columns: `Unsupported("tsvector")` only reserves the column type — the `GENERATED ALWAYS AS (to_tsvector(...)) STORED` expression and GIN index are added by hand-editing the migration SQL after `prisma migrate dev --create-only`.

### NestJS backend
```
backend/
  src/
    main.ts
    app.module.ts
    prisma/prisma.module.ts, prisma.service.ts
    companies/
      companies.module.ts / .controller.ts / .service.ts   // persistence only
      dto/create-company.dto.ts (ticker), update-company.dto.ts (convictionLevel), company-query.dto.ts (moatPattern/businessModel/conviction/q)
    company-data/                                          // aggregator, separate from companies/
      company-data.module.ts
      company-data-aggregator.service.ts                   // searchCandidates(q), fetchFullProfile(ticker)
      adapters/{company-data-adapter.interface,sec-edgar.adapter,finnhub.adapter,alpha-vantage.adapter}.ts
      merge/merge-company-profile.ts                        // pure function, unit-testable
      cache/company-data-cache.service.ts
      rate-limit/rate-limiter.service.ts
    notes/
      notes.module.ts / .controller.ts / .service.ts
      dto/create-note.dto.ts (body, moatPattern?, businessModel?), update-note.dto.ts
    tags/tags.controller.ts                                 // GET /tags -> { moatPatterns, businessModels, convictionLevels } with labels
    common/config/env.validation.ts                         // validates DATABASE_URL, SEC_EDGAR_USER_AGENT, FINNHUB_API_KEY, ALPHA_VANTAGE_API_KEY at bootstrap
  prisma/schema.prisma, prisma/migrations/
```

Endpoints:
- `GET /companies?moatPattern=&businessModel=&conviction=&q=`
- `GET /companies/:id`
- `GET /companies/search-external?q=`
- `POST /companies` `{ ticker }`
- `PATCH /companies/:id` `{ convictionLevel }`
- `PATCH /companies/:id/summary` `{ summary }`
- `POST /companies/:id/refresh-enrichment`
- `DELETE /companies/:id`
- `GET/POST /companies/:id/notes`, `PATCH/DELETE /notes/:id`
- `GET /tags`

`@nestjs/throttler` guard on `POST /companies` and `.../refresh-enrichment` (e.g. 1 req/5s per IP) to protect the Alpha Vantage daily budget from a retry-happy frontend.

### Next.js frontend (App Router)
```
frontend/
  app/
    page.tsx                          // Dashboard, Server Component, no-store fetch
    companies/[id]/page.tsx           // Company detail
    companies/[id]/loading.tsx
    actions.ts                        // Server Actions: create/update/delete, revalidatePath()
    api/tag-suggest/route.ts
    api/summarize/route.ts
  components/
    dashboard/{company-card,filter-bar}.tsx
    company-detail/{note-list,note-form,conviction-selector,current-thinking-panel}.tsx
  lib/api/backend-client.ts           // fetch wrapper against process.env.BACKEND_URL (server-only)
  types/{company,note}.ts
```

- **`api/tag-suggest`**: `{ noteText }` (capped ~4000 chars) → `generateObject({ model: anthropic(...), schema: z.object({ moatPattern: z.enum([...]).nullable(), businessModel: z.enum([...]).nullable(), rationale: z.string().optional() }) })`. On model failure, return `{ moatPattern: null, businessModel: null, error: 'suggestion_unavailable' }` with 200 — never blocks note-saving.
- **`api/summarize`**: `{ companyId }` → fetch note history from the Nest backend server-side → cap by walking notes newest-to-oldest to a char budget (~12,000 chars), re-sort chronologically, prepend `[earlier notes omitted for length]` if truncated → system prompt explicitly bans invented financial figures → `streamText(...)` → stream to client; frontend calls `PATCH /companies/:id/summary` once the stream completes.
- All backend calls are server-only (`BACKEND_URL`, not `NEXT_PUBLIC_*`) — no CORS config needed on the Nest side, a clean explicit trade-off.
- AI provider: `@ai-sdk/anthropic` (matches this being a Claude Code build); `@ai-sdk/openai` noted as the drop-in alternative behind the same AI SDK interface if preferred later.

### Repo scaffold (once this becomes a `03-ready` build)
```
thesis-lab/
  backend/                         # NestJS
  frontend/                        # Next.js
  README.md                        # overview, quick start, architecture + talking points
  .env.example
  .gitignore                       # node_modules, .env*, dist/, .next/, *.log, .DS_Store
  package.json                     # optional root, npm workspaces for convenience scripts
```

`.env.example`:
```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
SEC_EDGAR_USER_AGENT="Thesis Lab Demo you@example.com"
FINNHUB_API_KEY=""
ALPHA_VANTAGE_API_KEY=""
ENABLE_ALPHA_VANTAGE="true"
ANTHROPIC_API_KEY=""
BACKEND_URL="http://localhost:3001"
PORT=3001
```

### Sequencing (once built)
1. Scaffold both apps, `.gitignore`/README skeleton, Prisma init + first migration.
2. **Vertical slice first**: SEC EDGAR adapter alone → `CompaniesController`/`Service` persistence → dashboard + detail pages rendering real data.
3. Add Finnhub into the aggregator — exercises real 2-source `Promise.allSettled` merge/fallback.
4. Add Alpha Vantage third, budget-gated (first to cut if time runs short).
5. Notes CRUD + `GET /tags`, manual tag selection (no AI yet).
6. AI features: `tag-suggest` first (non-streaming, smaller), then `summarize` (capping + streaming).
7. Dashboard filters (keep) + Postgres FTS search box (cut-if-behind, verbal fallback).
8. Polish: activity feed (optional/cuttable), error/loading states, README talking points.

**Cuttable, ranked**: Alpha Vantage → activity feed → FTS search box → streaming for summarize → persisting AI summary to DB → refresh-enrichment retry endpoint.
**Non-cuttable**: add-by-ticker with ≥2 real parallel sources + merge/fallback, notes CRUD with both tag dimensions + conviction level, both AI features working, basic dashboard filtering.

### Deployment (separate, explicitly-approved step, not part of any current build)
No Neon/Render/Vercel provisioning happens until explicitly requested. When ready: Neon project → pooled `DATABASE_URL` → Render web service (root `backend`, `prisma migrate deploy` in release step, free tier/cold start) → Vercel (root `frontend`, `BACKEND_URL` + `ANTHROPIC_API_KEY` env vars, no `NEXT_PUBLIC_*` needed).
