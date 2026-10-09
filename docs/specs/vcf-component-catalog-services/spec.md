# VCF-COMPONENT-CATALOG-SERVICES-03

## Status

Complete locally with checks passed on `content/vcf-component-catalog-services`, based on pushed networking-catalog commit `0f39c77862ff967d8a5f4b0e16838f735ffa8a8f`.

## Scope

- VCF Automation
- VCF Operations HCX
- VCF Identity Broker
- VCF Operations for logs
- VCF Operations for networks
- vSphere Supervisor

The expanded profile explains purpose, operation, dependencies, capabilities, limits, management surfaces, failure impact, verification, common mistakes and exam relevance. HCX and Kubernetes content remains concise because it is candidate-profile context rather than a numbered deep-product objective.

## Acceptance

- Strict content validation, tests, typecheck and build pass.
- Focused browser checks cover one self-service component and one optional Operations product.
- Visual review confirms existing relationship diagrams and the expanded detail panel remain usable.
- Secret scan passes and only the feature branch is pushed.

## Next catalog scope

The four remaining logical constructs: VCF Fleet, VCF Instance, Management Domain and VI Workload Domain.
