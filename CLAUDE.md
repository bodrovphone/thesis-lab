# thesis-lab

This repo runs on a 4-stage task pipeline (`docs/task-pipeline/01-ideas/` → `docs/task-pipeline/02-specs/` → `docs/task-pipeline/03-ready/` → `docs/task-pipeline/04-shipped/`). The full, tool-agnostic process description lives in `AGENTS.md` at the repo root — read that first before touching any task file.

Claude-Code-specific notes:
- The `docs/task-pipeline/01-ideas → docs/task-pipeline/02-specs` and `docs/task-pipeline/02-specs → docs/task-pipeline/03-ready` transitions are available through the `advance-task` discovery adapter (`.claude/skills/advance-task/SKILL.md`), which delegates to the exact procedure in `AGENTS.md`.
- `docs/task-pipeline/03-ready → docs/task-pipeline/04-shipped` is never a skill call — only move a file there after it has actually been implemented and verified, appending an `## Outcome` section.
- A file only actually moves from `docs/task-pipeline/01-ideas`/`docs/task-pipeline/02-specs` once **two different models** have signed off on that transition in its `## Sign-offs` section — never move a file on a single model's say-so, and never let the same model fill both sign-off slots. See `AGENTS.md` for the exact gating logic.
