---
title: Alpha Vantage adapter — budget-gated third source
domain: [backend]
stage: shipped
created: 2026-07-22
---

# Alpha Vantage adapter — budget-gated third source

## Sign-offs

- gpt-5-codex — 2026-07-23 — ideas → specs
- claude-sonnet-5 — 2026-07-23 — ideas → specs

## Context
Adds the third, most rate-limited source as an optional enrichment layer, not a required one. Alpha Vantage should enrich a company after the user has selected a ticker, but it must never participate in search-as-you-type or any retry-heavy path.

Alpha Vantage's own support page currently describes the free service as allowing most datasets up to 25 requests per day. This makes the adapter useful for richer company metadata, especially overview-style descriptive fields, but too scarce to treat as part of the required company-add path. The design should therefore preserve a fully usable SEC + Finnhub flow when Alpha Vantage is disabled, unconfigured, rate-limited, or failing.

This task depends on `03-finnhub-adapter` because the project should already have the multi-source aggregator, keyed source configuration, source provenance, partial-failure behavior, and merge policy foundations in place before adding a budget-gated third source.

## Technical Approach

Add an Alpha Vantage adapter behind the same company-data adapter boundary used by SEC EDGAR and Finnhub. The adapter should call the `OVERVIEW` function for a selected symbol and normalize only the fields that map cleanly into the application's company profile model.

Alpha Vantage should be feature-flagged with `ENABLE_ALPHA_VANTAGE`. If the flag is false, the API key is absent, or the daily budget is exhausted, the aggregator should skip the adapter and return a normal partial enrichment result rather than treating that as a company-add failure.

The adapter should only run during add-time or explicit refresh-time profile enrichment. It should not implement or be wired into external company search. Search remains the cheaper SEC cached ticker dataset plus Finnhub search path.

The daily budget should be enforced locally below the published free-tier ceiling, with a target cap of about 20 calls per day to leave a safety margin for manual tests, clock skew, and accidental duplicate requests. Because the app is currently single-instance, an in-memory daily counter is acceptable for the first release, but the design should isolate budget tracking behind a small service so persistence can be added later if hosted multi-instance deployment becomes important.

Alpha Vantage results should participate in the existing settled-result flow. Timeouts, upstream error payloads, rate-limit responses, malformed payloads, and "no data" responses should all normalize into source-specific adapter statuses. The aggregator should continue merging any successful SEC/Finnhub data and should record whether Alpha Vantage participated through `sourcesUsed` and the final `enrichmentStatus`.

## Data and Merge Policy

Alpha Vantage `OVERVIEW` can contribute fields that are hard to get from the other free sources:

- `Description` as the preferred source for the company description when present.
- `Sector` and `Industry` as preferred classification fields when present and non-placeholder.
- `Country`, `Exchange`, `Name`, and `MarketCapitalization` as fallback or tie-breaker profile fields when existing higher-priority sources lack them.
- `Symbol` only as a consistency check against the selected ticker, not as a new identity source.

Field precedence should stay explicit and deterministic. SEC remains the most trusted source for U.S. identity fields such as CIK and legal ticker association. Finnhub remains the primary keyed enrichment source for practical UI metadata such as website, logo, country, and many profile basics. Alpha Vantage is best treated as the preferred source for description and sector/industry when available, while acting as a lower-priority fallback for overlapping identity/profile fields.

Missing, `"None"`, empty string, zero market cap, or obviously placeholder values from Alpha Vantage should be normalized to null before merge. Market capitalization should be parsed conservatively into the application's existing normalized market-cap representation; parsing failure should drop the field instead of failing enrichment.

## Rate Limiting and Budget Behavior

The budget gate should run before the HTTP request is attempted. When no Alpha Vantage budget remains, the adapter should return a budget/rate-limited status without consuming a request slot.

The counter should reset on a calendar-day boundary. If the implementation cannot reliably know Alpha Vantage's server-side reset time, use a simple local-date UTC reset and keep the cap below the published 25/day ceiling. The response should be observable in tests so a daily budget exhaustion path can be verified without making real API calls.

Do not retry Alpha Vantage calls automatically after a 429 or rate-limit-style payload. The product can expose explicit refresh later, but retry loops are hostile to a 25/day quota.

## Failure and Product Semantics

Alpha Vantage is optional enrichment. A failed Alpha Vantage call should not block company creation when SEC or Finnhub produced usable identity data. If Alpha Vantage is the only source that fails, the final company should generally be `PARTIAL`, with `sourcesUsed` excluding `ALPHA_VANTAGE`.

If SEC and Finnhub fail but Alpha Vantage succeeds, the system may use Alpha Vantage profile data as partial enrichment for the selected ticker, but should be careful not to invent stronger identity confidence than the source provides. If all enabled profile sources fail, the existing minimal-company fallback behavior should remain intact.

Observability should log source name, normalized status, latency, and budget decision, but never the Alpha Vantage API key.

## Options and Trade-offs

### Implement now versus defer

Implementing Alpha Vantage now exercises the third-source merge path, budget protection, and richer profile fields. Deferring it keeps the first release simpler and avoids burning scarce daily calls during development. The architecture should make either choice cheap by keeping the adapter optional and feature-flagged.

### In-memory budget versus persisted budget

