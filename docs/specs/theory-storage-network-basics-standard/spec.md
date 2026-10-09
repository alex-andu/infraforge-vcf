# THEORY-STORAGE-NETWORK-BASICS-STANDARD-07

## Status

Complete with checks passed on `content/theory-storage-network-basics-standard`, based on `b177bce`.

## Scope

Migrate `storage-network-virtualization-basics` to the standalone-theory standard:

- expand abbreviations at first learner-facing use;
- explain datastores, VMFS/NFS/vSAN, vNIC/vmk/vmnic and vSS/VDS/NSX through purpose, operation, dependencies, limits, management surfaces and exam relevance;
- retain the original storage/network path diagram;
- replace click-path configuration with ownership and configuration intent;
- remove the embedded lab block while retaining the separate guide in metadata;
- preserve objective 2.2 and the verified VCF 9 vVols deprecation caveat.

## Source evidence

Broadcom KB 401070 was rechecked on 2026-10-09. It states that vVol capabilities are deprecated beginning with VCF 9.0 and VVF 9.0 and are planned for discontinuation in future releases.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
