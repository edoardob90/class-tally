# class-tally – specification

A small offline-first Progressive Web App for a secondary school teacher to log classroom warnings ("richiami") per student and per category during a lesson, see at a glance where each student stands on the escalation ladder, and get an end-of-lesson list of what must be copied into the official electronic register.

Working name: `class-tally` (repository and app). Can be renamed before the first commit.

## Context

- One teacher, three classes of about 20 students each, 4 lessons per week per class.
- Warnings fall into the same three categories used by the school's electronic register: behaviour, homework, materials.
- Each category has an escalation ladder: a first verbal warning with no consequence, then entries on the official register, and for repeated cases a disciplinary note.
- The official register is the system of record. This app only captures events quickly in class and reminds the teacher what to transcribe. It never talks to the register.
- Students' data are personal data of minors. In milestone 1 they never leave the device.

## Goals and non-goals

Goals:

- Log an event in about three taps and three seconds, one-handed, on an iPhone.
- Show, for every student, the current count and level per category, computed over a rolling window.
- Configurable windows and ladders per category, in Settings.
- Optional short note per event.
- End-of-lesson summary of events still to be transcribed to the register.
- Fully offline after the first load; installable on the iPhone home screen.
- An architecture that can later gain sync with a server or a native client without rewriting the core.

Non-goals for milestone 1:

- No server, no accounts, no sync, no analytics, no network requests after the app shell is cached.
- No Apple Watch, widgets or Live Activities.
- No integration with the electronic register or with Google services.
- No timetable awareness (the current class is chosen manually).

## Domain rules

### Categories and defaults

| Category | Default label | Rolling window | Ladder (default) |
| --- | --- | --- | --- |
| `behaviour` | Behaviour | 7 days | 1 → verbal warning; 2 → register entry; 4 → disciplinary note |
| `homework` | Homework | 30 days | 1 → verbal warning; 2 → register entry; 10 → disciplinary note |
| `materials` | Materials | 30 days | 1 → verbal warning; 2 → register entry; 10 → disciplinary note |

Category ids are fixed. Labels, windows and ladders are editable in Settings.

### Actions

| Action | Meaning | Needs transcription |
| --- | --- | --- |
| `verbal` | Verbal warning only, nothing recorded anywhere | no |
| `register` | Entry ("richiamo") in that category on the official register | yes |
| `note` | Disciplinary note on the official register | yes |

### Rolling window

- For a student and a category, the count at time `t` is the number of non-voided events of that student and category with `createdAt` in the half-open interval `(t − windowDays, t]`.
- There is no reset. An event simply stops counting once it is older than the window.
- `windowDays` is an integer from 1 to 365.

### Ladder

- A ladder is a list of steps `{ from: n, action }`, sorted by strictly increasing `from`, whose first step has `from = 1`.
- The action of an event is the action of the step with the largest `from` that is less than or equal to the event's count, where the count includes the event itself.
- Consequence: once the highest step is reached, every further event inside the window gets the same action. With the defaults, every behaviour event after the fourth within 7 days is another disciplinary note, and every homework or materials event after the tenth within 30 days is another disciplinary note.
- The `note` step is optional: a ladder may stop at `register`.

Worked example (behaviour, 7-day window): events on Mon, Tue, Thu, Fri of the same week get `verbal`, `register`, `register`, `note`. An event the following Wednesday counts the Thu and Fri events plus itself (Mon and Tue have expired), so its count is 3 and its action is `register`.

### Snapshots

- When an event is created, its count and action are computed and stored on the event (`countAtCreation`, `action`). Changing Settings later does not rewrite history.
- The student grid always shows the live count (computed now, with current settings) and the level that the next event would get.

### Voiding and undo

- Right after logging, an undo removes the event entirely (undo window: until the toast disappears, about 8 seconds).
- Later, an event can be voided with confirmation. A voided event stays in storage with `voidedAt`, is shown struck through in history, and no longer counts.
- When an event is voided, the snapshots of later events of the same student and category inside the window are recomputed only if they have not been transcribed yet. If a transcribed event would now get a different action, it keeps its snapshot and the summary shows a "check register" flag for it.

## Functional requirements

### F1 – Classes and students

