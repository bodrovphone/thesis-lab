---
title: SEC EDGAR adapter + company persistence + dashboard/detail pages (vertical slice)
domain: [backend, frontend]
stage: shipped
created: 2026-07-22
---

# SEC EDGAR adapter + company persistence + dashboard/detail pages (vertical slice)

## Sign-offs

- cursor-grok-4.5 — 2026-07-22 — ideas → specs
- claude-sonnet-5 — 2026-07-22 — ideas → specs
- gpt-5 — 2026-07-22 — specs → ready
- cursor-grok-4.5 — 2026-07-22 — specs → ready

## Context

This is the first end-to-end product slice after the monorepo scaffold. It proves the path from a real external source through NestJS and PostgreSQL to server-rendered Next.js pages before Finnhub, Alpha Vantage, notes, or AI are added.

Implementation depends on `03-ready/01-monorepo-scaffold.md` being built and verified. Its Company, ExternalApiCacheEntry, Prisma module, environment, workspace, and frontend conventions are prerequisites. The reference-only `02-specs/mini-research-tracker-idea.md` remains authoritative for product boundaries.

## Goal

A user can:

1. Search U.S.-listed ticker symbols and company names from a cached SEC association dataset.
2. Select a result and add the company to the local database.
3. Receive a useful persisted record even if the secondary SEC submissions request fails.
4. See all tracked companies on the dashboard.
5. Open a server-rendered company detail page.

This task adds no second enrichment source, note workflow, AI route, dashboard filters, company deletion, or hosted deployment.

## Resolved Decisions

All specs-stage questions are resolved:

1. Use `company_tickers_exchange.json` from the start. It supplies CIK, name, ticker, and exchange in one dataset.
2. Saving a validated minimal company after a submissions-profile failure is non-cuttable. A profile outage must not discard a search selection already validated against SEC data.
3. Persist the ticker dataset in ExternalApiCacheEntry with a 24-hour TTL and permit stale-cache fallback when SEC is temporarily unavailable.
4. Defer company deletion until the later CRUD/polish task.

No open question is carried forward.

## SEC Inputs

### Ticker and exchange dataset

Fetch:

```text
https://www.sec.gov/files/company_tickers_exchange.json
```

The current response shape is:

```ts
interface SecTickerExchangePayload {
  fields: ['cik', 'name', 'ticker', 'exchange'];
  data: Array<[number, string, string, string | null]>;
}
```

Parse positions by the `fields` array rather than assuming a permanent column order. Reject a payload missing any required field. Normalize ticker to uppercase and CIK to a zero-padded 10-character string.

### Submissions profile

For a selected candidate, fetch:

```text
https://data.sec.gov/submissions/CIK{zero-padded-cik}.json
```

Only consume these fields:

```ts
interface SecSubmissionsPayload {
  cik: string;
  name: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string;
  sicDescription?: string;
}
```

Do not fetch company-facts/XBRL data in this task. Map `sicDescription` to Company.industry. Leave sector, description, country, marketCapUsd, website, and logoUrl null until later enrichment sources fill them.

### Fair-access contract

Every SEC request must:

- Send `User-Agent` from `SEC_EDGAR_USER_AGENT` with an application name and real contact email.
- Send `Accept: application/json` and `Accept-Encoding: gzip, deflate`.
- Run through one process-local scheduler with a 125 ms minimum start interval, keeping this application below the SEC's 10-request-per-second ceiling.
- Use a 5-second timeout.
- Never retry immediately in a loop after HTTP 403 or 429.

Do not log the full User-Agent value or response payloads. Log source, operation, duration, HTTP status when present, and normalized outcome.

## Backend Paths

Add:

