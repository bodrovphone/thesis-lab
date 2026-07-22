---
title: Dashboard filters + Postgres full-text search
domain: [backend, frontend]
stage: ideas
created: 2026-07-22
---

# Dashboard filters + Postgres full-text search

## Sign-offs

## Context
Makes the dashboard actually useful once there's more than a couple of tracked companies — filter by tag/conviction, and free-text search across notes/companies.

## Scope
- Backend: `GET /companies?moatPattern=&businessModel=&conviction=&q=` — relational filters for tag/conviction, `tsvector`/GIN-backed full-text search for `q`.
- Frontend: filter bar on the dashboard (moat pattern, business model, conviction level) + a search box.
- First thing to cut/describe-verbally-only if this task runs long — filters are simple `WHERE` clauses and can ship without the FTS search box.

## Depends on
05-notes-crud-tagging.

## Reference
`02-specs/mini-research-tracker-idea.md` ("Persistence model", "Scope Boundaries") is the current, cross-model-approved authority — confirms ordinary indexed relational filters are sufficient for the first release and explicitly lists Postgres full-text search as optional/deferrable, not required. `task-pipeline-and-research-tracker-plan.md` (Part B: "Data model", "NestJS backend" endpoints) still has the endpoint shape and `tsvector` migration notes.
