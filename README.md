# Sysadmin cert flashcards (MVP)

Local-first SPA for certification flashcards: static deck JSON, IndexedDB for spaced repetition and exam history, hash routing for static hosting.

## Using the app

1. Open the site (dev: `npm run dev`, production: deploy `dist/` and open `index.html` host).
2. **Study** — pick a chapter, reveal each question, self-grade (Again / Hard / Good / Easy). Scheduling uses an SM-2–style algorithm with jitter and a maximum interval (see `src/lib/scheduling.ts`).
3. Optional **cram** on the study chapter list includes cards that are not due yet.
4. **Exam** — pick a chapter; the app draws `N` cards (`examQuestionCount` in JSON, or default **5**, capped by chapter size). Same reveal/grade flow; results are stored and optionally update scheduling with a **smaller interval jump** than study (`applyReviewForExam`).
5. **History** — past exams for the loaded book; open a row for per-card grades.
6. **Settings** — export/import user data (JSON `schemaVersion: 1`) or wipe the local database.

## Design documentation

Architecture, data model, and algorithms:

`c:\Users\akacz\Documents\Cursor2\Architectures\sysadmin-cert-flashcards\`

Read `overview.md` (§4–§7, §5 scheduling) and `technology.md`.

## Scripts

| Command            | Description                                |
|--------------------|--------------------------------------------|
| `npm run dev`      | Vite dev server                            |
| `npm run build`    | `tsc -b` then production bundle to `dist/` |
| `npm run preview`  | Serve `dist/` (default port 4173)          |
| `npm test`         | Vitest (scheduler + helpers)               |
| `npm run test:e2e` | Build, then Playwright against preview     |

First-time e2e: `npx playwright install chromium`.

E2E starts preview via `node node_modules/vite/bin/vite.js` so the preview server does not depend on `npm` being on `PATH` for subprocesses (see `playwright.config.ts`).

## Content

Deck JSON lives under `public/content/` (e.g. `maag-11-2-1.json`). The app loads `/content/maag-11-2-1.json` from [`src/main.ts`](src/main.ts) and validates with Zod in [`src/content/loadContent.ts`](src/content/loadContent.ts).

## Export format (`schemaVersion`)

Settings export is a single JSON object:

- `schemaVersion` — **1** (bump when fields change; add Dexie migrations when IndexedDB shape changes).
- `exportedAt` — ISO timestamp.
- `cardSchedulingState`, `attempts`, `examResults` — arrays matching [`src/types/runtime.ts`](src/types/runtime.ts).

## Stack

Vite, TypeScript (strict), vanilla DOM, Dexie (IndexedDB), Zod, plain CSS, Vitest, Playwright.

## Algorithm constants

Tunable values (ease bounds, max interval days, exam jump cap, jitter) live at the top of [`src/lib/scheduling.ts`](src/lib/scheduling.ts). Default exam size when a chapter omits `examQuestionCount`: [`src/appConstants.ts`](src/appConstants.ts).
