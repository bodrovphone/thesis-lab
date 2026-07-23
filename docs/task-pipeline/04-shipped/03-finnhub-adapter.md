---
title: Finnhub adapter — second parallel source with merge/fallback
domain: [backend, frontend]
stage: shipped
created: 2026-07-22
---

# Finnhub adapter — second parallel source with merge/fallback

## Sign-offs

- claude-sonnet-5 — 2026-07-22 — ideas → specs
- cursor-grok-4.5 — 2026-07-22 — ideas → specs
- gpt-5 — 2026-07-23 — specs → ready
- composer — 2026-07-23 — specs → ready

## Context

This task adds Finnhub as the second real company-data source and exercises the parallel adapter design created by the SEC vertical slice. Search combines SEC's cached directory with Finnhub symbol lookup. Company creation fetches both profiles concurrently, merges fields deterministically, and remains usable when either source fails.

Implementation depends on `03-ready/02-sec-edgar-vertical-slice.md` being built and verified. The current SEC types, aggregator, companies service, HTTP routes, frontend search flow, and CompanyView are extended rather than replaced.

## Goal

A user can:

1. Search U.S. companies across SEC and Finnhub concurrently.
2. See one de-duplicated candidate per normalized ticker with source provenance.
3. Add SEC-backed, Finnhub-backed, or dual-source candidates.
4. Receive a richer merged company profile when Finnhub succeeds.
5. Still search and add through SEC when Finnhub is missing, unavailable, timed out, or rate-limited.

Alpha Vantage, notes, AI, stored-company filters, deletion, refresh-enrichment, and deployment remain out of scope.

## Resolved Decisions

All specs-stage questions are resolved:

1. Missing FINNHUB_API_KEY does not stop backend boot. Finnhub returns a disabled adapter status and logs one warning; SEC-only behavior continues.
2. Finnhub wins user-facing name, exchange, country, industry, market cap, website, and logo. SEC remains the only authority for CIK.
3. Search de-duplicates by uppercase-trimmed ticker only. Do not guess that punctuation variants such as `BRK.B` and `BRK-B` are equivalent.
4. Convert market capitalization only when Finnhub currency is `USD`; otherwise persist marketCapUsd as null. No FX conversion is introduced.
5. SEC and Finnhub candidates interleave under the same deterministic match ranking. Dual-source candidates win ties within the same rank.

No open question is carried forward.

## Finnhub API Contract

Base URL:

```text
https://finnhub.io/api/v1
```

Authenticate with the `X-Finnhub-Token` request header. Do not put the token in the query string, exception messages, or logs.

### Symbol lookup

```text
GET /search?q={encoded-query}&exchange=US
```

Consume:

```ts
interface FinnhubSearchPayload {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}
```

Normalize ticker from `displaySymbol` when non-empty, otherwise `symbol`. Uppercase and trim it. Use description as the candidate name. Ignore entries without a usable ticker or name. Finnhub search does not supply CIK or a reliable display exchange, so both remain null until profile merge.

### Company Profile 2

```text
GET /stock/profile2?symbol={encoded-ticker}
```

Consume:

```ts
interface FinnhubProfile2Payload {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  ticker?: string;
  weburl?: string;
}
```

Treat an empty object or a payload without a usable ticker/name as an adapter error. Convert market capitalization with:

```ts
currency === 'USD' && Number.isFinite(marketCapitalization) && marketCapitalization >= 0
  ? BigInt(Math.round(marketCapitalization * 1_000_000))
  : null
```

Finnhub documents Profile 2 as the free company-profile operation and the free plan as 60 calls per minute. The implementation uses a lower internal budget and does not assume more generous capacity.

## Backend Paths

Add:

```text
backend/src/company-data/finnhub/finnhub.adapter.ts
backend/src/company-data/finnhub/finnhub.adapter.spec.ts
backend/src/company-data/finnhub/finnhub-request-scheduler.service.ts
backend/src/company-data/finnhub/finnhub-request-scheduler.service.spec.ts
backend/src/company-data/finnhub/finnhub-search-cache.service.ts
backend/src/company-data/finnhub/finnhub-search-cache.service.spec.ts
backend/src/company-data/merge/merge-company-profile.ts
backend/src/company-data/merge/merge-company-profile.spec.ts
```

Modify:

