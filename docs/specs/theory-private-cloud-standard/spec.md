# THEORY-PRIVATE-CLOUD-STANDARD-02

## Status

Complete with checks passed on `content/theory-private-cloud-standard`, based on `7004a78`.

## Scope

Migrate `private-cloud-and-sddc` to the agreed learning standard:

- define acronyms at first learner-facing use;
- explain SDDC, private cloud, hypervisor and the VCF control/consumption layers through their role, operation, dependencies, capabilities, limitations, management surfaces and exam relevance;
- preserve the original layer diagram and official Broadcom fleet-design figure;
- remove the non-runnable embedded lab section;
- retain exam objective 2.1 and official VCF 9 use cases as the scope boundary.

## Source evidence

The existing official VCF 9 documentation sources remain canonical. The VMware by Broadcom VCF 9 use-cases article was rechecked on 2026-10-09 and still identifies infrastructure modernization, unified cloud experience, and secure/resilient platform outcomes.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- The rendered lesson has no browser console error and passes visual review.
- The feature branch passes a changed-file secret scan before push.
