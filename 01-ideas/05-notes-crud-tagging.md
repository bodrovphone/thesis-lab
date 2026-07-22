---
title: Notes CRUD + manual tagging (moat pattern + business model + conviction)
domain: [backend, frontend]
stage: ideas
created: 2026-07-22
---

# Notes CRUD + manual tagging (moat pattern + business model + conviction)

## Sign-offs

## Context
Validates the two-dimensional tag data model end to end with manual (human-picked) tagging before any AI suggestion is layered on top.

## Scope
- Backend: `Note` CRUD endpoints, `GET /tags` (moat patterns, business models, conviction levels with labels), `PATCH /companies/:id` for conviction level.
- Frontend: note form (manual moat-pattern + business-model selectors), conviction-level selector on the company detail page, notes list.
- No AI tag suggestion yet — tags are picked manually only in this task.

## Depends on
02-sec-edgar-vertical-slice.

## Reference
`02-specs/mini-research-tracker-idea.md` ("Product Scope", "Persistence model") is the current, cross-model-approved authority on the classification model — the two dimensions are independent and optional per note, conviction is a separate company-level field, and both taxonomies are fixed database enums (not user-editable) precisely so DB validation and generated TS types do the work instead of a runtime taxonomy-editing UI. `task-pipeline-and-research-tracker-plan.md` (Part B: "Data model", "NestJS backend" endpoints, "Next.js frontend" components) still has the literal endpoint routes and Prisma field names.
