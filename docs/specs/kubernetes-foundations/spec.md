# Kubernetes foundations for vSphere Supervisor

Package ID: `K8S-FOUND-01`

Module: `p08-workload-domains` / `m08-wld`

Status: implemented and validated on `content/kubernetes-foundations`

## Problem and outcome

The curriculum already explains Supervisor activation at an advanced level, but the candidate profile expects
foundational Kubernetes knowledge. A learner can reach the existing lesson without a reliable model for desired
state, controllers, Pods, Deployments, Services, storage claims or the difference between Supervisor and VKS.

This package adds one standalone foundation lesson before the advanced lesson. It teaches upstream concepts first,
then maps them to Supervisor. It does not repeat the activation wizard and does not create a runnable guide for
infrastructure that the sanitized inventory does not show.

## Scope

- Add `kubernetes-foundations-for-supervisor` to `m08-wld`, immediately before `supervisor-in-workload-domain`.
- Use all 17 standalone-theory sections and no embedded `Lab` section.
- Add an original interactive diagram showing the Supervisor and VKS API boundaries.
- Embed the official Kubernetes component diagram with source attribution.
- Add glossary entries for the minimum generic Kubernetes vocabulary used by the lesson.
- Add five questions linked to the new lesson and objectives 4.1 / 4.4.
- Keep the existing advanced Supervisor lesson and `lab-enable-supervisor` unchanged.

## Practical-guide gate

The supplied lab inventory lists a single-node management domain and no VI Workload Domain or active Supervisor.
Therefore this package adds no practical guide and makes no runtime-health claim. A future guide requires confirmed:

1. target Workload Domain and vCenter build;
2. Supervisor activation state and topology;
3. networking/load-balancer model and reachable API endpoint;
4. vSphere Namespace and test identity/role;
5. VKS availability and a disposable namespace/cluster scope;
6. approved rollback and resource budget.

Once those prerequisites exist, the guide must follow the repository's UI-first runbook standard and record
sanitized observed evidence. Conceptual `kubectl` examples in the theory lesson are read-only and are not represented
as steps already validated in Alex's lab.

## Source and visual record

| Material | Role | Handling |
|---|---|---|
| Kubernetes official concepts pages | Upstream definitions and component responsibilities | Linked in lesson frontmatter |
| Official Kubernetes component SVG | Architecture orientation | Remote embed with caption/source; text and original diagram preserve offline meaning |
| Broadcom VCF 9 Supervisor architecture | vSphere mapping | Linked as primary product source |
| Broadcom VM Service and Namespace Management APIs | Declarative VM and Supervisor object boundaries | Linked as primary API sources |
| `d08-kubernetes-to-supervisor` | Original teaching diagram | Bundled locally and interactive |

No generated product UI is used. No official figure is presented as a screenshot of Alex's environment.

## Acceptance

- Strict content validation returns zero errors and warnings.
- The lesson appears in the correct curriculum order and renders all sections, figure, diagram and quiz.
- Questions resolve to valid lesson sections; glossary and diagram references resolve.
- Unit tests, typecheck and production build pass.
- Browser smoke includes the new lesson route and reports no console error.
- Secret scan finds no credentials or tokens in the change.
- Commit and push occur only on `content/kubernetes-foundations` under the automatic-push policy.

## Validation result

- Strict content validation: 71 lessons / 154,175 words, 620 questions, 24 guides, 106 diagrams; 0 errors and 0 warnings.
- Unit tests: 23/23 passed.
- Typecheck and production build: passed.
- Browser smoke: 15 main routes plus `/learn/kubernetes-foundations-for-supervisor`; no console errors.
- Visual review: curriculum order, title, metadata, all 17 headings and navigation rendered correctly at 1440 × 900.
- Runtime guide: intentionally absent until the practical-guide gate above is satisfied.
