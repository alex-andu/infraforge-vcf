# Content status

Snapshot as of 2026-10-08, from `npm run content:check --strict`: 0 errors, 0 warnings.

**This repo is VMware Cloud Foundation (VCF 9 / 2V0-17.25) only. It has no RHCSA content**; "InfraForge RHCSA" is a separate project.

Totals:

| Item | Count |
|---|---|
| Lessons | 72 (161,862 words) |
| Questions | 683 |
| Practical guides (internal `lab` schema) | 25 |
| Incidents | 10 |
| Scenarios | 3 |
| Diagrams | 111 |
| Glossary terms | 279 |
| Commands / API entries | 116 |
| Architecture components | 24 |
| Badges | 18 |

## Theory modules (VCF curriculum, `content/curriculum.yaml`)

| Phase | Title | Lessons written / planned | Words | Questions | Labs |
|---|---|---|---|---|---|
| p00 | Orientation | 4/4 | 8,267 | 34 | 1 |
| p01 | Virtualization Foundations | 4/4 | 6,876 | 27 | 2 |
| p02 | vSphere Core | 6/6 | 13,674 | 53 | 2 |
| p03 | Storage and vSAN | 6/6 | 14,560 | 53 | 2 |
| p04 | Networking | 4/4 | 10,077 | 35 | 3 |
| p05 | NSX | 7/7 | 15,226 | 64 | 3 |
| p06 | VCF Architecture | 6/6 | 12,127 | 66 | 3 |
| p07 | VCF Deployment | 4/4 | 8,953 | 37 | 4 |
| p08 | Workload Domains | 5/5 | 11,100 | 41 | 2 |
| p09 | Lifecycle Management | 4/4 | 8,892 | 40 | 1 |
| p10 | VCF Operations | 6/6 | 14,400 | 77 | 3 |
| p11 | Automation and APIs | 4/4 | 10,295 | 65 | 2 |
| p12 | Identity, Security and Certificates | 4/4 | 8,047 | 30 | 2 |
| p13 | Troubleshooting | 4/4 | 10,947 | 37 | 1 |
| p14 | Architecture and Design | 3/3 | 6,117 | 20 | 0 |
| p15 | Certification Preparation | 1/1 | 2,304 | 4 | 0 |

The lab counts are labs linked to that phase's lessons; one lab can be linked to several phases.

- The standalone-theory template requires 17 sections, sources, at least one diagram and an inline quiz. The DNS/NTP pilot, Kubernetes foundations and HCX lessons use it; the other 69 lessons remain valid with their legacy `Lab` sections during incremental migration.
- **Gaps:**
  - Candidate-profile foundations for Kubernetes, DNS/NTP/certificates and HCX have dedicated theory and separate prepared guides. Validation remains gated on the required real infrastructure and observed evidence.
  - All 59 official items meet the internal five-question target. A question mapping is evidence of coverage, while later topic packages continue to review theory depth and accuracy.
- **Unverified facts** are written as "check your version" rather than stated. The main areas:
  - ESX 9, vCenter and SDDC Manager log paths (only `domainmanager.log`, `hostd.log` and the sos output path are confirmed for VCF 9)
  - some vSphere Client / VCF Operations menu paths
  - precheck contents
  - the TEP IP-pool vs DHCP behaviour
  - alert wait/cancel cycles
  - sample command outputs (marked "trimmed" or "representative")

## Questions (`content/questions/*.yaml`)

683 in total.

- **By objective:**

  | Objective | Questions |
  |---|---|
  | 2.1 | 34 |
  | 2.2 | 76 |
  | 2.3 | 53 |
  | 2.4 | 89 |
  | 4.1 | 161 |
  | 4.2 | 111 |
  | 4.3 | 81 |
  | 4.4 | 69 |
  | none | 9 (3 exam-strategy and 6 HCX candidate-profile items, excluded from mocks) |

