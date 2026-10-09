# THEORY-REMAINING-MODULES-STANDARD-26

## Status

Complete with checks passed on `content/theory-remaining-modules-standard`, based on `42a90ac`.

## Scope

- Complete the standalone-theory migration for the 40 remaining lessons in phases p06 through p15.
- Remove embedded execution blocks while preserving practical-guide relationships in lesson metadata.
- Label configuration sections as decision, ownership, dependency and evidence models; keep exact click paths, values, validation and rollback in the linked guides.
- Apply the agreed first-use expansion convention for common infrastructure abbreviations.
- Preserve existing lesson-specific theory, diagrams, official VMware/Broadcom figures, scenarios, incidents and exam mappings.

## Acceptance

- No lesson contains an embedded `## Lab` section.
- Strict content validation, tests, typecheck and production build pass.
- Browser smoke covers every affected lesson route; representative modules receive visual review.
- Changed files pass secret and diff checks before push.
- Create one cumulative pull request containing the complete theory migration.
