# Decisions

These are settled. Don't reopen them unless Alex asks.

## Operating-model update (Alex, 2026-10-08)

ChatGPT is the primary end-to-end owner for the VCF platform. Claude is optional capacity for a bounded implementation handoff. Alex retains real-lab validation and milestone approval. Project memory lives in the repository: concise `CURRENT_STATE.md` checkpoints, per-package specs, source/visual manifests and lab evidence records. Sessions use targeted reads and one reviewable batch, avoiding routine full-repository rescans, repeated source retrieval and long chat-history dependence. Details are in `VCF_PARALLEL_WORKFLOW.md`.

## Learning-structure update (Alex, 2026-10-08)

Alex explicitly requested deeper, better explained and better structured standalone theory, with laboratories removed from the theory and presented as separate guides performed on the infrastructure already built together. Guides must correlate practical actions with the supplied official 2V0-17.25 blueprint (excerpt updated 2026-04-23).

This supersedes the earlier requirement to include a `Lab` section in every lesson. Concept explanations, worked examples, diagrams and knowledge checks remain appropriate in theory; executable lab instructions/checklists and embedded lab cards belong in the existing Labs section. Guides link back to prerequisite theory and start from confirmed deployed state, rather than reinstalling a generic lab by assumption. Missing components remain explicit guide prerequisites.

The approved `THEORY-LABS-01` pilot implements this decision. The validator now requires 17 theory headings and permits untouched lessons to retain an extra legacy `Lab` section, so migration can happen in bounded batches without changing IDs, bookmarks or persisted progress. The visible area is named **Ghiduri practice** while internal `lab` routes/schema/state remain stable. See `VCF_PARALLEL_WORKFLOW.md`, `VCF_MODULE_ROADMAP.md` and live status in `CURRENT_STATE.md`.

### Practical guides are complete UI-first runbooks (2026-10-08)

Alex requires step-by-step navigation, not task summaries. Every runnable guide names the exact product URL, menu path,
button, field, lab value, save/finish action, validation and rollback. Paths are build-specific and backed by official
documentation or a redacted real-lab capture. Unknown paths or values remain `VERIFY ON LAB`; they are not guessed.
Read-only guides provide the same navigation precision and explicitly stop before saving. CLI/API methods supplement
the main UI workflow unless the official task has no supported UI.

## Visual-material update (Alex, 2026-10-08)

Alex requested official VMware/Broadcom imagery, including product UI screenshots (vSphere/vCenter, NSX and other components), alongside original diagrams and generated illustrations. Use official embeds with source attribution as the default, reusing the existing figure renderer. Verify the actual image and applicable version. Local/offline delivery may use assets whose terms permit storage, or genuine redacted captures from Alex's lab. Generated illustrations are supplementary teaching material, never evidence of an actual product screen. Record provenance, caption, accessible text, placement and offline behavior in each spec package.

This extends the original visual policy: data-based YAML/SVG remains the preferred form for precise interactive architecture diagrams, while generated illustrations are now expressly requested as a complement. Official-source embeds remain the default; no image download, content integration or UI change is performed in this documentation session.

## Product decisions (Alex, 2026-10-03)

| Topic | Decision |
|---|---|
| Exam | VCF 9.0 Administrator **2V0-17.25**. VCF 9.x is primary; legacy (5.x) only as callouts. |
| Users | Alex only. No accounts, no sync, no backend. |
| Progress storage | Local, in the browser (IndexedDB), with JSON export/import. |
| Hosting | Self-hosted on Alex's Proxmox homelab, LAN IP only, no domain. |
| Language | UI in Romanian; technical content in English (matches the docs and the exam). |
| Level | Alex is a VMware beginner, so content starts from foundations. |
| Scope | All 16 phases; 400–600+ quality questions; mock exams in the official format. |
| Labs | Guided on the real homelab, plus browser simulators (incidents, scenarios). |
| UI | Dark by default, desktop only (no mobile layout), short diagnostic at first run. |
| Gamification | Yes: XP, levels, streaks, badges. |
| AI features | None. |
| Official images | Allowed, because the site stays private and local. |
| Previous versions | Ignored: V3 is a fresh build. |
| Delivery | Work continuously; report only at milestones. |

## Architecture decisions

- **Static SPA with build-time content.** All content is compiled into the bundle by a Vite plugin, so there is no server, database or API to run. This is a consequence of the single-user, local-only, no-backend decisions.
- **Content lives apart from UI.** Content is YAML and Markdown in `content/`, validated by zod schemas in `src/content/schema.ts`. Adding a lesson, question, lab, incident, scenario, diagram, glossary term or command never touches React code. See `docs/CONTENT_GUIDE.md`.
- **The validator is the gate.** `scripts/content-loader.ts` checks:
  - schemas and duplicate ids
  - the 18 required lesson sections
  - topic and objective references
  - correct-option counts
  - dangling lab, term, component and lesson references (warnings)
  - lessons under 1,200 words (warning)

  `npm run build` fails on any content error. The dev server only logs them, so authoring isn't blocked.
