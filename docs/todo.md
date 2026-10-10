# Todo

Brief (from the kickoff prompt, kept here because the prompt file was removed):

- Definition of done for the first session: milestones 1 to 3 complete, all tests passing, successful production build. In the preview build on an iPhone-sized viewport the owner can: import the example roster; pick a class; log events in all three categories and see badges and next-level hints update; undo; add a note; see register entries and notes in "To transcribe"; mark them transcribed; void an event and see counts and flags update; reload and find everything preserved; switch the language to Italian and see every screen translated with no missing keys. Milestones 4 and 5 if time allows.
- Working rules: milestone by milestone; after each milestone run lint, check, unit tests, build and e2e, commit, tick this file, add a dated entry to `progress.md`. Decisions not covered by the spec go to `decisions.md`. No questions to the owner in Phase B. Push only to the working branch, never force-push, never touch files outside the repo.
- Final deliverables: "Summary" at the top of `progress.md`, `README.md`, repository cleaned of kickoff files.

## Setup

- [x] First commit: `.gitignore`, `CLAUDE.md`, `docs/` (spec moved, todo, progress, decisions, architecture)
- [x] Scaffold: config files, scripts, lockfile, empty shell route, `ci.yml` (lint, check, unit, build)

## M1 – Domain core and storage

- [x] Types, constants, defaults
- [x] `time.ts` (calendar-day window, DST tests under Europe/Rome)
- [x] `rules.ts` (count, ladder lookup, preview, snapshot)
- [x] `recompute.ts` (void recomputation, `checkRegister`)
- [x] `validation.ts` (settings and ladder)
- [x] `merge.ts` and `roster.ts` (+ `fixtures/example-roster.json`)
- [x] `Repository` interface, memory implementation, Dexie implementation, migrations
- [x] Shared repository contract tests (both implementations)
- [x] Backup envelope, import/export round trip, CSV serializer

## M2 – Localization and logging flow

- [x] i18n layer: `en.ts`, `Messages`, `it.ts`, `translate.ts`, `index.ts`, typed `t()`, locale store
- [x] i18n tests (parity, plurals, interpolation, switching) and guard tests (no hard-coded text, no em dash)
- [x] App shell: Tailwind tokens, safe areas, navigation with badge, settings gate
- [x] State stores and services
- [x] Classes: create, rename, archive, switcher; students: add, rename, deactivate
- [x] Roster import screen with preview
- [x] Student grid with badges and category sheet
- [x] Logging with toast: undo, add note, quick phrases
- [x] Minimal Settings with language switch
- [x] Playwright e2e for the logging flow; `ci.yml` runs e2e

## M3 – Summary and history

- [x] "To transcribe" view with grouping, flagged items, badge
- [x] Mark transcribed (single and all for class), undo
- [x] Per-student and per-class history
- [x] Void with confirmation and recomputation
- [x] Playwright e2e for transcribe, void, persistence
- [x] README and progress Summary written

## M4 – Settings and data management

- [x] Category settings editor with validation, reset to defaults
- [x] Backup reminder interval, language selector (final form)
- [x] JSON backup export and CSV export
- [x] Import with preview, replace or merge
- [x] Backup reminder banner
- [x] Delete all data (typed confirmation)
- [x] Persistent storage request and status
- [x] Italian review against the glossary
- [x] e2e: change window, export/import round trip

## M5 – PWA and deployment

- [x] Manifest, icons, iOS meta tags
- [x] Native service worker, registration, update row
- [x] Offline e2e, base-path e2e (root and `/class-tally`)
- [x] `deploy.yml` (GitHub Pages)
- [x] README: GitHub Pages, Cloudflare Pages, VPS subdomain
- [x] `scripts/deploy-vps.sh`

## Cleanup

- [x] Kickoff files removed, everything documented in README and `docs/`

## Post-v0 feedback (round 1)

- [x] Export file names with date and time (D-45)
- [x] Keep tab state (History filters, open Settings sections) when switching tabs (D-46)
- [x] "?" toggle with help hints (tooltips on desktop, captions on touch) (D-47)
- [ ] Manual counter resets (per category and all, per student and per class): design to be discussed with the owner
