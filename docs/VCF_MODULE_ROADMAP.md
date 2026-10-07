# VCF module roadmap

Planning map, assessed on 2026-10-08 against `main` at `577f553bfcc02b2bbf9eca224940b4d3dc596f3d`. [CURRENT_STATE.md](CURRENT_STATE.md) owns priorities and live status; [VCF_PARALLEL_WORKFLOW.md](VCF_PARALLEL_WORKFLOW.md) owns the handoff rules.

## Repository assessment and milestone

- V3 (`3.0.0`) is already built. After the DNS/NTP pilot and Kubernetes foundations package, the inventory is 16 phases, 71 lessons, 620 questions, 24 practical guides in the existing lab schema and 106 diagrams. This is an enhancement roadmap, not a new curriculum build.
- The inspected clone started clean on `main`, matching `origin/main`. History has three commits: `95aca5b` (V3), `8ffc48c` (handoff docs), `577f553` (Claude instructions). The old state header's one-commit claim was stale.
- The product milestone is the completed V3 baseline plus `THEORY-LABS-01` and `K8S-FOUND-01`. Real-lab validation of the DNS/NTP guide remains pending. Alex explicitly resumed the Kubernetes slice of task #4; the other held tasks stay governed by `CURRENT_STATE.md`.
- GitHub privacy was verified on 2026-10-08: anonymous access returns 404 and the authenticated remote remains accessible. Repository content still excludes credentials and unredacted captures.
- Fresh local strict content validation, 23 engine tests, typecheck, build and a 15-route browser smoke pass. `CURRENT_STATE.md` records results and the Windows line-ending workaround. These checks do not establish deployed or real-lab runtime health.
- Gaps documented in the repository: no dedicated HCX lesson, 23 measured objective items below the internal question target, thin Operations/Automation coverage, generic rather than real-lab labs, hedged facts, no phase 14–15 labs, only three scenarios and no CI. Kubernetes foundations now has a dedicated lesson; its guide can be prepared before a Workload Domain and Supervisor exist, then validated after they are added.
- Alex's new direction supersedes the old embedded-lab teaching format: deeper, better structured standalone theory; separate practical guides aligned with the supplied official blueprint. The exam curriculum determines coverage even when a component is not yet present in the lab. `/labs` and individual lab pages already exist. Guides for future components may be complete but visibly unvalidated until Alex adds and tests those components.
- Every module package also considers official VMware/Broadcom figures and real product UI screenshots alongside original diagrams/generated illustrations. Default to source-attributed official embeds, with version checks, inspected images and explicit offline behavior. UI screenshots illustrate guide steps; architecture figures support theory. See the workflow's visual-material rules.
- Every practical-guide migration uses the DNS/NTP pilot's UI-first runbook standard: exact build-specific breadcrumbs, controls, fields, real values/discovery variables, commit checkpoints, validation and rollback. The 23 legacy guides are not considered migrated until they meet this contract.

## Sequencing without lifting the hold

Exam reference supplied by Alex in this session: the official-description excerpt labelled **Last Updated: 4/23/2026**. It matches the repository's objective/item list: 2.1 (3 items), 2.2 (4), 2.3 (6), 2.4 (4), 4.1 (9), 4.2 (7), 4.3 (14), 4.4 (12), **59 items total**. Sections 1 and 3 have no testable objectives. The excerpt explicitly lists foundational Kubernetes, DNS/NTP/certificates and VCF Operations HCX in the candidate profile, supporting batch C.

Repository item IDs such as `4.1.9` and `4.4.12` are local ordinal conventions, not printed official sub-objective numbers. Map them to the exact item text. The supplied description specifies 60 items, a scaled passing score of 300 and a 135-minute appointment; it provides no per-objective weights or raw-percent passing threshold. Keep the existing mock's allocation by item count and estimated score labelled as practice heuristics. Do not infer official weighting or change the exam engine in this documentation batch.

