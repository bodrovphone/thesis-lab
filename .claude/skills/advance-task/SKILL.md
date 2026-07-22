---
name: advance-task
description: Advance a task markdown file to the next stage of this repo's pipeline (01-ideas -> 02-specs -> 03-ready), elevating its content to match the target stage's bar. A file only actually moves once two different models have signed off on the transition. Use when the user says "advance this task", "promote to specs", "move to ready", "sign off on this task", asks to progress a file in 01-ideas/ or 02-specs/, or references the advance-task skill directly.
---

# advance-task

Implements the procedure documented in `/AGENTS.md` at the repo root ("How to advance a task one stage" + "Sign-off gate: two different models required per transition") — read that file for the full, authoritative description of the pipeline and this procedure. Do not duplicate or diverge from it here; if the two ever disagree, `AGENTS.md` wins and this file should be updated to match it.

## Invocation

Takes one argument: a path to a task file currently in `01-ideas/` or `02-specs/`. If no path is given, ask which file to advance rather than guessing — do not scan the folders and pick one.

## Steps

1. Read the target file in full, including frontmatter and its `## Sign-offs` section (create an empty one right under the title if it doesn't have one yet).
2. Determine the pending transition from its folder (`01-ideas` -> "ideas -> specs", `02-specs` -> "specs -> ready"). If it's already in `03-ready/` or `04-shipped/`, stop and explain: `03-ready -> 04-shipped` is a manual, post-implementation step, not something this skill does, and isn't gated by sign-offs.
3. Infer/update the `domain: [...]` frontmatter field (any combination of `backend`, `frontend`, `infra`) from the file's content.
4. Identify yourself by your own model identifier (whatever model is actually running this — e.g. `claude-sonnet-5`, `claude-opus-4-8`) — this is what you'll record in the sign-off.
5. Check the `## Sign-offs` entries already logged for this pending transition:
   - **None yet**: this is the first pass — do the elevation (step 6), then add your sign-off line. Do not move the file; it still needs a second, different model's sign-off.
   - **One entry, different model than you**: review the existing content critically against the target stage's bar, fix anything you disagree with, then add your own sign-off line. Two distinct-model sign-offs now exist — `git mv` the file into the destination folder and update its `stage:` frontmatter.
   - **One entry, same model as you**: don't duplicate the sign-off, don't move the file. Report it's waiting on a genuinely different model.
   - **Two-plus distinct-model entries already logged but the file never moved**: just move it now.
6. Elevate the body per the target transition (only on the first pass, per step 5):
   - `01-ideas -> 02-specs`: add real technical depth (architecture/approach, trade-offs where relevant), a `## Action Items` section (manual/external setup steps a coding agent can't do itself), and an `## Open Questions` section (user-only decisions). No file-level implementation specifics yet.
   - `02-specs -> 03-ready`: finalize into a fully actionable spec — concrete file paths, schema/endpoints/interfaces, build sequencing, a cuttable/non-cuttable scope split if relevant, and a verification plan. Resolve or explicitly carry forward every open question from the specs stage.
7. Report what changed, whose sign-off was just added, and whether the file actually moved.

Sign-off entries accumulate for the file's whole life — never delete old ones. A sign-off only counts toward the two-model gate if it's from a model genuinely different from the one asked to advance the file this time; don't let the same model satisfy both slots.