- **By type:** 473 single, 75 multi, 47 ordering, 45 matching, 26 true/false, 17 CLI.
- **Diagnostic pool:** 58 questions across 8 areas (16 are drawn at onboarding).
- **Kinds:** concept, architecture, troubleshooting, log, command, scenario and design are all present.
- Every question has an explanation: correct answer, concept, architecture, trap. It also has a lesson + section link and a `why` on each option.
- All 674 objective-tagged questions have a primary `objectiveItem`; three exam-strategy and six HCX candidate-profile questions remain intentionally outside the testable objectives. See [EXAM_COVERAGE.md](EXAM_COVERAGE.md).
- **Gaps:**
  - 59/59 items meet the internal target of at least five questions; none are below it.
  - Coverage closure is complete; future additions should serve content depth, scenarios or newly verified product behavior rather than raw counts.

## Practical guides (`content/labs/*.yaml`)

25 practical guides in the existing internal lab schema. Each has objectives, prerequisites, a topology diagram, steps with validation, expected results, hints and troubleshooting. The VCF Automation organization guide includes exact VCF 9.0 paths for regions, provider networking, organizations, address management, VPCs, content and policies. The three VCF Operations guides contain UI-first slices for Network Operations, Storage Operations, policy creation/assignment, product-managed Telegraf, Business Applications, compliance, Configuration Drift and HCX site-pair/service-mesh mobility. These guides are marked **PREPARED — NOT YET LAB-VALIDATED** where current runtime evidence is absent.

- **Home lab and infrastructure:** `lab-homelab-proxmox-prep`, `lab-network-readiness`, `lab-esx-host-first-vm`, `lab-vcenter-cluster-ha-drs`, `lab-vm-templates-content-library`
- **Storage:** `lab-vsan-esa-cluster`, `lab-vsan-storage-policies`
- **NSX:** `lab-nsx-segments-tier1`, `lab-nsx-tier0-bgp-edge`, `lab-nsx-dfw-microsegmentation`
- **VCF:** `lab-vcf-planning-workbook`, `lab-deploy-vcf-management-domain`, `lab-explore-vcf-fleet`, `lab-commission-hosts-create-wld`, `lab-enable-supervisor`
- **Operate:** `lab-lifecycle-upgrade-planning`, `lab-certificate-replacement`, `lab-password-rotation`, `lab-vcf-ops-dashboards-alerts`, `lab-vcf-ops-logs-network`, `lab-vcf-operations-hcx`
- **Consume:** `lab-vcfa-organization-setup`, `lab-vcf-api-powercli`
- **Troubleshooting:** `lab-troubleshooting-drill` (5 injected faults)
- **Real-infrastructure verification:** `lab-verify-vcf-dns-ntp` (read-only DNS, reverse-resolution and time evidence for the documented VCF lab)

**Status:**
- The 22 remaining legacy guides are written for a *generic* nested-on-Proxmox plan (`lab.internal`, 10.10.x.0/24).
- The DNS/NTP pilot is the first separate, read-only guide for Alex's documented environment (`vcf.home.arpa`, DNS/NTP `infra01` at `10.100.80.10`, vCenter `10.100.10.21`, ESX hosts `10.100.10.11-.14`). Fresh PTR, saved-setting and synchronization evidence remain pending the real-lab run. See `docs/CURRENT_STATE.md` and `docs/LAB_ENVIRONMENT.md`.
- The pilot is also the reference for the new UI-first runbook standard. The 22 remaining legacy guides still need bounded conversion to exact, build-verified click paths, field values, validation and rollback. The HCX and Supervisor guides follow the standard but remain unvalidated.
- No labs for phases 14–15 or Operations for Networks deployment. The HCX guide is prepared but cannot be validated until a second supported site and HCX are available.

## Troubleshooting incidents and scenarios

- **Incidents (10):**
  - `inc-dns-reverse-lookup`, `inc-ntp-time-skew`, `inc-mtu-overlay`, `inc-vsan-degraded-objects`
  - `inc-nsx-edge-north-south`, `inc-host-commissioning`, `inc-certificate-trust`, `inc-lcm-precheck-failure`
  - `inc-vcf-ops-collection`, `inc-esx-host-disconnected`

  Each has 10–12 evidence items with red herrings, an ideal sequence, root cause, next step, remediation and validation choices, hints and a debrief.
