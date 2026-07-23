---
title: Notes CRUD + manual tagging (moat pattern + business model + conviction)
domain: [backend, frontend]
stage: shipped
created: 2026-07-22
---

# Notes CRUD + manual tagging (moat pattern + business model + conviction)

## Sign-offs

- gpt-5-codex — 2026-07-23 — ideas → specs
- cursor-grok-4.5 — 2026-07-23 — ideas → specs

## Context

Turns the product from a company-data tracker into a research notebook: users record observations, classify them with two fixed taxonomy dimensions, and maintain a separate company-level conviction state. Manual tagging comes first so the data model, APIs, persistence, and company-detail UX are proven before AI suggestion (task 06) is layered on.

**Depends on** `04-shipped/02-sec-edgar-vertical-slice.md` (company detail page + companies API). Schema foundation already ships `Note`, taxonomy enums, and cascade delete from Company (`04-shipped/01-monorepo-scaffold.md`). Finnhub enrichment (`04-shipped/03-finnhub-adapter.md`) is helpful but not required for notes.

Authoritative classification rules: `02-specs/mini-research-tracker-idea.md` (Product Scope, Persistence model).

## Goal

A user can:

1. Set company conviction (Watching / Building Conviction / High Conviction) from the company detail page.
2. Create a note with required body text and optional independent moat + business-model tags.
3. See notes newest-first on the company detail page, with tags and timestamps.
4. Update and delete notes (editability scope is an Open Question; default recommendation below).
5. Load taxonomy options (machine values + human labels) from the backend so the UI does not drift from DB enums.

No AI suggestion, thesis summary, dashboard tag filters (unless trivial), FTS, or taxonomy admin.

## Technical approach

### Domain ownership

NestJS owns notes and taxonomy. A note belongs to one company; body is required; `moatPattern` and `businessModel` are independently optional/nullable. Company cascade-deletes notes. Editing/deleting a note must not mutate enrichment/profile fields.

Conviction lives on **Company**, not on notes — current stance vs timestamped evidence.

AI suggestion columns already on `Note` (`aiSuggestedMoatPattern`, `aiSuggestedBusinessModel`, `tagEditedByUser`) stay **unused** in this task; do not invent partial AI behavior. Canonical display/filter tags are the user-approved fields only.

### Taxonomy (fixed enums — already in Prisma)

Machine values must match the shipped schema exactly:

| Dimension | Values |
| --- | --- |
| Moat | `SCALE_ECONOMIES`, `NETWORK_EFFECTS`, `SWITCHING_COSTS`, `COUNTER_POSITIONING`, `BRAND`, `CORNERED_RESOURCE`, `PROCESS_POWER` |
| Business model | `LOW_COST_OPERATOR`, `FRANCHISOR`, `B2B_MIDDLEMAN`, `SERIAL_ACQUIRER`, `MISSION_CRITICAL_PRODUCTS_SERVICES`, `VERTICALLY_INTEGRATED_RETAILER`, `AUCTIONS_AND_CLASSIFIEDS`, `B2B_SOFTWARE`, `MARKETPLACES_AND_PLATFORMS`, `OEMS_WITH_INSTALLED_BASE`, `UNIQUE_IP_OR_BRANDS`, `PHYSICAL_INFRASTRUCTURE_NETWORKS`, `INSURERS_AND_FINANCIALS` |
| Conviction | `WATCHING`, `BUILDING_CONVICTION`, `HIGH_CONVICTION` |

`GET /tags` (or equivalent) returns each set as `{ value, label }[]` with stable human labels suitable for UI and tests. Backend is the label source of truth to avoid drift; frontend may use generated TS types for values but should not hand-maintain a parallel taxonomy list.

Trade-off: renaming/adding values later needs a migration — accepted for validation, filtering, and future AI structured output.

### Backend behavior (conceptual)

