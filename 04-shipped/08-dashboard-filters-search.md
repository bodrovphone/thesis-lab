---
title: Dashboard filters + Postgres full-text search
domain: [backend, frontend]
stage: shipped
created: 2026-07-22
---

# Dashboard filters + Postgres full-text search

## Sign-offs
- gpt-5-codex — 2026-07-23 — ideas → specs
- claude-sonnet-5 — 2026-07-23 — ideas → specs

## Context
Makes the dashboard useful once there is more than a couple of tracked companies. Users need to narrow the company list by the fixed research taxonomy and conviction state, with optional free-text discovery across company identity and note content.

## Technical Approach

### Required first-release behavior

The dashboard list supports the three existing fixed dimensions:

- moat pattern, matched through notes associated with a company;
- business-model pattern, matched through notes associated with a company; and
- company conviction level.

Multiple active controls combine with AND semantics. Within a single taxonomy control, the UI may expose one selected value initially; the backend should preserve a path to multiple values without changing the meaning of a single-value request. A company appears once even when several of its notes match. Companies with no matching notes are excluded from a tag-filtered result, while a company-level conviction filter is evaluated directly on the company.

The filter bar consumes the canonical taxonomy values and labels already exposed by the application rather than duplicating label definitions in the frontend. Clearing a control removes that predicate. Empty results, loading, and request-error states are explicit and preserve the selected controls so the user can recover without reconstructing the query.

### Optional full-text search

If included in the time box, free-text search covers normalized company identity fields plus note bodies. Search terms are parsed by PostgreSQL full-text search, not interpolated into SQL; the implementation must use a parameterized query and a stable language configuration. Search should be tolerant of ordinary punctuation and whitespace, and should return companies rather than individual matching notes. Search combines with the structured filters using AND semantics.

The search index should be maintained from the source fields, with a GIN-backed vector once the schema and migration workflow support it. A generated or trigger-maintained vector is preferable to application code that can drift from persisted notes. The trade-off is migration and update complexity: PostgreSQL full-text search improves discovery for larger note collections but adds database-specific behavior and a migration that the Prisma schema may not express completely. A simpler `ILIKE` fallback is easy to build but will not provide linguistic matching or a scalable index and should not be presented as equivalent FTS.

### Alternatives and trade-offs

The simplest architecture is to ship only indexed relational predicates. It matches the approved first-release architecture, has predictable query behavior, and keeps the task focused on dashboard usability. The downside is that users cannot search note prose.

The richer architecture adds a database-maintained search vector and full-text predicate. It provides scalable note/company discovery and leaves room for ranking later, but requires hand-reviewed migration SQL, language/configuration decisions, and query tests against a real Postgres instance. It should remain independently cuttable so search does not delay basic filters.

Client-side filtering is rejected for the durable design because it downloads all companies and notes, becomes stale across pages, and cannot scale with the dataset. The browser should send filter state to the server-side data boundary and render the returned company list.

## UX and Reliability Boundaries

- Debounce free-text requests so typing does not create one backend request per keystroke; filters may apply immediately.
- The dashboard (`frontend/src/app/page.tsx`) is currently a plain Server Component with no query-param or client-fetch wiring at all — this task introduces the first filter/search state, not an extension of an existing convention. Two reasonable shapes: (a) filter controls push `?conviction=&moatPattern=&businessModel=&q=` onto the URL and the page re-renders server-side off `searchParams` through the existing server-only data path — bookmarkable/shareable, no new client-fetching layer, consistent with the app's server-only backend access; or (b) filter controls hold client state and call a same-origin API route (the app already has this proxy shape elsewhere, e.g. `frontend/src/app/api/companies/[id]/summary/`) for a snappier no-navigation interaction, at the cost of introducing client-side fetch/loading-state handling this page doesn't have today. Recommend (a) for consistency with the rest of the app's all-server-component dashboard; (b) is the reasonable alternative if that navigation cost turns out to matter more than the consistency.
- Give the dashboard two distinct empty states: "no companies tracked yet" (zero companies exist) versus "no companies match these filters" (companies exist, current filter/search combination matches none) — conflating them reads as a bug on first use of the filter bar.
- Use a minimum meaningful search length if needed to avoid broad expensive queries, and define the behavior for clearing or submitting shorter input consistently.
- Apply bounded pagination or an equivalent result limit so a broad query cannot return an unbounded company list. Preserve the existing dashboard sort unless product behavior requires a change.
- Validate enum-like filter values at the API boundary and reject unknown values with the project’s normal validation response.
- Treat a search-index/migration failure as an implementation failure to diagnose, not as permission to silently fall back to an unbounded query. The required relational-filter path must remain independently usable.

