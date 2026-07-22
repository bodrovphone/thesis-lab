# Task Pipeline

This repository organizes all work — ideas, technical specs, implementation-ready tasks, and shipped history — as single markdown files that move through four folders, in order:

1. `01-ideas/` — raw ideas, research notes, rough plans. Unrefined; can be as short as a paragraph.
2. `02-specs/` — deep technical detail: an architecture/approach with trade-offs, an `## Action Items` section (anything needing manual/external setup a coding agent can't do on its own — creating an account, registering an app in a browser console, obtaining an API key), and an `## Open Questions` section (decisions only a human can make).
3. `03-ready/` — implementation-ready: concrete file paths/modules, schema/endpoint/interface definitions, build sequencing, and a verification plan. Should read like something an implementer (human or agent) could execute with zero further clarification.
4. `04-shipped/` — completed tasks, each with an appended `## Outcome` section describing what was actually built, deviations from spec, and links (commits/PRs).

This file (`AGENTS.md`) is the tool-agnostic source of truth for the process — written so any LLM coding agent (Claude Code, Cursor, Codex, or otherwise) can read it and follow the same procedure, independent of any single tool's skill/extension mechanism.

## Frontmatter convention

Every task file carries YAML frontmatter:

```yaml
---
title: <short title>
domain: [backend]   # any combination of: backend, frontend, infra
stage: ideas        # ideas | specs | ready | shipped — kept in sync with folder location
created: YYYY-MM-DD
---
```

`domain` is metadata, not a folder split — a task can be backend-only, frontend-only, infra-only, or any combination, without a combinatorial folder tree.

## Sign-off gate: two different models required per transition

A task file may only actually move from one folder to the next once **at least two different models** have signed off on that specific transition. This is the pipeline's cross-model verification mechanism: one model elevates a file's content, but a second, independently-invoked model (a different model — e.g. a different tool, provider, or model version, not the same one asked twice) must review and approve it before the move happens.

Every task file has a `## Sign-offs` section, placed immediately after the title (before the rest of the body), logging every sign-off ever given as one line per entry:

```
## Sign-offs
- claude-sonnet-5 — 2026-07-22 — ideas → specs
- gpt-5-codex — 2026-07-22 — ideas → specs
```

Entries accumulate for the file's whole lifetime — never delete old entries when a file advances further; they're the audit trail of who reviewed what, and when. If a file doesn't have a `## Sign-offs` section yet, create an empty one under the title the first time this procedure touches it.

## How to advance a task one stage (the "advance-task" procedure)

This is the procedure any LLM coding agent should follow when asked to advance/promote/elevate a task file to the next pipeline stage. Claude Code additionally exposes this as an installable skill at `.claude/skills/advance-task/SKILL.md`, but the procedure itself is defined here and works from this file alone — no tool-specific mechanism is required to follow it.

**Only two transitions go through this procedure**: `01-ideas → 02-specs` and `02-specs → 03-ready`. The third transition, `03-ready → 04-shipped`, is deliberately NOT part of this procedure or the sign-off gate — it happens only after the task has actually been implemented (a normal build/coding session), at which point a human or agent manually moves the file and appends the `## Outcome` section.

Given a target file currently sitting in `01-ideas/` or `02-specs/`:

1. Read the full file, including its frontmatter and its `## Sign-offs` section (create an empty one under the title if missing).
2. Determine the pending transition from the file's current folder: in `01-ideas/` it's "ideas → specs"; in `02-specs/` it's "specs → ready". Refuse/no-op if the file is already in `04-shipped/` — a file in `03-ready/` only ever leaves via the manual post-implementation step above, never via this procedure.
3. Identify yourself honestly by your own model identifier (e.g. `claude-sonnet-5`, `claude-opus-4-8`, `gpt-5`, or whatever model is actually executing this procedure right now) — this is what gets recorded in the sign-off.
4. Check the existing `## Sign-offs` entries for the pending transition and act accordingly:
   - **No entries yet for this transition**: first pass. Perform the full stage-appropriate elevation (below), then add your own sign-off line for this transition. Do **not** move the file yet — it still needs a sign-off from a second, different model.
   - **Exactly one entry, from a model different than you**: review the existing elevated content critically against the target stage's bar; fix or improve anything you disagree with. If you approve, add your own sign-off line for this transition — two distinct-model sign-offs now exist, so `git mv` the file into the destination folder and update its `stage:` frontmatter to match.
   - **Exactly one entry, from the same model as you**: you've already signed off this transition. Don't add a duplicate sign-off and don't move the file — report that it's waiting on a sign-off from a genuinely different model.
   - **Two or more distinct-model entries already exist for this transition, but the file is still sitting in the source folder** (e.g. a previous run signed off but didn't move it): just perform the move now.
5. Stage-appropriate elevation (only performed on the first pass, per step 4 above):
   - **`01-ideas` → `02-specs`**: Research and write out the technical approach — architecture options and trade-offs where more than one reasonable approach exists. Add an explicit `## Action Items` section listing anything needing manual/external setup (accounts, browser-based app registration, API keys/credentials) — things a coding agent cannot complete autonomously. Add an `## Open Questions` section for anything only the user/human can decide. Deliberately stop short of file-level implementation specifics (exact paths, schemas, endpoint names) — that level of detail belongs to the next stage.
   - **`02-specs` → `03-ready`**: Finalize the task into something fully actionable: concrete file paths/modules to create or touch, schema/endpoint/interface definitions, a build sequencing plan, an explicit cuttable/non-cuttable scope split if the task has optional parts, and a verification section (how to confirm the implementation actually works once built). Resolve every `## Open Questions` item from the specs stage, or explicitly carry forward any that remain genuinely unresolved rather than silently dropping them.
6. Report a short summary: what changed (if anything), whose sign-off was just added, and whether the file actually moved.

## Commit convention

One commit per task, named for that task, made when the task's file lands in `04-shipped/` (i.e. once it's actually implemented) — not one commit per intermediate stage move. The commit message should name the task (its `title:` frontmatter or filename slug), so `git log` reads as a list of shipped tasks. Don't bundle two unrelated tasks' code into one commit.

**Exceptions**: repo-level/infra work that isn't itself a single pipeline task (e.g. the initial pipeline scaffolding, or other cross-cutting setup) can be its own commit describing that work directly, without pretending it's a task shipment.
