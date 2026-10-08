# VCF Automation use cases and content lifecycle gap closure

Package ID: `VCFA-CONTENT-01`

Branch: `content/vcfa-use-cases-content`

Status: complete

## Problem and outcome

The item-level coverage report showed three related VCF Automation items with only one dedicated question each:
`4.4.1` (identify a VCF Automation use case), `4.4.6` (configure a provider content library) and `4.4.9`
(create and manage content). Existing lessons described the product at a high level but did not connect provider libraries,
organization libraries, VM images, catalogs and projects into one lifecycle or provide the exact UI workflows.

This package develops that theory as one coherent content-lifecycle unit, adds an interactive diagram and twelve
item-tagged questions, and expands the existing VCF Automation practical guide with complete provider and organization
workflows. The guide remains **PREPARED — NOT YET LAB-VALIDATED** because VCF Automation and Supervisor are not present
in the current lab.

## Verified source facts

Checked against the official Broadcom VCF 9.0 TechDocs pages on 2026-10-08:

- VCF Automation provides organization-scoped self-service for virtual machines, Kubernetes resources, networking,
  volumes and extensible services under provider governance.
- A provider content library is read-only for organizations and is automatically available to organizations with a
  quota in a selected region.
- VCF Automation creates backing vCenter libraries per selected region, chooses a publisher and uses subscriptions for
  the remaining libraries; vCenter-to-vCenter connectivity is therefore required.
- Organization libraries are private to an organization, consume its storage quota and must be made available to each
  required region explicitly.
- Namespace scope is chosen when an organization library is created: all current and future namespaces, or selected
  namespace classes.
- Supported organization-library content types are ISO, OVA and OVF. Each uploaded image receives a unique VM image
  identifier used by blueprints.
- An image is published to a catalog for project consumption; OVF content can be published directly, while ISO content
  cannot.

Sources are linked in the lessons and guide:

- `Managing Content Libraries in VCF Automation`
- `Create and Manage a Provider Content Library`
- `Create and Manage an Organization Content Library`
- `Create and Publish VM Images`

## Implementation

- Expand the architecture lesson with use-case signals, product boundaries, scenarios and exam traps for `4.4.1`.
- Expand provider tenancy/regions with the backing-library topology, region and storage-class choices, migration,
  refresh behavior and operational failure cases for `4.4.6`.
- Expand organization administration with library scope, quota accounting, supported image formats, VM image IDs and
  catalog publication for `4.4.9`.
- Add `d11-vcfa-content-lifecycle` to connect provider libraries, organization libraries, namespace scope, VM images,
  catalogs and projects.
- Add glossary entries for organization content libraries and VM image identifiers.
- Add twelve questions across single-choice, multi-select, matching, ordering, troubleshooting and design formats.
- Add a complete UI-first content-library section to `lab-vcfa-organization-setup`, retaining the visible unvalidated
  status and discovery variables for environment-specific choices.
- Regenerate `docs/EXAM_COVERAGE.md`; expected result is 40/59 items at the five-question target and 19 below it.

## Acceptance

- Strict content validation returns zero errors and warnings.
- Coverage reports 634/634 objective-tagged questions mapped, with `4.4.1`, `4.4.6` and `4.4.9` at 5/5.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the three updated lessons, prepared guide, Exam Prep and representative new questions without
  console errors.
- Visual QA confirms the content-lifecycle diagram, guide status and exact objective chips.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict content validation returned 0 errors and 0 warnings; 634/634 objective-tagged
questions were mapped and `4.4.1`, `4.4.6` and `4.4.9` reached 5/5; 23/23 unit tests, typecheck and the production
build passed. Browser smoke covered 15 main routes plus the three updated lessons, prepared guide, Exam Prep and two
representative questions with no console errors. Visual QA confirmed the content-lifecycle diagram, the complete
content-library guide step, the **PREPARED — NOT YET LAB-VALIDATED** warning and the `Obiectiv 4.4.6` chip.
