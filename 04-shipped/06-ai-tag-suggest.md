---
title: AI feature — tag suggestion on note save
domain: [backend, frontend]
stage: shipped
created: 2026-07-22
---

# AI feature — tag suggestion on note save

## Sign-offs

- composer — 2026-07-23 — ideas → specs
- gpt-5-codex — 2026-07-23 — ideas → specs

## Context

First of the two AI features. When a user writes a research note, the app may suggest at most one moat-pattern tag and one business-model tag drawn from the fixed taxonomies already stored as Prisma enums. The user always has final say — AI is an assistant, not an authority.

This task layers on top of manual notes CRUD (`02-specs/05-notes-crud-tagging.md`), which ships the note form, taxonomy selectors, and persistence without touching the AI audit columns. The schema already reserves `aiSuggestedMoatPattern`, `aiSuggestedBusinessModel`, and `tagEditedByUser` on `Note` (`04-shipped/01-monorepo-scaffold.md`).

Authoritative product rules: `02-specs/mini-research-tracker-idea.md` ("AI Behavior → Tag suggestion"). Do **not** copy the stale `generateObject(...)` sample from `01-ideas/task-pipeline-and-research-tracker-plan.md`; use the AI SDK v6+ structured-output flow documented below.

## Goal

A user can:

1. Write a note on the company detail page and receive a non-blocking AI suggestion for moat pattern and/or business model.
2. See the suggestion pre-fill the existing manual selectors, then accept, change, or ignore it before saving.
3. Save the note successfully even when the AI provider is missing, times out, rate-limits, or returns invalid structured output.
4. Persist what the AI suggested and whether the user overrode it, without making AI fields the canonical display/filter tags.

Thesis summary generation (`01-ideas/07-ai-summarize.md`), dashboard tag filters, taxonomy admin, auth, and deployment remain out of scope.

## Technical approach

### Where the AI call lives

**Chosen:** a Next.js App Router Route Handler in the frontend workspace (`app/api/tag-suggest/...`), called only from server code or same-origin client fetches — never directly from the browser with an exposed key.

**Trade-off — Next route vs NestJS endpoint:** Keeping Gemini + AI SDK in Next matches the existing pattern for same-origin API routes (`frontend/src/app/api/companies/...`) and avoids adding provider SDK weight to Nest. The downside is split configuration: AI credentials live in frontend server env while note persistence stays in Nest. Accept this split for the learning exercise; provider code remains behind the AI SDK boundary so the model can change later without redesigning the product contract.

**Trade-off — suggest-on-type vs explicit action:** Debounced suggestion while typing feels magical but burns tokens on drafts the user never saves. A dedicated **"Suggest tags"** control (enabled once body text meets a minimum length) is the default recommendation: predictable cost, clearer failure UX, and no race with rapid edits. Debounced auto-suggest remains an Open Question if the user prefers more automation.

### Provider and SDK contract

- **Provider:** Google Gemini Flash via `@ai-sdk/google` (`google('<flash-model-id>')`).
- **Credential:** `GOOGLE_GENERATIVE_AI_API_KEY` — server-only; never `NEXT_PUBLIC_*`, never logged, never returned to the client on errors.
- **Structured output:** `generateText` with `output: Output.object({ schema })` (AI SDK v6+). Do **not** design around deprecated `generateObject` / `streamObject`.
- **Schema:** Zod object with **nullable** enum fields matching Prisma exactly:
  - `moatPattern`: one of the seven `MoatPattern` values or `null`
  - `businessModel`: one of the thirteen `BusinessModel` values or `null`
  - Optional `rationale`: short string for UI hint only — not persisted unless Open Question #2 resolves otherwise
- **Prompt constraints:** Classify only from supplied note text; do not invent company facts, financial figures, or investment recommendations; return `null` for a dimension when the note does not support a confident classification.

