# VCF Automation provider onboarding and governance gap closure

Package ID: `VCFA-GOV-01`

Branch: `content/vcfa-governance-workloads`

Status: complete

## Problem and outcome

After the organizational-networking and content-lifecycle packages, five connected VCF Automation items remained below
the internal question target: `4.4.3` regions, `4.4.4` multi-organizational tenancy, `4.4.5` provider networking,
`4.4.7` organization-administrator tasks and `4.4.11` organizational governance policies. The lessons had sound
concepts, but several provider and policy procedures were summarized rather than expressed as complete VCF 9.0 UI
workflows.

This package turns those items into one provider-to-tenant onboarding sequence, adds an interactive dependency diagram
and nine item-tagged questions, and upgrades the existing prepared guide with exact region, networking, organization and
policy paths. The guide remains **PREPARED — NOT YET LAB-VALIDATED** because VCF Automation and Supervisor are not
present in the current lab.

## Verified source facts

Checked against the official Broadcom VCF 9.0 TechDocs pages on 2026-10-08:

- A region can combine Supervisors across vCenter instances only when they use one NSX instance and homogeneous
  storage classes, VM classes, Kubernetes versions and IaaS services.
- VCF Automation does not verify storage- or VM-class presence and consistency on every backing vCenter.
- Provider IP spaces are IPv4, can serve several organizations and support default IP, CIDR and maximum-subnet-size
  quotas with organization-specific overrides.
- A VCF Automation 9.0 provider gateway is backed by an active-standby Tier-0 or a linked Tier-0 VRF, and associates
  one or more IP spaces.
- Edge clusters are discovered from registered NSX Managers; changes are made in NSX and synchronized into Automation.
- An All Apps organization receives region/Supervisor zones, CPU/memory limits and reservations, VM/storage classes and
  one first administrator. The organization name forms its URL, and it must be disabled before deletion.
- Organization policies include approval, day-2 action, lease and IaaS resource policies; policy scope can include
  projects and deployment criteria, and new policies apply to current and future matching deployments.
- Policy Definition stores rules, Policy Assignments shows effective application and Policy Enforcement provides the
  dated audit trail.

## Implementation

- Expand provider theory with exact region, IP-space, provider-gateway, edge-sync and All Apps organization workflows.
- Add `d11-vcfa-provider-onboarding` to show the dependency chain from infrastructure through governed tenant use.
- Expand governance theory with the exact policy workflow, policy lifecycle and operational views.
- Upgrade the existing VCF Automation guide's region, provider-networking, organization and governance steps to the
  UI-first runbook standard, with validation evidence and expected outcomes.
- Add nine questions across ordering, multi-select, troubleshooting, design and matching formats.
- Regenerate `docs/EXAM_COVERAGE.md`; expected result is 45/59 items at the target and 14 below it, with no remaining
  gaps in objective 4.4.

## Acceptance

- Strict content validation returns zero errors and warnings.
- Coverage reports 643/643 objective-tagged questions mapped and every item in objective 4.4 at or above 5/5.
- Unit tests, typecheck and production build pass.
- Browser smoke covers both updated lessons, the prepared guide, Exam Prep and representative new questions without
  console errors.
- Visual QA confirms the onboarding diagram, the expanded provider/policy guide steps and exact objective chips.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict content validation returned 0 errors and 0 warnings; 643/643 objective-tagged
questions were mapped and every objective 4.4 item reached the internal target; 23/23 unit tests, typecheck and the
production build passed. Browser smoke covered 15 main routes plus both updated lessons, the prepared guide, Exam Prep
and two representative questions with no console errors. Visual QA confirmed the provider-onboarding diagram, expanded
region and policy guide steps, the **PREPARED — NOT YET LAB-VALIDATED** status and the exact objective chip.