- **Virtual modules split eager from lazy.**
  - `virtual:ifc/meta` is loaded eagerly: ids, titles, lesson TOCs, glossary, commands, components, the question index.
  - Everything else is a lazy chunk: lesson bodies, labs, incidents, scenarios, diagrams, the full question bank, the home lab guide, the search index.
- **Custom Markdown extensions** are parsed in `src/components/markdown.ts`:
  - callouts: `:::vcf9|legacy|general|exam|trap|warning|tip|note|details`
  - `::diagram[id]`, `::figure{src caption source}`, `::lab[id]`, `::incident[id]`, `::quiz`
  - `[[glossary-term]]` and `lesson:` links
- **Diagrams are data.** They are YAML (groups, nodes, edges, steps) rendered by `src/components/Diagram.tsx` as clickable SVG, with a text description for accessibility. No image diagrams.
- **Engines are pure functions** in `src/engine/` and are unit-tested. `src/state/derived.ts` wires them to the store.
- **State** is a zustand store persisted to IndexedDB through idb-keyval, under key `infraforge-vcf-v3`. Changing the shape of `PersistedState` needs a migration or it breaks existing progress.

## Learning-model decisions (see `docs/MASTERY.md`)

- **Mastery is not a raw percentage.** It is recency-weighted (21-day half-life) and difficulty-weighted accuracy, with a Bayesian prior: the diagnostic result, or 0.25 if there is none. It is combined with confidence, coverage and practice, minus retention and confusion penalties.
- **"Mastered"** needs a score of at least 80, confidence of at least 0.6 and at least 70% on advanced/expert questions.
- **Spaced repetition** is Leitner with intervals [0, 1, 3, 7, 14, 30, 60] days, due at 04:00 local. A wrong answer goes back to box 1.
- **Readiness** has 8 weighted signals. It is **capped at 60% until a mock exam is taken**, and decays 5% if the last mock is older than 21 days.
- **The scaled score is an estimate.** Broadcom does not publish the raw cut score, so 70% raw is mapped to 300 on a 100–500 scale. The UI says this is an estimate.
- **Mock format:** 60 questions in 135 minutes, with questions per objective proportional to the number of items the exam guide lists for it. Sections 1 and 3 have no testable objectives.
- **Unanswered mock questions** count as wrong in the exam score, but are **not** recorded as attempts for mastery.
- **Diagnostic answers** seed the mastery prior but are excluded from the readiness signals.
- **XP never affects mastery or readiness.**

## Content decisions

- Every lesson uses the same 18-section template; `LESSON_SECTIONS` in `scripts/content-loader.ts` is the authority.
- Every question option carries a `why`. Distractors carry `confusedWith` (a topic id), which feeds the confusion penalty.
- **Sources are mandatory per lesson**, and Broadcom TechDocs is preferred. When a fact could not be verified, it is written as "check your version", never stated as fact.
- **Official figures are hotlinked**, not copied, from techdocs.broadcom.com. They use `referrerpolicy=no-referrer` and always show the source. This keeps the repo small and avoids redistributing files.
- "VCF Network Gateway" (exam item 4.1) is taught as the vCenter **Network Connectivity** workflow (centralized vs distributed gateway). The lesson flags this as an interpretation, because no 9.0 TechDocs page uses the name.
- Lab sizing assumes Alex's 256 GB host. VCF Automation (about 96 GB) does not fit alongside the management domain, so the labs defer it.

## Engineering choices that must not be rediscovered

- Import js-yaml as `import * as yaml from 'js-yaml'`; the default import fails.
- Vite's native-config loading needs `.ts` extensions on relative imports in `scripts/` and `vite.config.ts`, so `allowImportingTsExtensions` is on.
- `src/virtual.d.ts` needs `/// <reference types="vite/client" />` for CSS imports to typecheck.
- zustand selectors must not return a fresh `[]` or `{}` (for example `s.x[id] ?? []`). That causes an infinite render loop ("getSnapshot should be cached"). Use a module-level constant fallback outside the selector, as in `NO_RUNS` in `IncidentPage.tsx`.
- React lists must have unique keys. Duplicate glossary or command ids in content show up as duplicate-key console errors, and MiniSearch throws on duplicate ids. The validator now rejects duplicates.
- Playwright tests must wait for the lazy question UI to appear and allow a short settle between questions. Otherwise clicks race the re-render. `flows.mjs` already does both.

## Tried and rejected

- **Creating the GitHub repo from the session:** not allowed. Alex created `alex-andu/infraforge-vcf` himself and the session pushed to it.
- **`playwright install` in the cloud container:** rejected. Use the preinstalled Chromium through `PW_CHROMIUM`.
- **`curl` to Broadcom sites from the container:** blocked by the proxy. Use WebFetch, and budget it: it is shared across parallel agents, about 400 per hour.
- **WebFetch on very long TechDocs URLs:** fails because the URL is too long. Use KBs or neighbouring pages.
- **Downloading official images into the repo:** rejected in favour of hotlinking (see above).
- **Further code-splitting of the content metadata:** not worth it for a LAN-only app. The warning limit was raised instead.
- **Recording unanswered mock items as wrong attempts:** rejected, because it would poison mastery for topics never actually tried.
