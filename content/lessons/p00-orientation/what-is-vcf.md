---
id: what-is-vcf
title: What Is VMware Cloud Foundation?
phase: p00-orientation
module: m00-vcf-intro
version: vcf9
minutes: 30
difficulty: foundation
summary: VCF 9 in one picture - the five product pillars, the fleet/instance/domain structure, who manages what, and why the platform is deployed and lifecycle-managed as one product.
topics: [vcf-overview, private-cloud, sddc]
objectives: ["2.1"]
keyTerms: [vcf, sddc, private-cloud, esx, fleet, vcf-instance, management-domain, workload-domain, vvf]
labs: [lab-esx-host-first-vm, lab-explore-vcf-fleet]
incidents: []
components: [vcf-fleet, vcf-instance, management-domain, workload-domain, vcf-operations, vcf-automation, sddc-manager, vcenter, esx-host, vsan, nsx-manager, vcf-installer]
related: [private-cloud-and-sddc, vcf-vs-vsphere, vcf9-terminology, vcf9-architecture-overview]
sources:
  - title: "VCF 9.0 – What Is VMware Cloud Foundation?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/what-is-vmware-cloud-foundation-and-vmware-vsphere-foundation.html
  - title: "VCF 9.0 – VCF Taxonomy"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 – Component Nodes in VCF and vSphere Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF 9.0 – What is the VMware Cloud Foundation Installer?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/what-is-the-vcf-installer-.html
  - title: "VCF 9.0 – VMware Cloud Foundation Concepts (architectural options)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts.html
  - title: "VCF blog – VCF 9.0 Use Cases"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/17/vcf-9-0-use-cases/
  - title: "William Lam – Clarifying minimum required ESX hosts for VCF deployments"
    url: https://williamlam.com/2026/06/clarifying-minimum-required-esx-hosts-for-vcf-deployments.html
  - title: "VCF 2V0-17.25 Administrator exam guide"
    url: https://docs.broadcom.com/doc/vmware-cloud-foundation-administrator-exam-guide
---

## Why This Matters

Every question on exam 2V0-17.25 assumes you can answer three things instantly: *what is in VMware Cloud Foundation (VCF)*, *where does each piece run*, and *who manages it*. If you picture VCF as "vSphere with extra products bolted on", you will miss questions about where VCF Operations lives, why a workload domain's vCenter sits in the management domain, or why you cannot simply patch one ESX host by hand.

This lesson gives you the map. Every later phase (VMware vSphere, VMware vSAN and VMware NSX, followed by deployment, lifecycle and operations) zooms into one part of it.

## Learning Objectives

- Define [[vcf]] and name its five product pillars.
- Describe the VCF 9 hierarchy: [[fleet]], [[vcf-instance]], [[management-domain]] and [[workload-domain]].
- State which components are fleet-level and which are instance-level, and where each runs.
- Explain why VCF is deployed and upgraded as one product rather than as separate tools.
- Distinguish VCF from vSphere Foundation ([[vvf]]) at a high level.

## Concept

Broadcom describes VMware Cloud Foundation (VCF) as *"a private cloud platform that delivers public cloud scale and agility with on-premises security, resilience and performance, while lowering total cost of ownership."* Translated for a beginner: VCF is the complete software stack that turns a rack of ordinary x86 servers into a [[private-cloud]] that teams can consume on demand.

VCF is built from five pillars:

| Pillar | What it virtualizes or provides | Plain-English role |
|---|---|---|
| **vSphere** (ESX + vCenter) | Compute | Runs virtual machines (VMs) on hosts ([[esx]]) and pools hosts into clusters (vCenter). |
| **vSAN** | Storage | Pools the hosts' local disks into a shared datastore. |
| **NSX** | Networking and security | Virtual networks, routing and firewalling in software. |
| **VCF Operations** | Operate | Monitoring, logs, licensing, certificates, passwords, lifecycle and fleet management. |
| **VCF Automation** | Consume | Self-service provisioning (VMs, Kubernetes, networks) with tenancy and policy. |

The first three make a [[sddc]] (Software-Defined Data Center). The last two make it a *cloud*: something operated centrally and consumed through self-service.

### Core terms before the architecture map

