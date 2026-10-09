# THEORY-VSPHERE-PERMISSIONS-STANDARD-11

## Status

Complete with checks passed on `content/theory-vsphere-permissions-standard`, based on `d1c83f2`.

## Scope

Migrate `vsphere-permissions` to the standalone-theory standard:

- expand abbreviations at first learner-facing use;
- explain identity, principal, privilege, role and permission through their responsibilities, dependencies, capabilities and limits;
- clarify inventory inheritance, global-permission scope and the separation between vCenter and other VCF product role models;
- replace exact click instructions with configuration decisions, management surfaces and evidence;
- remove the embedded lab block while retaining the separate guide in lesson metadata;
- preserve the original inheritance diagram and both official Broadcom figures.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
