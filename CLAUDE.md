# class-tally

Offline-first PWA (SvelteKit 3, Svelte 5, TypeScript strict, Tailwind 4, Dexie) for a secondary school teacher to log classroom warnings per student and category, with rolling-window counts and escalation ladders, and an end-of-lesson list of what to copy into the official register.
Requirements: `docs/spec.md` (single source of truth).

## Commands

- Install: `npm ci`
- Dev server: `npm run dev`
- Build: `npm run build` (set `BASE_PATH=/class-tally` for a sub-path build)
- Preview the build: `npm run preview`
- Lint and format check: `npm run lint` (fix with `npm run format`)
- Type check: `npm run check`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e` (builds first, iPhone-sized viewport)

## Conventions

- Code and docs are in English.
- Every user-facing string goes through `t()` and lives in `src/lib/i18n`. `en.ts` is the source of truth, `it.ts` is typed against it. When you add or change an English string, update `it.ts` in the same commit.
- Never use the em dash character in UI strings or docs, in either language. Use the en dash "–".
- The domain core (`src/lib/domain`) must not import UI or storage code. UI never touches IndexedDB; it goes through the `Repository` interface (`src/lib/storage`).
- Only the repository layer sets `updatedAt`; `createdAt` is set once.

## Privacy

- No network requests at runtime, no CDN assets or fonts, no telemetry.
- Only invented names in fixtures and tests.

## Working rules

- Update `docs/progress.md` and `docs/todo.md` after every milestone.
- Record every decision not covered by the spec in `docs/decisions.md`. Never deviate from the spec silently.
- Run lint, check, unit tests, build and e2e before each commit.

## Docs

- `docs/spec.md` requirements
- `docs/architecture.md` structure, stack, deployment
- `docs/todo.md` milestone checklists
- `docs/progress.md` summary, manual test checklist, dated log
- `docs/decisions.md` decisions beyond the spec
