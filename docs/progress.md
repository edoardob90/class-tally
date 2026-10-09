# Progress

## Summary

_State after milestone 3 (updated at the end of every milestone; see the log below for details)._

### Try it

- Locally: `npm ci && npm run build && npm run preview`, then open http://localhost:4173 (in Chrome use the device toolbar with an iPhone profile).
- On the iPhone on the same Wi-Fi: `npm run build && npm run preview -- --host`, then open `http://<computer-ip>:4173` in Safari. Over plain HTTP the service worker and installing do not work; layout, taps and storage do.
- With HTTPS (needed for install and offline): deploy as described in the README (GitHub Pages after merging to `main`, your VPS subdomain with `scripts/deploy-vps.sh`, or Cloudflare Pages), then open the address in Safari, Share, Add to Home Screen, and open it from the icon.

### Manual test checklist (iPhone)

1. Open the HTTPS address in Safari, Share, Add to Home Screen. Launch from the icon while online and wait a few seconds.
2. Classes, Import roster: paste a few "Surname Name" lines, then import `fixtures/example-roster.json` (AirDrop or Files app; or paste its text). Check the preview and the generated labels.
3. Log events in all three categories on several students. Check the badge (count, level letter, colour), the next action in the category sheet, and that it takes three taps.
4. Undo from the toast. Add a note from the toast (type, and use a quick phrase). Check that the note field is not hidden by the keyboard.
5. Log four behaviour events for one student: verbal, register, register, note.
6. To transcribe: items grouped by class and date; mark one, then "Mark all transcribed"; Undo; the badge on the tab follows.
7. History: by student and by class with a date range; void an early event: later counts shift, a transcribed later event gets "Check register" (shown in To transcribe, cleared with "Checked").
8. Fully close the app from the app switcher and reopen: everything is still there. Airplane mode on, close and reopen: still works (after milestone 5).
9. Layout: nothing under the notch or the home indicator, no horizontal scrolling, no zoom when tapping a text field, comfortable one-handed reach, rotate to landscape.
10. Settings, Language: switch to Italiano and walk every screen: no raw keys, glossary terms correct (Comportamento, Compiti, Materiale, Avviso verbale, Richiamo sul registro, Nota disciplinare, Da trascrivere, Trascritto, Annulla evento). Switch back.
11. After milestone 4: change a window to 1 day and see counts change; an invalid ladder shows an inline error; reset to defaults; export JSON via the share sheet to Files; export CSV and open it; import with merge and with replace; the backup reminder; storage status; delete all data.
12. After a new deploy: open the app twice and look for "Update available" in Settings; the data is kept.

### What is done, partial, missing

- Done: milestones 1 to 3 (domain core and storage, localization and logging flow, To transcribe, history, void). All unit and e2e tests pass.
- Partial: Settings has only the language switch.
- Missing: milestones 4 and 5 (settings editor, backups and exports, PWA install and offline, deploy workflow). The README already describes them.

### Known issues and open questions

- The toast covers the bottom of the screen for 8 seconds; it can be dismissed with the close button.
- WebKit (Safari engine) is only exercised in CI (non-blocking); local e2e runs use Chromium with an iPhone profile.
- The Italian strings are a first draft for review (`src/lib/i18n/it.ts`).

### Decisions beyond the spec (see `docs/decisions.md`)

- D-01 rolling window uses calendar days in local time
- D-02 students have name and surname, label stays stored as "Name S."
- D-03 students sorted by surname then name
- D-04 Italian: Undo = Annulla, Void = Annulla evento, dialog Cancel = Indietro
- D-05 flagged items listed in To transcribe, counted in the badge, cleared with Checked
- D-06 "milestone 1" in the non-goals means the first release
- D-07 optional edited flags for category labels and quick notes
- D-08 default quick phrases
- D-09 event ordering and void recomputation rules
- D-10 undo is a hard delete, later removal is a void
- D-11 one toast at a time
- D-12 validation limits
- D-13 student management and roster re-import rules
- D-14 backup merge rules
- D-15 CSV format
- D-16 delete all data
- D-17 haptics
- D-18 light theme only
- D-19 English at first run, no flash
- D-20 no backdating
- D-21 layout additions
- D-22 routing with query parameters
- D-23 Lucide icons
- D-24 native service worker, TypeScript 6
- D-25 placeholder parity by unit test only
- D-26 kickoff files removed
- D-27 roster files with several classes
- D-28 SvelteKit 3 configuration
- D-29 monotonic updatedAt
- D-30 UUID fallback
- D-31 relative imports and trailing slashes
- D-32 optimistic toast, authoritative snapshot
- D-33 sheets use the native dialog
- D-34 e2e browser

