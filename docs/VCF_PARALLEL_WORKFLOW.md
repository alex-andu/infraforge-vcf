# VCF parallel workflow

Operating agreement for Alex, ChatGPT and Claude. On 2026-10-08 Alex approved the bounded DNS/NTP pilot after the initial repository assessment; its local result is the reference implementation for future modules. Live status, task priority, owners and holds belong in [CURRENT_STATE.md](CURRENT_STATE.md); this document defines how work moves between owners.

## Current operating mode

ChatGPT is the primary end-to-end owner for research, theory, visual specifications, practical guides, repository implementation and QA. Alex validates the real lab and approves milestones. Claude is optional capacity for a narrowly defined implementation batch; using it is not required for progress. If Claude is used later, the same source-of-truth and handoff rules below apply.

## Roles and boundaries

| Owner | Responsibility | Writable scope for an assigned task |
|---|---|---|
| ChatGPT | Architecture, original educational content, technical research, diagrams, guide specifications, repository implementation and QA | One approved module/batch at a time; package paths and implementation paths recorded in `CURRENT_STATE.md` |
| Claude (optional) | Extra repository implementation capacity for a bounded handoff | Only the exact `content/`, `src/` and `scripts/` files listed in an approved handoff |
| Alex | Priorities, approval, real-lab validation, infrastructure changes and merge/deployment decisions | Supplies build/topology evidence and confirms acceptance; credentials stay out of documents |

Neither agent reopens settled decisions or rewrites completed modules without a concrete gap or defect. Preserve the static desktop SPA, Romanian UI, English learning content, existing IDs and persistence contracts in `CLAUDE.md` and `DECISIONS.md`.

## Learning structure requested by Alex (2026-10-08)

Theory and practical guides are separate learning sections. The official exam objectives and candidate profile determine curriculum coverage; current lab availability never removes or postpones an exam-relevant theory topic. Theory explains concepts in more depth with a clear progression: problem and purpose, terminology, architecture, mechanism, worked examples, dependencies, failures, troubleshooting reasoning, exam connections and recap. Diagrams and conceptual knowledge checks may remain in theory. Do not interrupt it with lab instructions, lab step checklists, an embedded lab card or a required `Lab` section.

The existing `/labs` section holds standalone guides. Each guide maps its actions to exact official blueprint item text, lists required components/builds, provides steps with explanations and expected results, and records cleanup. A guide for a component already present starts from the actual deployed state and records observed evidence. A guide for a component Alex plans to add may be written in full from verified official documentation before the component exists, using explicit discovery variables and status **PREPARED — NOT YET LAB-VALIDATED**. Lab availability controls validation status and environment-specific values, not whether exam-relevant theory or a future guide may be authored. Never represent an unvalidated guide as successfully executed or replace it with a simulated infrastructure lab.

Each runnable guide is UI-first and fully procedural. It names the product URL, required role, exact menu breadcrumb,
button, field, value, commit action, visible result and verification for every step. Use the English VMware labels and
state the build on which the path was verified. A value discovered earlier in the guide is referenced by a named
placeholder; it is never invented. Configuration steps include a pre-change checkpoint and rollback. Read-only steps
identify where to stop or press **Cancel**. CLI/API alternatives follow the primary UI workflow unless the official
product procedure is command-only. A learner should be able to complete the task without having to infer where to
click or what to enter.

The validator now requires the 17 theory headings and tolerates extra legacy sections, including `Lab`, while existing lessons are migrated in bounded batches. The DNS/NTP pilot proves the transition without changing state shape, lesson IDs, anchors, routes, bookmarks or learner progress. Do not silently migrate all remaining lessons at once.

## Visual material requested by Alex (2026-10-08)

Use complementary original visuals and official VMware/Broadcom material, including genuine product UI screenshots from vSphere/vCenter, NSX, vSAN and VCF components where they help the learner recognize a screen or workflow. Original technical diagrams continue to use the YAML/SVG renderer; generated illustrations may supplement them. Generated artwork must never be presented as an authentic product screenshot or official figure.

