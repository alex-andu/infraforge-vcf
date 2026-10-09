# THEORY-ESX-HOST-MANAGEMENT-STANDARD-09

## Status

Complete with checks passed on `content/theory-esx-host-management-standard`, based on `a123c30`.

## Scope

Start the vSphere Core migration with `esx-architecture-host-management`:

- expand abbreviations at first learner-facing use;
- explain VMkernel, hostd/vpxa, FDM and lockdown mode through operation, dependencies, capabilities, limits, management surfaces and exam relevance;
- convert direct-host registration and configuration procedures into ownership and state models;
- remove embedded lab blocks while retaining both separate guides in metadata;
- preserve the original ESX architecture diagram and official VCF cluster-model figure;
- add a genuine Broadcom interface image associated with KB 442933 and retain internal provenance.

## Source evidence

Broadcom KB 442933 was rechecked on 2026-10-09. It documents the VCF 9 host-addition workflow, the Add Unassigned Hosts management-vCenter path and the SDDC Manager path required when that option is unavailable in a workload-domain vCenter.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass, including the official Broadcom figure.
- Changed files pass secret and diff checks before feature-branch push.