- F1.1 Create, rename and archive classes.
- F1.2 Students have a display label (default format "First name + initial of surname", e.g. "Chiara D."), an optional sort key and an active flag.
- F1.3 Import a roster from JSON, compatible with the test lampo app format (`{ "class": "1HT", "students": [{ "id": "01", "name": "...", "weight": 1 }] }`; extra fields are ignored), or by pasting one label per line.
- F1.4 Students are sorted alphabetically by label unless a sort key is set.

### F2 – Logging

- F2.1 Home shows the last used class, with a quick switcher for the others.
- F2.2 The class view is a grid of student buttons. Each button shows the label and, per category, a small badge with the live count, coloured by the level the next event would get. Zero counts are shown discreetly.
- F2.3 Tapping a student opens a bottom sheet with three large category buttons, each showing what the next event would trigger (for example "Behaviour – next: register entry").
- F2.4 Tapping a category logs the event immediately and closes the sheet. A toast shows the result ("Chiara D. – Behaviour #2 – register entry") with "Undo" and "Add note".
- F2.5 Notes are optional free text (up to 200 characters), with a few editable quick phrases per category.
- F2.6 Haptic or visual confirmation on logging; no blocking dialogs in the logging flow.

### F3 – End-of-lesson summary

- F3.1 A "To transcribe" view lists all events with action `register` or `note` and no `transcribedAt`, grouped by class, then by date, with student, category, action, time and note.
- F3.2 Each item can be marked as transcribed (sets `transcribedAt`), individually or all at once for a class, with undo.
- F3.3 A badge on the navigation shows the number of events still to transcribe.
- F3.4 Items flagged "check register" (see voiding) are highlighted.

### F4 – History

- F4.1 Per student: all events by category, newest first, with action, note, transcription status and voided state.
- F4.2 Per class: events in a selectable date range.

### F5 – Settings

- F5.1 Per category: label, rolling window in days, ladder steps (add, remove, edit `from` and action), quick note phrases.
- F5.2 Validation: window 1–365; ladder sorted, strictly increasing, first step `from = 1`; clear error messages; changes apply to new events only.
- F5.3 Reset to defaults per category, with confirmation.
- F5.4 Backup reminder interval (default 7 days).
- F5.5 Language: English (default) or Italian. The choice is stored in settings and applies immediately, without reload.

### F6 – Data management

- F6.1 Export all data as JSON (full backup, re-importable, every record with all its fields including `createdAt` and `updatedAt`) and events as CSV (one row per event: id, class, student, category, count, action, note, createdAt, updatedAt, transcribedAt, voidedAt; timestamps in ISO 8601 UTC, plus two convenience columns with local date and local time of `createdAt`).
- F6.2 Import a JSON backup, with a preview and an explicit choice between replace and merge (records matched by id, for classes, students and events alike; the one with the newer `updatedAt` wins; `createdAt` always comes from the record that wins).
- F6.3 Non-blocking reminder when the last export is older than the backup interval.
- F6.4 "Delete all data" with a typed confirmation, for the end of the school year.
- F6.5 Request persistent storage (`navigator.storage.persist()`) and show whether it was granted.

## Non-functional requirements

- Offline-first: service worker precaches the app shell; every feature works without network.
- Privacy: no third-party requests, no fonts or scripts from CDNs, no telemetry. The deployed site contains code only, never data.
- Performance: logging an event must feel instant (under 100 ms to visual feedback on a recent iPhone).
- Mobile-first UI for iPhone portrait; usable on desktop. Touch targets at least 44 × 44 pt. Safe-area insets respected.
- Accessibility: sufficient contrast, colour is never the only carrier of meaning (badges also show the number and an icon or letter for the level), keyboard usable on desktop.
- Language: UI in English by default, with an Italian translation (see Localization). Never use the em dash character in UI strings, in either language; use the en dash "–".
- Dates and times in the device's local time zone; stored as ISO 8601 UTC.

## Localization

### Design

