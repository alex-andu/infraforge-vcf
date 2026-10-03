---
id: vcf9-terminology
title: VCF 9 Terminology - Fleet, Instance, Domain, Cluster and the Renamed Products
phase: p00-orientation
module: m00-vcf-intro
version: vcf9
minutes: 35
difficulty: foundation
summary: The VCF 9 vocabulary you need for every later lesson and exam question - the fleet/instance/domain/cluster hierarchy, ESX vs ESXi, the Aria-to-VCF renames, VCF Installer vs Cloud Builder, and SDDC Manager's changed role.
topics: [vcf-terminology, vcf-overview, vcf-fleet, sddc-manager]
objectives: ["2.1"]
keyTerms: [fleet, vcf-instance, vcf-domain, management-domain, workload-domain, cluster, esx, vcf, vvf]
labs: [lab-explore-vcf-fleet]
incidents: []
components: [vcf-fleet, vcf-instance, management-domain, workload-domain, vcf-installer, sddc-manager, vcf-operations, vcf-operations-fleet-management, vcf-automation, vcf-identity-broker, vcf-operations-logs, vcf-operations-networks, vcenter, esx-host]
related: [what-is-vcf, vcf-vs-vsphere, vcf9-architecture-overview, management-domain, workload-domains-architecture]
sources:
  - title: "VCF 9.0 – VCF Taxonomy"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 – What is the VMware Cloud Foundation Installer?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/what-is-the-vcf-installer-.html
  - title: "VCF 9.0 – Component Nodes in VCF and vSphere Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF 9.0 – Fleet Deployment Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html
  - title: "VCF 9.0 – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "Broadcom KB 410435 – Unified VCF Product Releases & Versioning"
    url: https://knowledge.broadcom.com/external/article/410435/unified-vcf-product-releases-versioning.html
  - title: "VCF blog – How to Upgrade to VMware Cloud Foundation 9.0 (Aria to VCF product mapping)"
    url: https://blogs.vmware.com/cloud-foundation/2025/09/25/how-to-upgrade-to-vmware-cloud-foundation-9-0/
  - title: "VCF 9.0 Release Notes"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/release-notes/vmware-cloud-foundation-90-release-notes.html
  - title: "vInfrastructure – SDDC Manager deprecations in VCF 9.0 (quoting the release notes)"
    url: https://vinfrastructure.it/?p=39339
  - title: "Default Reasoning – VCF 9 top innovations (VCF Installer replaces Cloud Builder)"
    url: https://defaultreasoning.com/2025/06/17/vcf-9-top-innovations-and-updates/
  - title: "vNinja – VCF 9 is here (ESX naming in the BOM)"
    url: https://vninja.net/2025/06/17/vcf9-is-here-what-does-that-mean/
---

## Why This Matters

VCF 9 changed a lot of names at once. Old blog posts, KB articles, CLI output and colleagues still use the VCF 5.x vocabulary, while the exam and the 9.x documentation use the new one. If you cannot translate instantly, you will misread questions ("Aria Suite Lifecycle" in an old article is "VCF Operations fleet management" on the exam) or pick the wrong scope ("one per instance" versus "one per fleet"). This lesson is the dictionary for the rest of the course.

## Learning Objectives

- Define [[fleet]], [[vcf-instance]], [[vcf-domain]] and [[cluster]] and state what each contains.
- State the scope (fleet, instance, domain) of each management component.
- Translate legacy names to VCF 9 names: ESXi → [[esx]], the Aria products, Cloud Builder, Aria Suite Lifecycle.
- Explain the VCF Installer and how it relates to SDDC Manager.
- Describe SDDC Manager's changed role in VCF 9.

## Concept

### The hierarchy