- Notes create/list scoped under a company; update/delete by note id (mixed nesting is fine for single-user).
- Validate note body: trim, reject empty; enforce an application max length (recommend ~4,000 chars, aligned with the later AI tag-suggest input cap). Invalid enum values → 400, never stored as free strings.
- `PATCH /companies/:id` for conviction must be narrowly scoped (whitelist `convictionLevel` only) so enrichment-managed profile fields cannot be overwritten from the notebook UI.
- Company detail should be renderable without a browser-visible second hop for notes: either include notes on `GET /companies/:id`, or compose company + notes in the Next.js server layer (Open Question #2). Prefer no flicker between profile and notes on happy path.
- Dashboard filtering by note tags / conviction is product-scope later (task 08); this task should not pull in FTS or a full filter bar. If existing list endpoints already accept unused query params, leave them alone.

Exact route strings, DTOs, and module paths belong in `03-ready`.

### Frontend behavior

Extend company detail into a quiet notebook surface:

- Conviction selector near the header/profile area.
- Note form: body + optional moat + optional business-model selectors (tags not required to save).
- Notes list newest-first; show selected tags clearly; empty / loading / validation / mutation-error states.
- After create/update/delete/conviction change, refresh relevant detail data and keep writing flow comfortable.
- Server-only backend access (`BACKEND_URL`); browser talks to same-origin Next routes/actions only, consistent with prior slices.

Two tag dimensions should look visually distinct without in-app taxonomy essays.

### Persistence

Use existing `Note` model and indexes (`companyId+createdAt`, moat, business model). Sort default: `createdAt DESC`. No schema migration expected unless a gap appears vs shipped Prisma. No `tsvector` / GIN work here.

Destructive company deletion already cascades notes; confirmation UX can wait for polish if not present.

## Trade-offs

### Backend-owned vs frontend-owned labels

Backend-owned labels avoid drift and keep one contract for UI + later AI routes. Chosen.

### Nested vs standalone note routes

Mixed: create/list under company, update/delete by note id. Matches mental model without awkward update URLs.

### Manual-only vs AI scaffolding now

Manual-only. Leave AI columns null/unused.

### Full edit vs append-only / tag-only edit

Full edit is friendlier for a personal notebook (typos, reclassification). Append-only is a stronger audit trail but more ceremony. Specs recommendation: allow full edit in v1; Open Question #1 can still choose tag-only body lock.

### Immediate delete vs confirm

Personal single-user: immediate delete with resilient error UI is acceptable; confirmation is optional polish (Open Question #3).

## Scope

### In

- Note CRUD + validation
- `GET /tags` with values + labels for all three enums
- Narrow conviction `PATCH` on companies
- Company detail notebook UI (form, list, conviction selector, states)
- Tests for note CRUD, tags shape, conviction update, and frontend data mapping at the repo’s existing level

### Out

- AI tag suggestion / rationale / providers
- Thesis summary generation
- User-editable taxonomy admin
- Auth / multi-user
- Note FTS, rich text, attachments, version history
- Full dashboard filter bar (task 08) unless already trivial

## Action Items

- None beyond a working local Postgres + applied scaffold migration and a bootable company detail from the shipped SEC slice.
- Hosted Neon only if intentionally testing against it — configure connection strings first.

## Open Questions

1. Notes editable after create (full body + tags — recommended), tag-only edits, or append-only body?
2. Notes embedded in `GET /companies/:id`, or separate notes list composed server-side by Next?
3. Note delete: immediate, or confirm dialog in v1?
4. Ship any note-tag / conviction filters on the dashboard in this task, or defer entirely to task 08? (Recommend defer.)

## Research references

- `02-specs/mini-research-tracker-idea.md` — Persistence model, fixed enums, AI fields reserved for later
- `04-shipped/01-monorepo-scaffold.md` / `backend/prisma/schema.prisma` — exact enum and Note columns
- `04-shipped/02-sec-edgar-vertical-slice.md` — company detail + server-only frontend patterns to extend
- `01-ideas/task-pipeline-and-research-tracker-plan.md` (Part B) — draft endpoint/component sketch (reconcile; do not override shipped schema)

## Outcome

Shipped on 2026-07-23.

**Built**

- `TaxonomyModule` with backend-owned labels and `GET /tags` returning moat, business-model, and conviction `{ value, label }[]` sets.
- `NotesModule` with company-scoped create/list (`POST/GET /companies/:companyId/notes`) and id-scoped update/delete (`PATCH/DELETE /notes/:id`); body trim, 4,000-char cap, enum validation; AI suggestion columns left unused.
- Narrow `PATCH /companies/:id` whitelisted to `convictionLevel` only; `GET /companies/:id` embeds notes newest-first.
- Company detail notebook UI: conviction selector, note form with optional tags, editable note list with distinct moat/business tag styling, mutation error states.
- Same-origin Next.js API routes proxying all note/taxonomy/conviction mutations via server-only `BACKEND_URL`.

**Resolved decisions**

1. Full body + tag edit after create.
2. Notes embedded on `GET /companies/:id` (no second-hop flicker).
3. Immediate delete with inline error UI (no confirm dialog).
4. Dashboard tag/conviction filters deferred to task 08.

**Verification**

- Backend unit tests pass (109 tests); frontend production build succeeds.
- E2e coverage added for taxonomy shape, note CRUD, conviction update, and validation failures (requires reachable Postgres).

**Deviations**

- No Prisma schema migration — existing `Note` model and enums were sufficient.
