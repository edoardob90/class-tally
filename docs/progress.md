# Progress

## Summary

_Written at the end of the session (see the last entry of the log)._

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