An in-memory budget is simpler and matches the current single-user, likely single-instance release. It can reset unexpectedly on process restart, which means a crash or deploy could allow extra calls. A persisted budget would be stricter but adds database or cache complexity for an optional source. For the first release, in-memory with a conservative cap is the better trade-off.

### Adapter-owned budget versus shared provider limiter

Putting the daily budget inside the Alpha Vantage adapter keeps the first implementation focused. A shared provider-limiter abstraction would help if more scarce APIs are added later, but it risks adding ceremony before the app needs it. The useful compromise is a small budget service local to company-data that can later be generalized.

## Scope
- Alpha Vantage `OVERVIEW` adapter, feature-flagged via `ENABLE_ALPHA_VANTAGE`.
- Daily-budget rate limiter (cap ~20/day for safety margin), never called from the cheap search-as-you-type path.
- `enrichmentStatus`/`sourcesUsed` correctly reflect whether Alpha Vantage participated.
- Explicit merge precedence for Alpha Vantage description, sector, industry, and overlapping fallback fields.
- Unit coverage for success, disabled/unconfigured state, budget exhaustion, upstream error/rate-limit response, timeout, and malformed/no-data payloads.
- No change to the user-facing search contract beyond richer data appearing after company add/refresh when Alpha Vantage is enabled.

## Out of Scope

- Using Alpha Vantage for search-as-you-type or symbol discovery.
- Premium Alpha Vantage plans or higher daily quotas.
- Persisted distributed budget tracking across multiple backend instances.
- Real-time prices, technical indicators, earnings, cash flow, balance sheet, or other Alpha Vantage endpoints beyond `OVERVIEW`.
- UI controls for manually selecting data-source precedence.

## Depends on
03-finnhub-adapter.

## Action Items

- Create or confirm an Alpha Vantage account and provide `ALPHA_VANTAGE_API_KEY` through local and hosted backend environment configuration, if the decision below is to enable it.

## Resolved Decisions

All open questions from the specs stage are resolved:

1. `ENABLE_ALPHA_VANTAGE` defaults to false in `.env.example` and requires an explicit `true` value plus `ALPHA_VANTAGE_API_KEY`; it does not auto-enable when only the key is present.
2. Alpha Vantage budget exhaustion or other optional-source failure is neutral when SEC and Finnhub succeed — enrichment stays `COMPLETE` and `sourcesUsed` simply excludes `ALPHA_VANTAGE`.
3. The in-memory budget resets on UTC calendar-day boundaries.
4. The adapter ships disabled by default; opt in locally or in hosted env when ready to spend the scarce daily quota.
5. First release assumes a single backend instance; budget tracking stays in-memory behind a small dedicated service so persistence can be added later if multi-instance deployment becomes necessary.

## Open Questions

None. All five specs-stage questions are resolved above.

## Research References

- [Alpha Vantage API documentation](https://www.alphavantage.co/documentation/)
- [Alpha Vantage support: free service limits](https://www.alphavantage.co/support/)

## Reference
`02-specs/mini-research-tracker-idea.md` ("Company-data aggregation", "Open Questions" #4) is the current, cross-model-approved authority — confirms the 25 req/day free ceiling, that it must stay out of search-as-you-type, and flags whether to enable it at all in the first release as still open. `task-pipeline-and-research-tracker-plan.md` (Part B: "External data sources") has the same numbers with more implementation-level framing (env var name, safety-margin budget).

## Outcome

Shipped on 2026-07-23.

**Built**

- Optional `ALPHA_VANTAGE_API_KEY` and `ENABLE_ALPHA_VANTAGE` in `env.validation.ts`; adapter disables cleanly unless both flag and key are present.
- `AlphaVantageBudgetService` with in-memory UTC daily cap of 20 calls, checked before HTTP and isolated for future persistence.
- `AlphaVantageRequestSchedulerService` for `OVERVIEW` requests (5s timeout, no retries on 429/`Note`/`Information` payloads, structured logging without the API key).
- `AlphaVantageAdapter` profile-only integration (`search`/`resolveTicker` return `disabled`); aggregator calls it only from `fetchProfiles()`.
- Extended `NormalizedCompanyProfile` and merge rules so Alpha Vantage preferred `description`, `sector`, and `industry`; Finnhub keeps `country`, `website`, `logo`, and primary `marketCapUsd`; SEC keeps `cik`.
- `sourcesUsed` includes `ALPHA_VANTAGE` only on successful enrichment; core `enrichmentStatus` remains driven by SEC + Finnhub.
- `CompaniesService.create` persists `sector` and `description`.

**Verification**

- `npm test` — 99 unit tests pass in `backend/`.
- `npm run build` — succeeds from `backend/`.
- `npm run test:e2e` — 12 e2e tests pass, including a new mocked Alpha Vantage overview case that confirms search contract unchanged, `COMPLETE` enrichment preserved, and merged description/sector/industry plus `ALPHA_VANTAGE` in `sourcesUsed`.
- `browser-tasks/alpha-vantage-api-key.md` completed; key stored only in untracked `backend/.env`.

**Deviations**

- Task sat in `03-ready/` with specs-stage sign-offs only (no separate specs → ready elevation); implementation followed the written scope and resolved the listed open questions directly.
- No refresh-enrichment endpoint yet; Alpha Vantage runs on company create only, matching current product surface.