- **Scenarios (3):** `scn-production-workload-domain`, `scn-availability-design`, `scn-nsx-tenant-networking`. This is thin; the target is one per objective group.

## Glossary (`content/glossary/*.yaml`)

279 terms, no duplicates.

| File | Terms |
|---|---|
| a-foundations | 24 |
| b-vsphere | 34 |
| c-storage | 32 |
| d-networking | 28 |
| e-nsx | 30 |
| f-architecture | 15 |
| g-deployment | 16 |
| h-lifecycle-security | 28 |
| i-ops-automation | 51 |
| j-troubleshooting | 11 |

**Missing:** selected Kubernetes operational terms such as CNI and kubeconfig. Core Kubernetes terms including control plane, node, pod, Deployment, Service, Namespace, PVC, StorageClass, Supervisor and VKS are present; core HCX terminology is now included.

## Commands / API reference (`content/commands/*.yaml`)

116 entries.

| File | Entries |
|---|---|
| a-foundations | 10 |
| b-vsphere | 12 |
| c-storage | 12 |
| d-networking | 14 |
| e-nsx | 15 |
| g-deployment | 8 |
| h-lifecycle-security | 13 |
| i-ops-automation | 14 |
| j-troubleshooting | 18 |

They cover esxcli, vmkping, nsxcli, vecs-cli, openssl, PowerCLI (`VCF.PowerCLI`), SDDC Manager / NSX / VCF Operations REST, vcf-download-tool, and Proxmox `qm` / `pvesh`.

## Interactive components (all working, all covered by the smoke/flow tests)

| Component | Where | Status |
|---|---|---|
| Interactive SVG diagrams with steps and a text description | `src/components/Diagram.tsx`, 107 diagrams | Done |
| Architecture Explorer: tree, map, focus graph, failure impact | `src/pages/Architecture.tsx`, `content/architecture/` | Done |
| Question renderer: single, multi, true/false, ordering, matching, CLI | `src/components/Question.tsx` | Done |
| Quiz runner with feedback and summary | `src/components/QuizRunner.tsx` | Done |
| Mock / timed exam: timer, navigator, flags, result breakdown | `src/pages/ExamSession.tsx`, `ExamResultPage.tsx` | Done |
| Incident simulator (6 stages, scored) | `src/pages/IncidentPage.tsx` | Done; an infinite-render bug was fixed 2026-10-03 |
| Design scenarios | `src/pages/ScenarioPage.tsx` | Done |
| Guided lab runner (step check-off, hints, topology) | `src/pages/LabPage.tsx` | Done |
| Home Lab Builder (profiles, IP/VLAN/DNS, checklists) | `src/pages/HomeLab.tsx` | Done |
| Global search (Ctrl K, grouped, highlighted) | `src/components/SearchPalette.tsx`, `search.ts` | Done |
| Glossary tooltips, section bookmarks, notes, copy buttons | `src/components/RichContent.tsx` | Done |

## Progress and adaptive learning

| Feature | Where | Status |
|---|---|---|
| Onboarding and diagnostic (16 questions, 8 areas) | `src/pages/Onboarding.tsx` | Done |
| Topic mastery engine | `src/engine/mastery.ts` | Done, unit-tested |
| Spaced repetition (Leitner) | `src/engine/srs.ts`, `Review*.tsx` | Done, unit-tested |
| Readiness score (8 signals, cap without a mock) | `src/engine/readiness.ts` | Done; cosmetic ~2% shown with no data |
| Recommendations ("what to do now") | `src/state/derived.ts` | Done |
| Study plan (7/14/30/custom, recomputed daily) | `src/engine/plan.ts`, `StudyPlan.tsx` | Done |
| Progress page (per phase, topic, objective; mastery history) | `src/pages/Progress.tsx` | Done |
| Gamification (XP, levels, streaks, 18 badges) | `src/engine/gamification.ts` | Done |
| Export / import / reset | `src/pages/Settings.tsx` | Done |
