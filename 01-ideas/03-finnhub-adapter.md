---
title: Finnhub adapter — second parallel source with merge/fallback
domain: [backend]
stage: ideas
created: 2026-07-22
---

# Finnhub adapter — second parallel source with merge/fallback

## Sign-offs

## Context
Adds the second data source so the aggregator's `Promise.allSettled` merge/fallback logic is actually exercised with two real sources instead of one.

## Scope
- Finnhub adapter (`/search`, `/stock/profile2`), API-key-gated via env var.
- `mergeCompanyProfile` becomes a real 2-source merge with field-level precedence, not a passthrough.
- Adapter wrapped to never throw; per-adapter timeout; one source failing still persists a `PARTIAL` company from the other.

## Depends on
02-sec-edgar-vertical-slice.

## Reference
`02-specs/mini-research-tracker-idea.md` ("Company-data aggregation") is the current, cross-model-approved authority: source precedence is defined per field rather than by picking one globally "best" vendor, and partial data is a normal result, not a request failure. `task-pipeline-and-research-tracker-plan.md` (Part B: "External data sources" → Design/Merge) still has the literal merge-function signature and status enum shape.