Confirm the exact Flash model id string against current `@ai-sdk/google` docs at implementation time (browser task `browser-tasks/google-gemini-api-key.md` should record what the account supports).

### Input bounds and reliability

- Accept `{ noteText: string }` (exact request field names belong in `03-ready`).
- Trim input; reject empty/whitespace-only with 400.
- Cap length at the same application maximum as notes CRUD (~4,000 characters — align with `02-specs/05-notes-crud-tagging.md`). Truncate or reject over-limit consistently; do not silently send unbounded text to Gemini.
- Apply a server-side timeout (recommend 8–10 seconds for a single non-streaming call).
- Normalize failures into a **soft-unavailable** response with HTTP 200 and `{ moatPattern: null, businessModel: null, error: 'suggestion_unavailable' }` (exact envelope in `03-ready`). Handle at minimum:
  - missing/disabled API key
  - provider timeout
  - HTTP 429 / quota errors
  - `AI_NoObjectGeneratedError` and schema validation failures
  - unexpected thrown errors
- Never block note save on any of the above. The note form must remain fully usable with manual selectors only.

Logging: provider name, latency, outcome status, and a correlation id are fine; do not log full prompts, note bodies, or API keys by default.

### Frontend UX (conceptual)

Extend the note form delivered by task 05:

1. User enters note body (required) and may optionally click **Suggest tags** once the body is valid.
2. While suggesting, show a lightweight loading state on the tag selectors; do not disable saving the note.
3. On success, pre-fill moat and business-model selectors with suggested values (including `null`/cleared when the model returns null for a dimension).
4. User may change either selector before submit; canonical saved tags are always the selector values at save time.
5. On soft failure, show a quiet inline message (e.g. "Suggestion unavailable — choose tags manually") and leave selectors unchanged.

Visual treatment should distinguish **AI-pre-filled** selectors from manual-only state without implying the suggestion is authoritative (e.g. subtle helper text, not a blocking modal).

### Backend persistence (conceptual)

Task 05 leaves AI columns unused. This task extends note create/update so the server stores audit metadata alongside user-approved tags:

| Field | Meaning |
| --- | --- |
| `moatPattern`, `businessModel` | User-approved values at save time (unchanged product meaning) |
| `aiSuggestedMoatPattern`, `aiSuggestedBusinessModel` | What the model returned for the suggestion request associated with this save, or `null` if no suggestion was obtained |
| `tagEditedByUser` | `true` when the user changed either tag away from the AI suggestion (including clearing a suggested tag); `false` when both match the suggestion; `null` when no suggestion was recorded |

Comparison logic must treat "no suggestion" (`null` AI fields) separately from "suggestion matched."

Exact DTO validation, service rules, and whether suggestion is sent as part of the note POST body vs recomputed server-side belong in `03-ready`. The specs-stage requirement is: **persist audit trail atomically with the note**, not in a separate AI-only endpoint on Nest.

### Dependencies and sequencing

**Hard dependency:** `02-specs/05-notes-crud-tagging.md` implemented and verified (note form, manual tags, note CRUD APIs). Do not start this task on a company detail page that cannot create/list notes.

**Soft dependency:** `browser-tasks/google-gemini-api-key.md` for local/live verification; automated tests must pass with the key absent (mocked provider).

Finnhub / company enrichment slices are unrelated.

## Trade-offs

### Structured enums vs free-text labels

Fixed enums enable Zod-constrained model output, DB validation, and filter consistency. Free-text tags would simplify the prompt but break comparability — rejected.

### Persist rationale vs ephemeral UI copy

Showing a one-line rationale helps the user decide whether to trust a suggestion, but storing it adds schema noise with little filter value. Default: allow rationale in the API response for UI only; do not add DB columns unless Open Question #2 chooses persistence.

### Client-side vs server-side suggestion trigger

Client-triggered fetch to the Next route keeps latency visible and avoids suggesting on every keystroke. Server-side-only suggestion during note POST would couple save latency to Gemini — rejected for this feature.

