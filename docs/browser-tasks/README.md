# browser-tasks

Standalone action items for a browser-capable agent (Claude Cowork, Codex Computer, or similar) to execute independently — creating accounts and obtaining API keys/credentials for external services this project depends on.

**These are not part of the `docs/task-pipeline/01-ideas` → `docs/task-pipeline/02-specs` → `docs/task-pipeline/03-ready` → `docs/task-pipeline/04-shipped` pipeline.** No `stage`/`domain` frontmatter, no sign-off gate, no `advance-task` procedure applies here — each file is a self-contained, one-shot browser task. Point an agent at exactly one file per session.

Each file lists: why it's needed, the steps to do it, and what credential(s) to hand back once done (to be placed in the relevant `.env` per the repo's `.env.example`, never committed).