| Term | Official meaning (VCF 9.0 taxonomy) | Contains | Scope of management |
|---|---|---|---|
| **VCF private cloud** | The highest level; can contain one or more VCF fleets | 1..n fleets | – |
| **VCF fleet** | "An environment that is managed by a single set of fleet-level management components – VCF Operations and VCF Automation" | 1..n VCF instances, optionally standalone vCenter instances | VCF Operations, VCF Automation (plus fleet management) |
| **VCF instance** | "Compute, storage, networking virtual infrastructure that runs business workloads" | 1 management domain + 0..n workload domains | SDDC Manager, NSX, vCenter, ESX |
| **VCF domain** | A unit of the instance with its own vCenter | 1 vCenter, 1..n vSphere clusters (HA and DRS enabled), vSphere distributed switches, NSX segments, a dedicated or shared NSX Manager, optional NSX Edge clusters, storage | vCenter (+ NSX) |
| **Management domain** | Created during deployment or convergence | Management components of the instance; in the first instance also VCF Operations and VCF Automation; SDDC Manager and the fleet management appliance | – |
| **Workload domain** | Created in VCF Operations to run consumer workloads | Dedicated ESX hosts and clusters; its vCenter (and NSX Manager) run in the management domain | – |
| **vSphere cluster** | Group of ESX hosts in one vCenter with HA and DRS | ESX hosts | vCenter |

Two facts from the taxonomy that are easy to miss:

- **Fleet-level components live in the first instance's management domain.** There is no separate "fleet cluster".
- **For the first workload domain, VCF Operations deploys a vCenter and an NSX Manager instance in the management domain.** New workload domains can share an existing NSX Manager cluster or get a new one.

## Architecture

::diagram[d00-fleet-hierarchy]

The Fleet Deployment Models page shows how one VCF Operations and VCF Automation pair serves several instances:

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/d881e129-73ec-4b71-8940-e69541f380ef.original.png" caption="Using VMware Cloud Foundation Operations and Automation from fleet across multiple instances" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html"}

## Components

### Who lives at which level

| Level | Component | Count |
|---|---|---|
| Fleet | VCF Operations (with collectors, optional VCF Operations for logs / for networks) | One per fleet |
| Fleet | VCF Operations fleet management appliance | One per fleet |
| Fleet | VCF Automation | One per fleet |
| Fleet / SSO | VCF Identity Broker (single sign-on to an identity provider) | Depends on the SSO model chosen (Security phase) |
| Instance | SDDC Manager | One per instance |
| Domain | vCenter | One per domain |
| Domain | NSX Manager cluster | Dedicated per domain or shared between workload domains |
| Cluster | ESX hosts, vSAN | Per cluster |

### The rename table

:::vcf9 Changed in VCF 9
| Legacy name (VCF 5.x / vSphere 8 era) | VCF 9 name |
|---|---|
| VMware ESXi | **VMware ESX** |
| vCenter Server | **vCenter** (as used throughout the 9.x docs) |
| VMware Aria Operations | **VCF Operations** |
| VMware Aria Automation | **VCF Automation** |
| VMware Aria Operations for Logs | **VCF Operations for logs** |
| VMware Aria Operations for Networks | **VCF Operations for networks** |
| VMware Aria Suite Lifecycle | **VCF Operations fleet management** |
| Aria Operations cloud proxy | **VCF Operations collector** (also known as cloud proxy) |
| VMware HCX | **VCF Operations HCX** |
| Cloud Builder (bring-up appliance + Excel workbook) | **VCF Installer** (wizard or JSON) |
| Enhanced Linked Mode for multi-vCenter SSO | **VCF single sign-on with the VCF Identity Broker** |
| VI workload domain | **workload domain** (both terms appear) |
| Update / Patch / Express Patch naming | Five-field version numbers, e.g. 9.0.1.0 |
:::

### ESX vs ESXi

The hypervisor was called ESX up to version 4.x, ESXi from 5.0 through 8.x, and is called **ESX** again in the 9.x bill of materials and documentation. It is the same product line: a type 1 hypervisor with the VMkernel. Many command names, log names, KB titles and even some UI strings still contain "esxi" (for example the `esxcli` tool and older paths). When you read "ESXi 8.0 U3", think "the version before ESX 9.0".

## How It Works

