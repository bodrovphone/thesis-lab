# Frontend Feature-Slices Cleanup Implementation Plan

> **For agentic workers:** Execute slice-by-slice in this session (or via subagents). Steps use checkbox (`- [ ]`) syntax for tracking. This is a **move/import refactor** — prefer verifying existing tests over inventing new TDD loops.

**Goal:** Thin App Router pages and group UI into pragmatic `features/` folders without changing signed-off behavior.

**Architecture:** Keep `app/` as thin RSC shells. Move dashboard, company-detail, and company-search UI into `frontend/src/features/*`. Leave `lib/`, `hooks/`, and `types/` as shared infra. Extract only cheap shared format helpers.

**Tech Stack:** Next.js App Router, React Server Components, existing Vitest suite, `@/` path alias (`frontend/tsconfig.json`).

**Design doc:** [`docs/plans/2026-07-23-frontend-feature-slices-design.md`](./2026-07-23-frontend-feature-slices-design.md)

---

## File map (end state)

| Path | Responsibility |
| --- | --- |
| `frontend/src/app/page.tsx` | Fetch taxonomy + company list; compose feature UI |
| `frontend/src/app/companies/[id]/page.tsx` | Fetch company + taxonomy; compose feature UI |
| `frontend/src/features/dashboard/build-filters.ts` | `buildFilters`, `hasActiveFilters` |
| `frontend/src/features/dashboard/filter-bar.tsx` | Tracked-companies heading + filters suspense |
| `frontend/src/features/dashboard/company-list-body.tsx` | Empty/filter/list rendering |
| `frontend/src/features/dashboard/dashboard-filters.tsx` | Client filter controls (moved) |
| `frontend/src/features/dashboard/company-card.tsx` | Company card link (moved) |
| `frontend/src/features/company-detail/*` | Detail UI pieces previously under `components/` |
| `frontend/src/features/company-detail/company-header.tsx` | Logo/ticker/name block extracted from page |
| `frontend/src/features/company-detail/company-metadata.tsx` | Sources + `<dl>` facts + added date |
| `frontend/src/features/company-search/company-search.tsx` | Search island (moved) |
| `frontend/src/components/app-sidebar.tsx` | App shell only (stays) |
| `frontend/src/lib/format/datetime.ts` | Optional shared `relativeTime` / `formatGeneratedAt` |
| `frontend/README.md` | Document `features/` convention |

---

### Task 1: Dashboard slice

**Files:**
- Create: `frontend/src/features/dashboard/build-filters.ts`
- Create: `frontend/src/features/dashboard/filter-bar.tsx`
- Create: `frontend/src/features/dashboard/company-list-body.tsx`
- Move: `frontend/src/components/dashboard-filters.tsx` → `frontend/src/features/dashboard/dashboard-filters.tsx`
- Move: `frontend/src/components/company-card.tsx` → `frontend/src/features/dashboard/company-card.tsx`
- Modify: `frontend/src/app/page.tsx`
- Keep using: `frontend/src/features/company-search/...` only after Task 3 — for this task, home page may still import `@/components/company-search`

- [ ] **Step 1: Create feature folder and move dashboard components**

```bash
mkdir -p frontend/src/features/dashboard
git mv frontend/src/components/dashboard-filters.tsx frontend/src/features/dashboard/dashboard-filters.tsx
git mv frontend/src/components/company-card.tsx frontend/src/features/dashboard/company-card.tsx
```

- [ ] **Step 2: Extract filter helpers**

Create `frontend/src/features/dashboard/build-filters.ts` with the existing helpers from `app/page.tsx` (same logic, exported):

```ts
import type { ListCompaniesFilters } from '@/lib/api/backend-client';

export interface DashboardSearchParams {
  conviction?: string;
  moatPattern?: string;
  businessModel?: string;
}

export function buildFilters(
  searchParams: DashboardSearchParams,
): ListCompaniesFilters | undefined {
  const filters: ListCompaniesFilters = {};

  if (searchParams.conviction) {
    filters.conviction = searchParams.conviction;
  }
  if (searchParams.moatPattern) {
    filters.moatPattern = searchParams.moatPattern;
  }
  if (searchParams.businessModel) {
    filters.businessModel = searchParams.businessModel;
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

export function hasActiveFilters(searchParams: DashboardSearchParams): boolean {
  return Boolean(
    searchParams.conviction ||
      searchParams.moatPattern ||
      searchParams.businessModel,
  );
}
```

- [ ] **Step 3: Extract `FilterBar` and `CompanyListBody`**

Move the existing `FilterBar` / `CompanyListBody` implementations into:

- `frontend/src/features/dashboard/filter-bar.tsx`
- `frontend/src/features/dashboard/company-list-body.tsx`

Update their imports to `@/features/dashboard/dashboard-filters` and `@/features/dashboard/company-card` / `build-filters` as needed. Do not change JSX or copy.

- [ ] **Step 4: Thin `app/page.tsx`**

`frontend/src/app/page.tsx` should only:

1. await `searchParams`
2. `getTags()` / `listCompanies(buildFilters(params))`
3. render shell + `CompanySearch` + `FilterBar` + list/error UI

Imports should point at `@/features/dashboard/...` (and still `@/components/company-search` until Task 3).

- [ ] **Step 5: Verify dashboard slice**

```bash
npm run test --workspace frontend
npm run build --workspace frontend
```

