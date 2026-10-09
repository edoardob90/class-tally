# Decisions beyond the spec

Format: context, choice, alternatives discarded. IDs are stable; the Summary in `progress.md` lists one line per entry.

## D-01 Rolling window uses calendar days in local time

- Context: the spec says `(t − windowDays, t]` but not how to subtract days across DST changes.
- Choice: subtract calendar days in the device's local time through one injectable function (`shiftDaysLocal`). An event expires exactly N calendar days later at the same wall-clock time. Decided by the owner.
- Discarded: fixed 24-hour blocks (the expiry would drift by one hour in DST weeks).

## D-02 Students have `name` and `surname`; `label` stays stored

- Context: the owner's roster files use `name` as "Surname Given-name" (e.g. "Acacia Davide"); the grid should show "Name + Surname initial".
- Choice: `Student` gains `name` and `surname` (additive to the spec model). `label` remains a stored field, generated as "Davide A." (longer initial on collisions) and regenerated when name or surname change unless the user set it by hand. Roster import splits at the first space (first token is the surname); the preview allows editing and swapping. `id` and `weight` of the roster are ignored.
- Discarded: computing the label on the fly (breaks the spec model, CSV and sync).

## D-03 Student sort order

- Context: F1.4 says alphabetical by label unless a sort key is set, but the label starts with the given name while the registers are ordered by surname.
- Choice: effective key is `sortKey ?? "surname name"` (falls back to `label` if no surname), compared with `Intl.Collator`.

## D-04 Italian "Annulla" disambiguation

- Context: the glossary maps "Void" to "Annulla", which is also natural for Undo and Cancel.
- Choice: Undo "Annulla", Void "Annulla evento" (state "Annullato"), dialog Cancel "Indietro". Decided by the owner.

## D-05 Check-register flag handling

- Context: F3.1 lists untranscribed items, F3.4 highlights flagged items that are already transcribed.
- Choice: flagged items appear at the top of "To transcribe"; the navigation badge counts pending plus flagged; a "Checked" button clears the flag (`checkRegister=false`). Decided by the owner.

## D-06 "Milestone 1" in Goals and Non-goals

- Context: the non-goals are labelled "for milestone 1" while the milestone list has five milestones.
- Choice: read as "first release" (milestones 1 to 5): no server, accounts, sync or network requests.

## D-07 Edited markers for labels and quick notes

- Context: default labels and quick notes follow the active locale "until edited", but the model has no marker.
- Choice: optional `labelEdited` and `quickNotesEdited` booleans on `CategorySettings`. Stored English text is the backing value. Reset to defaults clears the flags.
- Discarded: comparing the stored text with both locales' defaults (magic behaviour).

## D-08 Default quick phrases

- Choice: Behaviour: Talking, Phone, Out of seat, Disrespect. Homework: Not done, Incomplete, Forgot at home. Materials: No textbook, No calculator, No notebook, No pen. Italian counterparts in `it.ts`.

## D-09 Event ordering and void recomputation

- Events are ordered by (`createdAt`, `id`). Recomputation after a void uses the current settings and only touches later events of the same student and category inside the window; untranscribed ones get a new snapshot, transcribed ones keep theirs and get `checkRegister` if the action would differ.

## D-10 Undo is a hard delete; later removal is a void

- Undo inside the 8 s window deletes the record. Anything later is a void (a tombstone that can sync).

## D-11 One toast at a time

- A new log replaces the previous toast. "Add note" keeps the toast open until saved or dismissed. The timer compares timestamps so it survives throttling.

## D-12 Validation limits

- Ladder: non-empty, integer `from` between 1 and 1000, first step `from=1`, strictly increasing, known actions; action order is not enforced. Label 1 to 30 characters; at most 8 quick notes of at most 200 characters; note text at most 200 characters. Backup reminder: integer 0 to 365 (0 = off).

## D-13 Student management and roster re-import

