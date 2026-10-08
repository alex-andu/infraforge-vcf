# VCF-COMPONENT-CATALOG-CORE-01

## Status

Complete locally with checks passed on `content/vcf-component-catalog-core`, based on `fec1e3817ac10c31b36f70660a33b04ba4ca3b48`.

## Goal

Turn the existing Architecture Explorer into the central component catalog requested by Alex. Every completed profile explains the component's full name where the product has one, purpose, operation, dependencies, capabilities, limitations, management surfaces, failure impact, verification, common mistakes and exam relevance.

## First bounded batch

- VCF Installer
- SDDC Manager
- VCF Operations
- VCF Operations fleet management appliance
- VCF Operations collector
- vCenter
- ESX host
- vSAN

The remaining 16 architecture components keep their existing fields and will be migrated in later bounded batches.

## Implementation

- Extend the architecture schema with optional profile fields so existing component IDs and content remain compatible.
- Render the new fields in the existing component detail panel and preserve the complete/focus diagrams and failure simulation.
- Keep English learning content and Romanian interface labels.
- Use established, previously verified VCF 9 facts already present in the repository's lessons, architecture data and source manifests; do not add lab-IP dependencies.

## Acceptance

- Strict content validation, tests, typecheck and production build pass.
- `/architecture/<component-id>` renders the expanded component name and all profile sections without overflow or console errors.
- Visual review covers at least one management component and one infrastructure component.
- Secret scan passes and only the feature branch is pushed.

## Follow-up batches

1. NSX and networking components.
2. VCF Automation, Identity Broker and optional Operations products.
3. Fleet/domain constructs, Supervisor and external dependencies.
4. Bounded lesson migration applying first-use acronym expansion and the matching term explanation.
