# THEORY-VSPHERE-HA-STANDARD-12

## Status

Complete with checks passed on `content/theory-vsphere-ha-standard`, based on `437989e`.

## Scope

- Expand abbreviations at first learner-facing use.
- Explain FDM, primary election, heartbeat channels and admission control through responsibilities, dependencies, capabilities and limits.
- Keep failure classification, vSAN behavior, VMCP and restart ordering aligned with the official sources already recorded in the lesson.
- Replace exact click instructions with design decisions, management surfaces and evidence.
- Remove the embedded lab block while retaining the separate guide in metadata.
- Preserve the original HA failure/restart diagram.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
