---
id: vcf-vs-vsphere
title: VCF vs Standalone vSphere vs vSphere Foundation
phase: p00-orientation
module: m00-vcf-intro
version: vcf9
minutes: 25
difficulty: foundation
summary: What VCF adds on top of a standalone vSphere estate, how vSphere Foundation (VVF) differs from VCF, what the VCF Installer deploys for each, and the paths from existing vSphere into VCF 9.
topics: [vcf-overview, private-cloud]
objectives: ["2.1"]
keyTerms: [vcf, vvf, sddc, workload-domain, management-domain]
labs: []
incidents: []
components: [vcf-installer, sddc-manager, vcf-operations, vcf-automation, nsx-manager, vcenter]
related: [what-is-vcf, vcf9-terminology, private-cloud-and-sddc]
sources:
  - title: "VCF 9.0 – What Is vSphere Foundation?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/what-is-vsphere-foundation.html
  - title: "VCF 9.0 – What Is VMware Cloud Foundation?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/what-is-vmware-cloud-foundation-and-vmware-vsphere-foundation.html
  - title: "VCF 9.0 – What is the VMware Cloud Foundation Installer?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/what-is-the-vcf-installer-.html
  - title: "VCF 9.0 – Deployment, Convergence and Upgrade"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment.html
  - title: "VCF 9.0 – Component Nodes in VCF and vSphere Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF 9.0 – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "VCF blog – How to Upgrade to VMware Cloud Foundation 9.0"
    url: https://blogs.vmware.com/cloud-foundation/2025/09/25/how-to-upgrade-to-vmware-cloud-foundation-9-0/
---

## Why This Matters

Most people who come to VCF already know (or have heard of) vSphere. The exam and real projects both test whether you understand **what VCF adds** and **what changes in how you work**. In a standalone vSphere estate you can do almost anything by hand. In VCF, many things that look like "just vSphere" are owned by platform workflows, and doing them by hand causes drift. You also need to know the smaller sibling, **vSphere Foundation (VVF)**, because scenario questions ask which edition fits a requirement.

## Learning Objectives

- Compare a standalone vSphere estate with [[vcf]] across components, deployment, lifecycle and operations.
- Explain what [[vvf]] includes and what it lacks compared with VCF.
- State what the VCF Installer deploys for VCF versus VVF.
- Describe the three paths into VCF 9: new deployment, convergence of existing vSphere, upgrade from VCF 5.x.

## Concept

**vSphere** is the compute virtualization product: [[esx]] hosts plus vCenter. On its own it gives you VMs, clusters, HA, DRS and vMotion. Everything else (storage, network virtualization, monitoring, automation, lifecycle orchestration) you add and integrate yourself.

**VCF** packages vSphere together with vSAN, NSX, VCF Operations and VCF Automation into **one product** with:

- a **standard architecture** (fleet, instance, [[management-domain]], [[workload-domain]]),
- an **installer** that deploys the stack consistently,
- a **validated bill of materials** and orchestrated lifecycle,
- **central operations** in VCF Operations and **self-service** in VCF Automation.

**vSphere Foundation (VVF)** sits in between. Broadcom describes it as an enterprise workload platform (VMs and containers side by side, intelligent operations, hyperconverged compute and storage), but it *"does not include the cloud management and integrated automation capabilities that are available in VMware Cloud Foundation."*

## Architecture

::diagram[d00-vsphere-vs-vcf]

Broadcom's workload domain models figure shows the VCF-specific structure that standalone vSphere does not have: a management domain that hosts management appliances for itself and for workload domains.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4d229944-9a22-4b9e-ba1b-8a558a80c6a3.original.svg" caption="Workload Domain Models in VMware Cloud Foundation" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html"}

## Components

### What the VCF Installer deploys

| Platform | Components deployed by the VCF Installer |
|---|---|
| **VCF** (simple or high availability) | vCenter, VCF Operations, NSX, VCF Automation, SDDC Manager |
| **vSphere Foundation** | vCenter and VCF Operations (primary node only) |

In VCF high-availability mode, VCF Operations gets replica and data nodes; VVF does not.

### Side-by-side

