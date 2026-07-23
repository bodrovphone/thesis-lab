---
title: Obtain Google AI Studio API key for Gemini Flash
created: 2026-07-23
---

# Obtain Google AI Studio API key for Gemini Flash

Standalone browser task — not part of the task pipeline (see `browser-tasks/README.md`).

## Why
`01-ideas/06-ai-tag-suggest.md` and `01-ideas/07-ai-summarize.md` use Gemini Flash via the AI SDK's `@ai-sdk/google` provider — not Anthropic/OpenAI — because there's existing balance on this Google account.

## Steps
1. Go to https://aistudio.google.com.
2. Sign in with the Google account that already has the Gemini balance — **this task should reuse that existing account**, unlike the Neon/Vercel tasks in this folder which need fresh ones.
3. Go to "Get API key" and create a new API key (a new or existing Google Cloud project underneath it both work fine for this use case).
4. Copy the API key.

## What to hand back
- `GOOGLE_GENERATIVE_AI_API_KEY=<the key>`
- The exact Flash model id available on this account/balance (e.g. `gemini-2.5-flash` or whichever tier applies) — Google's Flash naming has shifted across versions, so note the precise id string for whoever implements tasks 06/07.

## Notes
- This is the one credential in this folder that should use the *existing* account, not a new signup.
- Use `GOOGLE_GENERATIVE_AI_API_KEY` exactly for both local `frontend/.env.local` and the Vercel frontend project's server-side environment variables. Do not use a `NEXT_PUBLIC_*` variable; the key must never be exposed to browser code.
