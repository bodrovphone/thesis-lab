---
title: AI feature — tag suggestion on note save
domain: [frontend]
stage: ideas
created: 2026-07-22
---

# AI feature — tag suggestion on note save

## Sign-offs

## Context
First of the two AI features. Suggests a moat-pattern/business-model pair from note text, but the user always has final say — AI as assistant, not authority.

## Scope
- `frontend/app/api/tag-suggest/route.ts`: **`generateText` with `Output.object()`** (AI SDK v6's current structured-output pattern — `generateObject`/`streamObject` are deprecated and slated for removal, folded into the `generateText`/`streamText` flow instead) using a Zod schema of nullable moat/business-model enums, capped input length. Model failure, timeout, or invalid output (`AI_NoObjectGeneratedError`) must never block saving the note — fall back to manual selection and record no suggestion.
- Model provider: **Gemini Flash via `@ai-sdk/google`** (`model: google('<flash-model-id>')`, key in `GOOGLE_GENERATIVE_AI_API_KEY`) — not Anthropic/OpenAI. Confirm the exact model id string against `@ai-sdk/google`'s current docs at implementation time.
- Wired into the note form from `05-notes-crud-tagging` so a suggestion pre-fills the manual selectors, which the user can accept or override.
- Records whether the AI suggestion was accepted or overridden (`aiSuggestedMoatPattern`/`aiSuggestedBusinessModel`/`tagEditedByUser` on `Note`).

## Depends on
05-notes-crud-tagging.

## Reference
`02-specs/mini-research-tracker-idea.md` ("AI Behavior → Tag suggestion") is the current, cross-model-approved authority on the exact AI SDK API to use — verified 2026-07-22 against Vercel's AI SDK v6 docs, since this corrects an API choice in the older master plan doc. `task-pipeline-and-research-tracker-plan.md` (Part B: "Next.js frontend" → `api/tag-suggest`) still has the route's field-level shape, but its `generateObject(...)` code sample is stale — don't copy that part.
