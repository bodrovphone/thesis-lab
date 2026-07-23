---
title: Set up Neon project for thesis-lab (existing account first, new account only if at capacity)
created: 2026-07-23
status: done
completed: 2026-07-23
---

# Set up Neon project for thesis-lab (existing account first, new account only if at capacity)

Standalone browser task — not part of the task pipeline (see `browser-tasks/README.md`).

## Why
`04-shipped/01-monorepo-scaffold.md` / `03-ready/02-sec-edgar-vertical-slice.md` need a hosted Postgres project (pooled + direct connection strings). An existing Neon account already has other projects on it — **check capacity there first**, don't assume a new account is needed.

## Steps
1. Log into the **existing** Neon account at https://console.neon.tech.
2. Check the current project count against the free-tier limit. As of the January 2026 pricing change, Neon's free plan allows **up to 100 projects per account** (raised from the old limit of 10) — so unless the existing account already has dozens of projects, there should be plenty of room. [(neon.com/faqs/free-plan-limits-and-quotas)](https://neon.com/faqs/free-plan-limits-and-quotas)
3. **If under the limit**: create a new project on the existing account named `thesis-lab` (or similar). Skip to step 5.
4. **Only if genuinely at/near the 100-project cap**: create a new Neon account with an email/identity distinct from the existing login (a Gmail "+" alias like `youraddress+thesislab@gmail.com` works — Neon treats it as a distinct account address while it still delivers to the same inbox), then create the `thesis-lab` project there instead.
5. From the project's connection details, copy **both**:
   - The pooled connection string → `DATABASE_URL`
   - The direct/unpooled connection string → `DIRECT_URL`

## What to hand back
- `DATABASE_URL=<pooled connection string>`
- `DIRECT_URL=<direct connection string>`
- Which account was used (existing vs. new) and the current/remaining project count, for reference.

## Notes
- No credit card required either way.
- Both connection strings are genuinely needed, not a "pick one" — Prisma needs the direct URL for migrations, the pooled one for runtime.

## Outcome
- Used existing personal Neon free org: `Oleksandr`.
- Created project `thesis-lab` (`sweet-silence-48677665`), branch `main` (`br-plain-wind-au0qiym7`), database `neondb`.
- Project count after setup: `2 / 100` free-plan projects.
- Added pooled `DATABASE_URL` and direct `DIRECT_URL` to untracked `backend/.env`.
- Verified both connection strings with a read-only `select 1`.
