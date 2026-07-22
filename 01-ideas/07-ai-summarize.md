---
title: AI feature — on-demand "current thinking" summary
domain: [frontend]
stage: ideas
created: 2026-07-22
---

# AI feature — on-demand "current thinking" summary

## Sign-offs

## Context
Second AI feature: synthesizes a company's full note history into a short current-thinking paragraph, regenerated on demand rather than automatically.

## Scope
- `frontend/app/api/summarize/route.ts`: fetches note history server-side, caps by char budget (~12,000 chars, newest-first then re-sorted chronologically so the model still sees chronological order), visibly indicates when older notes were omitted, system prompt bans invented financial figures/recommendations, `streamText` response.
- "Regenerate summary" button on the company detail page; `PATCH /companies/:id/summary` persists the result (and generation timestamp) once streaming completes. A failed attempt must leave the previously-displayed summary intact rather than clearing it.
- Streaming is cuttable to a plain non-streaming call if it proves troublesome — not a hard requirement.
- Model provider: **Gemini Flash via `@ai-sdk/google`** (`model: google('<flash-model-id>')`, key in `GOOGLE_GENERATIVE_AI_API_KEY`) — not Anthropic/OpenAI. Confirm the exact model id string against `@ai-sdk/google`'s current docs at implementation time.

## Depends on
05-notes-crud-tagging.

## Reference
`02-specs/mini-research-tracker-idea.md` ("AI Behavior → Current-thesis summary") is the current, cross-model-approved authority on prompt constraints and failure behavior. `task-pipeline-and-research-tracker-plan.md` (Part B: "Next.js frontend" → `api/summarize`) still has the capping algorithm and route shape in more implementation-level detail.
