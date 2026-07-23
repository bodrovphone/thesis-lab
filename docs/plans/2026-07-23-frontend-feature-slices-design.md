# Frontend Feature-Slices Cleanup Design

## Goal

Reorganize the Next.js frontend so route `page.tsx` files stay thin, and UI/helpers live in pragmatic feature folders inspired by Feature-Sliced Design — without a full FSD migration or behavior changes.

## Constraints

- Preserve signed-off behavior: moves and import updates only; no UX/CSS redesign; no API contract changes.
- Prefer incremental slices with frontend tests + production build after each slice.
- Do not over-engineer: no entities/widgets/processes layers, no import-boundary linters, no long-lived re-export shims unless a slice becomes painful.
- Keep existing shared infra in place (`lib/`, `hooks/`, `types/`) rather than relocating for its own sake.

## Chosen approach

**Pragmatic FSD-inspired layout** under `frontend/src/features/`, with `app/` as thin App Router shells.

Rejected alternatives:

- Route-colocated `_components` under `app/` — less clear sharing and weaker FSD shape.
- Full FSD (`shared` / `entities` / `features` / `widgets` / `processes`) — too much churn for current size.

## Target layout

```
frontend/src/
  app/                              # thin RSC pages + BFF api routes
  features/
    dashboard/                      # home list/filter UI + filter helpers
    company-detail/                 # detail page sections + research UI
    company-search/                 # search island
  components/                       # app-shell leftovers only (e.g. sidebar)
  hooks/                            # shared hooks (unchanged role)
  lib/                              # api / ai / query / small format helpers
  types/                            # shared view types + existing formatters
```

Exact filenames can follow current kebab-case component names when moved.

## Slice plan

1. **Dashboard** — extract `buildFilters`, `hasActiveFilters`, `FilterBar`, `CompanyListBody` from `app/page.tsx`; move `dashboard-filters` and `company-card` into `features/dashboard/`; page becomes fetch + compose.
2. **Company detail** — extract header / metadata blocks from `app/companies/[id]/page.tsx`; move `company-notebook`, `activity-feed`, `conviction-selector`, `enrichment-status`, and `current-thinking-panel` into `features/company-detail/`.
3. **Company search** — move `company-search` (including local `SourceBadges`) into `features/company-search/`.
4. **Light shared cleanup** — only cheap wins (e.g. `relativeTime` / `formatGeneratedAt` into `lib/format` or beside existing formatters). Do not deep-refactor notebook mutation logic.
5. **Docs** — document the convention in `frontend/README.md`; touch other docs only if paths or structure claims become wrong.

## Safety and verification

After each slice:

- Update imports and colocated tests.
- Run `npm run test --workspace frontend`.
- Run `npm run build --workspace frontend`.

Stop and fix before starting the next slice if either fails.

## Out of scope

- Visual redesign or Astryx migration.
- Relocating `lib/api`, `lib/ai`, or App Router `api/` routes.
- Strict FSD public-API barrels and cross-layer enforcement.
- Backend changes.
