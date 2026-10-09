# class-tally

An offline-first web app for a secondary school teacher to log classroom warnings ("richiami") per student and per category during a lesson. It shows at a glance where each student stands on the escalation ladder (verbal warning, register entry, disciplinary note), and at the end of the lesson it lists what still has to be copied into the official electronic register.

- Logging takes three taps: class (remembered), student, category.
- Counts are computed over a rolling window per category (default 7 days for behaviour, 30 days for homework and materials) with a configurable ladder.
- The official register stays the system of record. The app never talks to it.
- All data stays on the device (IndexedDB). The server only hands out code. There are no accounts, no analytics and no third-party requests.
- English and Italian, switchable at any time.

Requirements: [`docs/spec.md`](docs/spec.md). Structure, tech stack and reasoning: [`docs/architecture.md`](docs/architecture.md). Decisions beyond the spec: [`docs/decisions.md`](docs/decisions.md). Status and manual test checklist: [`docs/progress.md`](docs/progress.md).

## Using it

1. Add the app to the iPhone home screen (see below) and always open it from there.
2. Import a roster (Classes, Import roster): paste the JSON of the other app, or one "Surname Name" per line, or choose a file. The preview lets you fix names before importing. Labels are generated as "Name + Surname initial", e.g. "Davide A.".
3. On the class screen, tap a student, then a category. A bar at the bottom confirms the event and offers Undo and Add note for about 8 seconds.
4. At the end of the lesson open "To transcribe", copy the entries into the register and mark them as transcribed.
5. Use History to review a student or a class, and to void an event.

Voiding an event recomputes the later events of the same student and category that have not been transcribed yet. If a later event is already on the register and its action would change, it gets a "Check register" flag in "To transcribe" until you tap "Checked".

### Roster format

```json
{
  "class": "1AX",
  "students": [{ "id": "1AX-01", "name": "Agata Aurora", "weight": 1 }]
}
```

`name` is "Surname Name" (the register order). `id` and `weight` are ignored. Entries with separate `name` and `surname` fields are accepted too, and so is `{ "classes": [ ... ] }` with several classes. A sample with invented names is in [`fixtures/example-roster.json`](fixtures/example-roster.json).

## Add to the iPhone home screen

1. Open the app's HTTPS address in Safari.
2. Tap Share, then "Add to Home Screen", then Add.
3. Open the app once from the new icon while online and wait a few seconds, so that it can store itself for offline use.
4. From then on, always open it from the icon.

An app installed to the home screen has its own storage, separate from Safari tabs. Data entered in a Safari tab is not visible in the installed app, and removing the icon deletes the installed app's data. Keep a backup (below).

## Installation and development

Requirements: Node.js 22 (see `.nvmrc`) and npm.

```sh
npm ci            # install
npm run dev       # development server
npm run build     # production build into build/
npm run preview   # serve the production build on http://localhost:4173
npm run lint      # prettier --check and eslint (npm run format fixes formatting)
npm run check     # svelte-check and TypeScript
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end tests (Playwright, iPhone-sized viewport)
```

Notes:

- End-to-end tests build the app and serve it with `vite preview`. Install a browser once with `npx playwright install chromium`. In an environment that already has a Chromium, point `PW_CHROMIUM_PATH` at its executable.
- `BASE_PATH` sets the path the app is served from: empty (the default) for a domain root, `/class-tally` for GitHub Pages. Example: `BASE_PATH=/class-tally npm run build`.
- To try the app on a phone on the same Wi-Fi: `npm run build && npm run preview -- --host`, then open `http://<computer-ip>:4173`. Over plain HTTP the phone cannot install the app or use the service worker, so this checks layout and storage only. For the full experience use one of the HTTPS options below.

## Deployment

The build is a folder of static files (`build/`). Only `BASE_PATH` differs between hosts. HTTPS is required for installing to the home screen and for offline use.

### GitHub Pages (workflow in `.github/workflows/deploy.yml`)

One-time steps:

1. In the repository, open Settings, Pages, and under "Build and deployment" choose Source: "GitHub Actions". (For a private repository this needs a plan that includes Pages. The published site is public but contains code only, never data.)
2. Merge to `main`. The workflow builds with `BASE_PATH=/<repository-name>` and publishes with the official Pages actions. The address appears in the workflow run and in Settings, Pages: `https://<user>.github.io/class-tally/`.
3. If the deployment is refused because of the environment, open Settings, Environments, `github-pages`, and make sure `main` is an allowed deployment branch.
4. Custom domain (optional): Settings, Pages, Custom domain, plus a DNS `CNAME` record. Then the app is served at the root, so set the repository variable `PAGES_BASE_PATH` to an empty value.

### Your own subdomain on a VPS (for example `tally.example.org`)

1. DNS: an `A` (and `AAAA`) record for the subdomain pointing at the server.
2. TLS: Let's Encrypt (certbot) or Caddy with automatic HTTPS.
3. Serve the files from a directory. nginx sketch:

```nginx
server {
  listen 443 ssl http2;
  server_name tally.example.org;
  # ssl_certificate and ssl_certificate_key from certbot
  root /var/www/tally;
  index index.html;
  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" always;
  location /_app/immutable/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location = /service-worker.js { add_header Cache-Control "no-cache"; }
  location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }
  location / { try_files $uri $uri/ /404.html; add_header Cache-Control "no-cache"; }
}
```

4. Publish with `scripts/deploy-vps.sh` (builds with an empty `BASE_PATH` and runs `rsync`). Set the target in the environment, for example `DEPLOY_TARGET=user@host:/var/www/tally/ scripts/deploy-vps.sh`.

### Cloudflare Pages

Connect the repository in the Cloudflare dashboard. Build command `npm run build`, output directory `build`, leave `BASE_PATH` unset, set `NODE_VERSION=22`. Cloudflare serves the site at the root of its domain and also gives every branch a preview address.

### Moving between addresses

Browser storage belongs to one address. If you change the address (for example from GitHub Pages to your own domain) the new app starts empty: export a backup on the old address and import it on the new one.

## Backups

The data lives only in the browser of the device. The home screen app can lose it if the icon is removed or if the system clears storage. The app can export everything as a JSON backup (restorable, with every record in full) and the events as a CSV file for a spreadsheet, and it reminds you when the last export is older than the interval set in Settings (default 7 days). Keep the backup file somewhere safe, for example in the Files app on iCloud Drive.

CSV exports are comma-separated with a UTF-8 byte order mark. Excel with Italian regional settings expects semicolons: use "Data, From Text/CSV" and choose the comma as delimiter. Numbers and Google Sheets open the file directly.

## Privacy

No network requests at runtime, no CDN assets or fonts, no telemetry. Test data and fixtures use invented names only.