### VCF Installer vs Cloud Builder

1. You download one OVA: the **VCF-SDDC-Manager-Appliance-9.x.x.ova**. It contains both the VCF Installer and SDDC Manager.
2. You deploy it **outside** the future management infrastructure (or on a host that is not part of it) and use it in **installer mode**: download binaries, run the deployment wizard or upload a JSON specification.
3. The installer deploys the platform: for VCF, vCenter, VCF Operations, NSX, VCF Automation and SDDC Manager; for VVF, vCenter and VCF Operations.
4. If you deploy the appliance **inside** the management infrastructure (on one of the hosts that will form the management domain), it switches into **SDDC Manager mode** and can no longer be used as an installer.
5. The VCF Installer can deploy a **new fleet** or **expand an existing fleet** with a new instance, and supports convergence of existing vSphere.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x, **Cloud Builder** was a separate appliance. You filled in the *Deployment Parameters Workbook* (Excel), converted it to JSON, and Cloud Builder performed "bring-up" of the management domain, then handed over to SDDC Manager. Aria components were deployed later through SDDC Manager and Aria Suite Lifecycle.
:::

### SDDC Manager's changed role

| Aspect | VCF 5.x | VCF 9.0 |
|---|---|---|
| Scope | One per instance | Still one per instance |
| Main UI for VCF | Yes, the central VCF console | **SDDC Manager UI is deprecated** (to be removed in a future major release); VCF Operations is the central console |
| Workload domain creation | SDDC Manager UI/API | Created in **VCF Operations**; SDDC Manager executes the instance workflows |
| Lifecycle | SDDC Manager LCM | Lifecycle capabilities moved into VCF Operations (fleet lifecycle); release notes list the old SDDC Manager precheck API as removed |
| Identity configuration | SDDC Manager APIs | Deprecated; replaced by VCF Operations |
| Deploying Aria / Ops / Automation | SDDC Manager + Aria Suite Lifecycle | VCF Installer and VCF Operations |

The practical summary: **SDDC Manager still exists and still does the instance-level orchestration**, but you increasingly drive it *through* VCF Operations instead of through its own UI.

## Deep Dive

### Why the fleet/instance split exists

An **instance** is the unit of infrastructure: it is tied to a location or failure domain, has its own SDDC Manager and its own management domain. A **fleet** is the unit of operations and consumption: one VCF Operations to see and manage everything, one VCF Automation to expose everything as a cloud. That lets an organisation run, for example, two data centers (two instances) but present a single private cloud (one fleet). The Fleet Deployment Models page describes four patterns: basic design (one availability zone/region), site high availability across zones, disaster recovery across regions, and fault domains plus disaster recovery.

### Domains as boundaries

A workload domain is a boundary for **lifecycle** (you can upgrade one domain while another waits), **capacity** (dedicated hosts), and **security/compliance** (its own vCenter, optionally its own NSX). Up to 24 workload domains per instance are supported in 9.0 (confirm the current maximum in the configuration maximums for your version).

### "Consolidated" is now just a management domain running workloads

:::legacy VCF 5.x / Legacy Context
VCF 4.x/5.x documentation talked about a **consolidated architecture** (workloads run in the management domain, often with resource pools) versus a **standard architecture** (separate VI workload domains). In 9.0 the model is simply: the management domain *can* also run business workloads, and workload domains are added when you need dedicated resources.
:::

## Configuration

Terminology does not get configured, but naming does. Agree on a naming convention before you deploy, because names appear in FQDNs, certificates and inventory:

| Object | Example name |
|---|---|
| Fleet | `lab-fleet` |
| Instance | `lab-site-a` |
| Management domain / vCenter | `mgmt-01` / `vc-mgmt-01.lab.local` |
| Workload domain / vCenter | `wld-01` / `vc-wld-01.lab.local` |
| Clusters | `mgmt-01-cl01`, `wld-01-cl01` |
| Hosts | `esx-01.lab.local` … |

Use the IP and DNS plan from the Home Lab section for your real names.

## CLI / API

