# Current state

Product/content snapshot as of 2026-10-07; repository/planning assessment on 2026-10-08. Inspected `main` is `577f553` (Claude instructions), after `8ffc48c` (handoff docs) and `95aca5b` (V3 build). Product: **InfraForge VCF**, a local single-user learning platform for VMware Cloud Foundation 9 and the **2V0-17.25 VCF 9.0 Administrator** exam. Owner: Alex.

Note: this repo has no RHCSA content. "InfraForge RHCSA" is a separate project.

## Parallel-work checkpoint (2026-10-08)

This section is the source of truth for work ownership and holds. Operating rules: [VCF_PARALLEL_WORKFLOW.md](VCF_PARALLEL_WORKFLOW.md). Proposed module batches: [VCF_MODULE_ROADMAP.md](VCF_MODULE_ROADMAP.md).

- **Current milestone:** `THEORY-VCF9-TERMINOLOGY-STANDARD-04` completes the orientation-module migration with explicit fleet, instance, domain and cluster boundaries.
- **Authorized now:** Alex explicitly asked Codex to continue as the primary end-to-end owner, including across usage resets. Automatic feature-branch pushes remain authorized. Current branch: `content/theory-vcf9-terminology-standard`, based on pushed theory commit `781f58e`. Push only after checks and a secret scan; no direct push to `main`, force-push, PR, merge, deployment or infrastructure mutation is authorized.
- **Implementation direction:** The earlier exact real-lab alignment plan is superseded. Guides do not need to reproduce the current lab exactly and repository completion does not wait for lab validation. Alex handles execution. Codex focuses next on the component catalog and structured theory, then migrates guides in bounded curriculum-driven packages.
- **Privacy:** verified on 2026-10-08: the unauthenticated GitHub API returns 404 while authenticated Git remote read succeeds, so the repository is private and this workstation retains access. The pilot stores only sanitized topology values and no credentials, tokens or unredacted captures. Task #1 is complete.
- **Exam baseline:** Alex supplied the official-description excerpt updated 2026-04-23. Its 8 objectives / 59 items match `content/objectives.yaml`; Kubernetes/HCX and DNS/NTP/certificates are candidate-profile prerequisites. Ordinal item IDs are repository conventions; mock allocation/scoring remain practice estimates, not official weights or a raw passing percentage.
- **Curriculum priority (Alex, 2026-10-08):** the official exam objectives and candidate profile determine theory, questions, visuals and the practical-guide roadmap. The current lab inventory does not limit curriculum scope. Complete guides may cover products that are not currently deployed; Alex handles execution independently.
- **Learning contract (Alex, 2026-10-08):** develop deeper standalone theory with the existing 17-section progression. At the first occurrence in every lesson, expand each acronym in parentheses; after the introductory paragraph explain that term's purpose, operation, dependencies, capabilities, limitations, management surface, common mistakes and exam relevance. Add a central catalog covering every VCF component with the same profile. Keep beyond-exam material concise and clearly labelled.
- **Visual requirement (Alex, 2026-10-08):** preserve the existing original diagrams and add genuine VMware/Broadcom product-interface images wherever they help the learner recognize vSphere, NSX, SDDC Manager, VCF Operations or another workflow. Visible citations are not required in the learner UI; keep provenance/version internally. Never present generated UI as an official screen.
- **Operating model and context budget (Alex, 2026-10-08):** ChatGPT is the primary end-to-end owner; Claude is optional for a bounded batch. Repository checkpoints/specs hold durable memory. Sessions use targeted reads, one small batch, reusable source/evidence manifests and compact handoffs; no routine full-repository rescans or repeated research. See `VCF_PARALLEL_WORKFLOW.md`.
- **Practical-guide standard (Alex, 2026-10-08):** every runnable guide is a complete UI-first VCF 9.0.2 runbook: product URL, required role, exact documented click path, button, field, FQDN or named input, commit action, expected screen, troubleshooting and rollback. Guides need not match the current home lab exactly. Avoid IP-discovery work; use known FQDNs and placeholders such as `<hcx-manager-fqdn>`. Alex performs lab validation independently.
- **Sanitized real-lab inventory (Alex, 2026-10-08):** `docs/LAB_ENVIRONMENT.md` now records the supplied VCF 9.0.2 topology without credentials. It confirms `infra01` / `10.100.80.10` as BIND DNS + chrony NTP, ESX hosts `esx01`–`esx04` / `10.100.10.11-.14`, and the deployed management components. The DNS/NTP guide now uses `esx01` and the actual NTP address. PTR and live sync state still require the guide run.

