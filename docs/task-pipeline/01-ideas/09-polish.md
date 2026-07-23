---
title: Polish — activity feed, error/loading states, README talking points
domain: [backend, frontend]
stage: ideas
created: 2026-07-22
---

# Polish — activity feed, error/loading states, README talking points

## Sign-offs

## Context
Final pass once the core product works end to end — makes it presentable and gives the README the talking-points framing the whole build was designed around.

## Scope
- Optional simple activity feed ("added a note on Company X — 2 days ago").
- Loading/error states across dashboard and detail pages (including a visible `PARTIAL`/`FAILED` enrichment-status indicator + `POST /companies/:id/refresh-enrichment` retry action).
- Reliability/safety pass: timeouts + normalized error statuses on every external call, 429s treated as rate-limit events (no immediate retry fan-out), logs include provider/latency/status/correlation id but never API keys or note content, destructive company deletion requires explicit confirmation since it also removes note history.
- `README.md`: overview, quick start, architecture summary, and the talking points list from the master plan.
- Entirely cuttable if earlier tasks ran long — this task is pure polish, nothing else depends on it.

## Depends on
08-dashboard-filters-search (last task in the sequence, though the activity feed/README pieces only really need 05-notes-crud-tagging).

## Reference
`02-specs/mini-research-tracker-idea.md` ("Reliability and Safety", "Scope Boundaries") is the current, cross-model-approved authority on the safety/logging checklist above. `task-pipeline-and-research-tracker-plan.md` (Part B: "Talking points", "Sequencing") still has the talking-points list and cuttable/non-cuttable framing.