On an ESX 9 host the version command reports the new product name:

```shell
esxcli system version get
```

Expect `Product: VMware ESX` and `Version: 9.0.x`. On an 8.x host the same command reports ESXi. The command itself is still `esxcli`.

## Failure Scenarios

Terminology mistakes cause real operational errors:

| Mistake | Consequence |
|---|---|
| Following a VCF 5.x guide that says "use Cloud Builder" | You look for an appliance that no longer exists in 9.0 |
| Deploying the installer OVA on a future management host | It switches to SDDC Manager mode; you cannot use it as an installer |
| Assuming each instance needs its own VCF Operations | Unnecessary deployments; fleet is the scope of VCF Operations |
| Searching for "Aria Operations for Logs" in VCF 9 docs | You miss the current docs (now "VCF Operations for logs") |
| Creating workload domains from the deprecated SDDC Manager UI out of habit | Works against the documented 9.0 operating model; plan for its removal |

## Troubleshooting

When a document, KB or colleague uses a name you do not recognise:

1. Check the rename table above; translate to the 9.0 name.
2. Check the **version** of the source. Anything about Cloud Builder, workbooks, Aria Suite Lifecycle or Enhanced Linked Mode is VCF 5.x or older.
3. Check the **scope** the source means: fleet, instance or domain.
4. For behaviour that differs between 9.0 and later 9.x releases, check the release notes for your exact version.

## Real-World Scenario

An engineer reads a 2023 runbook: "Use SDDC Manager to deploy Aria Suite Lifecycle, then deploy Aria Operations and Aria Operations for Logs; log in to SDDC Manager to create the VI workload domain." Translated to VCF 9: VCF Operations, VCF Operations fleet management and (optionally) VCF Operations for logs are deployed by the **VCF Installer** or from **VCF Operations**; the workload domain is created in **VCF Operations**, which uses SDDC Manager behind the scenes. Same goals, different tools and order.

## Lab

There is no lab yet where you can see all these components, because they require a deployed VCF fleet. Two things to do now:

- Complete the Phase 1 ESX lab, which shows you the "ESX" naming on a real host.
- When your VCF deployment is running, the **Explore a VCF fleet** lab has you place every appliance on the fleet → instance → domain map.

## Exam Focus

:::exam
- Memorise the scope: **VCF Operations / VCF Automation = fleet**, **SDDC Manager = instance**, **vCenter = domain**.
- Know where things run: fleet components in the **first instance's management domain**; workload domain vCenter/NSX Manager in the **management domain**.
- Know the renames and that the **VCF Installer** replaces Cloud Builder and is delivered in the same OVA as SDDC Manager.
- Know that the **SDDC Manager UI is deprecated** in 9.0 and VCF Operations is the central console.
:::

## Common Exam Traps

:::trap
- "A VCF instance is managed by its own VCF Automation." VCF Automation is per **fleet**.
- "A workload domain can have two vCenters." One vCenter per domain.
- "ESXi and ESX are different hypervisors." Same product line, renamed.
- "VCF Operations fleet management is part of SDDC Manager." It is the fleet management appliance associated with VCF Operations (formerly Aria Suite Lifecycle).
- "Standalone vCenters must be converted to an instance to be monitored." A fleet can include standalone vCenter instances managed by VCF Operations.
:::

## Knowledge Check

::quiz

## Summary

- Hierarchy: private cloud → fleet → instance → domain → cluster → host.
- Fleet = one VCF Operations + one VCF Automation; instance = own SDDC Manager + management domain + optional workload domains; domain = one vCenter.
- ESXi → ESX; Aria Operations/Automation/Logs/Networks → VCF Operations/Automation/for logs/for networks; Aria Suite Lifecycle → fleet management; Cloud Builder → VCF Installer.
- SDDC Manager remains per instance but its UI is deprecated; VCF Operations is the console.

## Next Topic

Phase 1 begins: [Hypervisors and ESX](lesson:hypervisors-and-esx), the foundation every VCF component sits on.