```text
backend/src/config/env.validation.ts
backend/src/company-data/company-data.module.ts
backend/src/company-data/company-data-aggregator.service.ts
backend/src/company-data/types/company-data-adapter.interface.ts
backend/src/company-data/types/company-data.types.ts
backend/src/company-data/sec-edgar/sec-edgar.adapter.ts
backend/src/company-data/sec-edgar/sec-request-scheduler.service.ts
backend/src/company-data/cache/company-data-cache.service.ts
backend/src/companies/companies.module.ts
backend/src/companies/companies.controller.ts
backend/src/companies/companies.service.ts
backend/src/companies/dto/company-view.dto.ts
backend/src/companies/dto/create-company.dto.ts
backend/src/companies/dto/search-external-query.dto.ts
backend/src/companies/dto/search-candidate.dto.ts
backend/src/companies/company.serializer.ts
```

Add colocated `.spec.ts` unit tests for the scheduler, cache, SEC adapter, aggregator, companies service, serializer, and controller behavior. Extend `backend/test/app.e2e-spec.ts` for the new HTTP routes.

Modify:

```text
backend/src/app.module.ts
backend/src/main.ts
.env.example
README.md
```

No Prisma schema change or migration is expected. This task uses Company and ExternalApiCacheEntry exactly as created by the scaffold.

## Dependency Additions

Add exact runtime dependencies:

```text
backend: class-validator@0.15.1, class-transformer@0.5.1
frontend: server-only@0.0.1
```

Use Node's built-in fetch, AbortSignal, and timers. Do not add Axios, a rate-limit package, or a separate cache library for this slice. The root package-lock remains the dependency authority.

## Environment Validation

`env.validation.ts` exports a `validateEnv(config)` function used by `ConfigModule.forRoot({ validate: validateEnv })`.

Required for this slice:

```text
DATABASE_URL
SEC_EDGAR_USER_AGENT
```

Keep PORT optional with the scaffold default of 3001. For the frontend server-only client, also require:

```text
BACKEND_URL
```

in `frontend/.env.local` (copy from the root `.env.example` value `http://localhost:3001`). Do not add `NEXT_PUBLIC_BACKEND_URL`. Nest validates `DATABASE_URL` and `SEC_EDGAR_USER_AGENT` at backend boot; Next fails closed in `backend-client.ts` if `BACKEND_URL` is missing.

Update `.env.example` so its placeholder makes the required format clear:

```dotenv
SEC_EDGAR_USER_AGENT="Thesis Lab your-real-email@example.com"
```

## Domain Interfaces

Define:

```ts
type DataSourceName = 'SEC_EDGAR';

interface CompanySearchCandidate {
  ticker: string;
  name: string;
  cik: string;
  exchange: string | null;
  source: DataSourceName;
}

interface NormalizedCompanyProfile {
  ticker: string;
  name: string;
  cik: string;
  exchange: string | null;
  industry: string | null;
}

type AdapterResult<T> =
  | { source: DataSourceName; status: 'ok'; data: T }
  | {
      source: DataSourceName;
      status: 'error' | 'timeout' | 'rate_limited';
      message: string;
    };

interface CompanyDataAdapter {
  readonly source: DataSourceName;
  search(query: string, limit: number): Promise<CompanySearchCandidate[]>;
  fetchProfile(candidate: CompanySearchCandidate): Promise<AdapterResult<NormalizedCompanyProfile>>;
}
```

Adapter error messages are safe, stable summaries such as `SEC request timed out`; they must not contain raw HTML bodies or contact details.

The aggregator exposes:

```ts
interface CompanyDataAggregator {
  searchCandidates(query: string, limit: number): Promise<CompanySearchCandidate[]>;
  resolveCandidate(ticker: string): Promise<CompanySearchCandidate | null>;
  fetchProfile(candidate: CompanySearchCandidate): Promise<AdapterResult<NormalizedCompanyProfile>>;
}
```

Although there is one adapter now, keep the result envelope and source field so the Finnhub task can introduce settled parallel calls without changing controllers.

## Persistent Cache Behavior

Use ExternalApiCacheEntry with:

```text
source: SEC_EDGAR
cacheKey: company_tickers_exchange:v1
payload: complete validated SEC JSON payload
expiresAt: fetchedAt + 24 hours
```

Algorithm:

1. Read the cache row.
2. If it exists and `expiresAt > now`, return it without an SEC request.
3. Otherwise fetch and validate the SEC dataset through the scheduler.
4. On success, upsert the cache row and return the fresh payload.
5. On fetch/validation failure, return the existing stale payload if present and log `stale_cache_used`.
6. If no usable cache exists, throw ServiceUnavailableException with `SEC company directory is unavailable`.

Concurrent cache misses in one process must share the same in-flight promise so one burst of searches causes one SEC download.

## Search Semantics

Normalize the user query with `trim()` and case-insensitive comparison. Query length is 2–50 characters. `limit` defaults to 10 and is constrained to 1–25.

Rank matches deterministically:

1. Exact ticker.
2. Ticker prefix.
3. Company-name prefix.
4. Company-name substring.
5. Ticker ascending as the final tie-breaker.

Return at most `limit` candidates. Do not match only on CIK in the public search operation.

## Company Persistence Behavior

POST creation receives only a ticker. The backend must re-resolve it against the cached SEC dataset; never trust company name, CIK, or exchange supplied by the browser.

Creation algorithm:

1. Uppercase and trim ticker.
2. Reject an existing normalized ticker with ConflictException.
3. Resolve the ticker from the SEC dataset. If absent, throw NotFoundException.
4. Fetch the submissions profile.
5. On profile success, persist the normalized profile with:
   - `sourcesUsed = [SEC_EDGAR]`
   - `enrichmentStatus = COMPLETE`
   - `lastEnrichedAt = now`
6. On profile error, timeout, or rate limit, persist the search candidate with:
   - `sourcesUsed = [SEC_EDGAR]`
   - `enrichmentStatus = PARTIAL`
   - `lastEnrichedAt = null`
   - optional fields not present on the candidate left null
7. Return the persisted CompanyView.

Handle the database unique constraint as a conflict too, so concurrent duplicate requests cannot create two rows.

## HTTP API

### Search external candidates

```text
GET /companies/search-external?q=apple&limit=10
```

HTTP 200 body:

```json
{
  "items": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "cik": "0000320193",
      "exchange": "Nasdaq",
      "source": "SEC_EDGAR"
    }
  ]
}
```

Return 400 for invalid q/limit and 503 when neither fresh nor stale directory data is available.

### Create company

```text
POST /companies
Content-Type: application/json

{
  "ticker": "AAPL"
}
```

Return 201 with CompanyView. Return 404 if the ticker is absent from the SEC directory and 409 if already tracked.

### List companies

```text
GET /companies
```

Return 200 with `{ "items": CompanyView[] }`, ordered by `updatedAt DESC`, then ticker ascending.

### Get company

```text
GET /companies/:id
```

Return 200 with CompanyView or 404 when absent.

### CompanyView

