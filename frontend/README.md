# Frontend

Next.js app for Thesis Lab.

**Local setup and monorepo commands:** see the [repository root README](../README.md#development).

**Data & state:** see [Frontend data & state](../README.md#frontend-data--state) in the root README. Short version: RSC owns list/detail reads, URL owns filters, local state owns form drafts, TanStack Query owns client-island fetch/mutation lifecycle (search cache, optimistic notes).

## Source layout

All application code lives under `src/`:

| Path | Purpose |
| --- | --- |
| `app/` | App Router pages, layouts, and BFF API routes (`/api/*`) |
| `features/` | Feature UI — `dashboard/`, `company-detail/`, `company-search/` |
| `components/` | App shell only (e.g. `app-sidebar.tsx`) |
| `hooks/`, `lib/`, `types/` | Shared hooks, API/AI/query helpers, and domain types |

Pages stay thin: fetch in RSC, compose from `features/`.

**Tests:** Vitest + React Testing Library. `npm run test --workspace frontend` (watch: `npm run test:watch --workspace frontend`). Config in `vitest.config.ts`.

Run from the repo root:

```bash
npm run dev --workspace frontend
```

Or start backend and frontend together:

```bash
npm run dev
```

Local app URL: http://localhost:3000

Production deployment: https://thesis-lab-frontend.vercel.app

Production backend URL: https://thesis-lab-backend-s8dj.onrender.com
