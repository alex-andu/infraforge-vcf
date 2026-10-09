# THEORY-CPU-MEMORY-STANDARD-06

## Status

Complete with checks passed on `content/theory-cpu-memory-standard`, based on `47b413a`.

## Scope

Migrate `cpu-memory-virtualization` to the standalone-theory standard:

- expand abbreviations at first learner-facing use;
- explain vCPU, CPU overcommitment, guest/machine memory and reclamation through operation, dependencies, capabilities, limits, management surfaces and exam relevance;
- retain the original scheduling diagram and official Broadcom memory-mapping figure;
- remove the embedded lab block while retaining the associated practical guide in metadata;
- preserve objective 2.2 and the existing VCF 9 Memory Tiering boundary.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
