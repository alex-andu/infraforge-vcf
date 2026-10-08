# VCF Operations network, storage and policy package

Package ID: `OPS-NET-STORAGE-POLICY-01`

Branch: `content/vcf-operations-network-storage-policy`

Status: complete

## Outcome

Close the internal five-question target for exam items `4.3.9` (monitor networks), `4.3.10` (monitor vSAN storage)
and `4.3.11` (configure VCF Operations policies). Deepen the linked theory and convert the relevant guide slices to
the UI-first runbook standard without claiming unobserved lab results.

## Verified source facts

- **Network Operations** exposes core NSX inventory, alerts and health even without the optional networks appliance;
  Business Applications with Flows and Traffic Summary depend on VCF Operations for networks. The page exposes an
  **Install Operations Network Appliance** action when that capability is absent.
- **Storage Operations** is a centralized vSAN and non-vSAN dashboard. vSAN data requires a vSAN-enabled vCenter
  account that is connected and collecting. Performance diagnostics use a goal, target cluster and time range;
  Troubleshooting fits active workloads, Benchmarking and Optimizing fits new clusters, and reports reach back seven
  days.
- A policy inherits undefined settings from its base. It becomes active only when assigned to an object or custom
  group. Highest priority wins among overlapping assignments, while direct object assignment is the exception and can
  enforce a lower-priority policy.

The facts and UI paths were checked against Broadcom TechDocs for VCF 9.0 on 2026-10-08. The Storage Operations source
URL was corrected to its current location under the vSAN data-source documentation.

## Implementation

- Expand the network lesson with native-versus-flow capability boundaries and an evidence-first investigation path.
- Expand Storage Operations with collection prerequisites, exact diagnostic controls and an interpretation sequence.
- Expand policy theory with the create, inherit, override, assign, precedence and target-object validation workflow.
- Add one original interactive decision diagram connecting network, storage, integration and log evidence.
- Add eight scenario-oriented questions: two for `4.3.9`, three for `4.3.10` and three for `4.3.11`.
- Rewrite the matching Network Operations, Storage Operations and policy guide steps around the documented lab values.
  Mark both guides **PREPARED — NOT YET LAB-VALIDATED** and preserve read-only checkpoints and cleanup.

## Lab boundary

The supplied inventory confirms VCF Operations (`ops01.vcf.home.arpa`), its collector, NSX and the vSAN OSA
management cluster. It does not list VCF Operations for networks. Guide steps therefore distinguish native NSX
inventory/health from unavailable flow analytics and never claim observed health, latency or policy behavior. Alex's
run provides exact build labels, current values and sanitized evidence.

## Acceptance

- Strict content validation returns zero errors and warnings and maps every objective-tagged question.
- The regenerated coverage report shows `4.3.9`, `4.3.10` and `4.3.11` at five questions each.
- Unit tests, typecheck and production build pass.
- Browser smoke covers the two lessons, two guides, Exam Prep and representative new questions with no console errors.
- Diagram and guide pages receive visual review; links and current documentation state are checked.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict validation returned 0 errors and 0 warnings with 658/658 objective-tagged questions
mapped; the report reached 51/59 items at target. All 23 unit tests, typecheck and production build passed. Browser
smoke covered 15 main routes plus both lessons, both guides, Exam Prep and three representative new questions with no
console errors. The original diagram, prepared-status warning and policy runbook step received visual review.

Real-lab behavior remains pending Alex's guide execution.
