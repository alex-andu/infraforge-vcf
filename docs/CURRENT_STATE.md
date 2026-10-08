# Current state

Product/content snapshot as of 2026-10-07; repository/planning assessment on 2026-10-08. Inspected `main` is `577f553` (Claude instructions), after `8ffc48c` (handoff docs) and `95aca5b` (V3 build). Product: **InfraForge VCF**, a local single-user learning platform for VMware Cloud Foundation 9 and the **2V0-17.25 VCF 9.0 Administrator** exam. Owner: Alex.

Note: this repo has no RHCSA content. "InfraForge RHCSA" is a separate project.

## Parallel-work checkpoint (2026-10-08)

This section is the source of truth for work ownership and holds. Operating rules: [VCF_PARALLEL_WORKFLOW.md](VCF_PARALLEL_WORKFLOW.md). Proposed module batches: [VCF_MODULE_ROADMAP.md](VCF_MODULE_ROADMAP.md).

- **Current milestone:** `OPS-HCX-FOUNDATIONS-01` completes the remaining candidate-profile theory gap with a dedicated HCX lesson, control/data-plane diagram, verified official figure, glossary, Architecture Explorer component, six scenario questions and a separate ten-step UI-first guide. The guide is **PREPARED — NOT YET LAB-VALIDATED** because the documented environment has no second supported site or HCX deployment. The official map remains **59/59 at target**. `THEORY-LABS-01` remains waiting for Alex's read-only lab run.
- **Authorized now:** Alex explicitly asked ChatGPT to preserve the curriculum-first strategy and continue, including after usage resets. A persistent goal carries the approved bounded-package workflow. Automatic feature-branch pushes remain authorized. Current branch: `content/vcf-operations-hcx-foundations`, based on pushed foundation/deployment commit `fa7cc913d50065be7b6b597455a159511bab2cb7`. Push only after checks and a secret scan; no direct push to `main`, force-push, PR, merge, deployment or infrastructure mutation is authorized.
- **Implementation hold:** Alex's latest instruction resumes curriculum-driven bounded content work. Batch A (measurement), Batch B (measured gap closure) and the HCX content slice of Batch C are complete. The Kubernetes practical guide and tasks #5–#10 remain queued until selected as a bounded package or dependent real-lab evidence is available.
- **Privacy:** verified on 2026-10-08: the unauthenticated GitHub API returns 404 while authenticated Git remote read succeeds, so the repository is private and this workstation retains access. The pilot stores only sanitized topology values and no credentials, tokens or unredacted captures. Task #1 is complete.
- **Exam baseline:** Alex supplied the official-description excerpt updated 2026-04-23. Its 8 objectives / 59 items match `content/objectives.yaml`; Kubernetes/HCX and DNS/NTP/certificates are candidate-profile prerequisites. Ordinal item IDs are repository conventions; mock allocation/scoring remain practice estimates, not official weights or a raw passing percentage.
- **Curriculum priority (Alex, 2026-10-08):** the official exam objectives and candidate profile determine theory, questions, visuals and the practical-guide roadmap. The current lab inventory does not limit curriculum scope. Missing products may be added later; until then their guides can be fully prepared from verified official documentation but must be labelled **PREPARED — NOT YET LAB-VALIDATED**, with environment-specific values and observed evidence left pending.
- **New learning direction (Alex, 2026-10-08):** develop clearer, deeper standalone theory and keep practical work as separate guides based on the existing infrastructure and mapped to the official exam description. The validator accepts the 17-section standalone-theory template; three lessons use it and the other 69 lesson bodies remain compatible for bounded migration.
- **Visual requirement (Alex, 2026-10-08):** combine original diagrams/generated illustrations with verified official VMware/Broadcom figures and genuine product screenshots. Default to official-source embeds with attribution; plan offline alternatives separately. Screenshots belong beside relevant guide steps, architecture visuals beside theory explanations. Track provenance/version and never present generated UI as official. The bounded content packages now demonstrate attributed official figures alongside original interactive diagrams.
- **Operating model and context budget (Alex, 2026-10-08):** ChatGPT is the primary end-to-end owner; Claude is optional for a bounded batch. Repository checkpoints/specs hold durable memory. Sessions use targeted reads, one small batch, reusable source/evidence manifests and compact handoffs; no routine full-repository rescans or repeated research. See `VCF_PARALLEL_WORKFLOW.md`.
- **Practical-guide standard (Alex, 2026-10-08):** every runnable guide is a complete UI-first runbook: product URL, required role, exact versioned click path, button, field, real lab value or discovery variable, commit action, validation, expected screen/evidence and rollback. The DNS/NTP pilot now demonstrates this with vSphere Client, ESXi Host Client and VAMI paths plus official ESX 9.x figures. The remaining legacy guides require incremental migration; they must not be represented as meeting this standard yet.
- **Sanitized real-lab inventory (Alex, 2026-10-08):** `docs/LAB_ENVIRONMENT.md` now records the supplied VCF 9.0.2 topology without credentials. It confirms `infra01` / `10.100.80.10` as BIND DNS + chrony NTP, ESX hosts `esx01`–`esx04` / `10.100.10.11-.14`, and the deployed management components. The DNS/NTP guide now uses `esx01` and the actual NTP address. PTR and live sync state still require the guide run.