**VCF** is the complete platform and compatibility boundary. It combines compute, storage, networking, security,
operations and consumption services; coordinated workflows deploy and lifecycle-manage those products together.
VCF does not replace the individual consoles for detailed element work, and direct changes can create drift from the
state expected by VCF. Administrators start in VCF Operations for fleet workflows, then use vCenter or NSX Manager
when a task belongs to that component.

**vSphere** is the compute virtualization layer formed by ESX hosts and vCenter management. ESX runs VMs and the
kernel data planes; vCenter groups hosts, clusters and inventory. vSphere alone does not provide the complete VCF
private-cloud operating model, integrated NSX networking or VCF Automation self-service.

**vSAN** is software-defined storage inside the ESX kernel. It pools eligible host devices into a shared datastore
and applies availability and performance through storage policies. It depends on compatible devices, a correct
network and sufficient fault-domain capacity; it does not turn an undersized nested lab into resilient production
storage. Administrators configure and monitor it through vCenter.

**NSX** is the network virtualization and security layer. It prepares host transport nodes, creates overlay segments,
distributes firewall policy and uses Edge nodes for centralized or north-south services. NSX cannot repair a broken
physical underlay, Virtual Local Area Network (VLAN) or Maximum Transmission Unit (MTU) path. Administrators use
NSX Manager for element configuration while VCF coordinates deployment and supported lifecycle.

**VCF Operations** is the fleet operations surface for health, capacity and VCF workflows. It integrates with each
instance's SDDC Manager and with optional fleet products. Its outage removes central visibility and workflows but
does not stop already-running VM data planes.

**VCF Automation** provides policy-controlled self-service for infrastructure consumers. It exposes catalog items,
organizations and projects backed by prepared infrastructure. It consumes capacity and services; it does not create
missing physical capacity or replace vCenter and NSX as element managers.

:::vcf9 Changed in VCF 9
VCF 9.0 introduces new constructs (**fleet**, **instance**, **domain**) and makes **VCF Operations** a mandatory, central part of the platform. The hypervisor is called **ESX** again, the Aria products are renamed (VCF Operations, VCF Automation, VCF Operations for logs/networks), and the **VCF Installer** replaces Cloud Builder. Details in [VCF 9 Terminology](lesson:vcf9-terminology).
:::

## Architecture

The diagram below is the picture to keep in your head for the whole course. Step through it.

::diagram[d00-vcf-big-picture]

Broadcom's own taxonomy figure shows the same idea: VCF Operations managing VCF instances (each with management and workload domains) plus standalone vCenter instances.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/8e4db722-a16d-4a51-ab59-442828d317a4.original.svg" caption="VCF Taxonomy: VCF Operations managing VCF instances with management and workload domains, plus standalone vCenter instances" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html"}

### Three levels to remember

| Level | Defined by | Contains | Key appliances |
|---|---|---|---|
| **Fleet** | One set of fleet-level management components | 1..n VCF instances, optional standalone vCenters | VCF Operations, VCF Operations fleet management, VCF Automation |
| **Instance** | Its own SDDC Manager | 1 management domain + 0..n workload domains | SDDC Manager, vCenter(s), NSX Manager(s), ESX hosts |
| **Domain** | Its own vCenter | 1..n vSphere clusters (High Availability (HA) + Distributed Resource Scheduler (DRS)), storage, NSX | vCenter, ESX hosts, vSAN, NSX Edge (optional) |

## Components

| Component | Scope | Runs on | Managed by / through | What depends on it |
|---|---|---|---|---|
| **ESX** | Every host | Bare-metal servers | vCenter (and the Host Client locally) | Everything: VMs, vSAN, NSX data plane |
| **vCenter** | One per domain | Appliance VM in the management domain | VCF Operations / SDDC Manager lifecycle | Clusters, HA/DRS, vSAN configuration |
| **vSAN** | Per cluster | Inside the ESX kernel of each host | vCenter | VM storage in the cluster |
| **NSX Manager** | Per domain (dedicated or shared) | Appliance VMs in the management domain | VCF Operations / SDDC Manager | Overlay networks, routing, distributed firewall |
| **SDDC Manager** | One per instance | Appliance VM in the instance's management domain | VCF Operations (its own UI is deprecated in 9.0) | Instance workflows: commissioning hosts, domains, lifecycle |
| **VCF Operations** | One per fleet | Appliance(s) in the first instance's management domain | Itself (admin UI) | Fleet operations, licensing, workload domain creation |
| **VCF Operations fleet management** | One per fleet | Appliance in the first management domain | VCF Operations | Lifecycle of fleet-level components |
| **VCF Automation** | One per fleet | Appliance(s) in the first management domain | VCF Operations fleet management | Self-service consumption, tenants |
| **VCF Installer** | Day 0 only | Appliance (same Open Virtual Appliance (OVA) package as SDDC Manager) | You | Initial deployment of a fleet or a new instance |

