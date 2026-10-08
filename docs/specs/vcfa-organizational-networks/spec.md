# VCF Automation organizational networking gap closure

Package ID: `VCFA-ORG-NET-01`

Branch: `content/vcfa-organizational-networks`

Status: complete

## Problem and outcome

The item-level coverage report identified `4.4.8` — configure organizational networks in VCF Automation — as the
only official item with zero dedicated questions. The existing theory mentioned VPCs but did not explain the three
address scopes, connectivity profiles, IP quotas, VPC sharing boundaries or the exact organization-portal workflow.

This package develops that theory, adds a dedicated interactive architecture diagram and five item-tagged questions,
and upgrades the networking portion of the existing practical guide with exact VCF 9.0 UI paths. The guide remains
**PREPARED — NOT YET LAB-VALIDATED** because VCF Automation and Supervisor are not present in the current lab.

## Verified source facts

Checked against the official Broadcom VCF 9.0 TechDocs pages on 2026-10-08:

- A VPC is an isolated network domain that can be associated with one or more namespaces.
- Private VPC CIDRs are local to the VPC and require NAT outside it; they need not be unique across VPCs.
- Private TGW IPv4 blocks are organization-managed and advertised within the organization and its transit gateway.
- External blocks are provider-managed and support external connectivity, including outbound SNAT for private workloads.
- A connectivity profile selects one region plus up to five external and five private TGW IPv4 blocks.
- Editing a connectivity profile affects northbound connectivity for every VPC that uses it.
- A VPC selects an allocated region and connectivity profile, defines private VPC CIDRs and can receive IP quotas.
- IP quotas can govern external or private TGW address consumption, CIDR counts and maximum subnet size.

Sources are linked in the lesson and guide:

- `Managing Networking in VCF Automation`
- `Create a Connectivity Profile in VCF Automation`
- `Create a Virtual Private Cloud in VCF Automation`
- `Managing IP Address Blocks and IP Quotas in VCF Automation`

## Implementation

- Expand `vcf-automation-org-admin` with the object model, three address scopes, exact workflow, failure cases, exam
  traps and a source-backed warning about connectivity-profile blast radius.
- Add `d11-vcfa-org-networking` to show provider allocation, organization address management, profiles, VPCs and
  namespace association.
- Add glossary entries for VCF Automation connectivity profiles and IP quotas.
- Add five questions mapped to `4.4.8`, spanning concept, configuration, ordering, troubleshooting and design.
- Expand the `lab-vcfa-organization-setup` networking step into a complete UI-first procedure and state its validation
  status visibly.
- Regenerate `docs/EXAM_COVERAGE.md`; expected result is 59/59 items represented, 37/59 at the five-question target and
  22 below target.

## Acceptance

- Strict content validation returns zero errors and warnings.
- Coverage reports 622/622 objective-tagged questions mapped and `4.4.8` at 5/5.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the updated lesson, practical guide, Exam Prep and a new tagged question without console errors.
- Visual QA confirms the diagram, guide status and objective chip.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict content validation returned 0 errors and 0 warnings; 622/622 objective-tagged
questions were mapped and `4.4.8` reached 5/5; 23/23 unit tests, typecheck and the production build passed. Browser
smoke covered 15 main routes plus the updated lesson, prepared guide and `/exam/question/vcfa-org-013` with no console
errors. Visual QA confirmed the organization-networking diagram, the **PREPARED — NOT YET LAB-VALIDATED** warning and
the `Obiectiv 4.4.8` chip.