Expected: all tests pass; production build succeeds.

- [ ] **Step 6: Checkpoint (commit only if user asked)**

If committing: message like `refactor(frontend): extract dashboard feature slice`.

---

### Task 2: Company detail slice

**Files:**
- Move:
  - `company-notebook.tsx`
  - `activity-feed.tsx`
  - `conviction-selector.tsx`
  - `conviction-selector.test.tsx`
  - `enrichment-status.tsx`
  - `current-thinking-panel.tsx`
  → `frontend/src/features/company-detail/`
- Create: `frontend/src/features/company-detail/company-header.tsx`
- Create: `frontend/src/features/company-detail/company-metadata.tsx`
- Modify: `frontend/src/app/companies/[id]/page.tsx`

- [ ] **Step 1: Move detail components**

```bash
mkdir -p frontend/src/features/company-detail
git mv frontend/src/components/company-notebook.tsx frontend/src/features/company-detail/company-notebook.tsx
git mv frontend/src/components/activity-feed.tsx frontend/src/features/company-detail/activity-feed.tsx
git mv frontend/src/components/conviction-selector.tsx frontend/src/features/company-detail/conviction-selector.tsx
git mv frontend/src/components/conviction-selector.test.tsx frontend/src/features/company-detail/conviction-selector.test.tsx
git mv frontend/src/components/enrichment-status.tsx frontend/src/features/company-detail/enrichment-status.tsx
git mv frontend/src/components/current-thinking-panel.tsx frontend/src/features/company-detail/current-thinking-panel.tsx
```

Update the test import of `ConvictionSelector` to the new relative/alias path.

- [ ] **Step 2: Extract header and metadata from the page**

`company-header.tsx` owns logo + ticker/name + “Research record” status chip (existing markup).

`company-metadata.tsx` owns:

- source chips (`formatSourceLabel`)
- facts `<dl>` grid
- “Added {date}” line

Keep date formatting in the metadata component for now (Task 4 may share formatters later).

- [ ] **Step 3: Thin detail page**

`app/companies/[id]/page.tsx` becomes:

1. await params
2. `Promise.all([getCompany, getTags])`
3. `notFound()` if missing
4. compose: back link, header, conviction, enrichment, metadata, thinking/notebook/activity grid

All feature imports from `@/features/company-detail/...`.

- [ ] **Step 4: Verify detail slice**

```bash
npm run test --workspace frontend
npm run build --workspace frontend
```

Expected: pass, including `conviction-selector` tests.

---

### Task 3: Company search slice

**Files:**
- Move: `frontend/src/components/company-search.tsx` → `frontend/src/features/company-search/company-search.tsx`
- Modify: `frontend/src/app/page.tsx` import

- [ ] **Step 1: Move search component**

```bash
mkdir -p frontend/src/features/company-search
git mv frontend/src/components/company-search.tsx frontend/src/features/company-search/company-search.tsx
```

Leave local `SourceBadges` inside the file (no extra split required).

- [ ] **Step 2: Update home page import**

```ts
import { CompanySearch } from '@/features/company-search/company-search';
```

- [ ] **Step 3: Verify search slice**

```bash
npm run test --workspace frontend
npm run build --workspace frontend
```

Expected: pass.

---

### Task 4: Light shared cleanup

**Files (only if still cheap after Tasks 1–3):**
- Create: `frontend/src/lib/format/datetime.ts`
- Modify: `frontend/src/features/company-detail/activity-feed.tsx`
- Modify: `frontend/src/features/company-detail/current-thinking-panel.tsx`

- [ ] **Step 1: Extract datetime helpers**

Move `relativeTime` from activity-feed and `formatGeneratedAt` from current-thinking-panel into `frontend/src/lib/format/datetime.ts`. Export both. Update the two call sites. Do **not** refactor `company-notebook` mutation logic.

- [ ] **Step 2: Verify**

```bash
npm run test --workspace frontend
npm run build --workspace frontend
```

If this starts looking like busywork or breaks something non-obvious, skip and note it in the Outcome / PR summary.

---

### Task 5: Docs

**Files:**
- Modify: `frontend/README.md`
- Optionally skim: root `README.md` Frontend data & state section (path claims only)
- Do **not** rewrite the reference-only master plan unless a path claim is actively misleading and worth a one-line fix

- [ ] **Step 1: Document convention in `frontend/README.md`**

Add a short “Source layout” section:

- `app/` — routes + BFF API routes
- `features/` — dashboard, company-detail, company-search UI
- `components/` — app-shell only
- `hooks/`, `lib/`, `types/` — shared infra

- [ ] **Step 2: Final verification**

```bash
npm run test --workspace frontend
npm run build --workspace frontend
```

Expected: pass.

---

## Spec coverage check

| Design requirement | Task |
| --- | --- |
| Pragmatic `features/` + thin `app/` | 1–3 |
| Incremental verify after each slice | Steps labeled Verify in 1–4 |
| Keep `lib/` / `hooks/` / `types/` | Explicit in file map |
| Light shared format cleanup only | Task 4 |
| Docs update | Task 5 |
| No behavior / UX redesign | All tasks are move/extract only |
| Leave notebook mutations alone | Task 4 explicitly |

## Out of scope (do not do)

- Full FSD layers / public API barrels / import lint rules
- Moving `lib/api`, `lib/ai`, or `app/api/*`
- Astryx redesign
- Backend changes