```text
backend/src/config/env.validation.ts
backend/src/company-data/types/company-data.types.ts
backend/src/company-data/types/company-data-adapter.interface.ts
backend/src/company-data/company-data-aggregator.service.ts
backend/src/company-data/company-data-aggregator.service.spec.ts
backend/src/company-data/company-data.module.ts
backend/src/company-data/sec-edgar/sec-edgar.adapter.ts
backend/src/company-data/sec-edgar/sec-edgar.adapter.spec.ts
backend/src/companies/companies.service.ts
backend/src/companies/companies.service.spec.ts
backend/src/companies/dto/search-candidate.dto.ts
.env.example
README.md
```

No Prisma schema change or migration is required. FINNHUB already exists in the DataSource enum, and Company already has the required nullable profile columns.

No new npm dependency is required; use Node's built-in fetch, AbortSignal, timers, Map, and URL APIs.

## Environment Behavior

Add FINNHUB_API_KEY as an optional string in `env.validation.ts` and keep its empty placeholder in `.env.example`:

```dotenv
FINNHUB_API_KEY=""
```

Rules:

- Missing, empty, or whitespace-only key: Finnhub is disabled; log one warning at startup without printing the value.
- Present key: enable Finnhub.
- HTTP 401 or 403: return a safe adapter error and log `authentication_failed`; do not crash or retry automatically.
- Never expose the key to frontend environment files.

The existing browser task `browser-tasks/finnhub-api-key.md` is the manual setup path.

## Evolved Domain Interfaces

Replace the SEC-only contracts with:

```ts
type DataSourceName = 'SEC_EDGAR' | 'FINNHUB';

interface CompanySearchCandidate {
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  sources: DataSourceName[];
}

interface NormalizedCompanyProfile {
  ticker: string;
  name: string;
  cik: string | null;
  exchange: string | null;
  industry: string | null;
  country: string | null;
  marketCapUsd: bigint | null;
  website: string | null;
  logoUrl: string | null;
}

type AdapterFailureStatus =
  | 'disabled'
  | 'error'
  | 'timeout'
  | 'rate_limited';

type AdapterResult<T> =
  | { source: DataSourceName; status: 'ok'; data: T }
  | {
      source: DataSourceName;
      status: AdapterFailureStatus;
      message: string;
    };

interface CompanyDataAdapter {
  readonly source: DataSourceName;
  search(
    query: string,
    limit: number,
  ): Promise<AdapterResult<CompanySearchCandidate[]>>;
  resolveTicker(
    ticker: string,
  ): Promise<AdapterResult<CompanySearchCandidate | null>>;
  fetchProfile(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>>;
}

interface CompanyDataAggregator {
  searchCandidates(
    query: string,
    limit: number,
  ): Promise<CompanySearchCandidate[]>;
  resolveCandidate(ticker: string): Promise<CompanySearchCandidate | null>;
  fetchProfiles(
    candidate: CompanySearchCandidate,
  ): Promise<AdapterResult<NormalizedCompanyProfile>[]>;
}
```

Update SecEdgarAdapter to conform:

- Wrap search and resolve success/failure in AdapterResult.
- Return candidates with `sources: ['SEC_EDGAR']`.
- Accept null candidate CIK. If CIK is absent, return an error result without making a submissions request.
- Populate all added NormalizedCompanyProfile fields, using null for fields SEC does not supply.

Update SearchCandidateDto identically: cik becomes nullable and `source` becomes `sources`.

## Finnhub Request Protection

FinnhubRequestSchedulerService owns both burst spacing and free-plan budgeting:

- Start at most one Finnhub request every 40 ms, below the documented 30 calls/second ceiling.
- Retain successful acquisition timestamps for a rolling 60-second window.
- Search may acquire only while fewer than 50 total requests exist in the window.
- Profile may acquire while fewer than 55 total requests exist, reserving at least five free-plan calls for add flows when search is busy.
- If no budget is available, return rate_limited immediately; do not wait for up to a minute.
- Each network request has a 5-second timeout.
- HTTP 429 maps to rate_limited. HTTP 401/403 and invalid JSON map to error. Other non-2xx responses map to error.
- Network/timeout details are logged safely; response bodies and authentication headers are never logged.

FinnhubSearchCacheService is an in-memory bounded cache:

- Key: normalized query plus limit.
- TTL: 5 minutes.
- Maximum: 200 entries.
- Evict the least-recently-used entry when over capacity.
- Cache successful empty results as well as populated results.
- Share one in-flight promise for identical concurrent searches.
- Do not cache error, disabled, timeout, or rate-limited results.

No persistent Finnhub search cache is added; short-lived query strings should not create unbounded database rows.

## Parallel Search and Candidate Merge

