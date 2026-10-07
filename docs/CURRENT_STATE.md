# Current state

Snapshot as of 2026-10-07. The only commit on `main` is `95aca5b`, the V3 build. Product: **InfraForge VCF**, a local single-user learning platform for VMware Cloud Foundation 9 and the **2V0-17.25 VCF 9.0 Administrator** exam. Owner: Alex.

Note: this repo has no RHCSA content. "InfraForge RHCSA" is a separate project.

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
- Learn mode: 16 phases, 70 lessons, all with the 18-section template. See `docs/CONTENT_STATUS.md`.
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
- Labs: 23 guided labs with step checklists, hints, validation and expected results.
- Troubleshooting: 10 incidents in a 6-stage simulator (evidence → cause → next step → remediation → validation → debrief), scored with LCS.
- Scenarios: 3 design scenarios.
- Architecture Explorer:
  - Component tree, full map, focus graph per component.
  - Failure simulation ("what breaks if X fails").
- Home Lab Builder: platforms, 3 profiles, IP/VLAN/DNS plan, checklists, guides.
- Reference pages: glossary (256 terms) and command/API reference (116 entries).
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
  - Questions are tagged per objective, not per objective item, so coverage of each item is not measured or guaranteed.
  - Topics named in the guide's "Minimally Qualified Candidate" profile are thin: VCF Operations HCX, foundational Kubernetes, and VCF Operations for Networks depth.
- **Fact verification.**
  - Content authors hit the shared WebFetch budget. Unverified details are written as "check your version", not stated as fact. Examples: some UI menu paths, ESX 9 / SDDC Manager log paths, sample command outputs, precheck contents.
- **Labs vs the real lab.**
  - Labs use a generic plan: `lab.internal` / 10.10.x.0/24.
  - Alex's real VCF 9.0.2 lab uses `vcf.home.arpa` / 10.100.x.0/24. Labs are not yet rewritten for it.
- **Scenarios.** Only 3 exist, and phases 14–15 have no labs.
- **Docker image.** Never built in the cloud container (no Docker daemon). The build was verified only with `npm run build`.

## Not started

- Rebuilding labs on Alex's real lab (see the task list below).
- Per-objective-item tagging and a coverage report.
- HCX and Kubernetes lessons.
- Install labs for components not yet in Alex's lab: VCF Automation, Operations for Logs, Operations for Networks, HCX, a workload domain.
- CI: no GitHub Actions workflow.
- Browser-level accessibility audit beyond the basics already built in (skip link, ARIA labels, focus states).

## Known bugs and limitations

1. The readiness ring shows ~2% before any answers, because of the mastery prior of 0.25. The card is labelled "Estimare preliminară". Cosmetic.
2. Initial JS chunk is ~1 MB (234 KB gzip) and the search chunk ~2 MB (505 KB gzip), because content metadata and the search index are bundled. The warning limit is raised to 2500 KB in `vite.config.ts`. Acceptable on a LAN; slow on a remote link.
3. Official figures are hotlinked from techdocs.broadcom.com. With no internet they don't render, but captions and source links still show.
4. Mock-exam questions left unanswered are not recorded as attempts, so they don't affect mastery. Intentional, but readiness may then show "answer at least 20 questions" right after a mostly blank mock.
5. Three questions (`ex-strat-001/002/004`) have no objective and are never picked for mock exams. Intentional.
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

Tasks 2–10 were requested on 2026-10-07 but are **on hold until Alex says his separate "InfraForge RHCSA" project is finished**.

1. **Make the GitHub repo private.** Only Alex can do this: Settings → General → Danger Zone. Confirm before adding any lab-specific content.
2. **Tag every question with its objective item.** Add an optional `objectiveItem` field to the question schema, backfill the 615 questions, and extend `scripts/check-content.ts` with a per-item coverage report.
3. **Fill the coverage gaps the report shows.** Every 2.1–4.4 item needs a dedicated lesson section and at least 5 questions. Expected weak spots: 4.1 "VCF Network Gateway", 4.3 Health and Diagnostics / Storage Operations / application monitoring, 4.4 provider content library, extensibility, governance policies, Supervisor-based Services.
4. **Add the topics named in the candidate profile:**
   - VCF Operations HCX (lesson, questions, glossary)
   - foundational Kubernetes for vSphere Supervisor
   - a DNS / NTP / certificates refresher
5. **Add a "real lab" profile to `content/homelab/homelab.yaml`** describing Alex's deployed lab: vcf-lab-01, single-node mgmt-domain, 4 nested ESX 9.0.2, vSAN OSA FTT0, VDS MTU 1700, VLANs 110/120/130/140/180. Topology only, no passwords.
6. **Rewrite existing labs against the real lab**, replacing the `lab.internal` / 10.10.x values with `vcf.home.arpa` / 10.100.x. Mark steps that need components the lab lacks.
7. **Write install labs for missing components:** VCF Automation (watch the RAM budget), Operations for Logs, Operations for Networks, HCX, a workload domain.
8. **Re-verify hedged facts** ("check your version") against TechDocs, or directly on Alex's lab (log paths, menu paths, command outputs), and remove the hedges that check out.
9. **Add labs for phases 14–15 and more design scenarios**, aiming for one scenario per objective group.
10. **Add a GitHub Actions workflow:** `npm ci`, `content:check --strict`, `npm test`, `npm run build`.