- English is the source of truth. `src/lib/i18n/en.ts` defines every user-facing string as a nested object exported `as const`.
- The `Messages` type is derived from the English object: same nested keys, every leaf a string (or a plural object, see below). `src/lib/i18n/it.ts` is declared as `Messages`, so a missing, extra or misspelt key in the Italian file is a type error in `npm run check` and in CI.
- Leaves are plain strings with named placeholders, for example `"{student} – {category} #{count}"`, so the Italian file can be reviewed and edited by a non-developer without touching code.
- Placeholder parity is enforced by a unit test: for every key, the Italian string must contain exactly the same set of placeholders as the English one. If feasible without hurting readability, it is also enforced at type level with template literal types; the unit test is required either way.
- Plurals: a leaf may be an object `{ one: string; other: string }`, resolved with `Intl.PluralRules` for the active locale. The Italian file must use the same shape as the English one for that key.
- A small `t(key, params?)` function (typed: only valid keys, and params required when the string has placeholders) and a reactive current-locale store. No i18n library is needed; if one is used, it must keep the English-file-as-type approach and add no runtime network requests.
- Dates, times and numbers are formatted with `Intl` using the active locale.
- No user-facing string may be hard-coded in components. A lint rule or a test should catch obvious violations (for example literal text nodes in `.svelte` files), within reason.

### Scope of translation

- Translated: all interface text, default category labels, default quick note phrases, action names, validation messages, empty states and toasts. Documentation (README, docs/) stays in English.
- Not translated: user data (class names, student labels, notes) and user-edited category labels or quick notes, which are stored as typed by the user.
- CSV export: column headers and enum values stay in English (stable, machine-readable), regardless of the UI language.
- Default category labels and quick notes come from the active locale only until the user edits them; once edited, the stored value is used.

### Italian glossary

The Italian translation must use the terms of the school's electronic register:

| English | Italian |
| --- | --- |
| Behaviour | Comportamento |
| Homework | Compiti |
| Materials | Materiale |
| Verbal warning | Avviso verbale |
| Register entry | Richiamo sul registro |
| Disciplinary note | Nota disciplinare |
| To transcribe | Da trascrivere |
| Transcribed | Trascritto |
| Void (an event) | Annulla |
| Rolling window | Finestra (giorni) |

The Italian file is a first draft for the owner to review; translations not covered by the glossary should be plain, short and natural, using the informal register of a teacher's own tool.

## Data model

```ts
type CategoryId = 'behaviour' | 'homework' | 'materials';
type Action = 'verbal' | 'register' | 'note';

interface LadderStep { from: number; action: Action }

interface CategorySettings {
  id: CategoryId;
  label: string;
  windowDays: number;
  ladder: LadderStep[];
  quickNotes: string[];
}

interface SchoolClass {
  id: string;            // uuid
  name: string;          // e.g. "1HT"
  archived: boolean;
  createdAt: string;     // ISO UTC, set once
  updatedAt: string;     // ISO UTC, set on every change
}

interface Student {
  id: string;            // uuid
  classId: string;
  label: string;         // e.g. "Chiara D."
  sortKey?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TallyEvent {
  id: string;            // uuid
  classId: string;
  studentId: string;
  category: CategoryId;
  createdAt: string;     // ISO UTC, when the event was logged; never changes; used for the rolling window
  countAtCreation: number;
  action: Action;        // snapshot
  note?: string;
  transcribedAt?: string;
  voidedAt?: string;
  checkRegister?: boolean;
  updatedAt: string;     // ISO UTC, bumped on note edit, transcription, voiding, snapshot recomputation
  deviceId: string;
}

interface AppSettings {
  categories: CategorySettings[];
  backupReminderDays: number;
  lastExportAt?: string;
  updatedAt: string;
  lastClassId?: string;
  locale: 'en' | 'it';   // default 'en'
  deviceId: string;
  schemaVersion: number;
}
```

## Architecture

- Pure domain core (`src/lib/domain/`): types, rules engine (count in window, action for count, recomputation after void), settings validation. No imports from UI or storage. Fully unit-tested.
- Storage behind an interface (`src/lib/storage/`): a `Repository` interface with an IndexedDB implementation (Dexie) and an in-memory implementation for tests. UI code never touches IndexedDB directly.
- Sync-ready data: every record (class, student, event) has a uuid, `createdAt` (set once) and `updatedAt` (bumped on every change by the repository layer, never by UI code), and events also have `deviceId`. Settings carry an `updatedAt` as well. Events are append-mostly (only notes, transcription and voiding change). Schema migrations are versioned. This is enough to add last-write-wins sync with a small server or a native client later, without changing the domain core.
- UI (`src/routes/`, `src/lib/components/`): SvelteKit with Svelte 5, static adapter, Tailwind CSS.

