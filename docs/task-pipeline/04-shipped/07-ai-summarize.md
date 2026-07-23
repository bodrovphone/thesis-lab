---
title: AI feature — on-demand "current thinking" summary
domain: [frontend]
stage: shipped
created: 2026-07-22
---

# AI feature — on-demand "current thinking" summary

## Sign-offs

- claude-sonnet-5 — 2026-07-23 — ideas → specs

## Context

Second of the two AI features. Synthesizes a company's full note history into a short "current thinking" paragraph, regenerated only on explicit user action rather than automatically on every visit or note save.

This task layers on top of manual notes CRUD (`02-specs/05-notes-crud-tagging.md`), which is the source of the note history this feature reads, and is independent of AI tag suggestion (`02-specs/06-ai-tag-suggest.md`) — the two AI features share a provider and an input-capping philosophy but do not call each other. The schema already reserves `currentThinkingSummary` and `summaryGeneratedAt` on `Company` (`04-shipped/01-monorepo-scaffold.md`); this task is the only one that writes to them.

Authoritative product rules: `02-specs/mini-research-tracker-idea.md` ("AI Behavior → Current-thesis summary", "Trade-offs → Persisted summary versus computed-only output"). The capping algorithm and route shape sketched in `01-ideas/task-pipeline-and-research-tracker-plan.md` (Part B: `api/summarize`) remain directionally correct and now use the same Gemini Flash provider convention as tag-suggest.

## Goal

A user can:

1. Open a company detail page and see the last-generated current-thinking summary (if any) with its generation timestamp.
2. Click a "Regenerate summary" action to synthesize a fresh summary from the company's full note history.
3. See the new summary replace the old one only once generation succeeds; a failed or errored attempt leaves the previously-displayed summary untouched.
4. Trust that the summary never states figures, prices, or recommendations the user's own notes didn't supply.

Automatic/background regeneration, summary version history, and any cross-company or portfolio-level synthesis remain out of scope.

## Technical approach

### Where the AI call lives

**Chosen:** a Next.js App Router Route Handler in the frontend workspace (`app/api/summarize/...`), matching the pattern already chosen for tag-suggest (`02-specs/06-ai-tag-suggest.md`) and the existing same-origin routes (`frontend/src/app/api/companies/...`). Called only from server code or same-origin client fetches — the Gemini key never reaches the browser.

Persistence of the result is a separate, existing Nest endpoint (`PATCH /companies/:id/summary`, already named in the master plan) rather than something this Next route writes to directly — the Next route's job is talking to the model; the Nest service remains the only writer of `Company` rows. This mirrors the split already established for notes and conviction: Next orchestrates AI, Nest owns persistence.

### Provider and SDK contract