## Log

### 2026-10-09 – Setup

- Moved `spec.md` to `docs/spec.md`, removed the kickoff prompt file, added `.gitignore`, `CLAUDE.md`, `docs/todo.md`, `docs/progress.md`, `docs/decisions.md`, `docs/architecture.md`.
- Next: scaffold the SvelteKit project and CI, then milestone 1.

### 2026-10-09 – Milestone 1: domain core and storage

- Done: types, limits and defaults; `time.ts` (calendar-day window in local time, DST tests for 2026-03-29 and 2026-10-25 under Europe/Rome and a UTC run); `rules.ts`; `recompute.ts`; `validation.ts`; `merge.ts`; `roster.ts` (name splitting, labels, sorting); `Repository` interface with memory and Dexie implementations and one shared contract suite (26 cases each); backup envelope with validation, migrations chain and import planning; CSV serializer; `fixtures/example-roster.json` (3 invented classes).
- Status: lint, type check, 137 unit tests and the production build pass.
- Notes: SvelteKit 3 keeps its configuration in `vite.config.ts` (no `svelte.config.js`); Dexie wraps errors thrown inside transactions, so the Dexie repository unwraps `NotFoundError`; the roster importer also accepts `{ "classes": [...] }` (several classes in one file) so the fixture can hold three classes.
- Next: milestone 2 (localization layer, then the logging flow).

### 2026-10-09 – Milestone 2: localization layer and logging flow

- Done: i18n layer first (`en.ts` source of truth, `Messages` derived type, `it.ts` typed against it, pure `translate.ts` with typed `t()` and `Intl.PluralRules`, reactive locale store, formatting helpers, display helpers for user-editable labels and quick notes); tests for key parity, placeholder parity, plural shape, interpolation, typing (`@ts-expect-error` checks), locale switching; guard tests (no hard-coded text in `.svelte`, no em dash, no external URLs in source).
- Done: services (log, undo, note, void with recomputation, transcription, student add/edit, roster import), rune stores (app cache, toast, logging flow), app shell with safe areas and bottom navigation with badge, class grid with level badges (count, letter, icon, colour), category sheet with the next action, toast with Undo and Add note (8 s, timestamp based), note dialog with quick phrases, class switcher, class and student management, roster import with editable preview (surname/name swap), minimal Settings with the language switch, stub pages for To transcribe and History.
- E2E (Playwright, iPhone 14 viewport on Chromium, Europe/Rome): import roster, switch class, log in all categories, ladder up to the disciplinary note, undo, note with quick phrase, toast timeout (fake clock), reload persistence, no cross-origin requests, Italian switch without reload with every route free of raw keys.
- Status: lint, type check, 171 unit tests, build and 10 e2e tests pass. CI now has an `e2e` job (Chromium blocking, WebKit allowed to fail until seen green).
- Notes: SvelteKit 3 has no `$lib` alias in this setup, so relative imports are used; `trailingSlash: 'always'` so every route is `<route>/index.html`; in the cloud sandbox Playwright needs `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (the installed browser revision differs from the one Playwright 1.64 expects).
- Next: milestone 3 (To transcribe, history, void).

### 2026-10-09 – Milestone 3: summary and history

- Done: "To transcribe" (grouped by class and local day, flagged items on top, mark one or all, undo, "Checked"), navigation badge (pending plus flagged), history by student (by category, newest first) and by class (date range, presets, category filter), note editing, void with confirmation (extra warning for transcribed events) and recomputation, local-day helpers and list builders with unit tests, README, progress Summary.
- E2E added: transcribe and undo, void with recomputation and check-register flag, warning for transcribed events, class range and note edit. 14 e2e tests pass.
- Status: lint, type check, 179 unit tests, build and 14 e2e tests pass.
- Next: milestone 4 (settings editor, backups, exports, delete all, storage persistence).
