# THEORY-CLUSTERS-HA-DRS-STANDARD-08

## Status

Complete with checks passed on `content/theory-clusters-ha-drs-standard`, based on `d040f81`.

## Scope

Complete the Virtualization Foundations migration with `clusters-ha-drs-intro`:

- expand abbreviations at first learner-facing use;
- explain HA, DRS, admission control and resource pools through operation, dependencies, capabilities, limits, management surfaces, mistakes and exam relevance;
- retain the original HA/DRS diagram and official Broadcom VCF cluster-model figure;
- replace the embedded creation procedure with configuration ownership and operational evidence;
- remove the embedded lab block while retaining the separate vCenter guide in metadata;
- preserve objective 2.2 and the VCF domain-cluster relationship.

## Source evidence

Broadcom KB 391137 was rechecked on 2026-10-09 and confirms DRS initial placement, vMotion load balancing, automation levels, migration sensitivity and affinity-rule behavior. The linked vSphere 9 availability documentation remains the canonical HA source in lesson metadata.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- Browser smoke and visual review pass for the rendered lesson.
- Changed files pass secret and diff checks before feature-branch push.