| Batch | ChatGPT preparation and default implementation | Claude optional bounded support | Alex acceptance | State task |
|---|---|---|---|---|
| Design prerequisite: Theory / Lab Separation | Implemented the teaching contract, DNS/NTP theory sample, read-only guide, source/visual manifest and QA | Optional future bounded integration support; no current Claude task | Run the guide, return sanitized evidence and approve the structure | `THEORY-LABS-01` complete locally |
| A: Measure coverage | **Complete:** 59 item IDs, 617 question mappings, validator, reproducible report and Exam Prep integration | No Claude work assigned | Review the resulting coverage map | #2 |
| B: Close measured gaps | **Active:** prioritize `4.4.8`, then the remaining low-count VCF Automation and Operations items; implement one theory/question package at a time | A specifically assigned content-integration slice | Accept gap closure evidence | #3 |
| C: Candidate-profile additions | Kubernetes foundations complete; HCX remains next; research, content, visuals, integration and QA | A specifically assigned integration slice | Approve teaching scope; validate any enabled guide | #4 |
| D: Real-lab alignment | Topology profile, evidence sheets, guide adaptation and QA | A specifically assigned guide-integration slice | Confirm privacy; supply build/RAM evidence and perform lab changes | #5–#7 |
| E: Technical and practical QA | Verify hedged claims; apply corrections, exercises and guide specs | A specifically assigned corrections slice | Validate environment-dependent behavior | #8–#9 |
| F: Repeatable checks | Implement and review acceptance gates in GitHub Actions | A specifically assigned workflow slice | Approve CI change | #10 |

The design prerequisite and Batch A coverage measurement are complete locally while Claude remains idle. ChatGPT owns preparation, implementation and QA by default; Claude is optional for a later bounded integration batch. Alex instructed ChatGPT to continue with the curriculum-first strategy, so Batch B proceeds as small report-driven packages. All later module packages follow the approved theory/guide separation. The official exam curriculum drives content order; component availability and RAM planning affect execution and validation of install exercises, not authoring coverage.

## Module map (existing curriculum IDs)

All modules below have existing lessons. Each row is a proposed focus, not a claim that the module is missing or unvalidated in full. ChatGPT owns the package end to end by default; Claude may receive an exact bounded integration slice; Alex approves scope and supplies any real-lab acceptance listed. A row activates only through `CURRENT_STATE.md`.

| Phase / module | ChatGPT: proposed spec or QA focus | Claude: bounded integration | Alex: acceptance / real-lab evidence | Task |
|---|---|---|---|---|
| p00 / `m00-vcf-intro` | Review item mapping only if coverage report finds gaps | Question tags; approved gap additions | Scope/content review | #2–#3 |
| p01 / `m01-virt-basics` | Preserve foundations; inspect only reported gaps | Tags and measured gap fixes | Content review | #2–#3 |
| p02 / `m02-hosts-vcenter` | Compute-item mapping; build-dependent host facts | Tags and verified corrections | ESX/vCenter build and relevant output | #2–#3, #8 |
| p02 / `m02-clusters-vms` | Cluster/VM coverage and existing lab prerequisites | Approved questions and lab adaptation | Cluster/VM checks | #3, #6 |
| p03 / `m03-storage` | Existing ESA/OSA distinctions and storage prerequisites | Approved coverage/profile adjustments | Actual storage configuration | #3, #5–#6 |
| p03 / `m03-vsan-ops` | Policy/resilience evidence sheet and reported item gaps | Questions, verified corrections, lab steps | Observed policy/health results | #3, #6, #8 |
| p04 / `m04-net-fundamentals` | **Pilot complete locally:** deeper DNS/NTP theory + separate read-only infrastructure verification guide; later certificates-linked refresher | No Claude work assigned | Run the guide; provide sanitized DNS/PTR/NTP evidence and approve teaching structure | THEORY-LABS-01, #4, #6 |
| p04 / `m04-vsphere-networking` | Network/MTU readiness checks | Approved lab adaptation | Switch/network evidence | #6, #8 |
| p05 / `m05-nsx-fabric` | Fabric/TEP claims requiring verification | Verified corrections and lab integration | Actual transport/TEP behavior | #6, #8 |
| p05 / `m05-nsx-routing` | Network Gateway interpretation and missing-edge prerequisites | Approved gaps and runnable/conceptual labels | Edge availability and routing evidence | #3, #6–#8 |
| p05 / `m05-nsx-security` | Existing security lab prerequisites and scoped QA | Lab adaptation where supported | Firewall validation and cleanup evidence | #6, #8 |
| p06 / `m06-structure` | Reuse architecture/domain diagrams; map measured gaps | Approved section fixes | Content review; topology confirmation later | #3, #5 |
| p06 / `m06-management` | Versioned management/component communication QA | Verified corrections | Actual menu/service evidence | #8 |
| p07 / `m07-deploy` | Real-lab planning/installation evidence and resource constraints | Approved profile/lab changes | Prerequisites and deployment evidence | #5–#8 |
| p08 / `m08-wld` | **Kubernetes foundations companion complete:** upstream concepts, Supervisor/VKS mapping, original diagram and questions; a separate full guide may be prepared now and labelled unvalidated | No Claude work assigned | Add WLD/Supervisor later and supply evidence for guide validation | #4, #6–#7 |
| p09 / `m09-lcm` | Upgrade/precheck fact verification and lab evidence sheet | Verified lifecycle lab corrections | Exact-build precheck/upgrade evidence | #6, #8 |
| p10 / `m10-ops-core` | Health/diagnostics, storage and application monitoring item gaps | Report-driven sections/questions | Operations evidence | #3, #8 |
| p10 / `m10-ops-extended` | HCX package proposal and Networks depth based on exam coverage; installation guide may precede component availability | Approved lesson/glossary/questions, install guides separately | Add components later and supply RAM/installation evidence for validation | #3–#4, #7 |
| p11 / `m11-vcfa` | Provider library, extensibility, governance and Supervisor Services gaps | Approved item sections/questions and install lab | Automation RAM plan and real component evidence | #3, #7 |
| p11 / `m11-apis` | Exact API/command verification for changed material | Verified reference/lab updates | Observed responses, without credentials | #6, #8 |
| p12 / `m12-identity` | RBAC/identity checks tied to reported gaps | Approved corrections and lab integration | Permission/access evidence | #3, #6, #8 |
| p12 / `m12-trust` | Certificates refresher linked to DNS/NTP; verify paths | Approved additions and lab corrections | Trust/password/license behavior | #4, #6, #8 |
| p13 / `m13-method` | Evidence-based troubleshooting and verified log paths | Incident/lab corrections in scope | Real output versus expected result | #6, #8 |
| p14 / `m14-design` | Guide to review actual infrastructure against deployment/availability requirements; scenarios remain separate | Approved infrastructure review guide and scenario data | Actual configuration evidence and design justification | #9 |
| p15 / `m15-exam` | Coverage review and a separate real-infrastructure readiness guide mapped to practical items | Approved guide; preserve deliberate untagged strategy questions | Final readiness/content review and lab evidence | #2–#3, #9 |

