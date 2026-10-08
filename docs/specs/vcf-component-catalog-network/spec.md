# VCF-COMPONENT-CATALOG-NETWORK-02

## Status

Complete locally with checks passed on `content/vcf-component-catalog-network`, based on pushed core-catalog commit `ee7c52dad26a0e9aab303b97cc7e67c8b8b5e6c8`.

## Goal and scope

Apply the expanded component profile to the main networking and external network-service dependencies:

- NSX Manager
- NSX Edge cluster
- vSphere Distributed Switch
- DNS service
- NTP service
- physical data center network

Each profile covers purpose, operation, dependencies, capabilities, limitations, management surfaces, failure impact, verification, common mistakes and exam relevance. Existing component IDs, relationships, diagrams, lessons and guide links remain stable.

## Acceptance

- Strict content validation, tests, typecheck and build pass.
- Focused browser checks render an NSX and an external-dependency profile without console errors.
- Visual review confirms the detail panel and existing relationship diagrams remain usable.
- Secret scan passes; push only the feature branch.

## Next catalog scope

VCF Automation, Identity Broker, Operations for logs/networks/HCX and Supervisor, followed by the fleet/domain constructs.
