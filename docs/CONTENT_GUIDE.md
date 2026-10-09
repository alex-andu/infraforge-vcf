# InfraForge content authoring guide

All learning content lives in `content/` and is validated by `npm run content:check`.
The UI renders whatever is there; **never** put lesson text in React components.

```
content/
  curriculum.yaml          phases → modules → lesson ids (the reading order)
  topics.yaml              mastery topics (the unit of adaptive tracking)
  objectives.yaml          2V0-17.25 exam objectives (from the official exam guide)
  lessons/<phase-id>/<lesson-id>.md
  questions/<phase-id>.yaml          { questions: [...] }
  labs/<lab-id>.yaml
  incidents/<incident-id>.yaml
  diagrams/<diagram-id>.yaml
  scenarios/<scenario-id>.yaml       design scenarios (decide → compare with recommendation)
  glossary/<phase-id>.yaml           { terms: [...] }
  commands/<phase-id>.yaml           { commands: [...] }
  architecture/<phase-id>.yaml       { components: [...] } for the Architecture Explorer
  homelab/homelab.yaml
  badges/badges.yaml
```

The schema is `src/content/schema.ts` (zod). Read it: it is the source of truth for every field.

## Technical accuracy rules (non-negotiable)

1. **VCF 9.x is the primary reference.** Verify claims against Broadcom TechDocs
   (`https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/...`), Broadcom KB articles,
   the official VCF blog (blogs.vmware.com/cloud-foundation), and the exam guide. Use WebSearch / WebFetch.
2. **Never invent** features, UI paths, commands, API endpoints, ports, limits or minimum host counts.
   If you cannot verify a detail, leave it out or say plainly that it varies and point to the doc.
3. **Never mix generations silently.** Legacy (VCF 5.x / vSphere 8 / NSX-T 3.x / Aria) behaviour goes in a
   `:::legacy` callout. Changes go in a `:::vcf9` callout. Product names follow VCF 9 naming
   (ESX not ESXi when talking about 9.x, VCF Operations not Aria Operations, VCF Automation not Aria Automation,
   VCF Operations for logs, VCF Installer instead of Cloud Builder, etc.) — verify each rename.
4. Every lesson lists `sources:` (primary sources, real URLs you actually fetched).
5. Quality over volume. No filler paragraphs. Explain *what, why, where it runs, who manages it, what it talks to,
   what depends on it, what happens when it fails, how to verify it, how to troubleshoot it*.
6. Content language is **English**. (The UI is Romanian; content is not.)
7. Audience: the learner is a VMware **beginner** who wants to pass 2V0-17.25 with a high score and run a real lab.
   At the first occurrence in **every lesson**, write each acronym as `Acronym (Full Name)`. After that introductory
   paragraph, explain the term in plain language: what it is, its role, how it works, dependencies, capabilities,
   limitations, management surface, common mistakes and exam relevance. Link its glossary entry where available.

## Lesson file

`content/lessons/<phase-id>/<lesson-id>.md`:

```markdown
---
id: nsx-tier0-tier1-routing
title: Tier-0 and Tier-1 Gateways
phase: p05-nsx
module: m05-nsx-routing
version: vcf9                 # vcf9 | legacy | general
minutes: 35
difficulty: intermediate      # foundation | intermediate | advanced | expert
summary: How NSX splits routing between provider (Tier-0) and tenant (Tier-1) gateways, and where each part runs.
topics: [nsx-routing, nsx-edge]          # ids from topics.yaml (required, must exist)
objectives: ["2.4"]                      # ids from objectives.yaml
keyTerms: [tier-0, tier-1, sr, dr]       # glossary ids (yours or other authors')
labs: [lab-nsx-t1-gateway]
incidents: [inc-nsx-edge-north-south]
components: [nsx-edge-cluster]          # architecture component ids
related: [nsx-edge-nodes-clusters]       # other lesson ids
sources:
  - title: "NSX Administration Guide – Tier-0 Gateways"
    url: https://techdocs.broadcom.com/...
---

## Why This Matters
...
```

### Required theory sections (exact headings, this order)

