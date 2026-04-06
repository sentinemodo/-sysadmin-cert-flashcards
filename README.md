# Sysadmin cert flashcards (MVP skeleton)

Local-first SPA for certification flashcards: static content JSON, IndexedDB for progress, hash routing for static hosting.

## Design documentation

Architecture and data model live on the authoring machine under:

`c:\Users\akacz\Documents\Cursor2\Architectures\sysadmin-cert-flashcards\`

Read `overview.md` (§4 data model, §5–§7 study/exam) and `technology.md` in that folder (they are not copied into this repo).

## Scripts

| Command        | Description                                      |
|----------------|--------------------------------------------------|
| `npm run dev`  | Vite dev server                                  |
| `npm run build`| `tsc -b` then production bundle to `dist/`       |
| `npm run preview` | Serve `dist/` (port 4173 by default)         |
| `npm test`     | Vitest unit tests                                |
| `npm run test:e2e` | Build, then Playwright against preview     |

First-time e2e: `npx playwright install chromium` (or `npx playwright install`).

## Content

Deck JSON is served from `public/content/` (e.g. `maag-11-2-1.json`). The app fetches `/content/maag-11-2-1.json` and validates with Zod.

## Stack

Vite, TypeScript (strict), vanilla DOM, Dexie (IndexedDB), Zod, plain CSS, Vitest, Playwright.

## Cursor Cloud Agents

Push this repository to GitHub and connect it in Cursor if you want agents to run against the remote. OAuth or remote setup is not automated here.