## Scope Split

Non-cuttable: server-side filtering by moat pattern, business model, and conviction; canonical taxonomy wiring; combined-filter behavior; clear loading/error/empty states; and regression coverage for matching companies once through the list boundary.

Cuttable: the search box, search-vector migration, ranking/highlighting, multi-select filter controls, saved filter views, and search suggestions. If cut, leave the list contract ready to accept a future search parameter but do not add a misleading UI control.

## Depends on
05-notes-crud-tagging.

## Reference
`02-specs/mini-research-tracker-idea.md` ("Persistence model", "Scope Boundaries") is the current, cross-model-approved authority — confirms ordinary indexed relational filters are sufficient for the first release and explicitly lists Postgres full-text search as optional/deferrable, not required. `task-pipeline-and-research-tracker-plan.md` (Part B: "Data model", "NestJS backend" endpoints) still has the endpoint shape and `tsvector` migration notes.

## Action Items

- No account, browser registration, API key, or other external setup is required for the relational-filter portion.
- If full-text search is selected for the first release, confirm the production Postgres version and the supported text-search language/configuration before writing the migration.
- If the dashboard is deployed before this task is implemented, confirm that the hosted database migration process permits the required Postgres-specific vector/index SQL and that rollback ownership is understood.

## Open Questions

1. Should full-text search be included in the first release, or should this task ship only the required relational filters and leave search as a follow-up? The approved architecture recommends deferring it when delivery time is constrained.
2. If full-text search is included, should matching notes be represented only by the company result, or should the dashboard also show a short matching-note preview? The default recommendation is company results only; previews expand the response contract and expose more note content on the dashboard.

## Outcome

Shipped on 2026-07-23.

**Built**

- `GET /companies` extended with optional `conviction`, `moatPattern`, `businessModel`, and `limit` query params; validated via `ListCompaniesQueryDto`.
- Server-side AND semantics: conviction on the company row; moat/business-model via `notes.some` (companies without matching notes excluded from tag filters).
- Response envelope now includes `totalTracked` (unfiltered count) alongside `items` for distinct empty-state messaging.
- Multi-value backend path for tag filters (comma-separated or repeated params); UI ships single-select per control.
- Dashboard filter bar (`DashboardFilters`) wired to URL search params; page re-renders server-side from `searchParams`.
- Taxonomy labels sourced from `GET /tags` — no duplicated label map in the frontend.
- Separate empty states for zero tracked companies vs zero filter matches; error state preserves URL filter selections.
- Dashboard `loading.tsx` skeleton for filter navigation.

**Resolved decisions**

1. Full-text search deferred — relational filters only; no search box or `q` param added.
2. URL-driven server-component approach (spec option a) over client-side fetch.

**Verification**

- Backend unit tests pass for service/controller filter logic.
- E2e tests cover AND semantics, tag-filter exclusion, and invalid enum rejection (20/20 passing).
- Frontend `tsc --noEmit` passes.

**Deviations**

- No Postgres FTS migration or search vector — explicitly cut per scope split.
- No new Prisma schema migration; existing note indexes on `moatPattern` and `businessModel` were sufficient.