`## Why This Matters`, `## Learning Objectives` (3–6 bullets), `## Concept`, `## Architecture` (must contain a
`::diagram[...]` and/or an official `::figure{...}`), `## Components`, `## How It Works` (numbered flow),
`## Deep Dive`, `## Configuration`, `## CLI / API`, `## Failure Scenarios`, `## Troubleshooting`,
`## Real-World Scenario`, `## Exam Focus`, `## Common Exam Traps`, `## Knowledge Check`
(body is just `::quiz` — the app renders the questions whose `lesson:` is this lesson), `## Summary`, `## Next Topic`.

Theory must stand on its own. Do not add a `## Lab` section or `::lab[...]` card to a lesson. Explain commands and
worked examples when they teach the mechanism, but keep executable step sequences in a separate guide under
`content/labs/`. Link the guide to prerequisite lessons through its `lessons` field and the lesson's `labs` metadata;
the UI shows that relationship in the context panel without interrupting the theory.

If a section genuinely does not apply (e.g. CLI for a pure concept lesson), keep the heading and write one or two
honest sentences (e.g. what the learner will use instead, and where it comes later). Use `###` subsections freely;
they become bookmarkable anchors. Target **1,800–3,500 words** for a substantial lesson.

### Markdown extensions

| Syntax | Renders as |
|---|---|
| `:::vcf9 Changed in VCF 9` … `:::` | Blue "Changed in VCF 9" callout |
| `:::legacy VCF 5.x / Legacy Context` … `:::` | Amber legacy callout |
| `:::general` … `:::` | Neutral "general concept" callout |
| `:::exam` … `:::` | Exam focus callout |
| `:::trap` … `:::` | Exam trap callout |
| `:::warning` / `:::tip` / `:::note` … `:::` | Callouts |
| `:::details Title` … `:::` | Collapsible deep-dive block |
| `::diagram[diagram-id]` (own line) | Interactive SVG diagram from `content/diagrams/` |
| `::figure{src="https://techdocs.broadcom.com/...png" caption="..." source="https://page-url"}` | Official image, embedded, with attribution |
| `::lab[lab-id]` | Lab card |
| `::incident[incident-id]` | Troubleshooting incident card |
| `::quiz` | Knowledge check (questions for this lesson) |
| `[[term-id]]` or `[[term-id\|label]]` | Glossary link with tooltip |
| `[text](lesson:lesson-id#anchor)` | Link to another lesson / subsection |
| ```` ```shell / powershell / json / http / log ```` | Code blocks |

Callouts and details blocks cannot be nested. Headings `## Foo {#custom-id}` set an explicit anchor;
otherwise the anchor is the slug of the heading (`## How It Works` → `how-it-works`).

### Official images

The site runs privately on the learner's LAN, so official Broadcom/VMware diagrams may be embedded by URL
(the browser loads them directly from techdocs). Get real image URLs by fetching the TechDocs page with WebFetch
and asking for the exact `![...](url)` references. Image URLs look like
`https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/<uuid>.original.png`.
Inspect the image before describing it and never guess its content. The learner-facing page does not need a visible
bibliography or source label for each official image. Keep the source page, product/build and image URL in the package
asset manifest for maintenance. Prefer existing original `::diagram` visuals for explanation and add genuine official
product-interface images where screen recognition helps. Preserve the current diagram library.

## Diagrams (`content/diagrams/<id>.yaml`)

Diagrams teach. Coordinates are in a `width`×`height` canvas (default 1000×600). Nodes are rectangles
(`x`,`y` top-left). Groups are background containers. Edges connect node/group ids. Steps highlight a subset for
progressive reveal. Every node has `info` (shown when clicked). `description` is the full text alternative.

