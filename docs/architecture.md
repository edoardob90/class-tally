# Architecture

## Overview

class-tally is a static, offline-first web app. All data lives in the browser (IndexedDB); the server only hands out code. Three layers keep the rules testable and the storage replaceable:

```text
UI (routes, components, rune stores)
        │ calls
services (use cases: log, undo, void, transcribe, import, export)
        │ uses                         │ uses
domain (pure rules)             Repository (interface)
                                   ├── Dexie / IndexedDB   (browser)
                                   └── in-memory           (tests)
```

Rules of the road:

- `src/lib/domain/` is pure TypeScript. It imports nothing from Svelte, Dexie, the DOM or the other layers. It never reads the clock or the time zone on its own: callers pass `now`, and day arithmetic goes through one injectable function.
- UI code never touches IndexedDB. It talks to services and rune stores, which talk to the `Repository` interface.
- Only the repository layer sets `updatedAt`; `createdAt` is set once and never changes.
- Every user-facing string goes through `t()`.
- No network requests at runtime. The only network traffic is the browser fetching the app files from its own origin.

## Tech stack and why

| Choice | Why |
| --- | --- |
| SvelteKit 3 + Svelte 5, `adapter-static` | Small bundles and fast first paint on a phone; runes make the grid and toast state simple; the output is plain static files that any host serves. The app is client-only (`ssr = false`), every route is prerendered as a shell. |
| TypeScript 6 (strict) | Typed domain core and a typed `t()`. Pinned below 7 because SvelteKit 3, svelte-check and typescript-eslint support TypeScript 6 only. |
| Tailwind CSS 4 (Vite plugin) | Utility classes keep touch-target sizes and safe-area spacing next to the markup; no runtime CSS. |
| Dexie 4 over IndexedDB | The only offline-capable structured storage on iOS Safari. Dexie gives transactions and schema versions with little code. |
| `@lucide/svelte` | Self-explanatory icons for a one-handed UI. Imported one by one, so only the icons in use are bundled (no font, no CDN). |
| Hand-written i18n (about 150 lines) | The spec wants `en.ts` as a typed source of truth and no network. A library would add weight and weaken the key typing. |
| Native SvelteKit service worker | Needs one strategy (precache the shell, cache-first). `@vite-pwa/sveltekit` does not support SvelteKit 3 yet, and Workbox would be more code than the worker itself. |
| Vitest + fake-indexeddb | Domain and storage run in Node; the same contract suite runs against the memory and Dexie repositories. |
| Playwright | End-to-end flows on an iPhone-sized viewport (Chromium locally; WebKit as an extra project in CI). |
| GitHub Actions | `ci.yml` on every push and pull request; `deploy.yml` publishes to GitHub Pages on push to `main`. |

## Source layout

```text
src/
├── app.html, app.css              shell, Tailwind entry and design tokens
├── service-worker.ts              precache + cache-first, no runtime fetches
├── lib/
│   ├── domain/                    types, constants, time, rules, recompute, validation, merge, roster
│   ├── storage/                   Repository interface, memory + Dexie implementations, backup, csv, migrations
│   ├── services/                  use cases built on domain + Repository
│   ├── state/                     Svelte 5 rune stores caching repository data
│   ├── components/                UI components; components/icons re-exports the Lucide icons in use
│   ├── i18n/                      en.ts, it.ts, translate.ts, index.ts
│   └── pwa.ts                     service worker registration and update state
└── routes/                        /, /transcribe, /history, /settings, /classes, /import
tests/unit  tests/e2e              Vitest and Playwright
fixtures/example-roster.json       invented names only
```

### Domain (`src/lib/domain`)

- `types.ts`: the spec's data model (plus `Student.name/surname`, `CategorySettings.labelEdited/quickNotesEdited`).
- `time.ts`: `windowStart`, `inWindow`, `shiftDaysLocal`. The window is `(t − N calendar days, t]` in local time.
- `rules.ts`: `countInWindow`, `actionForCount`, `previewNext`, `liveCount`, `snapshotFor`.
- `recompute.ts`: after a void, new snapshots for untranscribed later events; `checkRegister` for transcribed ones.
- `validation.ts`: settings and ladder validation returning issue codes (the UI maps codes to translated messages).
- `merge.ts`: last-write-wins planning used by backup import.
- `roster.ts`: roster parsing, name splitting, label generation, sorting.

### Storage (`src/lib/storage`)

- `repository.ts`: the `Repository` interface, the only thing services and UI see.
- `memory.ts` and `dexie.ts`: two implementations that pass the same contract test suite.
- `backup.ts`: backup envelope `{ format: 'class-tally-backup', schemaVersion, exportedAt, data }`, validation of untrusted input, merge and replace.
- `csv.ts`: event export (comma-separated, UTF-8 BOM, formula-safe cells).
- `migrations.ts`: versioned migrations for the backup format; Dexie `version()` upgrades handle the database.

### Data flow of one log (three taps: class remembered, student, category)

1. Tap student: bottom sheet opens with the three category buttons, each showing the next action computed by `previewNext` from the cached events.
2. Tap a category: the `logEvent` service reads `now` once, computes the snapshot with `snapshotFor`, updates the in-memory store immediately (optimistic) and calls `repository.addEvent` in the background.
3. The toast shows the result for about 8 seconds with Undo (`deleteEvent`) and Add note (`patchEvents`). A failed write shows an error and rolls back.
4. `Repository.onChange` notifies the stores; stores also reload on `visibilitychange`.

## Localization