```ts
interface CompanyView {
  id: string;
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  marketCapUsd: string | null;
  website: string | null;
  logoUrl: string | null;
  convictionLevel: 'WATCHING' | 'BUILDING_CONVICTION' | 'HIGH_CONVICTION';
  sourcesUsed: Array<'SEC_EDGAR' | 'FINNHUB' | 'ALPHA_VANTAGE'>;
  enrichmentStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  lastEnrichedAt: string | null;
  currentThinkingSummary: string | null;
  summaryGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Serialize BigInt marketCapUsd to a decimal string and all Date values to ISO 8601 strings. Never return Prisma entities directly from controllers.

Enable Nest's global ValidationPipe with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. Add `class-validator` and `class-transformer` only if the scaffold does not already contain them.

Do not add update, delete, summary, refresh-enrichment, or note routes.

Declare static Nest paths before parameterized ones in the controller so `GET /companies/search-external` is never captured by `GET /companies/:id`. Preferred method order: `search-external`, `POST /companies`, `GET /companies`, `GET /companies/:id`.

Wire `CompaniesModule` and `CompanyDataModule` into `AppModule`. `CompaniesService` depends on the aggregator and Prisma; controllers must not call the SEC adapter directly.

## Frontend Paths

Add:

```text
frontend/src/types/company.ts
frontend/src/lib/api/backend-client.ts
frontend/src/components/company-search.tsx
frontend/src/components/company-card.tsx
frontend/src/app/api/companies/route.ts
frontend/src/app/api/companies/search/route.ts
frontend/src/app/companies/[id]/page.tsx
frontend/src/app/companies/[id]/loading.tsx
frontend/src/app/companies/[id]/not-found.tsx
frontend/src/app/error.tsx
```

Modify:

```text
frontend/src/app/page.tsx
frontend/src/app/globals.css
```

### Backend client

`backend-client.ts` imports `server-only`, reads BACKEND_URL, and provides typed functions:

```ts
listCompanies(): Promise<CompanyView[]>
getCompany(id: string): Promise<CompanyView | null>
searchCompanies(query: string, limit?: number): Promise<CompanySearchCandidate[]>
createCompany(ticker: string): Promise<CompanyView>
```

All backend fetches use `cache: 'no-store'`. Convert Nest 404 to null only in getCompany. Preserve status and safe message for other failures through a typed BackendApiError.

### Next route handlers

The browser may call only same-origin Next routes:

- `GET /api/companies/search?q=...` delegates to Nest search.
- `POST /api/companies` with `{ ticker }` delegates to Nest create.

Forward successful JSON and expected 400/404/409/503 statuses. For unexpected errors return 502 with `{ "message": "Backend service unavailable" }`. Never expose BACKEND_URL or upstream response bodies.

### Dashboard

`frontend/src/app/page.tsx` remains a Server Component and renders:

- Page heading `Thesis Lab`.
- CompanySearch client component.
- Empty state `No companies tracked yet.` when the list is empty.
- A responsive card list otherwise, linking each card to `/companies/{id}`.
- Each card shows ticker, name, exchange when present, conviction, and enrichment status.

### Search/add interaction

CompanySearch is the only Client Component in this slice:

- Wait until the trimmed query has at least two characters.
- Debounce requests by 300 ms.
- Abort the previous browser request when the query changes.
- Show loading, no-results, and safe error states.
- Render up to 10 candidates with name, ticker, and exchange.
- On selection, POST only `{ ticker }` to `/api/companies`.
- Disable repeat submission while pending.
- On success, navigate to `/companies/{id}` and refresh the router.
- On 409, show `This company is already tracked.` without retrying.

### Detail page

Because Next.js 16 provides dynamic params asynchronously, accept `params: Promise<{ id: string }>` and await it. Render:

- Ticker and name.
- Exchange, CIK, industry, conviction, and enrichment status.
- A visible `Partial SEC profile` notice when enrichmentStatus is PARTIAL.
- `Added {formatted createdAt}`.
- A link back to the dashboard.

Call `notFound()` when getCompany returns null. Do not render empty note, AI summary, edit, or delete controls.

## Error and Resilience Rules

- SEC directory unavailable with no cache: search/create returns 503; no database write occurs.
- SEC directory refresh fails with stale cache: serve stale candidates and continue.
- SEC submissions request fails after candidate validation: create a PARTIAL company and return 201.
- Duplicate ticker: return 409, including races caught by the Prisma unique constraint.
- Invalid upstream JSON: treat as source error; never pass raw parse exceptions to clients.
- Nest unavailable from Next: same-origin Next route returns 502; server-rendered pages use error.tsx.
- Do not add automatic client retries for 403, 409, 429, or 503.

## Build Sequence

1. Confirm the monorepo scaffold is implemented, its init migration is applied, and both services pass their existing checks.
2. Add environment validation and the global ValidationPipe.
3. Implement the SEC scheduler and request helper with timeout/header rules.
4. Implement persistent ticker cache, payload validation, normalization, ranking, and stale fallback.
5. Add the adapter contract, SEC adapter, and one-adapter aggregator.
6. Add Company serializer, persistence service, controller, and exact routes.
7. Add backend unit tests and e2e tests using mocked SEC responses; do not depend on live SEC in the default suite.
8. Add frontend types and server-only backend client.
9. Add same-origin Next route handlers and the debounced search/add component.
10. Replace the shell dashboard and add detail/loading/not-found/error pages.
11. Run all verification, then manually exercise one real SEC search/add using the human-provided User-Agent.

## Scope Gate

### Non-cuttable

- Exchange-inclusive SEC directory dataset.
- Descriptive User-Agent, scheduler, rate ceiling, and timeout.
- PostgreSQL-backed 24-hour cache with in-flight request coalescing and stale fallback.
- Candidate normalization, deterministic ranking, and CIK padding.
- Minimal-company persistence after submissions failure.
- Exact four Nest endpoints and explicit serialization.
- Dashboard, debounced search/add flow, and detail page.
- Unit and backend e2e coverage for success and failure semantics.
- No direct browser-to-Nest requests.

### Cuttable

- Cosmetic animation or advanced visual polish.
- Optional live-SEC integration test in CI.
- Additional skeleton detail beyond the required loading page.

### Explicitly excluded

- Company facts/XBRL data.
- Finnhub and Alpha Vantage.
- Refresh-enrichment and deletion routes.
- Notes, tags, conviction editing, AI, filters, search over stored notes, and activity feed.
- Authentication and deployment.

## Verification Plan

### Backend unit tests

Cover:

- Ticker payload field-index parsing and malformed-payload rejection.
- CIK zero-padding.
- Exact/prefix/name ranking and deterministic limit behavior.
- Fresh cache hit, expired refresh, stale fallback, no-cache failure, and concurrent miss coalescing.
- 125 ms scheduler spacing using fake timers.
- SEC headers, 5-second timeout, 403/429 normalization, and submissions mapping.
- Successful COMPLETE creation and failed-profile PARTIAL creation.
- Duplicate pre-check and Prisma unique-race conversion to 409.
- CompanyView BigInt/date serialization.

### Backend e2e

With a test database and mocked SEC HTTP boundary, assert:

```text
GET  /companies/search-external?q=apple   -> 200 and normalized AAPL candidate
POST /companies {"ticker":"AAPL"}       -> 201 and COMPLETE company
GET  /companies                           -> 200 and contains AAPL
GET  /companies/{id}                      -> 200 and exact CompanyView
POST /companies {"ticker":"AAPL"}       -> 409
GET  /companies/missing-id                -> 404
```

Also force submissions timeout and assert POST still returns 201 with PARTIAL. Force directory failure with no cache and assert search returns 503.

### Static checks

From the repository root:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
git diff --check
```