Default for official material: embed the exact image URL from an official documentation/KB page using the existing `::figure{src caption source}` support. Inspect the actual image before describing it; record the source page, product/version, explanatory caption and accessible text. Keep official assets visibly attributed and original visuals clearly distinguishable. Explain version differences rather than silently mixing legacy UI with VCF 9.

Local hosting does not make remote embeds available offline. Include an offline plan in each package: retain meaningful captions/text and original local diagrams; use locally stored official assets only when their terms permit it, or genuine redacted screenshots from Alex's own lab. Do not save credentials, tokens or personal data from screenshots. Any annotations must be labelled as our additions and preserve the original meaning and source.

Place architecture figures in theory where the concept is explained and UI screenshots beside the relevant step in standalone guides. Select visuals for instructional value; do not fill every section with decorative images. The package asset manifest records provenance (official/generated/lab capture), source/version, intended placement, caption/alt text, embedding/local delivery and offline behavior. ChatGPT selects, verifies and integrates assets; Claude may integrate an explicitly assigned batch; Alex confirms screens against his actual lab build.

## One source of truth

1. Read `CLAUDE.md` and `CURRENT_STATE.md` at the start of a session; open other docs only for the selected task.
2. Before claiming a task, record its ID, owner, status, scope/paths, prerequisites and next handoff in the parallel-work section of `CURRENT_STATE.md`.
3. Only one agent edits `CURRENT_STATE.md` at a time. The current task owner records its checkpoint; the other agent supplies a short handoff note and waits before editing that file.
4. Use statuses: `PROPOSED` → `IN DESIGN` → `READY FOR APPROVAL` → `READY FOR IMPLEMENTATION` → `IN IMPLEMENTATION` → `IN QA` → `WAITING FOR REAL-LAB VALIDATION` → `COMPLETE`. Use `ON HOLD` when an explicit project hold applies. Record the reason and who can lift it.
5. A spec may be approved for preparation while implementation stays `ON HOLD`. A finished spec or passing automated tests do not lift the RHCSA hold or prove a real lab works. Missing lab components do not block exam-curriculum content; they only keep the associated guide in an unvalidated state.

`CONTENT_STATUS.md` records content inventory. [VCF_MODULE_ROADMAP.md](VCF_MODULE_ROADMAP.md) maps modules to proposed batches; it does not maintain a second task queue.

## Context and token efficiency

The repository holds durable memory. A session should not reconstruct the project from chat history or rescan the whole repository.

1. Start with `CLAUDE.md`, the top checkpoint in `CURRENT_STATE.md` and the active package `docs/specs/<package-id>/spec.md`. Open `DECISIONS.md`, `CONTENT_STATUS.md`, architecture docs or source files only when the current batch needs them.
2. Use targeted searches for exact IDs, headings, schemas and references before opening files. Read only the relevant portions of large lesson, question and lab files. Do not repeatedly load all 71 lessons, all questions or the entire lab inventory.
3. Work in one reviewable batch: normally one lesson plus its visuals/questions, one practical guide, or one small shared-code change. Finish validation and a checkpoint before claiming the next batch.
4. Each spec includes a compact context pack: objective/item text, affected IDs/files, existing content to reuse, decisions that apply, verified sources/claims, open questions, expected tests and real-lab evidence needed. Later sessions read this pack instead of repeating research.
5. Maintain source and visual manifests per package. Record page title/URL, product/build applicability, verification date, supported claim or image, provenance and offline behavior. Do not fetch the same official page again unless the claim/version changed or the saved note is incomplete.
6. Summarize tool output. Persist only decisions, counts, failures, evidence and next actions; do not paste long logs into project docs. Store no transient conversation history in `CLAUDE.md`.
7. At the end of a batch, update the top checkpoint in `CURRENT_STATE.md` with no more detail than needed to resume: status, base/head, changed files, checks, unresolved facts, lab validation and next authorized action. Put durable technical detail in the package/spec or the appropriate permanent document.
8. Start a fresh chat or compact handoff after a module/milestone, when the active context contains multiple completed batches, or when unrelated history begins to dominate. Bootstrap with the three files in item 1 and the exact task ID; do not ask the new session to audit the repository.
9. Re-run checks appropriate to changed files. Do not repeat browser flows, builds or research simply to recreate earlier evidence when no relevant input changed; preserve the dated result and explain its scope.
10. Real-lab observations become a short evidence record keyed by guide/step/build. Future guide work reads that record instead of asking Alex for the same output again.