## Scope

### In

- Next.js tag-suggest route with Gemini + AI SDK structured output
- Frontend note-form integration (suggest control, pre-fill, override, failure UX)
- Backend note create/update acceptance of AI audit fields + `tagEditedByUser` derivation
- Unit/route tests with mocked AI provider; note-save paths proven with key absent
- Env wiring for `GOOGLE_GENERATIVE_AI_API_KEY` on the frontend server

### Out

- Thesis summary / `streamText` (`07-ai-summarize`)
- Auto-suggest on every keystroke (unless Open Question #1 changes)
- Dashboard filters by AI suggestion acceptance
- Multi-user auth, rate limiting beyond basic timeout, prompt logging UI
- Changes to taxonomy enums or Prisma schema (columns already exist)

## Action Items

- Complete `browser-tasks/google-gemini-api-key.md` and record the exact Flash model id string supported on the account.
- Put `GOOGLE_GENERATIVE_AI_API_KEY` only in untracked frontend server env (e.g. `frontend/.env.local`) — never commit it.
- Implement and verify `02-specs/05-notes-crud-tagging.md` first.
- At implementation time, confirm AI SDK package versions and the `Output.object` / `result.output` API against current Vercel docs (v6→v7 migration renamed `experimental_output` to `output`).

## Open Questions

1. **Suggestion trigger:** Dedicated "Suggest tags" button (recommended) vs debounced auto-suggest after the user pauses typing vs suggest automatically on first save attempt?
2. **Rationale:** Return optional `rationale` in the tag-suggest response for inline UI only, or omit entirely from v1?
3. **Re-suggest behavior:** If the user edits the body after accepting a suggestion, should selectors reset, stay as-is until re-suggest, or auto-clear AI pre-fill?
4. **Env file location:** Standardize on `frontend/.env.local` only for the Google key, or also document a root-level copy for monorepo `npm run dev` — whichever matches how task 05 lands frontend env?

## Research references

- `02-specs/mini-research-tracker-idea.md` — AI Behavior → Tag suggestion; reliability rules
- `02-specs/05-notes-crud-tagging.md` — manual note form and taxonomy selectors to extend
- `04-shipped/01-monorepo-scaffold.md` / `backend/prisma/schema.prisma` — `Note` AI audit columns and enum values
- `browser-tasks/google-gemini-api-key.md` — credential setup
- [AI SDK — generating structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [AI SDK — Output reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/output)
- [AI SDK v6 migration — generateObject → generateText + Output.object](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)

## Outcome

Shipped on 2026-07-23.

**Built**

- `POST /api/tag-suggest` in Next.js using Gemini Flash (`gemini-2.5-flash`), AI SDK `generateText` + `Output.object`, Zod enum schema, 10s timeout, and soft-unavailable fallback when the key is missing or the provider fails.
- Note form **Suggest tags** button (≥20 chars), AI pre-fill with override, inline rationale/failure messaging; save never blocked.
- NestJS note create/update accepts optional `aiAudit` and derives `tagEditedByUser`; persists `aiSuggestedMoatPattern` / `aiSuggestedBusinessModel` atomically with the note.
- Dependencies: `ai`, `@ai-sdk/google`, `zod` in the frontend workspace.

**Resolved decisions**

1. Dedicated suggest button (not debounced auto-suggest).
2. Optional `rationale` returned for UI only, not persisted.
3. Selectors stay as-is after body edits until re-suggest.
4. `GOOGLE_GENERATIVE_AI_API_KEY` in `frontend/.env.local` only.

**Verification**

- Backend unit tests pass (115 tests, including AI audit derivation and persistence); frontend `tsc --noEmit` passes.
- Live Gemini calls require completing `browser-tasks/google-gemini-api-key.md`.

**Deviations**

- None from the ready spec. Removed stale `01-ideas/` copies of tasks 05 and 06 during shipment housekeeping.
