# Architecture

InfraForge VCF is a static single-page app. There is no backend: content is compiled into the bundle at build time and learner progress lives in the browser (IndexedDB), exportable from **Setări**.

```
content/            YAML + Markdown: the whole curriculum (see CONTENT_GUIDE.md)
scripts/
  content-loader.ts     reads + validates /content with zod, cross-checks references
  check-content.ts      `npm run content:check [--strict] [--only x]`
  vite-plugin-content.ts exposes content as virtual modules (eager meta, lazy everything else)
  search-docs.ts        builds the search corpus
  smoke.mjs             Playwright smoke test over all routes
src/
  content/   schema.ts (zod types), index.ts (lookups + lazy loaders)
  engine/    pure logic: mastery, srs, grading, readiness, exam, plan, gamification, incident (unit-tested)
  state/     zustand store persisted to IndexedDB + derived hooks (mastery, readiness, recommendations)
  components/ Layout, RichContent (markdown extensions), Diagram, Question, QuizRunner, SearchPalette, ui
  pages/     one file per route, all lazy-loaded
  styles.css design system (dark default, light theme)
deploy/      nginx.conf, Proxmox LXC install script
```

## Data flow

1. At build (or dev start) the plugin loads `/content`, validates it and fails the production build on any error.
2. `virtual:ifc/meta` (small: titles, ids, question index, glossary, commands) loads eagerly. Lesson bodies, labs, incidents, scenarios, diagrams, the question bank, the home lab guide and the search index are separate chunks fetched on demand.
3. Pages read content through `src/content/index.ts` and learner state through `src/state/store.ts`. Engines are pure functions; `src/state/derived.ts` wires them to the store.

## Key decisions

- **Content separate from UI**: adding a lesson, question, lab, incident or scenario never requires touching React code.
- **Local-only**: single user, no accounts, nothing leaves the browser. Back up with Export in Setări.
- **Official images** are hot-linked from techdocs.broadcom.com with `referrerpolicy=no-referrer` and always credited; if the network is offline the caption and source link remain.
- **No fake functionality**: every button does what it says; simulators are labelled as simulators.

## Running

```bash
npm install
npm run dev            # http://<ip>:5173
npm test               # engine unit tests
npm run content:check  # validate content (add --strict to fail on warnings)
npm run build          # content check + typecheck + production build into dist/
```