## First ChatGPT package completed locally

**`Theory / Lab Separation with a DNS/NTP pilot`** — `THEORY-LABS-01`, tied to `p04-networking` / `m04-net-fundamentals`. Package: `docs/specs/theory-labs-separation/spec.md`.

This pilot turns Alex's clarified learning model into a reviewable implementation before expanding other modules. It uses core infrastructure already discussed and does not depend on a new Workload Domain, Supervisor or Automation installation.

Delivered scope:

- Developed the DNS/NTP lesson as standalone theory with a clearer identity/trust/time model, worked diagnostic reasoning, the existing interactive architecture diagram and a verified Broadcom VCF 9 screenshot.
- Added **Verify DNS and time across the existing VCF lab** as a separate read-only guide, with confirmed DNS/vCenter values, explicit discovery points, evidence fields and exam connections.
- Added a local topology diagram for the verification paths and retained stable lesson, route, state and schema IDs.
- Changed the validator to the 17-section theory contract while keeping legacy lessons compatible; changed the learner-facing area to **Ghiduri practice**.
- Recorded primary-source applicability and caveats, especially for ESX 9.0.2 NTP commands.
- Passed strict content validation, all 23 unit tests, typecheck, production build and 15-route browser smoke.

No infrastructure action was performed. The guide does not reconfigure DNS, NTP, routing or firewalls. It does not invent the PTR record, NTP server, ESX host names or synchronization state; Alex's run supplies those facts. Existing learner IDs and persisted state remain compatible.

The local package meets its implementation and QA acceptance criteria. Final content acceptance awaits Alex's real-lab evidence and review of the learning structure. Claude has no assigned work.

**Kubernetes Foundations for vSphere Supervisor** is implemented under `m08-wld`. It fills the documented beginner prerequisite gap without duplicating the advanced Supervisor lesson. The subsequent `EXAM-COVERAGE-01` package completed Batch A and replaced guessed priorities with a reproducible map: 36/59 items meet the five-question target, 23 are below it, and `4.4.8` organizational networks is the only item at zero. That item is the first Batch B package; HCX remains queued as the other candidate-profile addition.
