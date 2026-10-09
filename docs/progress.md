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