`en.ts` is the source of truth; `Messages` is derived from it; `it.ts` is typed as `Messages`, so a missing or extra key fails `npm run check`. Placeholders are named (`{student}`), plurals are `{ one, other }` resolved with `Intl.PluralRules`. `t(key, params)` is typed from the English file. A unit test checks placeholder parity and plural shapes; another scans `.svelte` files for hard-coded text. See `docs/spec.md` for the Italian glossary.

## Icon map

Icon-only buttons carry a translated `aria-label`; escalation levels always combine a letter, an icon and a colour.

| Meaning | Lucide icon |
| --- | --- |
| Undo | `undo-2` |
| Add note | `message-square-plus` |
| Behaviour / Homework / Materials | `message-circle-warning` / `book-open` / `pencil-ruler` |
| Verbal / Register entry / Disciplinary note | `volume-2` / `file-pen-line` / `triangle-alert` |
| Mark transcribed | `check` / `check-check` (all) |
| Void event | `ban` |
| Check register flag | `flag` |
| Class / To transcribe / History / Settings | `users` / `clipboard-list` / `calendar-clock` / `settings` |
| Export / Import | `download` / `upload` |

Other icons: `pencil` (edit), `eye` / `eye-off` (show or hide a student), `archive` / `archive-restore`, `arrow-left-right` (swap name and surname), `plus`, `x`, `chevron-down` / `chevron-right`. All are re-exported from `src/lib/components/icons.ts`; the category and action maps are in `iconMaps.ts`.

## Offline and PWA

- `src/service-worker.ts` is SvelteKit's native service worker (about 60 lines, no library). SvelteKit 3 exposes the file lists through `$app/manifest` (`immutable`, `assets`, `prerendered`, relative to the base path) and the path helpers through `$app/paths`; the worker derives its base path from its own URL, so it works at the domain root and under a sub-path.
- It is registered by hand in `src/lib/state/pwa.svelte.ts` at `${base}/service-worker.js`, so its scope is the app's own folder on any host. It is not registered in development.
- On install it precaches the build files, the static files and the prerendered pages (cache name `class-tally-<build version>`). On fetch it answers same-origin GET requests from the cache and never fetches third-party URLs; navigation requests that are not cached fall back to the cached root shell. Cache lookups ignore `Vary`: module script requests carry an `Origin` header, and a host that sends `Vary: Origin` would otherwise make every script a cache miss and break offline loading.
- A new worker waits (no automatic `skipWaiting`). The page notices it (a dot on the Settings tab, a row in Settings, App) and activates it on request with a `SKIP_WAITING` message, then reloads. The page also asks the browser to check for a new worker whenever the app comes to the front.
- The worker is type-checked with its own `tsconfig.service-worker.json` (WebWorker types); `npm run check` runs both.
- The manifest uses relative URLs (`start_url: "./"`, `scope: "./"`, relative icon paths), so it works at the domain root and under a sub-path. Icons are generated by `scripts/generate-icons.mjs` (tally marks on blue; maskable and Apple touch variants).

## Deployment

All targets serve the same static `build/` folder. Only `BASE_PATH` differs. HTTPS is required for the service worker and for installing to the home screen.

### GitHub Pages (primary)

1. Repository, Settings, Pages, Build and deployment, Source: "GitHub Actions". (Private repositories need a plan that supports Pages, e.g. Pro. The published site is public but contains code only.)
2. Merge to `main`. `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo-name>` and publishes with the official Pages actions. The URL is shown in the workflow run and under Settings, Pages: `https://<user>.github.io/class-tally/`.
3. If the deployment is rejected because of the environment, open Settings, Environments, `github-pages`, and make sure `main` is an allowed deployment branch.
4. Custom domain (optional): Settings, Pages, Custom domain, plus a DNS `CNAME` record. The workflow takes the base path from `actions/configure-pages` (`/class-tally` for a project page, empty for a custom domain), so no change is needed.

### Own subdomain on a VPS (e.g. `tally.edobld.me`)

1. DNS: `A` (and `AAAA`) record for `tally` pointing at the VPS.
2. TLS: Let's Encrypt via certbot, or Caddy with automatic HTTPS.
3. Web server (nginx sketch):

```nginx
server {
  listen 443 ssl http2;
  server_name tally.edobld.me;
  # ssl_certificate / ssl_certificate_key from certbot
  root /var/www/tally;
  index index.html;
  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" always;
  location /_app/immutable/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location = /service-worker.js { add_header Cache-Control "no-cache"; }
  location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }
  location / { try_files $uri $uri/ $uri.html /404.html; add_header Cache-Control "no-cache"; }
}
```

4. Publish: `scripts/deploy-vps.sh` (builds with an empty `BASE_PATH` and runs `rsync -a --delete build/ "$DEPLOY_TARGET"`; the target, e.g. `user@host:/var/www/tally/`, comes from the environment). An automated SSH deploy workflow is not shipped because it needs secrets; to add one, store an SSH key as a repository secret and run the same script from a workflow.

### Cloudflare Pages

Connect the repository from the Cloudflare dashboard. Build command `npm run build`, output directory `build`, leave `BASE_PATH` unset, set `NODE_VERSION=22`.

### Switching target

Browser storage is per origin. Moving from one URL to another starts with empty data: export a backup on the old origin and import it on the new one.

## Testing

- Unit (`tests/unit`): domain rules (DST under `TZ=Europe/Rome`), validation, merge, roster, CSV, repository contract on both implementations, i18n parity and plurals, guard tests (no hard-coded text, no em dash, no external URLs).
- E2E (`tests/e2e`): iPhone-sized viewport against the production build, at the root and under `/class-tally`.