| Work item | Owner | Status | Scope / prerequisites | Next handoff |
|---|---|---|---|---|
| Parallel setup | ChatGPT | COMPLETE (local) | Assessed repository; wrote workflow/roadmap and established bounded-batch ownership | Use this file as the live checkpoint |
| THEORY-LABS-01: theory / guide separation + DNS/NTP pilot | ChatGPT | COMPLETE (local); WAITING FOR REAL-LAB VALIDATION | Standalone theory, UI-first read-only guide using the sanitized real inventory, original topology diagram, official Broadcom figures, compatibility transition and learner-facing labels | Alex runs the guide on esx01, then repeats on esx02–04; ChatGPT records sanitized PTR/settings/sync evidence |
| K8S-FOUND-01: Kubernetes foundations for Supervisor (part of #4) | ChatGPT | COMPLETE; GUIDE NOT INCLUDED IN THIS BATCH | 17-section theory, original Supervisor/VKS mapping, official Kubernetes figure, glossary and five questions | A separate complete guide may be authored before deployment and lab-validated after Supervisor/VKS is added |
| EXAM-COVERAGE-01 / #2 objective-item tagging and report | ChatGPT | COMPLETE; PUSHED `ee43683` | 59 item IDs, 617 question mappings, validator/report/UI integration | Use the reproducible map for Batch B |
| VCFA-ORG-NET-01 / #3 first measured gap | ChatGPT | COMPLETE; PUSHED `5c79814` | Close `4.4.8` with theory, diagram, glossary, five questions and a prepared guide slice | Superseded by the next bounded package |
| VCFA-CONTENT-01 / #3 VCF Automation content lifecycle | ChatGPT | COMPLETE; PUSHED `8245e2d` | Close `4.4.1`, `4.4.6` and `4.4.9` with deeper theory, one diagram, glossary, twelve questions and a prepared guide slice | Superseded by the next bounded package |
| VCFA-GOV-01 / #3 provider onboarding and governance | ChatGPT | COMPLETE; PUSHED `ad3f9ff` | Close `4.4.3`, `4.4.4`, `4.4.5`, `4.4.7` and `4.4.11` with exact theory/runbook workflows, one diagram and nine questions | Superseded by the next bounded package |
| OPS-OBSERVE-01 / #3 VCF Operations observability | ChatGPT | COMPLETE; PUSHED `3305596` | Reinforce `4.3.1`, `4.3.3` and `4.3.5` with seven scenario-driven questions tied to developed lessons | Superseded by the next bounded package |
| OPS-NET-STORAGE-POLICY-01 / #3 VCF Operations network, storage and policy | ChatGPT | COMPLETE; PUSHED `799f372` | Close `4.3.9`, `4.3.10` and `4.3.11` with deeper theory, one original diagram, eight questions and prepared UI-first guide slices | Superseded by the next bounded package |
| OPS-APP-COMPLIANCE-DRIFT-01 / #3 VCF Operations application monitoring, compliance and drift | ChatGPT | COMPLETE; PUSHED `b3a2b97` | Close `4.3.12`, `4.3.13` and `4.3.14` with verified UI workflows, corrected drift policy semantics, an official figure, seven questions and prepared guide slices | Superseded by the final measured-gap package |
| VCF-FOUNDATION-DEPLOYMENT-GAPS-01 / #3 measured coverage closure | ChatGPT | COMPLETE; PUSHED `fa7cc91` | Close `2.1.1`, `2.1.2`, `2.2.4`, `2.3.3` and `4.1.4` with deeper theory, one corrected question and nine new questions | Batch B complete |
| OPS-HCX-FOUNDATIONS-01 / #4 candidate-profile HCX | ChatGPT | COMPLETE; FEATURE BRANCH | Dedicated theory, original and official visuals, glossary, architecture component, six questions and a prepared ten-step guide | Validate only after HCX and a second supported site exist |
| #4–#10 remaining implementation | ChatGPT (Claude optional) | QUEUED | Existing task order retained; shared-file edits serialized and environment-dependent guides remain visibly unvalidated | Select one bounded package at a time |
| Real-lab validation and acceptance | Alex | NOT STARTED for new batches | Build/component/RAM evidence and approved lab steps; privacy confirmation before lab-specific content | Record observed results and milestone approval |

The completed pilot spec and evidence sheet are in `docs/specs/theory-labs-separation/spec.md`. The hold still applies to the older tasks #2–#10; it does not roll back this explicitly approved pilot. The feature branch may be committed and pushed automatically under `CLAUDE.md`; PR, merge and deployment remain separate.

Fresh local checks after `OPS-HCX-FOUNDATIONS-01`: strict content validation **0 errors / 0 warnings**, **674/674 objective-tagged questions mapped**, **59/59 items at target**, **23/23 unit tests passed**, typecheck passed and production build passed. Browser smoke passed on **15 main routes plus the HCX lesson, guide, Architecture Explorer, Exam Prep and three representative questions** with no console errors. The original diagram, official figure, prepared-state warning, representative guide steps and Architecture Explorer component were visually reviewed. Inventory is 72 lessons / 161,862 words, 683 questions, 25 guides, 111 diagrams and 279 glossary terms. Nine questions remain intentionally outside the numbered objective map: three exam-strategy questions and six HCX candidate-profile questions. Docker deployment and real-lab behavior were not revalidated.

Windows checkout note: the initial strict check reported 70 missing-frontmatter errors and 1,312 cascading warnings because Git converted lesson files to CRLF while `scripts/content-loader.ts:101` expects LF. Setting this clone's `core.autocrlf=input` and normalizing only unchanged lesson working-copy line endings to LF restored passing checks. Git reports no tracked content changes. A portable parser or repository line-ending policy is a separate proposed maintenance fix, not implemented here.

## Completed

- App shell:
  - Vite + React + TypeScript SPA with lazy routes for every page in `src/pages/`.
  - Dark theme (default) and light theme.
  - Romanian UI.
  - Ctrl K / `/` search palette.
  - Toasts.
- Content pipeline:
  - YAML/Markdown in `content/`, validated by zod (`scripts/content-loader.ts`).
  - Exposed through virtual modules (`scripts/vite-plugin-content.ts`).
  - The production build fails on any content error.
- Learn mode: 16 phases and 72 lessons. The standalone-theory contract has 17 required sections; 69 untouched lessons may retain their legacy `Lab` section until migrated. See `docs/CONTENT_STATUS.md`.
- Lesson page:
  - TOC with section tracking.
  - Callouts (vcf9 / legacy / exam / trap …).
  - Embedded interactive diagrams, official TechDocs figures and inline quizzes.
  - Glossary tooltips, section bookmarks, notes.
- Practice and exam mode:
  - Quizzes by topic, objective, module, weak areas or mixed.
  - Mock exam: 60 questions in 135 minutes, distributed by the number of items per objective, with timer, navigator, flags and result page.
  - Per-question page.
- Review: spaced-repetition (Leitner) queue and review session.
- Practical guides: 25 records in the existing lab schema, with step checklists, hints, validation and expected results.
- Troubleshooting: 10 incidents in a 6-stage simulator (evidence → cause → next step → remediation → validation → debrief), scored with LCS.
- Scenarios: 3 design scenarios.
- Architecture Explorer:
  - Component tree, full map, focus graph per component.
  - Failure simulation ("what breaks if X fails").
- Home Lab Builder: platforms, 3 profiles, IP/VLAN/DNS plan, checklists, guides.
- Reference pages: glossary (279 terms) and command/API reference (116 entries).
- Adaptive features:
  - Onboarding with a 16-question diagnostic.
  - Topic mastery engine and an 8-signal readiness score.
  - Recommendations, study plan (7/14/30/custom days), progress page.
  - Gamification: XP, levels, streaks, 18 badges.
  - Settings: theme, legacy callouts, level, exam date, export/import/reset.
- Persistence: zustand persisted to IndexedDB under key `infraforge-vcf-v3`. Export and import are JSON.
- Deployment files:
  - Dockerfile (node build → nginx).
  - `deploy/nginx.conf` with SPA fallback.
  - `docker-compose.yml` on port 8080.
  - `deploy/install-proxmox-lxc.sh`.
  - Alex's lab inventory lists a container `CT106 infraforge`, so it appears to be deployed.
- Docs: README (Romanian), `docs/ARCHITECTURE.md`, `docs/CONTENT_GUIDE.md`, `docs/MASTERY.md`.
- Tests and checks:
  - 23 engine unit tests.
  - `scripts/smoke.mjs`: all main routes, fails on console errors.
  - `scripts/flows.mjs`: diagnostic, quiz, mock, incident, lab, light theme.
  - All passed on 2026-10-03.

## Partially completed

- **Blueprint depth.**
  - `content/objectives.yaml` lists every 2.1–4.4 item verbatim from the official exam guide.
  - All 674 objective-tagged questions carry a primary objective-item mapping; the generated report measures every one of the 59 official items and all currently meet the internal target.
  - Candidate-profile foundations for Kubernetes, DNS/NTP/certificates and VCF Operations HCX now have dedicated lessons. Practical-guide validation and deeper VCF Operations for Networks deployment coverage remain separate work.
- **Fact verification.**
  - Content authors hit the shared WebFetch budget. Unverified details are written as "check your version", not stated as fact. Examples: some UI menu paths, ESX 9 / SDDC Manager log paths, sample command outputs, precheck contents.
- **Labs vs the real lab.**
  - Labs use a generic plan: `lab.internal` / 10.10.x.0/24.
  - Alex's real VCF 9.0.2 lab uses `vcf.home.arpa` / 10.100.x.0/24. Labs are not yet rewritten for it.
- **Scenarios.** Only 3 exist, and phases 14–15 have no labs.
- **Docker image.** Never built in the cloud container (no Docker daemon). The build was verified only with `npm run build`.

## Not started

- Rebuilding labs on Alex's real lab (see the task list below).
- Measured objective-item gap closure is complete: all 59 official items meet the internal five-question target. Content depth, practical-guide migration and real-lab validation remain separate quality tracks.
- Kubernetes practical guide; the HCX lesson and prepared guide are complete.
- Install labs for components not yet in Alex's lab: VCF Automation, Operations for Logs, Operations for Networks, HCX, a workload domain.
- CI: no GitHub Actions workflow.
- Browser-level accessibility audit beyond the basics already built in (skip link, ARIA labels, focus states).

## Known bugs and limitations

1. The readiness ring shows ~2% before any answers, because of the mastery prior of 0.25. The card is labelled "Estimare preliminară". Cosmetic.
2. Initial JS chunk is ~1 MB (234 KB gzip) and the search chunk ~2 MB (505 KB gzip), because content metadata and the search index are bundled. The warning limit is raised to 2500 KB in `vite.config.ts`. Acceptable on a LAN; slow on a remote link.
3. Official figures are hotlinked from techdocs.broadcom.com. With no internet they don't render, but captions and source links still show.
4. Mock-exam questions left unanswered are not recorded as attempts, so they don't affect mastery. Intentional, but readiness may then show "answer at least 20 questions" right after a mostly blank mock.
5. Nine questions have no numbered objective and are never picked for mock exams: three exam-strategy questions and six HCX candidate-profile questions. Intentional.
6. There is no "exam-prep" topic. The exam-strategy lesson borrows `vcf-overview`, `vcf-terminology` and `troubleshooting-method`.
7. Progress lives only in the browser's IndexedDB. Clearing site data loses it; back up with Settings → Export.

## Important technical constraints

- Single user, no backend, no accounts, no AI features: Alex decided this.
- UI text in **Romanian**. Technical content (lessons, questions, labs) in **English**.
- Desktop only. No mobile layout work.
- Content must stay separate from UI. Add content as YAML/Markdown (`docs/CONTENT_GUIDE.md`), never in React code.
- Never add fake functionality. Simulators must be labelled as simulators.
- **Never commit credentials.** Alex's lab inventory contains plaintext passwords, and the GitHub repo was **public** as of 2026-10-04. Use topology (FQDNs, IPs, VLANs) only.
- In the cloud container:
  - Playwright must use `PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Never run `playwright install`.
  - There is no Docker daemon.
  - `curl` to Broadcom is blocked by the proxy; WebFetch works but has a shared hourly budget.

## Run, build, deploy

```bash
npm install
npm run dev                 # http://<host>:5173 (vite --host)
npm test                    # 23 engine unit tests (vitest)
npm run typecheck           # tsc -b
npm run content:check       # validate content; add --strict to fail on warnings, --only <fragment> to filter
npm run build               # content:check + tsc -b + vite build → dist/
npm run preview             # serve dist/

# browser checks (dev server must be running)
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/smoke.mjs http://localhost:5173 <outdir>
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/flows.mjs http://localhost:5173 <outdir>

# deploy on Proxmox (Debian 12 LXC with Nesting enabled)
apt update && apt install -y git
git clone https://github.com/alex-andu/infraforge-vcf && cd infraforge-vcf
./deploy/install-proxmox-lxc.sh            # installs Docker if needed, docker compose up -d --build, port 8080
docker compose up -d --build               # update after git pull
INFRAFORGE_PORT=80 docker compose up -d    # change port
```

## Next 10 tasks (priority order)

Tasks 2–10 were requested on 2026-10-07. Alex later resumed curriculum-driven bounded packages and asked work to continue across usage resets. Tasks #2–#3 and both theory slices of #4 are complete; the Kubernetes practical guide and tasks #5–#10 remain queued for one bounded package at a time.

1. **Make the GitHub repo private.** Only Alex can do this: Settings → General → Danger Zone. Confirm before adding any lab-specific content.
2. **Tag every question with its objective item. COMPLETE in `EXAM-COVERAGE-01`.** The schema, all 617 mappings, validation, repeatable report and learner-facing item coverage are implemented.
3. **Fill the coverage gaps the report shows. COMPLETE in bounded batches.** All 59 official items have dedicated lesson coverage and at least five mapped questions. Continue to review depth and accuracy during later topic packages rather than inflating question counts.
4. **Add the topics named in the candidate profile:**
   - VCF Operations HCX (lesson, questions, glossary and prepared guide) — COMPLETE in `OPS-HCX-FOUNDATIONS-01`
   - foundational Kubernetes for vSphere Supervisor
   - a DNS / NTP / certificates refresher
5. **Add a "real lab" profile to `content/homelab/homelab.yaml`** describing Alex's deployed lab: vcf-lab-01, single-node mgmt-domain, 4 nested ESX 9.0.2, vSAN OSA FTT0, VDS MTU 1700, VLANs 110/120/130/140/180. Topology only, no passwords.
6. **Rewrite existing labs against the real lab**, replacing the `lab.internal` / 10.10.x values with `vcf.home.arpa` / 10.100.x. Mark steps that need components the lab lacks.
7. **Write install labs for missing components:** VCF Automation (watch the RAM budget), Operations for Logs, Operations for Networks, HCX, a workload domain.
8. **Re-verify hedged facts** ("check your version") against TechDocs, or directly on Alex's lab (log paths, menu paths, command outputs), and remove the hedges that check out.
9. **Add labs for phases 14–15 and more design scenarios**, aiming for one scenario per objective group.
10. **Add a GitHub Actions workflow:** `npm ci`, `content:check --strict`, `npm test`, `npm run build`.
