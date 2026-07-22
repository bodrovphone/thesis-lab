---
title: SEC EDGAR adapter + company persistence + dashboard/detail pages (vertical slice)
domain: [backend, frontend]
stage: ideas
created: 2026-07-22
---

# SEC EDGAR adapter + company persistence + dashboard/detail pages (vertical slice)

## Sign-offs

## Context
The first real, end-to-end vertical slice: one data source, real persistence, real pages — proves the whole stack works together before adding more sources or AI features on top.

## Scope
- Backend: SEC EDGAR adapter only (no API key; cached `company_tickers.json` search + submissions/company-facts fetch), `CompaniesController`/`CompaniesService` (persistence), `POST /companies`, `GET /companies`, `GET /companies/:id`, `GET /companies/search-external`.
- Frontend: dashboard page listing tracked companies, company detail page — both rendering real data from the backend, no filtering/AI yet.
- No Finnhub/Alpha Vantage, no notes, no AI routes yet.

## Depends on
01-monorepo-scaffold.

## Reference
`02-specs/mini-research-tracker-idea.md` ("Company-data aggregation", "Action Items") is the current, cross-model-approved authority on adapter behavior — including the requirement to send a descriptive SEC `User-Agent` (application identifier + contact info) and to treat partial/failed enrichment as a normal result, not a request failure. For endpoint route strings and frontend file paths, `task-pipeline-and-research-tracker-plan.md` (Part B: "NestJS backend", "Next.js frontend") still has the concrete detail. This task only implements the SEC-EDGAR-only slice of that design.
