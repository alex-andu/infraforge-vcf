# THEORY-VCENTER-ARCHITECTURE-STANDARD-10

## Status

Complete with checks passed on `content/theory-vcenter-architecture-standard`, based on `1f67ff5`.

## Scope

Migrate `vcenter-architecture-inventory` to the standalone-theory standard:

- expand abbreviations at first learner-facing use;
- explain vCenter, SSO domains, inventory hierarchy and vCLS through operation, dependencies, capabilities, limits, management surfaces and exam relevance;
- convert the deployment walkthrough and click-path configuration table into state, ownership and evidence models;
- remove the embedded lab block while retaining the separate vCenter guide in metadata;
- preserve the original service/inventory diagram and both official Broadcom figures;
- retain the release-specific ELM and vCLS deprecation caveats from the official vSphere 9 sources listed in the lesson.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
