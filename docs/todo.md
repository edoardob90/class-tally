# Todo

Brief (from the kickoff prompt, kept here because the prompt file was removed):

- Definition of done for the first session: milestones 1 to 3 complete, all tests passing, successful production build. In the preview build on an iPhone-sized viewport the owner can: import the example roster; pick a class; log events in all three categories and see badges and next-level hints update; undo; add a note; see register entries and notes in "To transcribe"; mark them transcribed; void an event and see counts and flags update; reload and find everything preserved; switch the language to Italian and see every screen translated with no missing keys. Milestones 4 and 5 if time allows.
- Working rules: milestone by milestone; after each milestone run lint, check, unit tests, build and e2e, commit, tick this file, add a dated entry to `progress.md`. Decisions not covered by the spec go to `decisions.md`. No questions to the owner in Phase B. Push only to the working branch, never force-push, never touch files outside the repo.
- Final deliverables: "Summary" at the top of `progress.md`, `README.md`, repository cleaned of kickoff files.

## Setup

- [x] First commit: `.gitignore`, `CLAUDE.md`, `docs/` (spec moved, todo, progress, decisions, architecture)
- [x] Scaffold: config files, scripts, lockfile, empty shell route, `ci.yml` (lint, check, unit, build)

## M1 – Domain core and storage

- [ ] Types, constants, defaults
- [ ] `time.ts` (calendar-day window, DST tests under Europe/Rome)
- [ ] `rules.ts` (count, ladder lookup, preview, snapshot)
- [ ] `recompute.ts` (void recomputation, `checkRegister`)
- [ ] `validation.ts` (settings and ladder)
- [ ] `merge.ts` and `roster.ts` (+ `fixtures/example-roster.json`)
- [ ] `Repository` interface, memory implementation, Dexie implementation, migrations
- [ ] Shared repository contract tests (both implementations)
- [ ] Backup envelope, import/export round trip, CSV serializer

## M2 – Localization and logging flow

- [ ] i18n layer: `en.ts`, `Messages`, `it.ts`, `translate.ts`, `index.ts`, typed `t()`, locale store
- [ ] i18n tests (parity, plurals, interpolation, switching) and guard tests (no hard-coded text, no em dash)
- [ ] App shell: Tailwind tokens, safe areas, navigation with badge, settings gate
- [ ] State stores and services
- [ ] Classes: create, rename, archive, switcher; students: add, rename, deactivate
- [ ] Roster import screen with preview
- [ ] Student grid with badges and category sheet
- [ ] Logging with toast: undo, add note, quick phrases
- [ ] Minimal Settings with language switch
- [ ] Playwright e2e for the logging flow; `ci.yml` runs e2e

## M3 – Summary and history

- [ ] "To transcribe" view with grouping, flagged items, badge
- [ ] Mark transcribed (single and all for class), undo
- [ ] Per-student and per-class history
- [ ] Void with confirmation and recomputation
- [ ] Playwright e2e for transcribe, void, persistence
- [ ] README and progress Summary written

## M4 – Settings and data management

- [ ] Category settings editor with validation, reset to defaults
- [ ] Backup reminder interval, language selector (final form)
- [ ] JSON backup export and CSV export
- [ ] Import with preview, replace or merge
- [ ] Backup reminder banner
- [ ] Delete all data (typed confirmation)
- [ ] Persistent storage request and status
- [ ] Italian review against the glossary
- [ ] e2e: change window, export/import round trip

## M5 – PWA and deployment

- [ ] Manifest, icons, iOS meta tags
- [ ] Native service worker, registration, update row
- [ ] Offline e2e, base-path e2e (root and `/class-tally`)
- [ ] `deploy.yml` (GitHub Pages)
- [ ] README: GitHub Pages, Cloudflare Pages, VPS subdomain
- [ ] `scripts/deploy-vps.sh`

## Cleanup

- [ ] Kickoff files removed, everything documented in README and `docs/`