The Component Nodes page shows an example of how these appliances are distributed in a fleet:

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/c99bb603-c1e2-495b-96ca-47c4d55c33ee.original.png" caption="Example VCF Nodes Configuration in a VCF Fleet" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html"}

## How It Works

How a VCF private cloud comes to life, at the level of detail you need now:

1. **Prepare hardware and network.** Servers from the compatibility guide, Virtual Local Area Networks (VLANs), Domain Name System (DNS) forward and reverse records, and Network Time Protocol (NTP). (Phase 4 covers why DNS and NTP are hard dependencies.)
2. **Install ESX** on the hosts that will form the management domain.
3. **Deploy the VCF Installer** appliance and download the binaries through it.
4. **Run the deployment** (wizard or JavaScript Object Notation (JSON) specification). The installer deploys vCenter, NSX, SDDC Manager, VCF Operations and VCF Automation and builds the management domain cluster. This creates the fleet and its first instance.
5. **Operate from VCF Operations.** Licensing, certificates, passwords, monitoring and fleet lifecycle live here.
6. **Commission more hosts and create workload domains** from VCF Operations; SDDC Manager executes the workflows. Each new workload domain gets a vCenter (and NSX Manager unless shared) deployed into the management domain.
7. **Consume** through VCF Automation: tenants request VMs, networks and Kubernetes from a catalog.
8. **Lifecycle as a whole**: upgrades follow one validated bill of materials, in a defined order, instead of product by product.

## Deep Dive

### Why "one product" matters

In a do-it-yourself vSphere estate you pick versions of vCenter, ESX, storage and networking separately, check interoperability yourself and upgrade each on its own schedule. VCF replaces that with a **validated Bill of Materials (BOM)** and automated workflows. The benefit is predictability. The cost is that you must work *through* VCF: if you upgrade a vCenter by hand outside the workflow, the platform's view of the BOM no longer matches reality and later upgrades or prechecks can fail.

Starting with 9.0, all components also share a unified five-field version format (for example 9.0.1.0), so "VCF 9.0.1" means one consistent set of component versions.

### VCF vs vSphere Foundation

The same installer can deploy **VMware vSphere Foundation (VVF)**. VVF gets vCenter, ESX, vSAN and VCF Operations, but Broadcom states it *"does not include the cloud management and integrated automation capabilities"* of VCF. NSX networking and VCF Automation are VCF-only. More in [VCF vs vSphere](lesson:vcf-vs-vsphere).

### How small can VCF be?

For VCF 9.x, a simple (non-HA) deployment needs a minimum of **3 ESX hosts with vSAN** or **2 ESX hosts with external storage**; a high-availability deployment needs **4 hosts**, mainly because NSX Manager nodes are kept on separate hosts. The VCF Installer has a built-in resource calculator. Always confirm against the docs for your exact version.

### Use cases Broadcom positions VCF for

| Theme | Use cases |
|---|---|
| Infrastructure modernization | Private cloud on-premises or at the edge; automated Infrastructure as a Service (IaaS); extend the data center to the cloud |
| Unified cloud experience | Kubernetes and modern apps; Private Artificial Intelligence (AI); traditional VM workloads |
| Secure and resilient platform | Ransomware protection and recovery; disaster recovery; integrated security and compliance |

## Configuration

There is nothing to configure in this theory lesson; it is the map. The separate Practical Guides section starts with a single ESX host and grows into a full VCF deployment. For now, build a component table: record which appliances you will eventually run, which domain they belong to and their Fully Qualified Domain Names (FQDNs).

## CLI / API

