---
title: Register Finnhub account and obtain API key
created: 2026-07-23
status: done
completed: 2026-07-23
---

# Register Finnhub account and obtain API key

Standalone browser task — not part of the task pipeline (see `browser-tasks/README.md`).

## Why
`01-ideas/03-finnhub-adapter.md` needs `FINNHUB_API_KEY` to call `/search` and `/stock/profile2`.

## Steps
1. Go to https://finnhub.io and sign up for a free account (email/password or Google/GitHub OAuth — any is fine, this service doesn't need to be distinct from any other account).
2. Verify email if prompted.
3. Once logged in, go to the Dashboard — the API key is shown there by default on the free tier.
4. Copy the API key.

## What to hand back
- `FINNHUB_API_KEY=<the key>`

## Notes
- Free tier: 60 requests/minute, no credit card required.
- No further configuration needed on Finnhub's side for this project.

## Outcome
- Finnhub account was created by the user.
- Added `FINNHUB_API_KEY` to untracked `backend/.env`.
- Verified the key with a live Finnhub search request for `AAPL`.
