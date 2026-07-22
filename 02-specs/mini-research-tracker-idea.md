---
title: Mini Research Tracker
domain: [backend, frontend, infra]
stage: specs
pipeline_role: reference
created: 2026-07-22
---

# Mini Research Tracker

> **Reference only — not an actively-advancing task.** This whole-project architecture spec is exempt from the `advance-task` procedure (see `AGENTS.md` → "Reference-only files") — it does not itself continue to `03-ready`/`04-shipped`. The actual pipeline tasks are `01-ideas/01-monorepo-scaffold.md` through `09-polish.md`, each of which cites this doc as its architecture authority.

## Sign-offs

- gpt-5 — 2026-07-22 — ideas → specs
- claude-sonnet-5 — 2026-07-22 — ideas → specs

## Context

Build a personal research notebook for tracking how an investment thesis changes over time. The project is deliberately small enough for one person to complete, but deep enough to exercise full-stack architecture, third-party data integration, failure handling, relational modeling, and constrained AI output.

This is not a stock screener and does not make investment recommendations. It organizes a user's own notes around companies, conviction, moat patterns, and business-model patterns. AI assists with classification and synthesis but is never treated as a source of financial truth.

## Product Scope

The product has three primary surfaces:

1. A dashboard of tracked companies, filterable by conviction, moat pattern, and business-model pattern.
2. A company-add flow that searches external sources, creates a normalized company record, and records which sources supplied its data.
3. A company detail view containing timestamped research notes, current conviction, and an on-demand summary of the user's current thesis.

Each note may carry two independent optional classifications:

- **Moat pattern:** Scale Economies, Network Effects, Switching Costs, Counter-Positioning, Brand, Cornered Resource, or Process Power.
- **Business-model pattern:** Low Cost Operator, Franchisor, B2B Middleman, Serial Acquirer, Mission-Critical Products and Services, Vertically Integrated Retailer, Auctions and Classifieds, B2B Software, Marketplaces and Platforms, OEM with an Installed Base, Unique IP or Brands, Physical Infrastructure and Networks, or Insurers and Financials.

Conviction is a separate company-level state with a deliberately small progression: Watching, Building Conviction, and High Conviction.

The first release is single-user and has no authentication. It stores no brokerage credentials, holdings, transactions, or portfolio values.

## Architecture

### Chosen service boundary

Use a TypeScript monorepo with a NestJS domain API, a Next.js frontend, and PostgreSQL accessed through Prisma.

- The NestJS service owns companies, notes, taxonomy values, conviction, external company-data aggregation, and persistence.
- The Next.js application owns the browser experience and server-side AI orchestration. Its server-only routes can stream summary output without exposing provider credentials to the browser.
- PostgreSQL is the system of record. Neon is the preferred hosted provider because it remains standard Postgres and supports pooled connections suitable for serverless consumers.

This split adds more deployment and local-development overhead than a single Next.js application, but that overhead is intentional: the project is meant to exercise a clear frontend/backend contract and independent service reasoning. A single Next.js service would be the pragmatic alternative if fastest delivery became more important than the learning goal.

The frontend must not call the NestJS service directly from browser code. Server-side calls keep the backend address private, avoid an unnecessary public CORS contract, and centralize credential handling.

### Company-data aggregation

Use adapters around three asymmetric sources rather than allowing vendor response shapes into the domain model:

- **SEC EDGAR** is the always-available U.S. identity source. Its public ticker and exchange association data can support cached local search and supply CIK, legal name, ticker, and exchange data. Requests must identify the application and remain within SEC fair-access guidance.
- **Finnhub** is the primary keyed enrichment source. Its symbol search and free company-profile operation can add country, industry, website, logo, exchange, and market-cap metadata.
- **Alpha Vantage** is optional, add-time enrichment. Its company overview can add richer descriptive and classification data, but the free allowance is currently only 25 requests per day, so it must not participate in search-as-you-type.

Search should combine the cached SEC ticker dataset with Finnhub results. Adding a company should request all enabled profile sources concurrently with per-source timeouts and settled results, then pass the results through a deterministic merge policy. Source precedence is defined per field rather than by choosing one globally "best" vendor.

Partial data is a normal result, not a request failure. Persist source provenance, last-enriched time, and an enrichment state such as complete, partial, or failed. If every enrichment source fails, the user may still save a minimal company record from the selected ticker and retry enrichment later.

Protect upstream services with caching, request coalescing, bounded concurrency, and provider-specific rate limits. Alpha Vantage should be feature-flagged and budgeted below its published daily ceiling. SEC datasets should be cached for a long interval because ticker metadata changes slowly.

### Persistence model

The core concepts are Company, Note, and External Data Cache.

A company stores normalized identity and profile data, conviction, source provenance, enrichment state, the current generated thesis summary, and timestamps. A note belongs to one company and stores its text, the two optional user-approved classifications, optional AI suggestions, whether the user changed those suggestions, and timestamps.

Use database enums for conviction and the two fixed taxonomies. They are intentionally curated and not user-editable, so database validation and generated TypeScript types are more valuable than runtime taxonomy editing. The trade-off is that changing the taxonomy later requires a migration.

Use a uniqueness constraint on normalized ticker within the supported market scope. If the product later expands beyond U.S.-centric symbols, identity must evolve to a composite such as exchange plus ticker or a stable vendor identifier; a bare ticker is not globally unique.