| Area | Standalone vSphere | vSphere Foundation (VVF) | VMware Cloud Foundation |
|---|---|---|---|
| Hypervisor + vCenter | Yes | Yes | Yes |
| vSAN | Separate decision | Included | Included |
| NSX network virtualization | Separate product | Not included | Included, deployed in every domain |
| VCF Operations | Optional add-on | Included | Included (mandatory central console) |
| VCF Operations for networks | Separate | Not available (VCF only) | Included |
| VCF Automation (self-service, tenancy) | No | **No** | Yes |
| SDDC Manager, domains, BOM lifecycle | No | No | Yes |
| Standard architecture (fleet/instance/domain) | No | No | Yes |

## How It Works

The three ways to arrive at a VCF 9 environment:

1. **New deployment.** Install ESX on the hosts, deploy the VCF Installer, choose VCF (or VVF), and the installer builds the management domain and fleet components.
2. **Convergence.** Use existing vSphere infrastructure as building blocks: update the existing components to version 9 first, then use the VCF Installer to deploy the additional components and bring the environment under VCF management.
3. **Upgrade.** Upgrade an existing VCF 5.x environment to 9.0. Environments on VCF 4.x must first upgrade to 5.2. The upgrade blog lists the high-level order: assess, upgrade existing Aria components, upgrade the management domain core components (SDDC Manager, NSX, vCenter, ESX), deploy VCF Operations if it was not there, then finish the remaining components.

In addition, an existing **standalone vCenter** can be managed by a fleet's VCF Operations without being converted into a VCF instance.

## Deep Dive

### What changes in your daily work

| Task | Standalone vSphere habit | VCF way |
|---|---|---|
| Add a host | Add to vCenter, configure by hand | **Commission** the host into VCF inventory, then add it to a cluster through a VCF workflow |
| New cluster for a team | Create cluster in vCenter | Create a cluster or a **workload domain** through VCF Operations / SDDC Manager |
| Patch ESX | Update hosts one by one with vLCM | Lifecycle through VCF, in BOM order, with prechecks |
| Replace certificates / rotate passwords | Per product, by hand | Centrally from VCF Operations |
| Network for new app | VLAN request to network team | NSX segment (overlay), often self-service through VCF Automation |

Doing VCF-owned tasks directly in vCenter or NSX is possible technically, but it can leave SDDC Manager's inventory out of sync and break later workflows. The rule of thumb: **if VCF has a workflow for it, use the workflow**.

### Choosing an edition from requirements

Exam scenarios usually describe requirements and ask which platform fits. Translate each requirement into the capability that delivers it, then check which edition has that capability:

| Requirement in the scenario | Capability needed | Minimum edition |
|---|---|---|
| "Run VMs and Kubernetes side by side, with good monitoring" | vSphere, Supervisor, VCF Operations | VVF can be enough |
| "Hyperconverged storage, no external SAN" | vSAN | VVF or VCF |
| "Developers must provision their own VMs within quotas" | Self-service with governance (VCF Automation) | VCF |
| "Several business units must be isolated as tenants" | Organizations / tenancy (VCF Automation), workload domains | VCF |
| "Create new application networks without touching the physical switches" | NSX overlay networking | VCF |
| "Flow-level network visibility and micro-segmentation planning" | VCF Operations for networks | VCF |
| "Standard, repeatable, fully automated lifecycle of the whole stack" | SDDC Manager, domains, BOM | VCF |

If any requirement maps to a VCF-only capability, VVF is the wrong answer even if it would be cheaper. If none do, VVF is a valid, simpler choice. Licensing details (cores, add-ons, capacity) are covered in the Security and Licensing phase; they change between releases, so always check the current licensing documentation.

### Why a "fixed" architecture is a feature

Standalone vSphere lets every site be designed differently. VCF deliberately limits choices (for example, a management domain is always the first domain and always hosts the management appliances) so that automation, upgrades and support work the same everywhere. The VCF Design guide still offers many **models** to choose from (fleet deployment models, cluster models, storage models, network models), but they are documented, supported patterns.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x the platform was assembled from separately branded products: vSphere (ESXi), vSAN, NSX, SDDC Manager, and optionally the Aria Suite (Aria Operations, Aria Automation, Aria Operations for Logs, Aria Operations for Networks) deployed through Aria Suite Lifecycle. Deployment used **Cloud Builder** with a bring-up workbook, and SDDC Manager was the main VCF UI. VCF 9 merges these into one product with VCF Operations as the central console.
:::

