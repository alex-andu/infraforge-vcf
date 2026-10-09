# VCF-COMPONENT-CATALOG-DOMAINS-04

## Status

Complete with checks passed on `content/vcf-component-catalog-domains`, based on pushed services-catalog commit `2b3c5ed472c51e97d79377e50b8b9840c8766018`.

## Scope

- VMware Cloud Foundation Fleet
- VMware Cloud Foundation Instance
- VMware Cloud Foundation Management Domain
- Virtual Infrastructure Workload Domain

This final catalog batch explains each structural boundary's purpose, operation, dependencies, capabilities, limits, management surfaces, failure impact, verification, common mistakes and exam relevance. It emphasizes the hierarchy `fleet > instance > domain` and separates management-plane scope from workload data-plane continuity.

## Acceptance

- All 24 Architecture Explorer components use the expanded teaching profile.
- Strict content validation, tests, typecheck and production build pass.
- Focused browser checks cover Fleet and VI Workload Domain profiles.
- Visual review confirms the expanded detail panel remains readable with existing diagrams.
- Secret scan passes and only the feature branch is pushed.

## Next content scope

Migrate one foundational theory lesson to the agreed acronym and component-explanation standard, without reintroducing an embedded lab.
