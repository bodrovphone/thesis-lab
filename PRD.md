# Thesis Lab Product Requirements Document

| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| Status           | Living PRD — current shipped baseline         |
| Product stage    | Single-user hosted portfolio release          |
| Last updated     | 2026-07-23                                    |
| Primary audience | Product, engineering, and technical reviewers |
| Live product     | <https://thesis-lab-frontend.vercel.app>      |
| System design    | [`README.md`](README.md#system-architecture)  |

## 1. Product summary

Thesis Lab is a private investment-research workspace for tracking how a thesis develops over time. It combines normalized public-company data with the researcher’s own notes, conviction, moat classifications, business-model classifications, and an AI-assisted synthesis of current thinking.

The product is not a stock screener, brokerage interface, or recommendation engine. Its purpose is to make research reasoning durable and reviewable:

- What did I observe?
- How does it affect my understanding of the company?
- Which recurring business patterns does it support?
- How strong is my conviction now?
- What changed since my earlier notes?

This PRD describes the product that is currently shipped. Section 14 contains a separate, non-committed near-term roadmap.

## 2. Problem and opportunity

Independent company research is usually spread across documents, bookmarks, spreadsheets, market-data sites, and short-lived personal notes. That fragmentation creates three problems:

1. **Loss of reasoning history.** A conclusion may be remembered while the observations and changes that produced it are not.
2. **Inconsistent classification.** Moat and business-model ideas are difficult to compare when every note uses different language.
3. **False confidence from tooling.** External data and AI output can appear authoritative even when a provider is incomplete, unavailable, or making an inference.

Thesis Lab provides one company-centered record that keeps external facts, personal observations, classifications, source provenance, and generated synthesis visibly distinct.

## 3. Primary user

### Primary persona

An independent, fundamentals-oriented investor or analyst who follows a focused list of public companies and wants to improve the consistency and traceability of their research process.

The current release assumes:

- one implicit user;
- a relatively small tracked-company set;
- periodic research sessions rather than real-time trading;
- public company metadata and non-sensitive personal notes;
- desktop-first web use.

### Jobs to be done

When researching a company, the user needs to:

1. find and start tracking the correct public company;
2. understand which providers supplied its profile;
3. capture observations before their context is lost;
4. classify observations using a consistent framework;
5. update conviction without rewriting historical notes;
6. retrieve companies that share thesis patterns;
7. synthesize the current view without treating AI as financial truth;
8. continue working when one external provider or AI capability is unavailable.

## 4. Product principles

### 4.1 Thesis first

The researcher’s notes and evolving conviction are the product’s center of gravity. Market data provides context; it does not replace reasoning.

### 4.2 Provenance over false precision

The interface must expose where company data came from and whether enrichment was complete, partial, or unsuccessful.

### 4.3 Graceful degradation

A degraded provider should reduce data completeness, not destroy saved research or make unrelated workflows unavailable.

### 4.4 AI is assistive and reviewable

AI may classify and summarize supplied notes. It must not invent company facts, produce investment recommendations, or prevent manual work when unavailable.

### 4.5 Deliberate scope

The product favors a small number of coherent research workflows over broad market, portfolio, or collaboration features.

## 5. Goals and success criteria

### 5.1 Current-release goals

- Provide one durable workspace per tracked company.
- Combine multiple company-data sources behind one understandable profile.
- Preserve a timestamped research trail.
- Make conviction and thesis-pattern classification consistent.
- Support fast retrieval through URL-restorable filters.
- Demonstrate honest loading, empty, degraded, and error states.
- Keep all provider credentials and AI orchestration outside the browser.

### 5.2 Release success criteria

The current release is successful when all of the following are verifiably true:

| Outcome                          | Success signal                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Start research                   | A user can search for a company, select it, and reach a persisted detail workspace                                   |
| Avoid duplicate records          | Attempting to add an already tracked ticker produces a clear conflict message                                        |
| Preserve useful partial data     | A company can remain usable with visible `PARTIAL` or `FAILED` enrichment                                            |
| Capture reasoning                | Notes can be created, edited, classified, and deleted without a page-level workflow reset                            |
| Retrieve thesis patterns         | Conviction, moat, and business-model filters produce server-authoritative results and survive reload through the URL |
| Keep AI optional                 | Missing, timed-out, or rate-limited AI does not block manual notes or tags                                           |
| Preserve the last good synthesis | A failed regeneration attempt does not overwrite an existing current-thinking summary                                |
| Make state understandable        | Loading, no-data, no-match, validation, provider, and mutation failures are distinguishable                          |
| Protect secrets                  | API keys and the backend address are not exposed as browser-public environment values                                |
| Validate the release             | Unit tests, backend e2e tests, production builds, and a deployed-browser smoke path exercise the core system         |

### 5.3 Future product metrics

The single-user release does not yet collect product analytics, and this PRD does not invent usage targets. If Thesis Lab becomes a multi-user product, candidate measures are:

- **Activation:** user tracks a first company and saves a first note.
- **Research depth:** percentage of tracked companies with notes, classifications, and a current-thinking summary.
- **Return behavior:** users who return to update or review a company within 30 days.
- **Recovery:** percentage of partial/failed enrichment attempts that later complete.
- **AI usefulness:** suggestions accepted unchanged, edited, or ignored.

Targets should be set only after consent-aware instrumentation establishes a baseline.

## 6. Non-goals

The current product does not:

- recommend buying, selling, or holding securities;
- execute trades or connect to brokerage accounts;
- track positions, transactions, cost basis, or portfolio performance;
- provide real-time prices, alerts, or market news;
- perform automated valuation or financial forecasting;
- support multiple users, organizations, sharing, or permissions;
- provide editable/custom taxonomies;
- offer semantic search, chat over notes, embeddings, or vector retrieval;
- guarantee complete global security identity from a bare ticker;
- replace source filings, professional financial advice, or independent verification.

## 7. Current product scope

| Capability                                                     | Shipped state |
| -------------------------------------------------------------- | ------------- |
| Dashboard and company workspace                                | Shipped       |
| Collapsible sidebar with overview and conviction quick filters | Shipped       |
| SEC EDGAR and Finnhub company discovery                        | Shipped       |
| SEC, Finnhub, and optional Alpha Vantage enrichment            | Shipped       |
| Source provenance and enrichment status                        | Shipped       |
| Company conviction                                             | Shipped       |
| Research-note CRUD                                             | Shipped       |
| Fixed moat and business-model taxonomies                       | Shipped       |
| AI tag suggestions with user override audit                    | Shipped       |
| On-demand current-thinking summary                             | Shipped       |
| Conviction, moat, and business-model filtering                 | Shipped       |
| Recent company activity                                        | Shipped       |
| Enrichment retry                                               | Shipped       |
| Authentication and multi-user isolation                        | Not shipped   |
| Company deletion                                               | Not shipped   |
| Note/full-text search                                          | Not shipped   |
| Summary version history                                        | Not shipped   |

## 8. Key user journeys

### Journey A — Start tracking a company

1. The user opens the overview.
2. The user enters at least two ticker/name characters.
3. The product searches available company sources and displays matching candidates with ticker, name, exchange, and source provenance.
4. The user selects a candidate.
5. The product creates and enriches one normalized company record.
6. The user arrives at the company workspace.
7. If enrichment is incomplete, the workspace remains usable and shows the relevant state.

### Journey B — Capture and classify an observation

1. The user opens a company.
2. The user writes a research note.
3. The user may assign one moat pattern and one business-model pattern manually.
4. The user may request AI suggestions after providing enough note context.
5. The user reviews, accepts, or changes the suggestions.
6. The saved note records the final classifications and, when applicable, the original AI suggestion.

### Journey C — Update current thinking

1. The user reviews the company’s notes and activity trail.
2. The user changes company-level conviction if warranted.
3. The user requests a new current-thinking summary.
4. The product synthesizes bounded note history without adding external financial claims.
5. A successful summary is saved with a timestamp.
6. A failed attempt leaves the prior summary intact.

### Journey D — Retrieve companies by thesis shape

1. The user chooses a conviction, moat, or business-model filter.
2. The URL reflects the selected filters.
3. The backend applies AND semantics across active filter dimensions.
4. The product distinguishes “no companies tracked” from “no companies match.”
5. The user can clear filters or reopen/bookmark the filtered URL.

### Journey E — Recover incomplete enrichment

1. A company workspace shows partial or failed profile enrichment.
2. Existing notes and conviction remain available.
3. The user triggers enrichment retry.
4. The product shows an in-flight state and then either refreshed data or a recoverable error.

## 9. Functional requirements

The identifiers below are stable product references. They are not endpoint or source-file identifiers.

### 9.1 Navigation and overview

- **NAV-001:** The application shall provide persistent navigation identifying Thesis Lab as a private research workspace.
- **NAV-002:** The navigation shall provide an Overview route.
- **NAV-003:** The navigation shall provide quick links for Watching, Building Conviction, and High Conviction.
- **NAV-004:** Selecting a conviction quick link shall update the overview URL and visible filter state.
- **NAV-005:** The sidebar shall be collapsible without removing access to the primary workspace.

### 9.2 Dashboard and filters

- **DASH-001:** The overview shall list tracked companies with ticker, name, conviction, and available profile context.
- **DASH-002:** Company cards shall link to the corresponding company workspace.
- **DASH-003:** Partial and failed profiles shall be visibly distinguishable from complete profiles.
- **DASH-004:** The user shall be able to filter by conviction, moat pattern, and business-model pattern.
- **DASH-005:** Active filter dimensions shall use AND semantics.
- **DASH-006:** Moat and business-model filters shall match companies through their classified notes.
- **DASH-007:** Filter state shall be encoded in URL search parameters.
- **DASH-008:** The user shall be able to clear all active filters.
- **DASH-009:** The overview shall distinguish an empty workspace from an empty filtered result.
- **DASH-010:** Filter selections shall remain visible when a list request fails.

### 9.3 Company discovery and creation

- **DISC-001:** Search shall activate only after at least two non-whitespace characters.
- **DISC-002:** Search input shall be debounced to avoid a provider request for each keystroke.
- **DISC-003:** Search results shall show ticker, company name, available exchange, and contributing sources.
- **DISC-004:** The UI shall display at most ten candidates for one query.
- **DISC-005:** Selecting a candidate shall create a company by normalized ticker and navigate to its workspace.
- **DISC-006:** A duplicate ticker shall not create a second company and shall produce a clear user-facing message.
- **DISC-007:** Search shall expose loading, no-match, provider-unavailable, and create-failure states.

### 9.4 Company profile and conviction

- **COMP-001:** A company workspace shall display identity and available profile data, including ticker, name, exchange, CIK, industry, country, market capitalization, and website where known.
- **COMP-002:** The workspace shall display source provenance.
- **COMP-003:** The workspace shall represent enrichment as `COMPLETE`, `PARTIAL`, or `FAILED`.
- **COMP-004:** The user shall be able to set conviction to Watching, Building Conviction, or High Conviction.
- **COMP-005:** Conviction changes shall persist independently of external enrichment.
- **COMP-006:** Partial or failed enrichment shall not hide or delete notes, conviction, or a saved summary.
- **COMP-007:** Partial and failed profiles shall provide a retry action with pending, success, and error feedback.
- **COMP-008:** A missing company identifier shall produce a dedicated not-found experience.

### 9.5 Research notes and taxonomy

- **NOTE-001:** The user shall be able to create, edit, and delete notes belonging to a company.
- **NOTE-002:** A note body shall be capped at 4,000 characters at the application boundary.
- **NOTE-003:** A note may contain zero or one moat pattern and zero or one business-model pattern.
- **NOTE-004:** Taxonomy choices shall come from backend-owned fixed values and labels.
- **NOTE-005:** Notes shall be presented newest first.
- **NOTE-006:** Interactive note mutations shall provide pending and inline error states.
- **NOTE-007:** Optimistic note updates shall roll back if persistence fails.
- **NOTE-008:** Destructive note deletion shall require explicit user confirmation.
- **NOTE-009:** Notes shall be cascade-owned by their company in durable storage.

### 9.6 AI tag suggestions

- **TAG-001:** Tag suggestion shall be explicitly user-triggered, not automatic.
- **TAG-002:** The action shall become available only after the note contains at least 20 characters.
- **TAG-003:** AI output shall be constrained to at most one allowed moat pattern and one allowed business model; either may be absent.
- **TAG-004:** The user shall be able to review and override every suggested classification before saving.
- **TAG-005:** An optional rationale may be shown for review but shall not be stored as research truth.
- **TAG-006:** The product shall record the original suggestion and whether the saved tags differ from it.
- **TAG-007:** Missing configuration, timeout, invalid output, quota, or provider failure shall fall back to manual tagging without blocking note save.

### 9.7 Current-thinking summary

- **SUM-001:** Summary generation shall be explicitly user-triggered.
- **SUM-002:** Summary generation shall be disabled when the company has no notes.
- **SUM-003:** Input shall be limited to a 12,000-character note-history budget, preferring newer notes while preserving chronological prompt order.
- **SUM-004:** The generated text shall summarize only supplied notes, acknowledge conflicting observations, and avoid invented figures or investment recommendations.
- **SUM-005:** A successful summary shall be persisted with its generation timestamp.
- **SUM-006:** A failed generation shall leave the previous saved summary unchanged.
- **SUM-007:** When notes are omitted for length, the current session shall communicate the omission count.
- **SUM-008:** AI unavailability and rate limiting shall be presented as recoverable states.

### 9.8 Research activity

- **ACT-001:** The company workspace shall provide a compact recent-activity view.
- **ACT-002:** Activity may include when tracking began, note creation/update events, and summary regeneration.
- **ACT-003:** Activity shall be derived from durable company/note timestamps rather than maintained as a separate source of truth.
- **ACT-004:** The current view shall prioritize the five most recent signals.

## 10. UX and state requirements

### Loading

- Dashboard navigation and data loading shall show a skeleton rather than a blank page.
- Search, note mutations, enrichment retry, and summary generation shall expose local pending states.
- Pending controls shall prevent duplicate submissions.

### Empty states

- No tracked companies shall invite the user to search and add a company.
- No filter matches shall preserve filters and suggest clearing or changing them.
- No notes shall explain that a note is required before summary generation.
- No search matches shall be distinguishable from a failed search.

### Error and degraded states

- Safe, actionable messages shall be preferred over raw provider or backend errors.
- A backend outage shall not be mislabeled as “not found.”
- Provider degradation shall remain visible through provenance and enrichment status.
- Failed optimistic mutations shall restore the last confirmed state.
- A previous successful summary shall remain visible after a failed regeneration.

### Accessibility and interaction

- Primary form controls shall have programmatic labels.
- Status shall not rely on color alone.
- Keyboard-accessible native controls or accessible design-system components shall be used for core actions.
- Responsive layouts shall preserve the reading and interaction order on smaller screens.

## 11. Data, privacy, and AI safety

### Data classification

The current release stores:

- public company identity/profile data;
- user-authored research notes;
- classifications and conviction;
- AI suggestion audit fields;
- the latest generated summary and timestamp;
- external-cache payloads used for company metadata.

It does not store brokerage credentials, holdings, transactions, payment data, or portfolio values.

### Privacy and credentials

- Provider and AI credentials shall remain in server-side environment variables.
- Credentials shall never be returned in API responses or written to application logs.
- Note text shall not be included in provider request logs.
- Only the note text needed for a requested AI action, or bounded note history needed for a requested summary, shall be sent to Gemini.

### AI safety

- Generated classifications and summaries shall be presented as assistance, not verified facts.
- Prompts shall prohibit invented financial figures and investment recommendations.
- The user shall retain control over final classifications.
- AI failure shall not block deterministic product workflows.

## 12. Reliability requirements

- **REL-001:** Every external provider request shall have a bounded timeout.
- **REL-002:** SEC requests shall include the required application identity and conservative pacing.
- **REL-003:** Keyed providers shall enforce request pacing/budgets appropriate to current allowances.
- **REL-004:** HTTP 429 and equivalent provider responses shall be normalized as rate-limit events without immediate retry fan-out.
- **REL-005:** Independent enrichment providers shall settle independently so one failure does not reject all useful data.
- **REL-006:** Provider results shall be normalized before reaching the product data model.
- **REL-007:** Slow-changing SEC directory data shall use durable caching with stale-on-refresh-failure behavior.
- **REL-008:** Repeated identical short-lived searches shall be cacheable/coalesced without caching failed results.
- **REL-009:** Structured provider logs shall include source, operation, outcome, status where available, and latency.
- **REL-010:** The backend shall expose a health check that includes database connectivity.

Detailed implementation decisions and scaling constraints are documented in [`README.md`](README.md#reliability-and-failure-semantics).

## 13. Current-release acceptance

The release is acceptable when:

1. The live overview renders navigation, search, filters, and tracked companies through the deployed Vercel → Render → Neon path.
2. Searching a valid ticker returns source-aware candidates, and selecting one creates or identifies the correct company record.
3. A duplicate add returns a user-readable conflict instead of duplicating data.
4. Company detail supports conviction changes, note CRUD, optional classifications, and recent activity.
5. AI tag suggestion can be accepted or overridden, and provider failure leaves manual tagging usable.
6. Summary generation persists a timestamped result and preserves it after later failure.
7. URL filters restore their state after reload and apply backend-authoritative AND semantics.
8. Partial or failed enrichment remains visible, retains research state, and offers retry.
9. Backend unit/e2e tests, frontend unit tests, and production builds pass.
10. A deployed-browser smoke test covers overview loading and at least one URL-driven quick filter.

## 14. Near-term roadmap — not currently shipped

Roadmap items are ordered by risk reduction and research value. They are not current-release commitments.

### Horizon 1 — Protect and preserve research

**Outcome:** The product can safely hold meaningful personal research beyond a public demo.

- Add authentication and explicit ownership of companies and notes.
- Add authorization enforcement and tenant-aware indexes.
- Add company deletion with impact explanation and explicit confirmation.
- Add export/backup for company research.
- Add editable or versioned current-thinking summaries rather than retaining only the latest generated result.

### Horizon 2 — Improve retrieval and thesis history

**Outcome:** A growing notebook remains useful as the number of companies and notes increases.

- Add full-text search across company names, descriptions, and note bodies.
- Add summary history and a visible “what changed” comparison.
- Expand the activity trail beyond the five-event derived view if users need deeper history.
- Add saved research views without replacing URL-addressable filters.

### Horizon 3 — Decouple long-running enrichment

**Outcome:** Provider latency and hosting cold starts no longer control the user request lifecycle.

- Move enrichment to idempotent background jobs.
- Show queued/running/succeeded/partial/failed progress.
- Persist attempts and provider outcomes.
- Add bounded backoff and dead-letter handling.
- Share caches and provider budgets across backend instances when horizontal scaling begins.

### Horizon 4 — Operate with evidence

**Outcome:** Reliability and product decisions use observable data.

- Add correlation IDs, traces, provider metrics, and latency/error dashboards.
- Define service-level objectives for core research reads and writes.
- Add consent-aware product analytics for activation and research-depth measures.
- Add contract tests or generated clients if frontend and backend begin releasing independently.

### Explicitly later

Collaboration, portfolio tracking, brokerage integrations, real-time alerts, automated financial analysis, and semantic chat remain outside the near-term roadmap until the core research workflow demonstrates sustained demand.

## 15. Constraints and risks

| Risk or constraint                   | Current treatment                                 | Trigger for change                                           |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| Single implicit user and open writes | Acceptable only for the portfolio demo            | Any real user onboarding or sensitive research               |
| Render cold starts                   | Loading skeleton and clear wait state             | Cold starts materially harm repeated research sessions       |
| Synchronous enrichment               | Simpler current operating model                   | Provider latency, traffic, or retries exceed request budgets |
| Ticker uniqueness                    | Fits current supported scope                      | Expansion to markets where ticker alone is ambiguous         |
| Process-local Finnhub cache/budget   | Fits one backend instance                         | Horizontal backend scaling                                   |
| Optional Alpha Vantage allowance     | Feature flag and conservative daily cap           | Higher data volume or paid provider plan                     |
| Latest-summary-only persistence      | Simple current UX                                 | Users need auditability or comparison over time              |
| Fixed taxonomy                       | Consistent filters and constrained AI output      | Users demonstrate a need for custom frameworks               |
| No product analytics                 | Avoids invented metrics and extra data collection | Multi-user validation begins                                 |

## 16. Open product questions

1. Should users edit generated current-thinking text directly, preserve every generated version, or both?
2. What export format best protects user ownership of research: Markdown, JSON, CSV, or a bundle?
3. Should company deletion permanently remove note history or provide a recoverable archive?
4. At what research-set size does full-text note search become more valuable than additional filters?
5. If multi-user use is pursued, is the first model private individual workspaces or organization collaboration?

## 17. Decision log

| Date       | Decision                                                  | Rationale                                                                   |
| ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| 2026-07-22 | Build a thesis tracker, not a stock screener              | Keeps the product centered on reasoning and change over time                |
| 2026-07-22 | Use fixed conviction, moat, and business-model taxonomies | Enables consistent filtering and schema-constrained AI output               |
| 2026-07-22 | Treat partial enrichment as a normal product state        | Useful research should survive individual provider failures                 |
| 2026-07-22 | Keep the first release single-user and unauthenticated    | Concentrates the initial scope on research and integration behavior         |
| 2026-07-23 | Make AI actions explicit and non-blocking                 | Preserves user control and deterministic manual workflows                   |
| 2026-07-23 | Persist only the latest successful summary                | Keeps the first summary workflow small and resilient                        |
| 2026-07-23 | Use URL-owned dashboard filters                           | Makes research views restorable without a global client store               |
| 2026-07-23 | Maintain one root PRD                                     | Product journeys cross frontend/backend implementation boundaries           |
| 2026-07-23 | Document shipped scope separately from roadmap            | Prevents aspirational capabilities from being presented as current behavior |

## 18. Related documentation

- [Architecture and engineering overview](README.md)
- [Editable system architecture diagram](docs/architecture/thesis-lab-system-architecture.excalidraw)
- [Cross-model technical reference](02-specs/mini-research-tracker-idea.md)
- [Shipped task outcomes](04-shipped/README.md)
- [Engineering task pipeline](AGENTS.md)
- [PRD design record](docs/plans/2026-07-23-product-requirements-document-design.md)
