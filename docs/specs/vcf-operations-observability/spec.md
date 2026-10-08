# VCF Operations observability question-depth package

Package ID: `OPS-OBSERVE-01`

Branch: `content/vcf-operations-observability`

Status: complete

## Outcome

Reinforce three already-developed VCF Operations lessons whose exam items were below the internal question target:
`4.3.1` tool selection for logs versus network operations, `4.3.3` metrics versus properties and `4.3.5` dashboard
creation/sharing. Add seven scenario-driven questions without duplicating the existing theory or merging laboratories
into lesson text.

## Implementation

- Add tool-selection, flow/path, log-search and deployment-model scenarios for `4.3.1`.
- Add classification and audit scenarios for metrics, properties and super metrics for `4.3.3`.
- Add dashboard interaction, sharing and permission-scope scenarios for `4.3.5`.
- Regenerate the item-level report; expected result is 48/59 items at target and 11 below it.

## Acceptance

- Strict content validation returns zero errors and warnings and maps 650/650 tagged questions.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the linked lessons, Exam Prep and representative questions without console errors.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict validation returned 0 errors and 0 warnings with 650/650 tagged questions mapped;
23/23 unit tests, typecheck and production build passed. Browser smoke covered 15 main routes plus the three linked
lessons, Exam Prep and two representative questions with no console errors.