```yaml
id: nsx-t0-t1-traffic
title: North-south traffic through Tier-1 and Tier-0
description: >
  A VM on an overlay segment sends traffic to the internet. The packet is routed first by the Tier-1 DR on the
  host, then by the Tier-0 DR, then crosses to the Tier-0 SR on an edge node, which peers with the physical router.
width: 1000
height: 560
groups:
  - { id: g-host, x: 20, y: 300, w: 420, h: 240, label: "ESX transport node", kind: compute }
  - { id: g-edge, x: 520, y: 300, w: 300, h: 240, label: "Edge node (edge cluster)", kind: nsx }
nodes:
  - { id: vm, x: 50, y: 440, w: 140, h: 56, label: "App VM", sublabel: "10.10.10.11", kind: vm, info: "Workload attached to an overlay segment." }
  - { id: t1dr, x: 250, y: 440, w: 160, h: 56, label: "Tier-1 DR", kind: nsx, info: "Distributed router instance in the kernel of every transport node." }
  - { id: t0sr, x: 560, y: 340, w: 160, h: 56, label: "Tier-0 SR", kind: nsx, info: "Service router; runs only on edge nodes and peers with the physical network." }
  - { id: rtr, x: 560, y: 60, w: 160, h: 56, label: "Physical router", kind: external, info: "Upstream ToR/router; BGP or static routes to the Tier-0." }
edges:
  - { from: vm, to: t1dr, label: "1. default gateway", kind: data }
  - { from: t1dr, to: t0sr, label: "2. Geneve to edge TEP", kind: overlay, dashed: true }
  - { from: t0sr, to: rtr, label: "3. uplink VLAN / BGP", kind: north-south, bidirectional: true }
steps:
  - { title: "VM sends to its gateway", text: "...", highlight: [vm, t1dr] }
  - { title: "Overlay to the edge", text: "...", highlight: [t1dr, t0sr] }
```

Node `kind` colors: mgmt, compute, storage, network, nsx, ops, security, external, vm. Edge `kind`: mgmt, data,
overlay, control, storage, north-south, dependency. Keep labels short; put detail in `info`. Avoid overlaps:
lay out on a grid (e.g. 180px columns, 90px rows). Optional `component:` links a node to an Architecture Explorer
component id.

## Questions (`content/questions/<phase-id>.yaml`)

Exam-quality, scenario-heavy (the real exam is "Given a scenario…"). Every option has `why`. Explanations include
the concept, architecture context and the exam trap. Spread difficulty: ~25% foundation, 40% intermediate,
25% advanced, 10% expert. Use every `type` where it fits, and `kind` honestly.

```yaml
questions:
  - id: nsx-rt-001
    type: single                # single | multi | truefalse | ordering | matching | cli
    kind: architecture          # concept | scenario | architecture | command | log | troubleshooting | design
    difficulty: intermediate
    version: vcf9
    topics: [nsx-routing]
    objective: "2.4"
    lesson: nsx-tier0-tier1-routing
    section: how-it-works       # anchor in that lesson (optional but preferred)
    context: |                  # optional scenario / log / output (markdown)
      ...
    stem: "Where does the Tier-0 service router (SR) run?"
    options:
      - { id: a, text: "On every ESX transport node", why: "That is the DR component; SRs need edge nodes.", confusedWith: nsx-transport }
      - { id: b, text: "On NSX Edge nodes in an edge cluster", correct: true, why: "Centralized services, including the T0 SR, run on edges." }
      - { id: c, text: "On the NSX Manager cluster", why: "Managers are the management/control plane, never in the data path." }
      - { id: d, text: "On vCenter", why: "vCenter has no NSX data-plane role." }
    explanation:
      correct: "The SR hosts centralized services (uplinks, BGP, NAT, gateway firewall) and therefore runs on edge nodes..."
      concept: "SR vs DR split of an NSX gateway"
      architecture: "Edge nodes are VMs (or bare metal) in an edge cluster, usually on dedicated hosts/clusters..."
      trap: "Distributed routing happens on hosts, but anything 'centralized' (SR) lives on edges."
    diagnostic: nsx            # optional: include in the onboarding diagnostic for this area
```

- `multi`: ≥2 correct; set `select:` to the number to choose ("Choose two").
- `truefalse`: exactly two options (`true` / `false`), use sparingly.
- `ordering`: `items:` listed in the **correct** order; the app shuffles.
- `matching`: `pairs:` of `left` ↔ `right`.
- `cli`: `answers:` accepted command strings (compared case-sensitively after collapsing whitespace); only use
  for commands you have verified exist with that exact syntax.
- `confusedWith:` on a distractor names the topic the learner likely confused → powers "You repeatedly confuse X and Y".
- Mark 2–3 foundation questions per area with `diagnostic:` (areas: virtualization, esxi, vsphere, networking,
  storage, nsx, vcf, troubleshooting).

## Practical guides (`content/labs/<lab-id>.yaml`)

