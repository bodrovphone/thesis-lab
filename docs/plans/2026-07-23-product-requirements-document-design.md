# Product Requirements Document Design

## Goal

Create a product-level source of truth for Thesis Lab that explains the currently shipped experience and keeps the near-term roadmap clearly separate. The primary audience is a CTO or technical hiring manager evaluating product judgment as well as implementation quality.

## Document location

Use one root-level `PRD.md`.

Thesis Lab is one product composed of end-to-end user journeys. Splitting requirements between `frontend/` and `backend/` would organize the document around implementation boundaries instead of user outcomes and would create avoidable duplication. Technical ownership remains documented in the architecture README and service-specific documentation.

## Content structure

The PRD will include:

1. document status and product summary;
2. problem statement and opportunity;
3. primary user and jobs-to-be-done;
4. product principles;
5. goals, success criteria, and non-goals;
6. shipped product scope;
7. key user journeys;
8. stable functional requirements grouped by product capability;
9. UX and failure-state requirements;
10. data, privacy, AI-safety, and reliability requirements;
11. current-release acceptance criteria;
12. constraints and risks;
13. a separately labeled near-term roadmap;
14. open product questions and a decision log;
15. links to the live product, architecture, technical specification, and shipped work.

Functional requirements will use stable identifiers so future tasks and tests can reference product intent without turning the PRD into an API or file-level specification.

## Success criteria

The PRD should let a reviewer answer:

- Who is the product for and what problem does it solve?
- What is available in the live product today?
- What behavior is required across happy, degraded, and failure paths?
- How are AI suggestions constrained and kept non-authoritative?
- Which quality expectations define a credible current release?
- What is deliberately excluded?
- Which future capabilities are plausible next steps rather than shipped claims?

Metrics will remain honest for a single-user portfolio product. They will focus on verifiable workflow completion, recoverability, data preservation, and visible system state rather than invented acquisition or engagement analytics.

## Repository integration

Add a prominent PRD link near the top of the root `README.md`. Do not duplicate the architecture narrative in the PRD; link to it where system implementation detail is relevant.

## Verification

- Cross-check every shipped requirement against the current frontend, backend, Prisma schema, and shipped-task records.
- Keep roadmap items explicitly outside current-release acceptance criteria.
- Verify Markdown links and run `git diff --check`.
- Review the final diff for product/technical boundary clarity and accidental scope claims.