All must pass. Next build must not contain a NEXT_PUBLIC backend variable.

### Manual real-SEC smoke test

With PostgreSQL running and a real SEC_EDGAR_USER_AGENT configured:

1. Start both services with `npm run dev`.
2. Search `apple` and confirm AAPL appears with Nasdaq and padded CIK.
3. Add AAPL and confirm navigation to its detail page.
4. Return to the dashboard and confirm AAPL appears once.
5. Restart Nest, search again, and confirm the persisted cache supports the request without requiring a fresh directory download.
6. Confirm logs contain outcomes and durations but no full User-Agent or raw SEC payload.

## Action Items

- Replace the `.env.example` SEC placeholder with a local `backend/.env` value containing the application name and a real monitored contact email before the real-SEC smoke test.
- Copy `BACKEND_URL=http://localhost:3001` into `frontend/.env.local` for server-only Nest calls.
- Ensure the monorepo scaffold migration is applied and PostgreSQL is running before implementation.
- No SEC account or API key is required.

## Open Questions

None. All specs-stage questions are resolved in this document.

## Research References

- [SEC company ticker and exchange dataset](https://www.sec.gov/files/company_tickers_exchange.json)
- [SEC Developer Resources](https://www.sec.gov/about/developer-resources)
- [SEC Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)
- [SEC submissions JSON example](https://data.sec.gov/submissions/CIK0000320193.json)
- Master architecture: `02-specs/mini-research-tracker-idea.md`
- Scaffold dependency: `03-ready/01-monorepo-scaffold.md`

## Outcome

Implemented as specified, with all files from the Backend/Frontend Paths sections added and the exact routes, DTOs, and serialization rules described above.

Backend: `SecRequestSchedulerService` enforces the fair-access contract (User-Agent, 125ms minimum start interval, 5s timeout, 403/429 → `rate_limited`, safe error messages, no logged secrets/payloads). `CompanyDataCacheService` is a generic PostgreSQL-backed read-through cache (TTL, upsert, stale-on-failure fallback, in-flight coalescing) that `SecEdgarAdapter` uses for the ticker directory; the adapter also does field-index-based parsing/validation, CIK zero-padding, deterministic ranking, and submissions-profile mapping. `CompaniesService` implements the full creation algorithm (duplicate pre-check, exact-ticker resolution, COMPLETE/PARTIAL persistence, Prisma unique-constraint race → 409). All four endpoints are wired through `CompaniesModule`/`CompanyDataModule` with a global `ValidationPipe`.

Frontend: `backend-client.ts` is a `server-only` typed client that fails closed without `BACKEND_URL`; same-origin Next route handlers forward only the expected 400/404/409/503 statuses and otherwise return a generic 502; `CompanySearch` is a debounced (300ms), abortable client component; the dashboard and detail pages are Server Components with `loading.tsx`/`not-found.tsx`/`error.tsx` (Next 16 renamed `error.tsx`'s reset callback to `unstable_retry`, confirmed against the vendored Next docs).

Verification: `npm run lint`, `npm test` (59 unit tests), `npm run test:e2e` (7 e2e tests against a real Postgres instance with the SEC HTTP boundary mocked), `npm run build`, and `git diff --check` all pass from the repo root. Manually smoke-tested against live SEC EDGAR end-to-end (backend API via curl and the full UI via browser): searched and added AAPL, MSFT, and TSLA; confirmed correct CIK/exchange/industry and `COMPLETE` enrichment, the dashboard listing, the `409` "This company is already tracked." UX, the `/companies/[id]` not-found page, and — after restarting the Nest process — that a subsequent search reused the persisted ticker-directory cache with no new SEC directory download.

Deviations / incidental fixes (all pre-existing scaffold gaps, unrelated to this task's own scope, discovered and fixed while wiring it up):
- A stray per-workspace `typescript@7.0.2` install (in `backend/node_modules` and `frontend/node_modules`) shadowed the root's `overrides`-pinned `typescript@6.0.2`, which broke `nest build`. Removed the stray copies so the pinned version resolves.
- `backend/eslint.config.mjs`'s `projectService` had no way to lint `test/app.e2e-spec.ts` (it sits outside `src/`'s `rootDir`, so adding it to `tsconfig.json`'s `include` instead produces a TS6059 rootDir violation that breaks `nest start --watch`). Fixed by adding `projectService.allowDefaultProject: ['test/*.ts']` instead of touching `tsconfig.json`.
- `nest start --watch` (and plain `tsc --watch` with this repo's `tsconfig.build.json`) does not reliably emit `dist/main.js` in this environment despite reporting "Found 0 errors" — a watch-mode-specific bug in this TypeScript version, reproducible outside Nest entirely. One-shot `nest build` is unaffected. Not fixed (out of scope for this task); worked around for local verification by running `nest build` once and then `node dist/main.js` directly instead of `start:dev`.