Lab ids start with `lab-`. Guides teach the canonical VCF 9.0.2 workflow and do not need to reproduce the learner's
current home-lab topology exactly. Necessary nested-lab deviations are labelled as adaptations, not product design.
Steps describe how an engineer approaches the task: each step has `why`,
`instructions`, optional `hint`, `validate` (how to check) and `expected` (what you should see). See schema `Lab`.
Topology views reference diagram ids. Include `troubleshooting` (symptom → fix), `challenge`, `cleanup`.

Treat the learner-facing artifact as a **practical guide** even though internal routes, schema and persisted state keep
the stable `lab` name. Map actions to exact official blueprint item text. Use the supplied lab FQDNs when a familiar
endpoint improves the example, but do not spend content work discovering or reconciling IP addresses. For a component
that is not deployed, use a clear placeholder such as `<hcx-manager-fqdn>`. Alex executes and validates procedures in
the lab independently; repository completion does not wait for a recorded lab-validation pass.

Every runnable guide is a complete UI-first runbook. Do not write shortcuts such as "configure NTP in vSphere" or
"create the network". For every action, state:

1. the entry URL/product and required role, without recording credentials;
2. the exact click path using the English product labels for the verified build (for example **Menu > Hosts and
   Clusters > host > Configure > System > Time Configuration**);
3. the button or tab to select, every field to populate and an FQDN or clearly named input variable;
4. the effect of clicking **Save/OK/Finish**, plus a checkpoint immediately before any disruptive action;
5. how to verify the result in the UI and, when useful, with a verified CLI/API command;
6. the expected visible result, troubleshooting and rollback/cleanup.

Label the path with the product/build documented for it. If a menu path cannot be confirmed, do not guess. Use genuine
Broadcom/VMware interface figures beside the relevant step and keep their provenance in the internal asset manifest.
Configuration,
deployment and remediation guides must include the full commit sequence and rollback. Read-only guides still provide
the exact navigation path, but explicitly stop at **Cancel** before a dialog could save a change. Present CLI/API as an
alternative or validation method after the normal UI path unless the official workflow is command-only.

## Incidents (`content/incidents/<incident-id>.yaml`)

Incident ids start with `inc-`. The learner gets symptoms, then *chooses* diagnostic actions from evidence
categories (logs, network, dns, ntp, services, certificates, hosts, storage, nsx). Each evidence item has
`action` (what the learner clicks, e.g. "Run nslookup for esx-03 from the VCF Installer appliance"), `output`
(realistic output in a code block), `relevance` (key | useful | noise) and `note` (what it tells an expert).
Include red herrings. `idealSequence` lists the efficient order. Then `rootCause`, `nextStep`, `remediation`,
`validation`: exactly one correct choice each, each choice with `why`. `hints` are progressive (vague → specific).
`debrief` explains the full reasoning. Log lines must be plausible for the component; do not invent exact
log file paths unless verified — when unsure, label the output generically ("installer task log").

## Glossary (`content/glossary/<phase-id>.yaml`)

Term ids are kebab-case of the term (`tier-0`, `tep`, `vsan-esa`). Before adding a term, grep `content/glossary/`
so you don't duplicate another author's id. Fields: term, expansion (acronyms), definition, whyItMatters, version,
related (term ids), lessons, labs.

## Commands (`content/commands/<phase-id>.yaml`)

Only verified commands. Fields: technology, title, purpose, syntax, example, output (realistic, trimmed),
mistake (common mistake), lesson, version, source.

## Architecture components (`content/architecture/<phase-id>.yaml`)

For the Architecture Explorer knowledge graph: what it is, function, runsOn, managedBy, dependsOn,
communicatesWith (with purpose and protocol/port only when verified), failureImpact, verify, lessons, labs.
Check `content/architecture/` first to reuse existing ids.

## Scenarios (`content/scenarios/<id>.yaml`)

Design exercises (sec. 33 of the spec): a brief, requirements, constraints, existing infrastructure, then
decisions (each a choice with `why`), then the recommended design.

## Validation

Run `npx tsx scripts/check-content.ts --only <your-file-or-id-fragment>` until it reports **0 errors** for your
files. Warnings about ids owned by other authors (unknown lab/term/component that someone else is writing) are
expected while authoring in parallel; warnings about your own files are not.
