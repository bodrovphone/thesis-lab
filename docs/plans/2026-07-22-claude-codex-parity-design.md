# Claude and Codex Workflow Parity

## Goal

Give Claude and Codex equal access to the repository's `advance-task` workflow while keeping the process portable enough to add Cursor later.

## Design

`AGENTS.md` remains the only authoritative definition of the task pipeline, transition rules, and two-model sign-off gate. Agent-specific files are discovery adapters: they identify when the workflow applies, then direct the agent to read and follow `AGENTS.md`.

Codex receives a repository-scoped skill at `.agents/skills/advance-task/SKILL.md`. Claude retains its existing adapter at `.claude/skills/advance-task/SKILL.md`. The adapters may repeat trigger metadata and a short invocation contract, but they must not duplicate the pipeline procedure.

A root `README.md` provides the human entry point: what the repository is, how the four stages work, and how to invoke the workflow in either agent. `AGENTS.md` will briefly identify the two adapters and reiterate that neither is authoritative.

No `.codex/config.toml`, model selection, sandbox policy, hooks, or MCP configuration will be added. Those settings are unnecessary for the current file-based workflow and would impose machine- or user-specific policy on the repository.

## Workflow

1. A user asks Claude or Codex to advance a named task file.
2. The tool discovers its repository-scoped `advance-task` skill.
3. The skill directs the agent to `AGENTS.md`.
4. The agent applies the same transition and sign-off rules regardless of tool.
5. A future Cursor adapter can point to the same `AGENTS.md` procedure without changing the core workflow.

## Verification

- Confirm both skill files contain valid `name` and `description` frontmatter.
- Confirm the Codex skill lives at the documented repository scope: `.agents/skills/advance-task/SKILL.md`.
- Confirm both adapters point to `AGENTS.md` and do not redefine transition logic.
- Confirm the README accurately summarizes the four stages and invocation behavior.
- Run `git diff --check` and inspect the final diff for unintended changes.
