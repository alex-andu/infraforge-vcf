# Official exam-item coverage

Package ID: `EXAM-COVERAGE-01`

Branch: `content/exam-objective-coverage`

Status: implemented and validated locally; publication pending

## Problem and outcome

Questions previously carried only broad objective tags such as `4.3`, although that objective contains fourteen
different official items. A large question count could therefore hide a missing item. This package gives every
official item an explicit repository ID, maps every objective-tagged question to one primary item and produces a
repeatable coverage report.

## Decisions

- IDs such as `4.3.10` are repository ordinals for the exact official item text. They are not Broadcom identifiers.
- Each question has one primary `objectiveItem`. A composite scenario maps to the decision principally graded.
- Five questions per item is an internal quality target, not an official weight or passing rule.
- The three exam-strategy questions without a testable objective remain intentionally unmapped.
- General API/PowerCLI questions already assigned to 4.4 map to `4.4.10` as the nearest explicit automation and
  extensibility item. This approximation is visible in the report and should be rechecked when Broadcom revises the
  guide.
- This batch measures question coverage. A question-linked lesson is useful evidence but does not prove that the
  official item has a complete dedicated theory section; content-gap batches verify and strengthen that separately.

## Implementation

- Convert `content/objectives.yaml` item strings to `{ id, text }` records for all 59 official items.
- Add optional `objectiveItem` to the question schema and expose it in lightweight question metadata.
- Validate that an item exists and belongs to the question's broad objective; warn when an objective-tagged question
  lacks an item.
- Backfill all 617 objective-tagged questions across the question bank.
- Add `npm run content:coverage` and `docs/EXAM_COVERAGE.md`.
- Show item-level coverage on Exam Prep and show the precise item ID on question chips.

## Initial findings

- 617/617 objective-tagged questions mapped.
- 36/59 official items meet the internal five-question target.
- 23 items are below target.
- `4.4.8` (organizational networks) has no dedicated question and is the first direct gap.
- VCF Operations and VCF Automation contain most of the remaining low-count items.
- Foundational Kubernetes and DNS/NTP have dedicated lessons; HCX remains a candidate-profile gap outside the 59
  item ordinals.

## Acceptance

- Strict content validation returns zero errors and warnings.
- Coverage output reports 617/617 mappings and the same 59 item texts as the official-description excerpt.
- The generated Markdown report is stable on a second run.
- Unit tests, typecheck and production build pass.
- Browser smoke covers Exam Prep and a tagged question with no console errors.
- Secret scan passes before automatic feature-branch publication.

## Validation result

Completed on 2026-10-08: strict content validation returned 0 errors and 0 warnings; all 617 objective-tagged
questions were mapped; the Markdown report was byte-stable on regeneration; 23/23 unit tests, typecheck and the
production build passed. Browser smoke covered 15 main routes plus `/exam/question/ops-logs-010` with no console
errors. Visual QA confirmed the item-coverage table and the `Obiectiv 4.3.10` question chip.