Use ordinary indexed relational filters for the first release. PostgreSQL full-text search is a reasonable later enhancement for company descriptions and note bodies, but it is not needed to validate the core product.

At runtime, use Neon's pooled connection string. Schema migrations and administrative operations should use the direct connection because transaction-pooling behavior can conflict with session-dependent operations.

## AI Behavior

### Tag suggestion

When a user writes a note, AI may suggest at most one moat pattern and one business-model pattern, either of which may be absent. Use the AI SDK's current structured-output flow: `generateText` with `Output.object()` and a schema constrained to the fixed taxonomy values. The older `generateObject` API should not be the design target.

The user can accept or override each suggestion before saving. Model failure, timeout, or invalid output must never block saving the note; the UI falls back to manual selection and records no suggestion.

### Current-thesis summary

Summary generation is explicitly user-triggered. It receives the company name and the user's note history, not live prices or model-generated financial data. The prompt must instruct the model to summarize only supplied notes, acknowledge conflicting observations, and avoid inventing figures or recommendations.

Input growth is bounded by a token or character budget. Prefer the newest notes while retaining chronological order in the final prompt, and visibly indicate when older notes were omitted. A successful result replaces the displayed current-thesis summary and records when it was generated. A failed attempt leaves the previous summary intact.

Provider-specific code should remain behind the AI SDK boundary so the initial model provider can be changed without redesigning the product contract.

## Reliability and Safety

- Give every external call a timeout and normalize upstream errors into source-specific statuses.
- Treat HTTP 429 responses as rate-limit events and respect retry guidance where provided; do not immediately fan out retries.
- Log provider name, latency, result status, and request correlation identifiers, but never API keys, full prompts, or private note content by default.
- Validate and cap note length at the application boundary before storing it or sending it to an AI provider.
- Keep all API credentials server-side and outside version control.
- Present generated summaries as editable AI-assisted synthesis, not investment advice or verified financial analysis.
- Make destructive company deletion explicit because it also removes the associated note history.

## Deployment Approach

The intended low-cost deployment is Next.js on Vercel, NestJS on a Render web service, and PostgreSQL on Neon. Render's free web services currently spin down after 15 minutes without inbound traffic and can take about a minute to restart, so the UI needs a clear cold-start loading state. Deployment is not required to begin implementation and should remain a separately approved action.

## Scope Boundaries

### Required for the first usable release

- Single implicit user with no authentication.
- Company search and add using SEC plus at least one keyed enrichment source.
- Deterministic multi-source merge with partial-failure behavior and provenance.
- Company dashboard and detail view.
- Notes with conviction and both classification dimensions.
- Non-blocking AI tag suggestions and on-demand thesis summaries.
- Basic filtering and clear loading/error states.

### Optional or deferrable

- Alpha Vantage enrichment beyond SEC and Finnhub.
- PostgreSQL full-text search.
- Activity feed.
- Streaming summary text; a non-streaming response is acceptable initially.
- Summary version history.
- Authentication, multi-user isolation, chat over notes, embeddings, vector search, automated financial analysis, and portfolio tracking.

## Trade-offs

### Split backend versus one full-stack service

The NestJS/Next.js split creates a stronger architecture exercise and clearer ownership, but duplicates configuration and deployment work. A single Next.js service would reduce complexity without changing the product; choose it only if the time box becomes the dominant constraint.

### Multiple external sources versus one

Multiple sources demonstrate normalization and graceful degradation while filling gaps in any one profile. They also introduce rate limits, conflicting values, provenance requirements, and more failure modes. The merge layer must therefore stay pure and deterministic, and the product must remain useful when only SEC data is available.

### Fixed enums versus editable tags

Fixed enums provide consistent filtering, schema-constrained AI output, and end-to-end type safety. Editable tags would be more flexible but would weaken comparability and require taxonomy-management UI that is outside the learning goal.

### Persisted summary versus computed-only output

Persisting the current summary makes the company page fast and preserves the last successful result during provider failures. It can become stale, so the interface must show the generation time and require an explicit refresh.

## Action Items

- Create a Finnhub account and obtain an API key.
- Decide whether Alpha Vantage enrichment is enabled for the first release; if enabled, create an account and obtain an API key.
- Choose an AI provider supported by the AI SDK and obtain its API key.
- Provide a descriptive SEC `User-Agent` value containing an application identifier and contact information.
- Create a Neon project and obtain both pooled runtime and direct migration connection strings before hosted integration testing.
- If deployment is approved later, create or confirm Vercel and Render accounts and connect the repository through their dashboards.

## Open Questions

1. Which AI provider should be the default for the first release?
2. Should regenerating the current thesis overwrite the previous summary, or should users be able to inspect summary history?
3. Is a hosted demo part of the first milestone, or is a reproducible local build sufficient initially?
4. Should Alpha Vantage be enabled in the initial build despite its 25-request daily free limit, or remain a documented optional adapter?

## Research References

- [SEC Developer Resources and fair-access guidance](https://www.sec.gov/about/developer-resources)
- [SEC ticker and exchange association datasets](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)
- [Finnhub API documentation](https://finnhub.io/docs/api)
- [Alpha Vantage API documentation](https://www.alphavantage.co/documentation/)
- [Alpha Vantage free-service limits](https://www.alphavantage.co/support/)
- [AI SDK structured-data generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [Prisma guidance for Neon](https://docs.prisma.io/docs/orm/v6/overview/databases/neon)
- [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Render free-service limitations](https://render.com/docs/free)