These rules reduce context use; they never justify skipping current-source verification for version-sensitive VMware claims or skipping tests affected by a change.

## Avoid overlapping edits

- Use separate local checkouts if ChatGPT and Claude are explicitly assigned simultaneous work. Two branches in the same working directory do not isolate concurrent edits.
- ChatGPT owns its package folder; Claude treats the approved package as read-only and integrates into application files. Changes to shared files (`curriculum.yaml`, `topics.yaml`, `objectives.yaml`, schemas and the state document) are serialized and listed in the handoff.
- Before switching owners, compare the package's base commit with current `main` and reconcile affected IDs/schema. Never overwrite another agent's uncommitted work.
- Alex authorized automatic commits and pushes to the active non-protected feature branch on 2026-10-08. Push only
  after relevant checks and a credential/secret scan pass. Never push directly to `main`, force-push or rewrite remote
  history. PR creation, merge and deployment remain separate actions requiring Alex's instruction.

## A reviewable implementation package

Each package contains a concise `spec.md` and any necessary source notes, diagram data or lab validation sheet. Include:

1. Existing phase/module IDs, exact gap, base commit, prerequisites, scope and exclusions.
2. Learning objectives, links to existing material, original structured theory using the approved 17-section template, and glossary additions checked for duplicate IDs. Legacy lessons may retain additional sections until their bounded migration.
3. An exam mapping table: objective/item text → proposed lesson section → questions. Distinguish candidate-profile background from directly assessed items. Until task #2 lands, keep item-level mappings in the spec; do not add unsupported `objectiveItem` fields to content.
4. Primary sources actually opened, verification date, applicable VCF/build versions and a claim checklist. Unresolved facts remain explicitly unverified; never invent menu paths, commands, limits or outputs.
5. Diagram nodes/groups/edges/reveal steps, accessible descriptions and integration IDs using the existing YAML/SVG renderer, plus an asset manifest for generated illustrations, official figures/product screenshots and real-lab captures under the visual-material rules above.
6. Separate practical-guide specifications, exact UI paths and field values, expected results, rollback/cleanup and an evidence sheet: guide/step ID, exact documented build, prerequisites, action, expected result, observed result and evidence. Map each guide to exact official objective/item text. Keep conceptual examples in theory. If a component is unavailable, the full guide may still be prepared from verified official sources, but environment values remain discovery variables and observed-result fields remain pending until the real run.
7. Questions with correct answers, distractor explanations and lesson/section links; exact destination files and acceptance criteria.

## Handoff, checks and stop point

After Alex approves a package and explicitly lifts the relevant implementation hold, ChatGPT implements one batch (or hands the exact bounded batch to Claude if Alex chooses to use it). The implementation owner runs `npm run content:check -- --strict` (zero errors/warnings), `npm test`, `npm run typecheck` and `npm run build`. For UI changes also run `scripts/smoke.mjs`; add `scripts/flows.mjs` for quiz/exam/incident/lab flows. Use the existing browser configuration for the execution environment.

ChatGPT checks technical accuracy, learning flow, diagram labels and spec compliance. Alex supplies real-lab evidence when the required component becomes available and approves the milestone. Missing components, unresolved facts or absent lab evidence remain tracked as validation gaps; they do not reduce exam coverage. Do not claim real-lab validation from official documentation, a simulator or unit tests.

Finish every batch with changed files, check results, unresolved facts/lab checks and a `CURRENT_STATE.md` checkpoint. Stop before the next unapproved batch. The first package, **Theory / Lab Separation with a DNS/NTP pilot**, is complete locally and waits for Alex's real-lab evidence. Claude remains optional and idle.
