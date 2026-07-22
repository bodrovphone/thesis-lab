---
title: Obtain Alpha Vantage API key
created: 2026-07-23
---

# Obtain Alpha Vantage API key

Standalone browser task — not part of the task pipeline (see `browser-tasks/README.md`).

## Why
`01-ideas/04-alpha-vantage-adapter.md` needs `ALPHA_VANTAGE_API_KEY`. This is the most optional/cuttable data source in the project — fine to deprioritize this task if time is short.

## Steps
1. Go to https://www.alphavantage.co/support/#api-key.
2. Fill in the short form (name + email) to request a free API key — Alpha Vantage typically issues this directly on the page/by email, not via a full account/login system.
3. Copy the API key shown.

## What to hand back
- `ALPHA_VANTAGE_API_KEY=<the key>`

## Notes
- Free tier: 25 requests/day — a hard cap, so this key is only used for on-demand "add company" enrichment, never for search-as-you-type.
- No credit card required.
