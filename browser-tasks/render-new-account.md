---
title: Register a Render account
created: 2026-07-23
status: done
completed: 2026-07-23
---

# Register a Render account

Standalone browser task — not part of the task pipeline (see `browser-tasks/README.md`).

## Why
The NestJS backend deploys to Render's free web service tier. No existing account for this one, so a normal signup is fine — included here for completeness alongside the other deploy-target signups, not because you flagged it.

## Steps
1. Go to https://render.com/register.
2. Sign up (GitHub OAuth is fine here — no conflicting existing account like Neon/Vercel).
3. No project/service needs to be created yet — just the account, ready to connect the repo when deployment actually happens.

## What to hand back
- Confirmation the account exists, and which login method was used.

## Notes
- Free tier: 750 hours/month, no credit card required. Cold start (~30–60s) after 15 minutes of inactivity — expected and fine for a demo.

## Outcome
- Render account exists and opens to the dashboard workspace `My Workspace`.
- Login method used: GitHub OAuth.
- Initial account task created no service/project.
- Later deployed backend web service `thesis-lab-backend` on Render Free from `bodrovphone/thesis-lab` `main`.
- Backend URL: https://thesis-lab-backend-s8dj.onrender.com
- Health check verified at `/health` with database status `up`.