## Configuration

No configuration in this lesson. The edition decision (VCF or VVF) is made in the VCF Installer during deployment, which you will do in the Deployment phase. Licensing in VCF 9 is managed centrally in VCF Operations (Security and Licensing phase).

## CLI / API

Not applicable yet. One useful habit to start now: on any ESX host, `esxcli system version get` shows the exact build. In VCF, all hosts of a cluster must be at the version the BOM expects; mismatches are a common reason for commissioning or upgrade precheck failures.

## Failure Scenarios

| Scenario | What goes wrong | Lesson |
|---|---|---|
| A team buys VVF but later needs NSX overlays and self-service | Features are not in the edition | Pick the edition from the requirements |
| An admin upgrades a workload domain vCenter by hand | VCF inventory/BOM mismatch; later lifecycle prechecks fail | Use VCF lifecycle workflows |
| Hosts added directly to a VCF cluster in vCenter | Host unknown to SDDC Manager; workflows fail | Commission hosts through VCF |
| Converging vSphere without first updating components to 9 | Convergence prerequisites not met | Follow the convergence sequence |

## Troubleshooting

When something "works in vCenter but VCF complains", suspect **drift** between what VCF thinks exists and what vCenter actually has. Check: was the change made through the VCF workflow? Do component versions match the expected BOM? Are hosts commissioned? Later phases show where to look (SDDC Manager and VCF Operations task views and logs).

## Real-World Scenario

A manufacturing company has 12 vSphere 8 clusters in two data centers. They need: self-service VMs for engineering, isolated networks for OT systems, and one operations console. Requirements analysis: self-service and multi-tenancy point to **VCF Automation**; isolated software networks point to **NSX**; both are VCF-only. VVF would have been cheaper but cannot meet the requirements. Because rebuilding all clusters at once is not possible, they deploy a new VCF management domain, then **converge** existing vSphere into the fleet over time, and in the meantime manage remaining standalone vCenters from VCF Operations.

## Lab

No hands-on lab for this comparison. In Phase 1 you will build a standalone ESX host and VM ([Hypervisors and ESX](lesson:hypervisors-and-esx)), which is exactly the "standalone vSphere" starting point; later you will see how VCF takes over the same tasks.

## Exam Focus

:::exam
- VCF = vSphere + vSAN + NSX + VCF Operations + VCF Automation, deployed and lifecycle-managed as one product.
- VVF lacks VCF Automation (cloud management/automation), NSX and VCF Operations for networks.
- VCF Installer deploys: **VCF** → vCenter, VCF Operations, NSX, VCF Automation, SDDC Manager; **VVF** → vCenter and VCF Operations (primary node only).
- Paths to VCF 9: new deployment, convergence, upgrade (VCF 4.x must first go to 5.2).
:::

## Common Exam Traps

:::trap
- "VVF includes VCF Automation." It does not.
- "VCF 9 is installed with Cloud Builder and a bring-up spreadsheet." It uses the **VCF Installer** (wizard or JSON).
- "Converging existing vSphere means reinstalling all hosts." Convergence reuses existing infrastructure after updating it to version 9.
- "Hosts can be added to VCF clusters directly in vCenter." They must be **commissioned** first.
:::

## Knowledge Check

::quiz

## Summary

- Standalone vSphere is compute virtualization; VCF is a full private cloud stack with standard architecture, BOM lifecycle and central operations.
- VVF = vSphere + vSAN + VCF Operations, without NSX and VCF Automation.
- Same installer, different deployed components for VCF and VVF.
- In VCF, use VCF workflows for host, cluster, domain and lifecycle tasks to avoid drift.

## Next Topic

[VCF 9 Terminology](lesson:vcf9-terminology): fleet, instance, domain, cluster, and every product rename you need to know.
