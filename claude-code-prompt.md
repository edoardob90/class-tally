# class-tally – Claude Code prompt

Paste into a Claude Code session opened on the new, empty repository, with `spec.md` copied into its root.

```text
You are building "class-tally", a small offline-first Progressive Web App I will use as a secondary school maths teacher to log classroom warnings per student and per category during lessons. The file spec.md in the repository root is the complete specification and the single source of requirements. Read it in full before doing anything else.

The work has two phases. Phase A is interactive. Phase B is autonomous: once I approve the plan, I will not be available to answer questions until the end of the session.

PHASE A – PLAN (interactive, wait for my approval)

Do not write code or create project files yet. Give me a plan covering:

1. Repository layout, matching the "Repository layout" section of the spec.
2. Dependencies, with current stable versions checked with npm rather than from memory. For the PWA layer, compare the realistic options for SvelteKit with Svelte 5 (a Vite PWA plugin versus SvelteKit's native service worker) and recommend one, with reasons.
3. The domain core API you intend to write (function signatures for the rules engine and the repository interface), since everything else depends on it.
4. A breakdown of milestones 1 to 5 into concrete, testable steps, and an honest estimate of how far one unattended session can get.
5. Every ambiguity, gap or contradiction in the spec, each with the default you propose. Ask all your questions now.
6. The localization design: how the Messages type is derived from en.ts, how placeholders and plurals are typed and tested, and a short excerpt showing what en.ts and it.ts will look like.
7. Risks and how you will handle them, in particular: service worker scope and asset paths under a GitHub Pages sub-path; IndexedDB persistence and storage isolation for installed web apps on iOS; date arithmetic for the rolling window across daylight saving time changes.
8. The manual test checklist you will leave for me, including how to test on my iPhone.

Then stop and wait.

PHASE B – BUILD (autonomous, after approval)

Setup, in this order:
1. First commit: .gitignore, CLAUDE.md, and docs/ with spec.md moved from the root to docs/spec.md, plus docs/todo.md (milestone checklists from the approved plan), docs/progress.md and docs/decisions.md.
2. CLAUDE.md must be short, because it is loaded into every future session: what the project is in two or three lines; commands (install, dev, build, preview, lint, check, unit tests, e2e tests); conventions (code and docs in English; every user-facing string goes through t() and lives in src/lib/i18n, with en.ts as the source of truth and it.ts typed against it; when adding or changing an English string, update it.ts in the same commit; never use the em dash character in UI strings or docs, in either language, use the en dash "–"; domain core must not import UI or storage code); privacy rules (no network requests at runtime, no CDN assets, no telemetry, only invented names in fixtures and tests); working rules (update docs/progress.md and docs/todo.md after every milestone, record every decision not covered by the spec in docs/decisions.md, never deviate from the spec silently); pointers to the files in docs/.

Build rules:
- Stack as in the spec: SvelteKit (current stable) with Svelte 5 and adapter-static, TypeScript strict, Tailwind CSS, Dexie, Vitest, Playwright.
- Domain core first. The rules engine and repository contract tests must exist and pass before any UI work.
- Localization layer second, before the first component, as described in the "Localization" section of the spec: en.ts as the source of truth, a Messages type derived from it, it.ts typed as Messages so missing or extra keys fail the type check, a placeholder parity unit test, plural support with Intl.PluralRules, and a typed t(). No hard-coded user-facing strings in components. Write the Italian strings as you go, following the glossary in the spec; I will review it.ts myself, so keep it readable: one string per line, grouped by screen, with short comments where the context is not obvious.
- Invented data only: fixtures/example-roster.json with three classes of about 20 obviously fictional students, labels in the "First name + initial" format.
- The base path must come from an environment variable so the same code builds for GitHub Pages (sub-path) and Cloudflare Pages (root).
- CI: .github/workflows/ci.yml runs lint, type check, unit tests, build and Playwright on every push and pull request. .github/workflows/deploy.yml builds with the GitHub Pages base path and deploys to GitHub Pages on push to main using the official Pages actions. Document in README.md the one-time manual steps I must do (enabling Pages with source "GitHub Actions", or connecting Cloudflare Pages instead, with its build command, output directory and base path variable).
- Mobile-first: design for an iPhone in portrait first. Large touch targets, safe-area insets, one-handed use. Logging an event must take three taps: class (remembered), student, category.
- Keep the visual design plain and clean; correctness and speed of the logging flow matter more than polish.

Working rules:
- Work milestone by milestone, in order.
- After each milestone: run lint, type check, unit tests, build and e2e tests; fix what fails; commit with a clear message; tick docs/todo.md; append a dated entry to docs/progress.md (what was done, test and build status, next step).
- Do not ask me questions during Phase B. When something is not covered by the spec or the approved plan, choose the simplest reasonable option, record it in docs/decisions.md (context, choice, alternatives discarded) and continue.
- Push your commits to the working branch you were given, if any; never push to main directly and never force-push. Never touch files outside the repository. Never install global packages.
- If you are stuck on the same problem for a long time, write down what you tried in docs/progress.md, leave a clearly marked TODO, and move on.
- If the session may end before you finish, commit what works first, then write in docs/progress.md the exact state and step-by-step instructions to resume. A clean, committed partial result is better than an uncommitted complete one.

Definition of done for this session:
- Milestones 1 to 3 complete, with all tests passing and a successful production build.
- In the preview build on an iPhone-sized viewport I can: import the example roster; pick a class; log events in all three categories and see badges and next-level hints update; undo; add a note; see register entries and notes in "To transcribe"; mark them transcribed; void an event and see counts and flags update; reload and find everything preserved; switch the language to Italian (a temporary switch is fine if the Settings screen is not done yet) and see every screen translated, with no missing keys.
- Milestones 4 and 5 if time allows.

Finally, put a "Morning summary" section at the top of docs/progress.md with: how to run the app locally and how to try it on my iPhone; the manual test checklist; what is done, partial and missing; known issues and open questions; one line per entry added to docs/decisions.md. Also write README.md: what the app is, installation, development, deployment (both options), adding to the iPhone home screen, backups.
```