VCF is driven mainly through User Interfaces (UIs) such as VCF Operations and vSphere Client, and through Representational State Transfer Application Programming Interfaces (REST APIs) exposed by SDDC Manager, VCF Operations, vCenter and NSX. You will meet the first Command-Line Interface (CLI) in Phase 1: on an ESX host, `esxcli system version get` tells you exactly which build the host runs, which is the first thing VCF checks when you commission a host.

```shell
esxcli system version get
```

APIs and PowerCLI are covered in the Automation phase.

## Failure Scenarios

Because VCF is layered, the *scope* of a failure depends on the layer:

| What fails | Immediate impact | What keeps working |
|---|---|---|
| One ESX host | Its VMs go down; vSphere HA restarts them elsewhere | Rest of the cluster |
| A workload domain vCenter | No management of that domain (no new VMs, no DRS) | Running VMs, HA restarts |
| NSX Manager cluster | No network configuration changes | Existing data-plane forwarding and firewall rules on hosts |
| SDDC Manager | No instance workflows (commission, domain changes, lifecycle) | All running workloads and vCenters |
| VCF Operations | No fleet console, monitoring, central licensing/certificate tasks | All workloads and infrastructure |
| Management domain cluster outage | Lose management of the whole instance (its vCenters and NSX Managers live there) | Workload domain VMs keep running on their hosts |

The pattern: **the management plane can fail without stopping workloads**, but you lose the ability to change anything. That is why the management domain is protected with HA and sized carefully.

## Troubleshooting

Start every VCF problem by placing it on the map:

1. **Which level?** Fleet (VCF Operations/Automation), instance (SDDC Manager), domain (vCenter/NSX), or host (ESX)?
2. **Which component owns the action that failed?** For example, a workload domain creation is requested in VCF Operations but executed by SDDC Manager, which calls vCenter, NSX and ESX.
3. **Check the shared dependencies first**: Domain Name System (DNS) forward and reverse resolution, Network Time Protocol (NTP), certificates and passwords. These break many components at once.
4. **Then go to that component's logs and UI.** Later phases teach each component's evidence.

## Real-World Scenario

A regional retailer runs 40 standalone vSphere clusters managed by four teams. Upgrades take months because every team validates its own versions, and nobody can answer "how many hosts are on a vulnerable build?" They adopt VCF: one fleet with VCF Operations for visibility, a management domain for the management appliances, and separate workload domains for production, test and a Payment Card Industry (PCI)-scoped payment zone. Upgrades now follow one BOM, and the PCI workload domain can be patched on its own schedule because domains are lifecycle units. Their existing vCenters that cannot be rebuilt yet are added to the fleet as standalone vCenters monitored by VCF Operations.

## Exam Focus

:::exam
- Know the **five pillars** and which are VCF-only (NSX, VCF Automation) versus also in VVF.
- Know the **hierarchy** and the scope of each component: VCF Operations and VCF Automation per **fleet**; SDDC Manager per **instance**; vCenter per **domain**.
- Know that workload domain vCenter/NSX Manager appliances run **in the management domain**.
- Objective 2.1 asks for private cloud principles, use cases and value proposition; expect "which use case" style questions.
:::

## Common Exam Traps

:::trap
- "SDDC Manager is the central console of VCF 9." No: **VCF Operations** is. SDDC Manager is per instance and its UI is deprecated in 9.0.
- "Each workload domain has its own VCF Operations." No: one VCF Operations per **fleet**.
- "Workload domain vCenters run on the workload domain hosts." No: they are deployed into the **management domain**.
- "Cloud Builder deploys VCF 9." No: the **VCF Installer** does.
:::

## Knowledge Check

::quiz

## Summary

- VCF is a private cloud platform: vSphere, vSAN, NSX (the SDDC) plus VCF Operations and VCF Automation (operate and consume).
- VCF 9 organises everything as **fleet → instance → domain → cluster → host**.
- Fleet-level: VCF Operations, fleet management, VCF Automation. Instance-level: SDDC Manager, NSX, vCenter, ESX.
- The platform is deployed by the VCF Installer and lifecycle-managed as one validated BOM.
- Management-plane failures stop changes, not running workloads.

## Next Topic

[Private Cloud and the SDDC](lesson:private-cloud-and-sddc): what "private cloud" really means, and the principles the exam expects you to recognise.