- **Provider:** Google Gemini Flash via `@ai-sdk/google` (`google('<flash-model-id>')`) — same provider decision as tag-suggest, sharing one `GOOGLE_GENERATIVE_AI_API_KEY` credential and one AI SDK boundary so the provider can be swapped once, in one place, later.
- **Credential:** `GOOGLE_GENERATIVE_AI_API_KEY` in the frontend server environment; never `NEXT_PUBLIC_*`, never logged, never echoed back to the client on error.
- **Call shape:** `streamText(...)` as the default, per the existing scope note — chosen over a structured-output call because the result is prose, not a schema-constrained value (contrast with tag-suggest's `Output.object()`). Streaming is explicitly cuttable to a single non-streaming `generateText`/plain call if it proves troublesome to wire through the route handler and client; the product requirement is a correct final summary, not necessarily a token-by-token UI.
- **System prompt constraints:** summarize only the supplied note text; explicitly acknowledge conflicting observations across notes rather than silently picking one; never invent financial figures, prices, or buy/sell/hold-style recommendations; the output is a synthesis of the user's own thinking, not investment advice.
- **Input:** company name plus its note history, not live prices, not model-general knowledge about the company, and not Finnhub/Alpha Vantage/SEC profile data.

Confirm the exact Flash model id string against current `@ai-sdk/google` docs at implementation time — the same open item already tracked in `browser-tasks/google-gemini-api-key.md` and `02-specs/06-ai-tag-suggest.md`, not a new one.

### Input bounds and the capping algorithm

Note history for an active company can exceed any reasonable prompt budget, so the route must bound input deterministically rather than trust the model's context window:

1. Fetch the company's full note history server-side (via the Nest backend, same `BACKEND_URL` server-only pattern as the rest of the app — never called from the browser).
2. Walk notes **newest-to-oldest**, accumulating characters, until adding the next note would exceed the budget (~12,000 chars, matching the existing scope note — an approximation of a token budget, not an exact tokenizer-based count).
3. Re-sort the retained notes back into **chronological order** before building the prompt, so the model reads the thesis evolving forward in time rather than backward.
4. If any notes were dropped, visibly indicate this — both in the prompt (so the model doesn't imply completeness it doesn't have) and in the UI (so the user knows the summary is based on a recent window, not the full history).

Edge cases the implementation must handle, deferred to `03-ready` for exact behavior: zero notes (summary action should be disabled or return a clear "nothing to summarize yet" state rather than calling the model on empty input), and a single note alone exceeding the char budget (truncate that note rather than omitting it entirely, so a summary is still possible).

### Frontend UX (conceptual)

Extend the company detail page with a current-thinking panel:

1. Show the persisted `currentThinkingSummary` and `summaryGeneratedAt` if present; show an empty/first-time state if not.
2. A "Regenerate summary" action triggers the route; while in flight, show a clear busy/streaming state without blocking the rest of the page.
3. On success, once the stream completes, call `PATCH /companies/:id/summary` to persist the new text and timestamp, then update the displayed summary and timestamp together (never show a summary whose displayed timestamp doesn't match its text).
4. On any failure (missing key, timeout, provider error, non-2xx from the persist call), leave the previously-displayed summary and timestamp exactly as they were, and surface a quiet inline error — never a blank or partial summary.
5. Disable re-triggering while a generation is already in flight for the same company, to avoid overlapping requests racing to persist.

### Reliability

- Server-side timeout on the model call, generous enough for a streaming paragraph-length synthesis (longer than tag-suggest's single structured object; exact seconds belong in `03-ready`).
- Treat HTTP 429 / quota errors from Gemini as a distinct, user-visible "try again shortly" case rather than a generic failure, consistent with the reliability rules in `02-specs/mini-research-tracker-idea.md`.
- Logging: provider name, latency, outcome status, and a correlation id are fine; never log full prompts, note bodies, or the generated summary content by default.
- Because this is an explicit, user-triggered, relatively expensive call (full note history, not a single note), consider a lightweight guard against rapid repeated clicks (e.g. disable-while-in-flight from the UX section above is the minimum bar; a server-side per-company cooldown is an `03-ready` decision, not required here).

### Dependencies and sequencing

**Hard dependency:** `02-specs/05-notes-crud-tagging.md` implemented and verified — this feature has nothing to summarize without note history, and reads through whatever note-fetch shape that task lands (embedded on `GET /companies/:id` or composed server-side).

**Independent of:** `02-specs/06-ai-tag-suggest.md` — same provider and credential, no functional dependency in either direction. Either can be built first; sequencing between them is a scheduling choice, not a technical requirement.

**Soft dependency:** `browser-tasks/google-gemini-api-key.md` for local/live verification; automated tests must pass with the key absent (mocked provider), same bar as tag-suggest.

## Trade-offs

### Streaming vs a single non-streaming call

Streaming gives a more polished, "thinking live" UX for a paragraph-length response, but adds route-handler and client-side complexity (reading a stream, handling partial-failure mid-stream, only persisting after the stream actually completes). The scope already marks this cuttable; if streaming plumbing proves troublesome, a plain `generateText` call behind the same route contract is a strictly simpler fallback with no product-contract change to the rest of the app.

### Persisted summary vs computed-only output

Persisting `currentThinkingSummary`/`summaryGeneratedAt` (already reserved on `Company`) keeps the company detail page fast on normal page loads and preserves the last successful result across provider outages — the user always has something to read even when Gemini is down. The cost is potential staleness, mitigated by always showing the generation timestamp and requiring an explicit regenerate action rather than silently trusting an old summary. This is carried forward unchanged from `02-specs/mini-research-tracker-idea.md`.

### Overwrite vs versioned summary history

The schema stores exactly one `currentThinkingSummary` per company with no history table — regenerating overwrites, it does not append. This resolves Open Question #2 from `02-specs/mini-research-tracker-idea.md` at the schema level: version history was considered and deliberately not built, since a personal research notebook's "current thinking" is by definition the latest read, not an archive. If summary history becomes valuable later it is an additive schema change (a new table), not a redesign of this task.

### Character budget vs token-accurate budget

A character-count budget (~12,000 chars) is a cheap, dependency-free approximation that avoids pulling in a tokenizer just to bound prompt size. It will over- or under-estimate actual token usage somewhat, which is acceptable for a personal tool with generous model context windows; a token-accurate budget would be more precise but is not worth the added dependency for this task's scale.

## Scope

### In

- Next.js `api/summarize` route: server-side note fetch, newest-first-then-chronological capping with visible omission signaling, prompt constraints against invented figures/recommendations, `streamText` (or its non-streaming fallback) call to Gemini Flash.
- "Regenerate summary" UI on the company detail page, wired to show the persisted summary, trigger regeneration, and handle in-flight/success/failure states per the UX section above.
- Persisting the result (text + generation timestamp) via the existing `PATCH /companies/:id/summary` Nest endpoint once streaming completes.
- Tests with a mocked AI provider covering: cap/truncation logic, chronological re-sort, omission signaling, and that a failed generation never mutates the previously-persisted summary.

### Out

- Automatic/background regeneration (on note save, on a schedule, etc.) — explicitly on-demand only.
- Summary version history or diffing between regenerations.
- Streaming as a hard requirement (cuttable per the trade-offs above).
- Any cross-company synthesis, portfolio-level rollups, or use of live price/market data in the prompt.
- Rate-limiting infrastructure beyond a basic in-flight guard (server-side cooldown, if wanted, is an `03-ready` decision).

## Action Items

- Complete `browser-tasks/google-gemini-api-key.md` if not already done for tag-suggest, and record the exact Flash model id string supported on the account — shared credential and shared open item with `02-specs/06-ai-tag-suggest.md`, not a second key.
- Implement and verify `02-specs/05-notes-crud-tagging.md` first (hard dependency — nothing to summarize without it).

## Open Questions

1. Server-side regeneration cooldown per company (e.g. disallow re-trigger within N seconds server-side, not just a disabled button client-side) — worth the complexity for a single-user tool, or is the UI-level in-flight guard sufficient for v1?
2. Should the "notes omitted for length" indicator be visible permanently on the summary panel (so a user browsing later still knows the summary is partial), or only surfaced at generation time?

## Reference

`02-specs/mini-research-tracker-idea.md` ("AI Behavior → Current-thesis summary", "Trade-offs → Persisted summary versus computed-only output") is the current, cross-model-approved authority on prompt constraints, capping philosophy, and the persisted-vs-computed decision. `01-ideas/task-pipeline-and-research-tracker-plan.md` (Part B: "Next.js frontend" → `api/summarize`, endpoint list) also has the capping algorithm and route/endpoint shape in useful detail, using the shared Gemini Flash provider convention.

## Outcome

Shipped on 2026-07-23.

**Built**

- `POST /api/summarize` — fetches company notes server-side, caps history newest-first to 12,000 chars, re-sorts chronologically, calls Gemini Flash via `generateText` (non-streaming v1).
- `PATCH /companies/:id/summary` on NestJS — persists `currentThinkingSummary` + `summaryGeneratedAt`; proxied via `/api/companies/[id]/summary`.
- **Current thinking** panel on company detail: shows last summary + timestamp, **Regenerate summary** action, in-flight/error states, disabled when no notes.
- Failed generation never overwrites a previously saved summary.

**Resolved decisions**

1. UI-level in-flight guard only (no server cooldown).
2. Notes-omitted indicator shown after generation in the panel session (not persisted to DB).

**Verification**

- Backend unit tests pass (120 tests, including cap/truncation logic and summary PATCH); frontend `tsc --noEmit` passes.
- Live Gemini requires `GOOGLE_GENERATIVE_AI_API_KEY` on the frontend server (Vercel env configured).

**Deviations**

- Used `generateText` instead of `streamText` — spec marks streaming as cuttable; product contract unchanged.