## Tech stack

| Component | Choice |
| --- | --- |
| Framework | SvelteKit (current stable) with `@sveltejs/adapter-static`, Svelte 5 |
| Storage | IndexedDB via Dexie |
| Styling | Tailwind CSS |
| PWA | Web app manifest and service worker (Vite PWA plugin for SvelteKit, or SvelteKit's native service worker) |
| Language | TypeScript, strict |
| Tests | Vitest for the domain core and storage, Playwright for end-to-end flows on an iPhone-sized viewport |
| CI/CD | GitHub Actions: lint, type check, unit and e2e tests on every push; deploy on push to `main` |
| Hosting | GitHub Pages (via Actions) or Cloudflare Pages; see Deployment |

## Deployment

- The site contains only static code. No data is ever uploaded.
- GitHub Pages: served under `/<repo-name>/`, so SvelteKit's `paths.base` must be set from an environment variable in CI. This is the primary target: the repository is private and the owner's GitHub Pro plan allows Pages for private repositories. The published site is still publicly reachable, which is acceptable because it contains code only.
- Cloudflare Pages: works with a private repository on the free plan, served at the domain root. Connected from the Cloudflare dashboard (manual one-time step by the owner).
- The build must work for both: base path configurable, all asset URLs relative to it, service worker scope correct under a sub-path.
- iOS note for the README: an installed home-screen web app has its own storage, separate from Safari tabs. Always use the installed app.

## Repository layout

```text
class-tally/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── spec.md
│   ├── todo.md
│   ├── progress.md
│   └── decisions.md
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── src/
│   ├── lib/
│   │   ├── domain/
│   │   ├── storage/
│   │   ├── components/
│   │   └── i18n/
│   │       ├── en.ts         source of truth, defines the Messages type
│   │       ├── it.ts         Italian, typed as Messages, reviewed by the owner
│   │       └── index.ts      t(), plural resolution, locale store
│   ├── routes/
│   └── service-worker.ts
├── static/
│   └── (icons, manifest)
├── tests/
│   ├── unit/
│   └── e2e/
└── fixtures/
    └── example-roster.json   (invented names only)
```

## Tests

- Rules engine: window boundaries (event exactly `windowDays` old does not count; just inside does), ladder lookup including beyond the last step, ladders without a `note` step, the worked example above, per-category windows.
- Snapshots: changing settings does not alter existing events; new events use the new settings.
- Voiding: recomputation of later untranscribed events; transcribed events keep their action and get `checkRegister` when it would change.
- Settings validation: all invalid ladder shapes rejected.
- Storage: repository contract tests run against both implementations; export then import round-trips exactly, including `createdAt` and `updatedAt`; merge by `updatedAt`; `createdAt` is never modified by any update; every mutation bumps `updatedAt`.
- Localization: placeholder parity between English and Italian for every key; plural objects have the same shape; `t()` interpolates and pluralizes correctly in both locales; switching locale updates the UI without reload.
- End-to-end (Playwright, iPhone viewport): import an example roster, log events across categories, see badges update, undo, add a note, mark items transcribed, change a window in Settings, export, reload offline and find the data.

## Milestones

1. Domain core and storage: types, rules engine, settings validation, repository interface, Dexie and in-memory implementations, migrations, unit tests.
2. Localization layer and logging flow: `en.ts`, `Messages` type, `t()` and locale store in place before the first component, so every string goes through it from the start; classes, roster import, student grid with badges, category sheet, toast with undo and note.
3. Summary and history: "To transcribe" view, transcription marking, per-student and per-class history, voiding.
4. Settings, Italian translation and data management: category settings editor, language selector, complete `it.ts` following the glossary, export and import, backup reminder, delete all, persistent storage.
5. PWA and deployment: manifest, icons, service worker, offline support, CI and deploy workflows, README.