| Work item | Owner | Status | Scope / prerequisites | Next handoff |
|---|---|---|---|---|
| Parallel setup | ChatGPT | COMPLETE (local) | Assessed repository; wrote workflow/roadmap and established bounded-batch ownership | Use this file as the live checkpoint |
| THEORY-LABS-01: theory / guide separation + DNS/NTP pilot | ChatGPT | COMPLETE (local); WAITING FOR REAL-LAB VALIDATION | Standalone theory, UI-first read-only guide using the sanitized real inventory, original topology diagram, official Broadcom figures, compatibility transition and learner-facing labels | Alex runs the guide on esx01, then repeats on esx02–04; ChatGPT records sanitized PTR/settings/sync evidence |
| K8S-FOUND-01: Kubernetes foundations for Supervisor (part of #4) | ChatGPT | COMPLETE; THEORY PUSHED EARLIER | 17-section theory, original Supervisor/VKS mapping, official Kubernetes figure, glossary and five questions | Companion guide completed in `K8S-SUPERVISOR-GUIDE-01` |
| EXAM-COVERAGE-01 / #2 objective-item tagging and report | ChatGPT | COMPLETE; PUSHED `ee43683` | 59 item IDs, 617 question mappings, validator/report/UI integration | Use the reproducible map for Batch B |
| VCFA-ORG-NET-01 / #3 first measured gap | ChatGPT | COMPLETE; PUSHED `5c79814` | Close `4.4.8` with theory, diagram, glossary, five questions and a prepared guide slice | Superseded by the next bounded package |
| VCFA-CONTENT-01 / #3 VCF Automation content lifecycle | ChatGPT | COMPLETE; PUSHED `8245e2d` | Close `4.4.1`, `4.4.6` and `4.4.9` with deeper theory, one diagram, glossary, twelve questions and a prepared guide slice | Superseded by the next bounded package |
| VCFA-GOV-01 / #3 provider onboarding and governance | ChatGPT | COMPLETE; PUSHED `ad3f9ff` | Close `4.4.3`, `4.4.4`, `4.4.5`, `4.4.7` and `4.4.11` with exact theory/runbook workflows, one diagram and nine questions | Superseded by the next bounded package |
| OPS-OBSERVE-01 / #3 VCF Operations observability | ChatGPT | COMPLETE; PUSHED `3305596` | Reinforce `4.3.1`, `4.3.3` and `4.3.5` with seven scenario-driven questions tied to developed lessons | Superseded by the next bounded package |
| OPS-NET-STORAGE-POLICY-01 / #3 VCF Operations network, storage and policy | ChatGPT | COMPLETE; PUSHED `799f372` | Close `4.3.9`, `4.3.10` and `4.3.11` with deeper theory, one original diagram, eight questions and prepared UI-first guide slices | Superseded by the next bounded package |
| OPS-APP-COMPLIANCE-DRIFT-01 / #3 VCF Operations application monitoring, compliance and drift | ChatGPT | COMPLETE; PUSHED `b3a2b97` | Close `4.3.12`, `4.3.13` and `4.3.14` with verified UI workflows, corrected drift policy semantics, an official figure, seven questions and prepared guide slices | Superseded by the final measured-gap package |
| VCF-FOUNDATION-DEPLOYMENT-GAPS-01 / #3 measured coverage closure | ChatGPT | COMPLETE; PUSHED `fa7cc91` | Close `2.1.1`, `2.1.2`, `2.2.4`, `2.3.3` and `4.1.4` with deeper theory, one corrected question and nine new questions | Batch B complete |
| OPS-HCX-FOUNDATIONS-01 / #4 candidate-profile HCX | ChatGPT | COMPLETE; PUSHED `cae7aee` | Dedicated theory, original and official visuals, glossary, architecture component, six questions and a prepared ten-step guide | Validate only after HCX and a second supported site exist |
| K8S-SUPERVISOR-GUIDE-01 / #4 Supervisor practical guide | ChatGPT | COMPLETE; PUSHED `21d3dcf` | Replace fictional lab values with mandatory discovery variables and a ten-step UI-first activation/namespace/VM Service runbook | Validate after a VI Workload Domain and Supervisor capacity exist |
| REAL-LAB-PROFILE-01 / #5 sanitized topology profile | ChatGPT | COMPLETE; PUSHED FEATURE BRANCH | Add the supplied current topology as a fourth Home Lab Builder profile without credentials or inferred unknowns | Alex supplies runtime evidence only when later guides touch each system |
| LEARNING-STANDARD-02 | Codex | COMPLETE; PUSHED `fec1e38` | Persist acronym, component-catalog, FQDN, visual, guide and exercise rules agreed with Alex | Apply to every subsequent bounded content package |
| VCF-COMPONENT-CATALOG-CORE-01 | Codex | COMPLETE; PUSHED `ee7c52d` | Expand the catalog schema/UI and enrich eight core component profiles | Superseded by the networking catalog batch |
| VCF-COMPONENT-CATALOG-NETWORK-02 | Codex | COMPLETE; PUSHED `0f39c77` | Enrich six networking and dependency component profiles | Superseded by the services catalog batch |
| VCF-COMPONENT-CATALOG-SERVICES-03 | Codex | COMPLETE; PUSHED `2b3c5ed` | Enrich six consumption, identity and optional-service component profiles | Superseded by the final domains catalog batch |
| VCF-COMPONENT-CATALOG-DOMAINS-04 | Codex | COMPLETE; PUSHED `7577eef` | Complete the four fleet, instance and domain structural profiles | Superseded by the first theory-standard migration |
| THEORY-WHAT-IS-VCF-STANDARD-01 | Codex | COMPLETE; PUSHED `7004a78` | Expand first-use acronyms and core-component explanations in `what-is-vcf`; remove its embedded lab block | Superseded by the second orientation migration |
| THEORY-PRIVATE-CLOUD-STANDARD-02 | Codex | COMPLETE; PUSHED `8557691` | Deepen `private-cloud-and-sddc`, define acronyms and remove its non-runnable embedded lab | Superseded by the platform comparison migration |
| THEORY-VCF-VSPHERE-STANDARD-03 | Codex | COMPLETE; PUSHED `781f58e` | Deepen the VCF/vSphere/VVF comparison and remove its non-runnable embedded lab | Superseded by the terminology migration |
| THEORY-VCF9-TERMINOLOGY-STANDARD-04 | Codex | COMPLETE LOCALLY; CHECKS PASSED; PUSH PENDING | Complete orientation with structural-boundary explanations, acronym expansion and theory/guide separation | Publish the feature branch; orientation module is fully migrated |
| #6–#10 remaining implementation | ChatGPT (Claude optional) | QUEUED | Existing task order retained; shared-file edits serialized and environment-dependent guides remain visibly unvalidated | Select one bounded package at a time |
| Independent lab execution | Alex | AS NEEDED | Run the canonical guides when useful and adapt known home-lab exceptions | No repository completion dependency |

The completed pilot spec and evidence sheet are in `docs/specs/theory-labs-separation/spec.md`. The hold still applies to the older tasks #2–#10; it does not roll back this explicitly approved pilot. The feature branch may be committed and pushed automatically under `CLAUDE.md`; PR, merge and deployment remain separate.

Fresh local checks after `THEORY-VCF9-TERMINOLOGY-STANDARD-04`: strict content validation **0 errors / 0 warnings**, **674/674 objective-tagged questions mapped**, **59/59 items at target**, **23/23 unit tests passed**, typecheck passed and production build passed. Browser smoke passed for `vcf9-terminology` with no console errors and the rendered lesson was visually reviewed. Inventory is 72 lessons / 163,057 words, 683 questions, 25 guides, 24 components, 111 diagrams and 279 glossary terms. The four-lesson orientation module is fully migrated and all 24 component profiles use the expanded catalog format.

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
- Learn mode: 16 phases and 72 lessons. The standalone-theory contract has 17 required sections; 65 untouched lessons may retain their legacy `Lab` section until migrated. See `docs/CONTENT_STATUS.md`.
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
- Home Lab Builder: platforms, 4 profiles including the sanitized documented real-lab topology, IP/VLAN/DNS plan, checklists, guides.
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
- Candidate-profile theory and prepared-guide coverage for Kubernetes/Supervisor, DNS/NTP/certificates and HCX is complete; real-lab validation remains pending.
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

Tasks 2–10 were requested on 2026-10-07. Alex later resumed curriculum-driven bounded packages and asked work to continue across usage resets. Tasks #2–#4 are complete at the authored/prepared level; tasks #5–#10 and all real-lab validation remain queued for one bounded package at a time.

1. **Make the GitHub repo private.** Only Alex can do this: Settings → General → Danger Zone. Confirm before adding any lab-specific content.
2. **Tag every question with its objective item. COMPLETE in `EXAM-COVERAGE-01`.** The schema, all 617 mappings, validation, repeatable report and learner-facing item coverage are implemented.
3. **Fill the coverage gaps the report shows. COMPLETE in bounded batches.** All 59 official items have dedicated lesson coverage and at least five mapped questions. Continue to review depth and accuracy during later topic packages rather than inflating question counts.
4. **Add the topics named in the candidate profile:**
   - VCF Operations HCX (lesson, questions, glossary and prepared guide) — COMPLETE in `OPS-HCX-FOUNDATIONS-01`
   - foundational Kubernetes for vSphere Supervisor — COMPLETE, including the prepared UI-first guide
   - a DNS / NTP / certificates refresher
5. **Add a "real lab" profile to `content/homelab/homelab.yaml`. COMPLETE in `REAL-LAB-PROFILE-01`.** It describes the supplied `vcf-lab-01` topology: single-node `mgmt-domain`, four nested ESX 9.0.2 hosts, vSAN OSA FTT=0, VDS MTU 1700 and VLANs 110/120/130/140/180. It contains no passwords and labels unobserved facts and unknown sizing explicitly.
6. **Migrate existing guides to the final teaching standard.** Use the known `vcf.home.arpa` FQDNs where useful, named FQDN placeholders for absent components, canonical VCF 9.0.2 procedures, genuine official UI images, complete troubleshooting and rollback. Do not bind every guide to the current lab's IP plan or require recorded lab validation.
7. **Write install labs for missing components:** VCF Automation (watch the RAM budget), Operations for Logs, Operations for Networks, HCX, a workload domain.
8. **Re-verify hedged facts** ("check your version") against TechDocs, or directly on Alex's lab (log paths, menu paths, command outputs), and remove the hedges that check out.
9. **Add labs for phases 14–15 and more design scenarios**, aiming for one scenario per objective group.
10. **Add a GitHub Actions workflow:** `npm ci`, `content:check --strict`, `npm test`, `npm run build`.
