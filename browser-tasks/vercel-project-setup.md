---
title: Set up Vercel project for thesis-lab (existing account first, new account only if at capacity)
created: 2026-07-23
---

# Set up Vercel project for thesis-lab (existing account first, new account only if at capacity)

Standalone browser task — not part of the task pipeline (see `browser-tasks/README.md`).

## Why
The Next.js frontend deploys to Vercel. An existing Vercel account already has other projects on it — **check capacity there first**, don't assume a new account is needed.

## Steps
1. Log into the **existing** Vercel account at https://vercel.com.
2. Check the current project count against the Hobby plan limit: **200 projects per account**. [(vercel.com/docs/limits)](https://vercel.com/docs/limits) Unless the existing account already has close to 200 projects, there's plenty of room — use it.
3. **If under the limit**: create a new project on the existing account and connect it to the `bodrovphone/thesis-lab` GitHub repo (root directory `frontend`). Skip to step 5.
4. **Only if genuinely near the 200-project cap**, or if the existing account is a Hobby *team* account that can't connect to this GitHub org/repo for some other reason: create a new Vercel account instead. Sign up with one of:
   - Email/password
   - A different OAuth provider (Google, GitLab, Bitbucket)
   - A genuinely different GitHub account, if one exists

   Do **not** use "Continue with GitHub" with the same GitHub account already linked to the existing Vercel account — that logs into the existing account rather than creating a new one, so it won't actually solve a capacity problem.
5. Confirm the project is connected and ready (no deploy needs to succeed yet if backend/env vars aren't ready — just confirm the repo connection).

## What to hand back
- Which account was used (existing vs. new), and the project's connection status.
- No app-level `.env` credential needed from this step — Vercel config lives in its dashboard, not an API key stored in the app.

## Notes
- Free (Hobby) tier is enough for this project; no credit card required either way.
