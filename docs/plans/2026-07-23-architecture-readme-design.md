# Architecture README Design

## Goal

Reframe the repository for a CTO or technical hiring manager. The README should explain what Thesis Lab does, show how the deployed system is partitioned, and make the engineering decisions and trade-offs visible without reading the source first.

## Audience and narrative

The primary audience is a senior technical reviewer. The document therefore leads with:

1. the product problem and system responsibilities;
2. the production architecture and core request flows;
3. reliability, security, and data ownership decisions;
4. explicit trade-offs and a credible evolution path;
5. local development and the repository's agent-assisted task pipeline.

This keeps the current setup instructions and workflow documentation, but moves them behind the system-design case study.

## Architecture representation

The README embeds a Mermaid deployment diagram so the architecture renders directly on GitHub. An editable Excalidraw source is stored under `docs/architecture/` for interviews, design reviews, and future edits.

Both diagrams show the same boundaries:

- browser/client;
- Next.js on Vercel as UI, BFF, and server-side AI orchestration;
- NestJS on Render as the domain and provider-orchestration API;
- Neon PostgreSQL as the durable system of record;
- SEC EDGAR, Finnhub, and optional Alpha Vantage as market-data providers;
- Gemini as an optional server-side AI capability.

## Content decisions

The architecture section will cover:

- search, add, note, summary, and enrichment-retry flows;
- server-only secret and backend access boundaries;
- provider adapters, normalized outcomes, timeouts, request pacing, and budgets;
- partial-success semantics and user-visible enrichment status;
- durable and in-memory cache roles;
- the Company, Note, and ExternalApiCacheEntry data model;
- current deployment constraints and the next scaling steps.

Claims must describe code that exists today. Correlation IDs, asynchronous enrichment queues, distributed budgets, authentication, and multi-tenancy are presented as evolution paths rather than shipped capabilities.

## Verification

- Parse the Excalidraw artifact as JSON and enforce Excalidraw font family `5` for every text element.
- Check Markdown links and whitespace with `git diff --check`.
- Run the repository lint, unit-test, and production-build commands.
- Review the final diff to ensure only the root README and new architecture documentation are part of this change.
