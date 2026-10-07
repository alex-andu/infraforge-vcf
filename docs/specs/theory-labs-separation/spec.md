# THEORY-LABS-01 — theory and practical-guide separation

Status: COMPLETE LOCALLY — WAITING FOR REAL-LAB VALIDATION
Base: `577f553bfcc02b2bbf9eca224940b4d3dc596f3d`
Pilot: `p04-networking` / `m04-net-fundamentals` / `dns-ntp-dependencies`

## Purpose and acceptance

Alex wants theory that can be studied end to end without an embedded lab. Practical work belongs in the existing `/labs` area as a guide for the real infrastructure, tied to the official 2V0-17.25 description. This pilot is accepted when:

- the DNS/NTP lesson has a clearer conceptual progression, useful examples, diagrams, one verified official Broadcom visual and no `## Lab` or `::lab[...]` block;
- the lesson validator permits the new 17-section theory template while untouched lessons remain valid during migration;
- `/labs` is presented to the learner as **Ghiduri practice**, while internal route/state/schema IDs remain stable;
- a new read-only guide validates the confirmed environment without assuming missing configuration or exposing credentials;
- existing learner IDs, question anchors and persisted state remain compatible;
- strict content validation, unit tests, typecheck, production build and UI smoke checks pass.

## Compact context pack

- Official exam-description excerpt supplied by Alex, updated 2026-04-23: DNS and NTP are foundational candidate knowledge. Relevant practical objectives include deployment/configuration under 4.1 and management/operations under 4.2–4.3; DNS/NTP are not separate numbered objectives.
- Confirmed documented lab facts: internal suffix `vcf.home.arpa`; `infra01` at `10.100.80.10` provides BIND DNS and chrony NTP; the NRPT rule for `.vcf.home.arpa` points there; Windows `Resolve-DnsName vcenter01.vcf.home.arpa` returned `10.100.10.21`; the environment is accessed through VPN; no credentials are stored.
- The supplied inventory identifies four ESX 9.0.2 hosts: `esx01`–`esx04.vcf.home.arpa` at `10.100.10.11`–`.14`. The pilot uses `esx01`; later passes repeat the same checks on the other three.
- Not confirmed for this pilot: PTR results, whether saved component settings still match the documented DNS/NTP service, and current synchronization state. The guide discovers and records these read-only.
- Sanitized reusable topology: `docs/LAB_ENVIRONMENT.md`. The source attachment contains credentials and must never be copied into the repo.
- Existing reusable IDs: topics `dns`, `ntp`, `deployment-planning`; lesson `dns-ntp-dependencies`; incidents `inc-dns-reverse-lookup`, `inc-ntp-time-skew`; diagram `d04-dns-ntp-dependency-map`.
- Existing `lab-network-readiness` remains a generic build guide and is not rewritten in this pilot. The new guide starts from an already-built environment.

## Content and integration files

| File | Change |
|---|---|
| `content/lessons/p04-networking/dns-ntp-dependencies.md` | Develop and restructure theory; link new guide in metadata; remove embedded lab section/card. |
| `content/labs/lab-verify-vcf-dns-ntp.yaml` | Add read-only verification guide for the confirmed environment. |
| `content/diagrams/d-lab-verify-vcf-dns-ntp-logical.yaml` | Show the verified access/resolution path and discovery points. |
| `scripts/content-loader.ts` | Change required theory template from 18 to 17 sections by removing `Lab`; tolerate old lessons during migration. |
| `docs/CONTENT_GUIDE.md` | Document standalone theory and separate guides. |
| learner-facing React strings | Rename the visible Labs area to practical guides without changing routes/state keys. |

## Sources and claim notes