- Students can be added, renamed, given a sort key and deactivated or reactivated. No hard delete of students or classes (archive only). Re-importing into an existing class skips students whose label already exists. Inactive students are hidden from the grid but stay in history and lists. Pending items of archived classes stay in "To transcribe".

## D-14 Backup and merge

- Whole-record last-write-wins on `updatedAt`, ties keep the local record. An event referencing an unknown class or student rejects the file. Settings merge the same way but the local `deviceId` is always kept. A newer `schemaVersion` is refused. Backup `schemaVersion` 1 includes the additive fields of D-02 and D-07. Decided by the owner.

## D-15 CSV format

- Columns: id, class (name), student (label), category, count, action, note, createdAt, updatedAt, transcribedAt, voidedAt, localDate, localTime; voided events included. Comma-separated (RFC 4180), UTF-8 with BOM; cells starting with `=`, `+`, `-` or `@` are prefixed with `'`. Italian-locale Excel may need "Data > From text". Decided by the owner.

## D-16 Delete all data

- The typed word is localized (DELETE / ELIMINA), case-insensitive. Classes, students and events are wiped and settings reset to defaults, keeping `deviceId` and `locale`.

## D-17 Haptics

- Visual flash and toast always; `navigator.vibrate` where available. No iOS "switch input" trick.

## D-18 Theme and orientation

- Light theme only; portrait-first, usable in landscape and on desktop. Dark mode is out of scope for now.

## D-19 Locale at first run and flash avoidance

- English by default, no auto-detection. The UI renders only after settings are loaded so the locale never flashes.

## D-20 Time of events

- `createdAt` is always the moment of the tap; no backdating. Decided by the owner.

## D-21 Layout additions

- Added `src/lib/services/` (use cases), `src/lib/state/` (rune stores), `src/lib/i18n/translate.ts` (pure translator), `scripts/`, and `docs/architecture.md`.

## D-22 Routing

- No dynamic route segments: class, student and date range travel as query parameters so every route prerenders as a plain shell and works on any static host.

## D-23 Icons

- `@lucide/svelte`, imported per icon; the UI is icon-first with a translated `aria-label` on icon-only buttons. Allowed by the owner.

## D-24 PWA layer

- SvelteKit's native service worker instead of `@vite-pwa/sveltekit`, whose peer range stops at SvelteKit 2 while the current stable is 3.
- TypeScript is pinned to 6.0.x because SvelteKit 3, svelte-check and typescript-eslint cap at TypeScript 6.

## D-25 Type-level placeholder parity not used

- Italian may reorder placeholders; an order-independent type check would need permutation types. Parity is enforced by a unit test (required by the spec either way).

## D-26 Removed kickoff files

- `claude-code-prompt.md` was removed in the first commit; its content is captured in `CLAUDE.md`, `docs/todo.md` and this file. The one-line `README.md` is replaced by the real README.

## D-27 Roster files with several classes

- Context: the fixture must hold three classes, while the owner's files hold one class (`{ class, students }`).
- Choice: the importer accepts one class object, `{ "classes": [ ... ] }`, or an array of class objects, and plain text (one "Surname Name" per line, also "Surname, Name").

## D-28 SvelteKit 3 configuration

- Context: SvelteKit 3 has no `svelte.config.js`; options are passed to `sveltekit()` in `vite.config.ts`. The service worker helpers moved to `$app/manifest` (`immutable`, `assets`, `prerendered`) and `$app/service-worker` (`self`).
- Choice: `BASE_PATH` is read in `vite.config.ts`; the service worker (M5) uses the new modules.

## D-29 Monotonic `updatedAt`

- Choice: the repository sets `updatedAt` to the current time but at least 1 ms after the record's previous `updatedAt`, so last-write-wins stays meaningful for changes within the same millisecond.

## D-30 UUID fallback

- Choice: `crypto.randomUUID` needs a secure context, so a `getRandomValues` fallback is used (plain-HTTP LAN testing on a phone).