CompanyDataAggregatorService registers SecEdgarAdapter and FinnhubAdapter explicitly in deterministic source order: SEC_EDGAR, then FINNHUB.

For search:

1. Start both adapter searches concurrently with Promise.allSettled.
2. Convert unexpected promise rejection into a safe error result for that source.
3. Flatten successful result arrays.
4. De-duplicate by `ticker.trim().toUpperCase()`.
5. Merge duplicate candidate fields:
   - ticker: normalized key
   - name: Finnhub, then SEC
   - cik: SEC, then null
   - exchange: SEC at search time, then Finnhub, then null
   - sources: unique values in `[SEC_EDGAR, FINNHUB]` order
6. Rank the merged list using the SEC slice's tiers: exact ticker, ticker prefix, name prefix, name substring.
7. Within one tier, sort candidates with two sources before one-source candidates, then ticker ascending.
8. Apply the requested limit only after de-duplication and ranking.

If at least one adapter returns status ok, return its merged results, including an empty list. If neither returns ok, throw ServiceUnavailableException with `Company search is unavailable`.

For resolveCandidate:

1. Normalize the ticker.
2. Start both resolveTicker calls concurrently.
3. Merge exact candidates using the same field/provenance rules when at least one adapter returns status ok with a match.
4. Return null when both adapters return status ok and neither finds the ticker.
5. Throw ServiceUnavailableException when neither adapter returns status ok.
6. When SEC returns status ok with null and Finnhub returns any non-ok status, throw ServiceUnavailableException. This blocks Finnhub-only create paths from falling through to 404 when Finnhub was required for validation but is now unavailable.

The browser still submits only ticker. Rule 6 ensures a Finnhub-only candidate cannot be created from stale browser metadata when Finnhub has become unavailable between search and POST.

## Parallel Profiles and Pure Merge

`fetchProfiles(candidate)` starts both adapter profile calls concurrently and always returns two AdapterResult entries in source order. Unexpected adapter throws are converted to error results.

Export a pure function:

```ts
interface MergedCompanyProfile extends NormalizedCompanyProfile {
  sourcesUsed: DataSourceName[];
  enrichmentStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  lastEnrichedAt: Date | null;
}

function mergeCompanyProfile(
  candidate: CompanySearchCandidate,
  results: AdapterResult<NormalizedCompanyProfile>[],
  now: Date,
): MergedCompanyProfile;
```

Field precedence:

| Field | Precedence |
| --- | --- |
| ticker | selected normalized candidate |
| name | successful Finnhub profile → successful SEC profile → candidate |
| cik | successful SEC profile → candidate → null |
| exchange | successful Finnhub profile → successful SEC profile → candidate → null |
| industry | successful Finnhub profile → successful SEC profile → null |
| country | successful Finnhub profile → null |
| marketCapUsd | successful Finnhub USD profile → null |
| website | successful Finnhub profile → null |
| logoUrl | successful Finnhub profile → null |

Metadata rules:

- sourcesUsed is the unique union of candidate.sources and successful profile sources, in SEC_EDGAR then FINNHUB order.
- Two successful profile results: COMPLETE.
- Exactly one successful profile result: PARTIAL.
- No successful profile results: FAILED.
- lastEnrichedAt is `now` when at least one profile succeeded; otherwise null.

The pure merge function must not mutate candidates or results and must ignore malformed/duplicate result entries after selecting at most one result per source.

## Company Persistence Changes

CompaniesService.create keeps its duplicate pre-check and database unique-race handling, then:

1. Resolve the ticker through the two-source aggregator.
2. Fetch both profiles.
3. Call mergeCompanyProfile with one captured `now` value.
4. Persist every merged Company field:
   - ticker, name, cik, exchange, industry, country
   - marketCapUsd, website, logoUrl
   - sourcesUsed, enrichmentStatus, lastEnrichedAt
5. Return the existing serialized CompanyView.

Do not overwrite an existing company through POST. Refresh-enrichment remains a later task.

Update the not-found message from `Ticker not found in SEC directory` to `Ticker not found in company sources`.

No HTTP route shape changes except the search candidate response:

```json
{
  "ticker": "AAPL",
  "name": "Apple Inc",
  "cik": "0000320193",
  "exchange": "Nasdaq",
  "sources": ["SEC_EDGAR", "FINNHUB"]
}
```

The four SEC-slice endpoints and CompanyView remain otherwise unchanged.

## Frontend Paths

Modify the files introduced by the SEC slice:

```text
frontend/src/types/company.ts
frontend/src/components/company-search.tsx
frontend/src/components/company-card.tsx
frontend/src/app/companies/[id]/page.tsx
frontend/src/app/api/companies/search/route.ts
frontend/src/app/api/companies/route.ts
```

Modify `frontend/next.config.ts` only if Next Image is used for Finnhub logos. Restrict remote images to HTTPS hosts matching `**.finnhub.io`; do not accept arbitrary remote hosts.

Frontend behavior:

- Search results show `SEC`, `Finnhub`, or both from candidate.sources.
- Candidate CIK is optional; never display `null` text.
- Company cards show country and formatted market cap when present.
- Detail shows industry, country, website, market cap, source badges, and logo when present.
- Website links open safely with `target="_blank"` and `rel="noreferrer noopener"`.
- Format marketCapUsd from its decimal string without converting the entire value to Number; use BigInt and Intl.NumberFormat or compact safe formatting.
- A PARTIAL or FAILED badge remains visible even when Finnhub fields are present.
- Existing loading, empty, 409, 502, and not-found behavior remains unchanged.

Do not add filters, editable fields, refresh buttons, notes, or AI UI.

## Error Matrix

| SEC profile | Finnhub profile | Persisted result |
| --- | --- | --- |
| ok | ok | merged COMPLETE |
| ok | disabled/error/timeout/rate_limited | SEC-shaped PARTIAL |
| disabled/error/timeout/rate_limited | ok | Finnhub-shaped PARTIAL; CIK may come from candidate |
| disabled/error/timeout/rate_limited | disabled/error/timeout/rate_limited | minimal candidate FAILED |

Search behavior:

- SEC ok, Finnhub unavailable: return SEC results.
- Finnhub ok, SEC unavailable: return Finnhub results.
- Both ok: merge, de-duplicate, and rank.
- Neither ok: return 503.
- Either source returning a successful empty array counts as available.

Never automatically retry 401, 403, 409, 429, or adapter-disabled results.

## Build Sequence

1. Confirm the SEC vertical slice is implemented and its complete test/build suite passes.
2. Make FINNHUB_API_KEY optional in backend environment validation.
3. Evolve shared candidate/profile/result interfaces and update SEC adapter/tests to compile against them.
4. Implement Finnhub scheduler and bounded search cache with fake-timer unit tests.
5. Implement and unit-test Finnhub search/profile parsing, authentication, timeouts, and market-cap conversion.
6. Implement the pure merge function and its full success/failure matrix tests.
7. Upgrade aggregator search, resolve, and profile fan-out to two concurrent adapters.
8. Update CompaniesService persistence and API tests.
9. Update frontend types, provenance badges, richer cards/detail, and same-origin route assumptions.
10. Run automated verification without a key to prove SEC-only degradation.
11. Add a Finnhub key locally and run the opt-in live smoke test.

## Scope Gate

### Non-cuttable

- Header-based Finnhub authentication and safe key handling.
- Optional-key SEC-only degradation.
- 5-second timeout, per-second spacing, rolling free-plan budget, and reserved profile capacity.
- Five-minute bounded Finnhub search cache.
- Concurrent dual-source search, resolve, and profile fetch.
- Strict ticker de-duplication and deterministic ranking.
- Pure per-field merge with the complete failure matrix.
- Finnhub-only candidate creation when it can be re-resolved.
- USD-only market-cap conversion.
- Search provenance and richer company display.
- Unit and backend e2e coverage with mocked Finnhub HTTP.

### Cuttable

- Rendering remote company logos; logoUrl must still persist.
- Advanced market-cap compact formatting beyond a correct readable value.
- Opt-in live Finnhub test in CI; local smoke verification remains required.

### Explicitly excluded

- Alpha Vantage and FX conversion.
- Persistent caching of arbitrary Finnhub searches.
- Automatic retries or background refresh jobs.
- Company deletion or refresh-enrichment endpoint.
- Notes, AI, filters, activity feed, authentication, and deployment.
- Share-class ticker aliasing beyond uppercase/trim normalization.

## Verification Plan

### Unit tests

Cover:

- Missing key returns disabled without fetch.
- Token is sent only through X-Finnhub-Token.
- Search query and `exchange=US` are encoded correctly.
- Empty/malformed search and profile payload behavior.
- Five-second timeout plus 401/403/429/non-2xx normalization.
- Search cache TTL, LRU eviction, empty-result caching, and in-flight coalescing.
- 40 ms request spacing, 50-search threshold, 55-total threshold, and reserved profile capacity using fake timers.
- USD market-cap conversion including decimal, zero, negative, NaN, and non-USD cases.
- Candidate de-duplication, source order, precedence, ranking, and limiting after merge.
- Resolve behavior for SEC-only, Finnhub-only, both, neither found, neither available, and Finnhub-unavailable with SEC miss (503).
- Every profile failure-matrix row and every field-precedence rule.
- CompaniesService persistence of COMPLETE, PARTIAL, and FAILED records.
- Existing SEC-only tests updated for nullable CIK, sources array, and wrapped search results.

### Backend e2e

Using mocked SEC and Finnhub HTTP boundaries plus the test database, assert:

```text
GET  /companies/search-external?q=apple -> one AAPL item with both sources
POST /companies {"ticker":"AAPL"}      -> merged COMPLETE profile
GET  /companies/{id}                    -> Finnhub display fields + SEC CIK
```

Then test:

- Finnhub search failure returns SEC candidates.
- SEC search failure returns Finnhub candidates.
- Both search failures return 503.
- Missing Finnhub key preserves SEC search/create and produces PARTIAL enrichment.
- Finnhub-only ticker creates with null CIK when Finnhub profile succeeds.
- Both profiles failing after candidate resolution creates FAILED minimal company.
- Duplicate create remains 409.

### Static verification

From the repository root:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
git diff --check
```

All must pass with FINNHUB_API_KEY absent. Search candidate consumers must no longer reference `.source`; they must use `.sources`.

### Live smoke test

After completing `browser-tasks/finnhub-api-key.md`, place the key only in `backend/.env` and:

1. Start both services.
2. Search `apple`; confirm one AAPL candidate with SEC and Finnhub badges.
3. Add AAPL; confirm SEC CIK plus Finnhub country, industry, website, logo URL, and plausible USD market cap.
4. Compare the raw Profile 2 marketCapitalization scale with the stored whole-dollar value and confirm the 1,000,000 multiplier.
5. Temporarily remove the key and restart; confirm the backend boots, logs one safe warning, and SEC-only search/add still work.
6. Confirm no token appears in logs, browser requests, returned errors, or tracked files.

## Action Items

- Complete `browser-tasks/finnhub-api-key.md` to create a Finnhub account and obtain the free API key.
- Put FINNHUB_API_KEY only in the untracked `backend/.env` before the live smoke test.
- Confirm the SEC vertical slice is implemented and verified before beginning this task.
- During the live AAPL check, confirm Finnhub's marketCapitalization scale before accepting the task outcome.

## Open Questions

None. All five specs-stage questions are resolved in this document.

## Research References

- [Finnhub API documentation](https://finnhub.io/docs/api)
- [Finnhub free-plan limits](https://api.finnhub.io/pricing)
- `04-shipped/02-sec-edgar-vertical-slice.md`
- `02-specs/mini-research-tracker-idea.md`
- `browser-tasks/finnhub-api-key.md`

## Outcome

Shipped on 2026-07-23.

**Built**

- Optional `FINNHUB_API_KEY` in `env.validation.ts`; Finnhub disables cleanly at startup with one safe warning when absent.
- Evolved shared adapter contracts (`sources[]`, nullable CIK, `AdapterResult` on search/resolve, `fetchProfiles` fan-out) and updated `SecEdgarAdapter` to match.
- `FinnhubRequestSchedulerService` (40ms spacing, rolling 60s budget, 5s timeout, header auth), `FinnhubSearchCacheService` (5min TTL, LRU, in-flight coalescing), and `FinnhubAdapter` for `/search` and `/stock/profile2` with USD market-cap conversion (`× 1_000_000`).
- `CompanyDataAggregatorService` parallel SEC+Finnhub search/resolve/profile with de-duplication, ranking, merge rules, and Finnhub-only create 503 guard.
- Pure `mergeCompanyProfile()` with COMPLETE / PARTIAL / FAILED matrix; `CompaniesService.create` persists all merged enrichment fields.
- Frontend search provenance badges plus richer company cards and detail (country, market cap, website, logo, source badges, enrichment status).

**Verification**

- `npm run lint`, `npm test` (80 unit tests), `npm run test:e2e` (11 tests with mocked SEC/Finnhub HTTP), and `npm run build` all pass from the repo root.
- `browser-tasks/finnhub-api-key.md` completed; key stored only in untracked `backend/.env`.

**Deviations**

- None from the ready spec. Logo rendering uses a plain `<img>` tag rather than Next Image (cuttable per scope gate).
