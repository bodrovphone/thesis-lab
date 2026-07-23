---
title: Astryx dashboard UI refresh
domain: [frontend]
stage: ideas
created: 2026-07-23
---

# Astryx dashboard UI refresh

## Sign-offs

## Context
Evaluate Meta's Astryx React design system for the Thesis Lab web dashboard and replace the hand-rolled dashboard UI primitives where Astryx materially improves consistency, accessibility, and future feature work.

This is for the Next.js web app, not the Unity/Quest Meta Horizon UI Set. Astryx is a React component library installed from npm and documented with Next.js examples, theme CSS, Tailwind interop guidance, and dashboard-friendly components.

## Scope
- Add Astryx to the frontend deliberately: `@astryxdesign/core`, an approved Astryx theme package, and the Astryx CLI only if its generated guidance is useful and reviewed before being kept.
- Import Astryx reset/theme CSS through the frontend global stylesheet with explicit cascade-layer handling so it does not accidentally fight the existing Tailwind setup.
- Refresh the existing dashboard shell using Astryx layout, heading/text, card/clickable-card, badge/status, empty-state, skeleton/spinner, toast/banner, and search/typeahead-style components where they fit.
- Keep backend routes and data contracts unchanged; this task is only a UI/design-system adoption pass.
- Preserve the existing SEC dashboard behavior: list tracked companies, show empty state, search external companies, add by ticker, navigate to company detail, and handle duplicate/error/loading states.
- Document component choices so later dashboard filters/search can reuse Astryx selectors, segmented controls, Power Search, table/list, and badges instead of adding one-off controls.

## Depends on
02-sec-edgar-vertical-slice.

## Sequencing note
This can ship any time after the SEC dashboard/detail vertical slice exists. If pulled forward before `08-dashboard-filters-search`, that later task should build its filter bar and search UI on top of the Astryx primitives chosen here. If time is tight, this can instead be folded into the polish pass and the first release can keep the simpler Tailwind dashboard.

## Open Questions
- Which Astryx theme should Thesis Lab start from: Neutral for restrained product UI, Stone for a little more warmth, or a custom copied theme?
- Should the dashboard remain card-first, or should the Astryx refresh move tracked companies to a denser table/list layout before filters arrive?
- Should the Astryx CLI-generated agent guidance be committed, or should the task record only the specific conventions adopted for this repo?

## Reference
- Astryx components: https://astryx.atmeta.com/components
- Astryx getting started: https://astryx.atmeta.com/docs/getting-started
- Astryx themes: https://astryx.atmeta.com/themes
- Current dashboard task: `03-ready/02-sec-edgar-vertical-slice.md`
- Later dashboard filters task: `01-ideas/08-dashboard-filters-search.md`