| Source | Used for | Applicability / caution |
|---|---|---|
| Broadcom KB 435717, *Fleet or Instance deployment from VCF Installer fails at validation due to DNS resolution failure* | Forward/reverse consistency, exact-name/case comparison, VCF 9 validation screenshot | VCF 9.x; official KB. |
| Broadcom KB 443781, *NTP synchronization issues on ESXi hosts* | `ntpq`, reach value, UDP 123 troubleshooting model | Page lists ESXi 7.x/8.x. Use it for the diagnostic model; the guide asks Alex to record actual ESX 9.0.2 behavior rather than claiming it unverified. |
| Broadcom KB 394448, *During deployment of external Identity Broker appliances, the UI is confusing — DNS and NTP servers are hidden* | VCF Operations 9.0 example that DNS/NTP selections are platform inputs | Product-specific example, not the guide's primary workflow. |
| Broadcom KB 397246, *DNS server IP address update on vSphere ESXi host* | Exact vSphere Client DNS path and field names | Applies to ESXi/vCenter 7.x, 8.x and 9.x. Pilot opens the edit dialog only for inspection and cancels. |
| Broadcom KB 301589, *Manually update NTP servers on VCF Components* | vCenter VAMI and vSphere Client NTP paths | Applies to VCF 5.x and 9.0.x; the pilot uses the paths read-only. |
| Broadcom KB 403181, *Actions menu of Time & date is not working* | ESXi Host Client path and official UI figures | Explicitly includes ESX 9.x; figures were visually inspected before integration. |
| Broadcom KB 425914, *VVF 9 deployment fails: NTP should be configured* | Full ESX 9.x Host Client configuration sequence | Used as a clearly labelled future configuration rehearsal, not executed by this read-only guide. |
| Existing VCF 9 TechDocs links in lesson frontmatter | External-services design context | Live page was blocked to the research tool; retain the already recorded official references and do not add unverified quotations. |

## Visual asset manifest

| Asset | Provenance | Placement | Delivery / offline behavior |
|---|---|---|---|
| `d04-dns-ntp-dependency-map` | Original interactive YAML/SVG | Theory architecture | Bundled locally; primary explanatory visual. |
| Broadcom KB 435717 attachment `uniqueFileId=2339411294298` | Official Broadcom screenshot | Theory failure scenario | Remote embed with source/caption; existing figure fallback preserves context offline. Screenshot is described only as the KB's VCF Installer DNS validation example. |
| Broadcom KB 403181 attachments `uniqueFileId=1913999764395` and `1914000326227` | Official Broadcom ESXi Host Client screenshots | ESX time-verification step | Remote embeds with attribution; show the Time & date entry point and NTP client/startup/server fields. Textual click paths remain available offline. |
| `d-lab-verify-vcf-dns-ntp-logical` | Original interactive YAML/SVG | Practical guide | Bundled locally; identifies infra01/10.100.80.10 and the esx01 pilot path. Runtime health remains a discovery point. |
| Actual vSphere time-configuration evidence | Alex's future redacted lab capture | Guide evidence | Not committed in this pilot; capture only after validation, with secrets/session data removed. |

No generated bitmap is needed for this topic: the interactive dependency diagram communicates the technical relationship more precisely. Generated illustrations remain available for later modules where they improve understanding.

## Practical guide evidence record

Record only results, not credentials:

| Guide step | Build / location | Expected | Observed / evidence |
|---|---|---|---|
| Windows split-DNS | Alex workstation + VPN | `.vcf.home.arpa` uses `10.100.80.10`; public names keep their normal resolver | Pending fresh run; previous `Resolve-DnsName` result for vCenter was successful. |
| Forward/reverse pair | Internal resolver `10.100.80.10` | vCenter FQDN → `10.100.10.21` → same FQDN | PTR result pending. |
| Component consistency | One trusted internal host plus selected components | Same forward/reverse result from each relevant resolver context | Pending. |
| ESX time | `esx01.vcf.home.arpa` / ESX 9.0.2 | `10.100.80.10` configured and selected, synchronization evidence and small clock difference | Pending fresh run; record exact commands supported by this build. |
| Management appliances | vCenter / VCF components | Time sources and UTC time agree closely | Pending. |

## Local validation

- Strict content validation: 70 lessons / 151,034 words, 615 questions, 24 guides, 105 diagrams; 0 errors and 0 warnings.
- Unit tests: 23/23 passed.
- Typecheck and production build: passed.
- Browser smoke: 15 routes passed with no console errors, including `/learn/dns-ntp-dependencies` and `/labs/lab-verify-vcf-dns-ntp`.
- Visual review: the lesson renders as standalone theory; the guide renders separately under **Ghiduri practice** with numbered UI paths, confirmed values, explicit discovery placeholders and the official ESX Host Client figures.
- Follow-up requirement from Alex: practical guides are complete UI-first runbooks. The pilot now includes exact vSphere Client, ESXi Host Client and VAMI navigation, field names, stop-before-save points and official ESX 9.x UI figures.

## Out of scope

- No DNS/NTP reconfiguration, service restart, firewall change or infrastructure mutation.
- No migration of the other 69 lesson bodies in this batch.
- No replacement of internal `lab` schema/state/route identifiers.
- No credentials, tokens or unredacted management screenshots.
- No claim that practice-item distribution represents official exam weighting.
