# THEORY-HYPERVISORS-ESX-STANDARD-05

## Status

Complete with checks passed on `content/theory-hypervisors-esx-standard`, based on `357a38a`.

## Scope

Migrate `hypervisors-and-esx` as the first Virtualization Foundations lesson:

- expand abbreviations at first learner-facing use;
- explain hypervisor, ESX/VMkernel, VMM and VMware Tools through purpose, operation, dependencies, capabilities, limitations, management surfaces, mistakes and exam relevance;
- replace the embedded installation runbook with a conceptual host-state flow;
- remove the embedded lab block while retaining the two separate practical-guide links in metadata;
- preserve the original type-1/type-2 diagram and objective 2.2 coverage.

## Source evidence

Broadcom KB 312100 was rechecked on 2026-10-09 and confirms that virtual hardware version 22 can be created, edited and run on ESX 9.0, while ESXi 8.0 Update 2/3 supports version 21 and does not support version 22.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
