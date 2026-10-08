# VCF foundation and deployment coverage closure package

Package ID: `VCF-FOUNDATION-DEPLOYMENT-GAPS-01`

Branch: `content/vcf-foundation-deployment-gap-closure`

Status: complete

## Outcome

Close the five isolated official-exam items that remained below the internal five-question target after every VCF
Operations and VCF Automation item reached it: Private Cloud principles (`2.1.1`), Private Cloud use cases (`2.1.2`),
VM management through vCenter (`2.2.4`), vSAN cluster deployment (`2.3.3`) and post-installer components (`4.1.4`).

## Verified source facts

- VCF capabilities span Build, Manage, Operate and Consume job functions; a private cloud combines resource
  virtualization with a governed, measured and automated consumption model.
- VCF 9 use cases group into infrastructure modernization, unified cloud experience and secure and resilient platform.
  The primary theme follows the requested business outcome even when one component supports several themes.
- vCenter VM administration includes creating/deploying VMs, templates and clones, content libraries, hardware and
  options, snapshots, upgrades and troubleshooting. Snapshot use remains a temporary lifecycle action, not backup.
- A standard vSAN cluster requires at least three ESX hosts that contribute capacity. Devices, drivers and firmware
  must be certified; a host in the vSAN cluster cannot participate in another cluster.
- After automated VCF Installer deployment, platform completion includes Operations for logs, Operations for networks
  for VCF, and Operations orchestrator. A dedicated three-node VCF Identity Broker is optional. Platform type and
  Simple/HA model determine the appliance counts.

The official VCF/vSphere documentation and VMware by Broadcom use-case article were checked on 2026-10-08.

## Implementation

- Add a business-outcome decision table to the Private Cloud use-case theory.
- Add a controlled VM lifecycle table for provisioning, snapshots, migration, hardware changes and retirement.
- Add compatibility, cluster, network and storage-claim gates to the vSAN deployment workflow.
- Add the exact post-installer completion matrix for VCF Simple/HA and vSphere Foundation.
- Correct the existing post-installer question from two to three mandatory top-level completion components.
- Add nine scenario-oriented questions: five for `2.1`, one for `2.2.4`, one for `2.3.3` and two for `4.1.4`.

## Practical-guide boundary

This package closes measured theory/question gaps and does not claim new real-lab observations. Existing separate
guides already cover VM templates, vSAN deployment/planning and VCF deployment; their environment-specific execution
and incremental UI-first migration remain governed by `docs/CURRENT_STATE.md`. No platform or VM change is performed.

## Acceptance

- Strict content validation returns zero errors and warnings and maps every objective-tagged question.
- The regenerated report shows all 59 official items at the internal five-question target.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the four updated lessons, Exam Prep and representative new questions without console errors.
- New tables and representative questions receive visual review.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict validation returned 0 errors and 0 warnings with 674/674 objective-tagged questions
mapped; the reproducible report reached 59/59 items at the internal five-question target. All 23 unit tests, typecheck
and production build passed. Browser smoke covered 15 main routes plus the four updated lessons and four representative
new questions with no console errors. All four theory tables and the corrected post-installer question received visual
review.

No infrastructure action or new real-lab validation was performed.
