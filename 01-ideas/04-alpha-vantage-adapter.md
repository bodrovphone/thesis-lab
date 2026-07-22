---
title: Alpha Vantage adapter — budget-gated third source
domain: [backend]
stage: ideas
created: 2026-07-22
---

# Alpha Vantage adapter — budget-gated third source

## Sign-offs

## Context
Adds the third, most rate-limited source (25 req/day free tier) as an optional enrichment layer, not a required one — first thing to cut if time runs short later.

## Scope
- Alpha Vantage `OVERVIEW` adapter, feature-flagged via `ENABLE_ALPHA_VANTAGE`.
- Daily-budget rate limiter (cap ~20/day for safety margin), never called from the cheap search-as-you-type path.
- `enrichmentStatus`/`sourcesUsed` correctly reflect whether Alpha Vantage participated.

## Depends on
03-finnhub-adapter.

## Reference
`02-specs/mini-research-tracker-idea.md` ("Company-data aggregation", "Open Questions" #4) is the current, cross-model-approved authority — confirms the 25 req/day free ceiling, that it must stay out of search-as-you-type, and flags whether to enable it at all in the first release as still open. `task-pipeline-and-research-tracker-plan.md` (Part B: "External data sources") has the same numbers with more implementation-level framing (env var name, safety-margin budget).
