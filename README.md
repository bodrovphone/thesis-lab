# thesis-lab

An agent-assisted task pipeline for turning rough ideas into implementation-ready work and preserving what shipped.

## Pipeline

| Folder | Purpose |
| --- | --- |
| `01-ideas/` | Raw ideas, research notes, and rough plans |
| `02-specs/` | Technical approaches, trade-offs, action items, and open questions |
| `03-ready/` | Fully actionable implementation tasks with verification plans |
| `04-shipped/` | Completed work with outcomes and links |

The authoritative workflow, frontmatter convention, and two-model sign-off gate live in [`AGENTS.md`](AGENTS.md). Read it before creating, advancing, or shipping a task.

## Agent support

Claude Code and Codex expose the same `advance-task` workflow through thin, repository-scoped adapters:

- Claude Code: `.claude/skills/advance-task/SKILL.md`
- Codex: `.agents/skills/advance-task/SKILL.md`

In Claude Code, invoke `/advance-task <task-path>`. In Codex, ask it to advance the named task or explicitly mention `$advance-task`.

Both adapters delegate to `AGENTS.md`; neither defines its own transition rules. A future agent integration should follow the same pattern so the pipeline remains tool-agnostic.

## Sign-off rule

Moving a task from ideas to specs or from specs to ready requires approvals from two genuinely different models. The first model elevates and signs the content; the second reviews it, adds a distinct sign-off, and moves the file if it approves.
