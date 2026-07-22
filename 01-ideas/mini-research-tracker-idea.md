---
title: Mini Research Tracker — Hobby Project Idea
domain: [backend, frontend, infra]
stage: ideas
created: 2026-07-22
---

# Mini Research Tracker — Hobby Project Idea

## Sign-offs

## Context
A personal side project to sharpen full-stack + AI-integration skills: a small self-directed build to practice architecture, trade-off decisions, and system design end to end, rather than a tutorial-following exercise.

The inspiration is investment research platforms that organize content by company, industry, moat pattern (Switching Costs, Counter-Positioning, Serial Acquirer, etc.), market cap, and country. This project intentionally leans into that domain and into "AI tools that help investors learn about businesses," not just a generic CRUD app.

## Product idea: "Mini research tracker"
A personal research notebook structured around companies and evolving theses — not a stock screener, not a folder of notes. Value prop: help a long-term investor track *how their thinking on a company evolves*, tagged using a fixed taxonomy of moat and business-model patterns.

### Core user flow
1. **Search / add a company** — pull basic data from a public API (SEC EDGAR full-text search, or Alpha Vantage/Finnhub free tier), unify into one internal data model regardless of source.
2. **Company detail page**
   - Running list of timestamped notes
   - Thesis tag (fixed enum: Switching Costs, Counter-Positioning, Serial Acquirer, etc.)
   - Conviction level (e.g. Watching / Building conviction / High conviction)
   - "Current thinking" AI-generated summary block, regenerated on demand (button), built from the note history
3. **Dashboard** — all tracked companies as cards/table, filterable by tag and conviction level.
4. Optional: simple activity feed ("added a note on Company X — 2 days ago")

### AI features (both in scope)
1. **Tag suggestion on note save** — send note text to the model, use AI SDK's `generateObject` with a Zod schema constrained to the fixed tag enum (forces a valid pick, no hallucinated categories). User can accept or override — AI as assistant, not authority.
2. **"Update my thesis" summary** — on-demand (button, not auto-triggered) `generateText`/`streamText` call that synthesizes all notes on a company into a short current-thinking paragraph. Truncate/cap note history sent to the model as it grows (real production concern, good talking point).

### Explicitly out of scope (time-box discipline)
- Full auth flow (signup/verification/refresh tokens) — either skip entirely (single implicit user) or bare-bones JWT login only
- Chat/RAG over notes (needs embeddings + vector search — too much for the time budget)
- Any AI-generated financial figures/analysis — hallucination risk too high for an investment research context; worth naming this risk explicitly even though it's not built

## Architecture

### Services
- **Backend**: NestJS + Prisma + Neon Postgres
  - Unifies data from 1-2 public company APIs into one internal model
  - Endpoints: company search/add, notes CRUD, tag list, (optionally) Postgres full-text search (`tsvector`) for filtering
- **Frontend**: Next.js
  - Dashboard + company detail screens
  - Two AI SDK routes (tag-suggest, summarize) — can live on the frontend side (Next.js API routes) rather than routed through Nest, keeping "frontend orchestrates AI, backend owns domain data" as a clean, explainable split

### Repo structure
Monorepo, one GitHub repo:
```
/backend    (NestJS)
/frontend   (Next.js)
README.md   (explains structure + reasoning)
.env.example
```
Chosen over separate repos for a 2-service demo project — lower coordination overhead. Good talking point: would split into separate repos once deploy cadence or team ownership diverges.

### Deployment
- **Backend** → Render free tier (no card required; cold start after 15 min inactivity is an acceptable, explainable trade-off for a demo)
- **Database** → Neon (already serverless Postgres, no separate setup needed)
- **Frontend** → Vercel (native fit for Next.js, hosts the AI SDK routes too)

## Talking points this setup is designed to surface
- Why Postgres full-text search over a dedicated search engine at this scale
- Schema decisions for tagging (join table vs array column)
- Rate-limiting/caching a third-party company data API
- Structured AI output (`generateObject` + Zod) to constrain model responses to a known taxonomy
- Cost/latency growth of summarization as note history grows, and how to cap it
- Honest framing of AI's role (suggestion, not source of truth) — especially relevant given the domain (investment research)
- Monorepo vs. separate repos trade-off, and when to switch
- Render free-tier cold start trade-off vs. paid always-on

## Open items to decide during build
- Which public API(s) to unify for company data (SEC EDGAR full-text search vs. Alpha Vantage vs. Finnhub free tier)
- Whether to include any auth at all, or skip it entirely for this scope
- Exact fixed tag taxonomy list (borrow loosely from public moat/business-model frameworks, e.g. Hamilton Helmer's 7 Powers)
