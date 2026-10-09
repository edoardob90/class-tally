# Decisions beyond the spec

Format: context, choice, alternatives discarded. IDs are stable; the Summary in `progress.md` lists one line per entry.

## D-01 Rolling window uses calendar days in local time

- Context: the spec says `(t − windowDays, t]` but not how to subtract days across DST changes.
- Choice: subtract calendar days in the device's local time through one injectable function (`shiftDaysLocal`). An event expires exactly N calendar days later at the same wall-clock time. Decided by the owner.
- Discarded: fixed 24-hour blocks (the expiry would drift by one hour in DST weeks).

## D-02 Students have `name` and `surname`; `label` stays stored

- Context: the owner's roster files use `name` as "Surname Given-name" (e.g. "Acacia Davide"); the grid should show "Name + Surname initial".
- Choice: `Student` gains `name` and `surname` (additive to the spec model). `label` remains a stored field, generated as "Davide A." (longer initial on collisions) and regenerated when name or surname change (hand-editing the label is not offered). Roster import splits at the first space (first token is the surname); the preview allows editing and swapping. `id` and `weight` of the roster are ignored.
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

## D-31 Relative imports, trailing slashes

- Context: SvelteKit 3 no longer provides the `$lib` alias by default (subpath imports do not resolve directory indexes for TypeScript).
- Choice: relative imports; `trailingSlash = 'always'` so every route is built as `<route>/index.html`, which any static host (GitHub Pages, Cloudflare Pages, nginx) serves without rewrite rules.

## D-32 Optimistic toast, authoritative snapshot

- Choice: the toast appears at once, computed from the cached events; the service recomputes the snapshot from the stored events and the toast text is corrected if they differ. The event list reloads from the repository after every change.

## D-33 Sheets use the native `<dialog>`

- Choice: bottom sheets and the note editor are native dialogs (focus trap, Escape, backdrop). The note editor sits at the top of the screen so the iOS keyboard does not cover it.

## D-34 E2E browser

- Choice: Playwright runs the iPhone 14 profile on Chromium locally (WebKit is not installed in the sandbox); CI also runs a WebKit project that may fail without blocking until it has been seen green.

## D-35 Service worker cache lookups ignore `Vary`

- Context: with `Vary: Origin` on the host (as `vite preview` sends), module script requests never matched the precache (they carry an `Origin` header the precache request lacked), so offline reloads were blank, sometimes only partly (the browser HTTP cache hid it). Found by an e2e offline test and confirmed with the server really stopped.
- Choice: `cache.match(request, { ignoreSearch: true, ignoreVary: true })`. Every cached file is a content-hashed or versioned static file, so `Vary` carries no information here.

## D-36 Update flow

- Choice: no automatic `skipWaiting`. A waiting worker shows a dot on the Settings tab and an "Update available" row in Settings, App. Applying it posts `SKIP_WAITING` and reloads on `controllerchange`. The page asks the browser to check for a new worker when the app returns to the front (a request to the app's own origin).

## D-37 GitHub Pages base path

- Choice: `deploy.yml` takes `BASE_PATH` from `actions/configure-pages` (`base_path` output), which is `/<repo>` for a project page and empty for a custom domain. No repository variable is needed.

## D-38 Separate tsconfig for the service worker

- Choice: SvelteKit requires the worker to be excluded from the main tsconfig; it has `tsconfig.service-worker.json` (WebWorker types) and `npm run check` runs `tsc` on it after `svelte-check`.

## D-39 Icons

- Choice: tally marks (four strokes crossed by a fifth) on blue, generated by `scripts/generate-icons.mjs` with the already installed Chromium: rounded 192 and 512 icons, a maskable 512 icon with the drawing in the safe zone, and an opaque 180 Apple touch icon.

## D-40 Export delivery

- Choice: on touch devices exports go through the Web Share API (the reliable way to reach Files on iOS), elsewhere an anchor download. Only the JSON backup resets the backup reminder; the CSV is not a backup.
