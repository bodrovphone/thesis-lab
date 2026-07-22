# Cursor Workflow Parity

## Goal

Give Cursor the same `advance-task` discovery path Claude Code and Codex already have, without changing the tool-agnostic procedure in `AGENTS.md`.

## Design

Follow the existing Claude/Codex parity pattern from `2026-07-22-claude-codex-parity-design.md`:

- `AGENTS.md` stays authoritative.
- Cursor gets a thin skill adapter at `.cursor/skills/advance-task/SKILL.md` with the same frontmatter and body contract as the other two adapters.
- Cursor also gets concise project rules under `.cursor/rules/`:
  - `task-pipeline.mdc` (`alwaysApply: true`) — Cursor equivalent of `CLAUDE.md`: points at `AGENTS.md` and the skill, restates the two-model sign-off gate and the no-skill ship transition.
  - `task-files.mdc` (globs on pipeline folders) — frontmatter / sign-offs / no ad-hoc stage moves when editing task markdown.
- No Cursor user settings, MCP config, or machine-specific policy in the repo.

## Workflow

1. User asks Cursor to advance a named task.
2. Cursor discovers `.cursor/skills/advance-task/SKILL.md` (and/or the always-apply pipeline rule).
3. The skill directs the agent to `AGENTS.md`.
4. The agent applies the same transition and sign-off rules as Claude/Codex.

## Verification

- Confirm the Cursor skill has valid `name` / `description` frontmatter and matches the Claude/Codex adapter body.
- Confirm `.cursor/rules/*.mdc` files have correct frontmatter and do not redefine transition logic.
- Confirm `README.md` and `AGENTS.md` list the Cursor adapter alongside Claude and Codex.
- Run `git diff --check` and inspect the final diff for unintended changes.
