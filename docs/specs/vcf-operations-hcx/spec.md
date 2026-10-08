# VCF Operations HCX candidate-profile package

Package ID: `OPS-HCX-FOUNDATIONS-01`

Branch: `content/vcf-operations-hcx-foundations`

Status: complete on feature branch; real-lab validation pending

## Outcome

Close the remaining candidate-profile content gap for VCF Operations HCX without changing the official 59-item map.
Provide standalone theory, a control/data-plane diagram, an official Broadcom figure, terminology, scenario questions
and a separate complete installation/mobility guide that can be validated after a second supported site is available.

## Verified source facts

- HCX supports migration, network extension and workload rebalancing within and across VCF/vSphere environments.
- The source contains workloads and initiates site-pair, extension and migration operations. A private-cloud destination
  requires supported vSphere and NSX; source NSX is optional except where the selected extension requires it.
- HCX Manager appliances form Site Pairs for management/authentication/orchestration. Network Profiles define backing
  networks and L3/IP-pool properties. Compute Profiles select services, clusters, placement and Network Profiles.
  Creating a Service Mesh deploys and connects the data-plane appliances.
- HCX-IX handles encrypted replication/vMotion migration and traffic engineering. HCX-NET-EXT bridges selected Layer
  2 networks and preserves IP/MAC identity. Sentinel appliances support non-vSphere OS Assisted Migration.
- Bulk is parallel and schedulable with reboot-like cutover; HCX vMotion is live and designed for one VM at a time;
  Cold moves a powered-off VM; RAV combines parallel/scheduled replication with zero-downtime state transfer; OSAM
  moves supported non-vSphere guests; Direct orchestrates native cross-vCenter vMotion.
- The documented installation order is destination manager/profiles, source manager, Site Pair, source profiles and
  Service Mesh. Destination accepts source-initiated tunnels.

These facts and UI paths were checked against Broadcom TechDocs for VCF 9.0 on 2026-10-08.

## Implementation

- Add `vcf-operations-hcx` to the extended Operations curriculum and a dedicated mastery topic.
- Add a full lesson using the standalone-theory contract and verified UI paths.
- Add one original interactive diagram separating Site Pair control from Service Mesh data paths.
- Embed the official Broadcom Compute Profile concept figure with attribution.
- Add nine glossary entries and an Architecture Explorer component.
- Add six candidate-profile questions covering architecture, order, requirements, migration choice, extension and
  troubleshooting. They remain outside numbered objective-item counts by design.
- Add a separate ten-step guide from design evidence through managers, profiles, Site Pair, Service Mesh, optional
  test extension, disposable-VM migration, acceptance and cleanup.

## Lab boundary

Alex's inventory documents one VCF 9.0.2 environment and no HCX, second vCenter, destination NSX capacity, entitlement,
OVA or appliance IP pools. The guide is therefore **PREPARED — NOT YET LAB-VALIDATED** and uses mandatory discovery
variables. It performs no infrastructure action. Credentials, SSO client secrets, tokens and raw certificates are
runtime inputs and are excluded from evidence.

## Acceptance

- Strict content validation returns zero errors and warnings.
- Official 59-item coverage remains 59/59 at target; HCX questions are clearly candidate-profile additions.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the new lesson, guide, Architecture Explorer, Exam Prep and representative questions.
- The original diagram, official figure, prepared-state warning and representative guide steps receive visual review.
- Secret scan passes before automatic feature-branch publication.

## Validation result

- Strict content validation: 72 lessons / 161,862 words, 683 questions, 25 guides, 10 incidents, 279 glossary terms,
  116 command/API entries, 24 Architecture Explorer components, 111 diagrams and 3 scenarios; zero errors and warnings.
- Exam mapping: 674/674 objective-tagged questions mapped; all 59 items meet the internal five-question target. The
  six HCX questions remain clearly outside the numbered objective allocation alongside three exam-strategy questions.
- Automated checks: 23/23 unit tests, TypeScript project build and Vite production build passed.
- Browser smoke: 15 main routes plus the HCX lesson, guide, Architecture Explorer, Exam Prep and three representative
  HCX question routes; no console errors.
- Visual review: original control/data-plane diagram, official Compute Profile figure, prepared-state warning,
  destination profiles, Site Pair, Service Mesh, disposable-VM migration and Architecture Explorer component passed.
- No lab action or deployment was performed. The guide remains **PREPARED — NOT YET LAB-VALIDATED**.
