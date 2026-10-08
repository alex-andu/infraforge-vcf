# VCF Operations application monitoring, compliance and drift package

Package ID: `OPS-APP-COMPLIANCE-DRIFT-01`

Branch: `content/vcf-operations-app-compliance-drift`

Status: complete

## Outcome

Close the internal five-question target for exam items `4.3.12` (monitor applications), `4.3.13` (monitor security
hardening and compliance) and `4.3.14` (configure configuration drift). Deepen the linked theory and extend the
separate VCF Operations guide with exact UI workflows while retaining its unvalidated status.

## Verified source facts

- Product-managed Telegraf supports vCenter-managed Virtual Machine objects and physical or unmanaged Endpoint
  objects. UI installation under **Workload Operations > Applications > Manage Telegraf Agents** applies to managed
  VMs; Endpoint installation uses the product-managed helper script. A successful UI install reports **Agent Running**
  and **Install Success**.
- Business Applications are first-class objects with optional tiers. Manual membership is static; models can also be
  discovered or imported. Manual creation is under **Workload Operations > Business Applications**.
- VCF Audit Guide assessment is enabled from **Security > Compliance** on the VMware Cloud Foundation scorecard and
  activates compliance-subtype alert definitions in a selected policy. The scorecard reports percentage score,
  non-compliant objects and violations.
- Configuration Drift covers VCF 9.0+ vCenter instances and eligible vSphere clusters. A vCenter account must use a
  cloud proxy or cloud proxy group. The workflow selects a source and configuration schema, creates a template,
  activates it in policies applied to targets, then runs or schedules detection.
- Drift results distinguish **Not Drifted**, **Drift Detected**, **Drift Check Failed** and **Unavailable**. The detailed
  view compares current vCenter values with configuration-template values, and the downloadable report retains seven
  days by default with a configurable maximum of 30 days.

These facts and UI paths were checked against Broadcom TechDocs for VCF 9.0 on 2026-10-08.

## Implementation

- Expand the lesson with exact compliance activation, Configuration Drift template-policy-execution and managed-agent
  workflows.
- Correct the prior drift wording that implied direct target assignment to a template.
- Update the original interactive diagram to show configuration schema, policy activation and execution.
- Embed the official Broadcom application-monitoring setup figure and identify its inherited Aria label in the caption.
- Add seven scenario-oriented questions: three for `4.3.12`, two for `4.3.13` and two for `4.3.14`.
- Extend the separate Operations guide with product-managed Telegraf, Business Application, VCF compliance and
  Configuration Drift steps, evidence gates, troubleshooting and cleanup.

## Lab boundary

The supplied inventory confirms VCF Operations, `collector01`, `vcenter01` and the management-domain components. It
does not prove a supported disposable application VM, active application-monitoring adapter, enabled VCF scorecard or
configuration template. The guide therefore remains **PREPARED — NOT YET LAB-VALIDATED**. Runtime credentials stay in
the product wizard, potentially disruptive collector or configuration changes require Alex's lab approval, and all
scores, metrics and drift results remain observed evidence rather than assumed values.

## Acceptance

- Strict content validation returns zero errors and warnings and maps every objective-tagged question.
- The regenerated coverage report shows `4.3.12`, `4.3.13` and `4.3.14` at five questions each.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the updated lesson, guide, Exam Prep and representative new questions without console errors.
- The official figure, corrected diagram and new guide slices receive visual review.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict validation returned 0 errors and 0 warnings with 665/665 objective-tagged questions
mapped; the report reached 54/59 items at target and every objective 4.3 item now meets it. All 23 unit tests,
typecheck and production build passed. Browser smoke covered 15 main routes plus the updated lesson, guide and three
representative new questions with no console errors. The official figure, corrected diagram, prepared-status warning
and application/compliance/drift guide steps received visual review.

Real-lab behavior remains pending Alex's guide execution.
