---
id: vcf9-architecture-overview
title: "VCF 9 Architecture: Fleet, Instance, Domain, Cluster"
phase: p06-vcf-architecture
module: m06-structure
version: vcf9
minutes: 40
difficulty: intermediate
summary: The four-level VCF 9 hierarchy (fleet, VCF instance, domain, cluster), which components live at fleet level and which at instance level, and what changed from VCF 5.x.
topics: [vcf-fleet, management-domain, workload-domains, sddc-manager, fleet-management]
objectives: ["4.1", "4.2"]
keyTerms: [fleet, vcf-instance, management-domain, workload-domain, vcf-operations, fleet-management, sddc-manager, vcf-automation, vcf-identity-broker, management-components, core-components]
labs: [lab-explore-vcf-fleet]
components: [vcf-fleet, vcf-instance, management-domain, workload-domain, vcf-operations, vcf-operations-fleet-management, sddc-manager, vcf-automation, vcf-identity-broker, vcenter, nsx-manager, esx-host]
related: [management-domain, workload-domains-architecture, vcf-operations-fleet-management, component-communication, vcf-deployment-models]
sources:
  - title: "VCF 9.0 – VCF Taxonomy (Constructs of a VCF Private Cloud)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 – VCF Management Appliances and Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF 9.0 – Architectural Options"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts.html
  - title: "VCF 9.0 – Lifecycle Management in VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 Release Notes – Bill of Materials"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/release-notes/vmware-cloud-foundation-90-release-notes/vmware-cloud-foundation-bill-of-materials.html
  - title: "VCF 9.0 Release Notes – Product Support Notes"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/release-notes/vmware-cloud-foundation-90-release-notes/platform-product-support-notes.html
  - title: "VCF Blog – VCF 9.0 Deployment Pathways"
    url: https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/
---

## Why This Matters

Every other part of VCF 9 (deployment, workload domains, lifecycle, certificates, passwords, operations) is described in terms of a small set of containers: the **fleet**, the **VCF instance**, the **domain** and the **cluster**. If you cannot say instantly which container a component belongs to, you will misread exam scenarios such as "an administrator adds a second data center" or "where are the vCenter instances of the workload domains running?".

VCF 9 also changed the vocabulary. Things that were called Aria Operations, Aria Suite Lifecycle, Cloud Builder or Workspace ONE Access in VCF 5.x now have new names or no longer exist, and the central console moved from SDDC Manager to VCF Operations. The exam is written in VCF 9 language, so this lesson is the map you will use for the rest of the course.

## Learning Objectives

- Describe the VCF 9 hierarchy: private cloud → fleet → VCF instance → domain → cluster → host.
- Classify each VCF component as **fleet-level** (management components) or **instance-level** (core components).
- Explain what a [[management-domain]] and a [[workload-domain]] contain and who creates them.
- Map VCF 5.x product names and roles to their VCF 9.0 equivalents.
- Identify the components of a VCF deployment (exam objective 4.1) and which console manages them (objective 4.2).

## Concept

### The hierarchy in one table

| Level | Official definition (VCF 9.0 taxonomy) | Example in a real company |
|---|---|---|
| VCF private cloud | The highest management level; can contain several fleets | "Contoso private cloud" |
| [[fleet\|VCF fleet]] | "An environment that is managed by a single set of fleet-level management components – VCF Operations and VCF Automation. A VCF fleet contains one or more VCF Instances." | One fleet per business unit or per regulatory boundary |
| [[vcf-instance\|VCF instance]] | "Compute, storage, networking virtual infrastructure that runs business workloads. A VCF Instance consists of VCF domains – a management domain and, optionally, additional workload domains." | One instance per data center / site |
| VCF domain | One vCenter instance plus one or more vSphere clusters with vSphere HA and DRS enabled (and an NSX Manager instance) | "mgmt" domain, "prod" domain, "dev" domain |
| vSphere cluster | A group of ESX hosts with shared/principal storage | 4-host vSAN cluster |
| ESX host | The hypervisor | Physical server |

A fleet can also include **standalone vCenter instances** that VCF Operations monitors but that are not part of a VCF instance (the official taxonomy figure shows VCF Operations managing both VCF instances and plain vCenter instances).

### Fleet-level vs instance-level components

This is the single most useful classification in VCF 9. TechDocs calls them **VCF management components** (fleet level) and **VCF core components** (instance level):

| Fleet level ("management components") | Instance level ("core components") |
|---|---|
| [[vcf-operations\|VCF Operations]] | [[sddc-manager\|SDDC Manager]] (one per instance) |
| VCF Operations [[fleet-management\|fleet management]] appliance | vCenter (one per domain) |
| [[vcf-automation\|VCF Automation]] | NSX Manager (one per domain, or shared between workload domains) |
| VCF Operations for logs | ESX hosts |
| VCF Operations for networks | vSAN / principal storage |
| [[vcf-identity-broker\|VCF Identity Broker]] | |

Two components are "fleet services but deployed per instance": the **VCF Operations collector** and the **VCF Operations for networks collector**. TechDocs explicitly calls them VCF-instance-level components and recommends putting them on the VM management network of each instance's management domain.

:::vcf9 Changed in VCF 9
The **fleet** is new in VCF 9.0. In VCF 5.x each VCF instance was managed by its own SDDC Manager UI, and Aria products were optional add-ons. In 9.0, VCF Operations is mandatory for every fleet and is the console for monitoring, licensing and fleet management (lifecycle, certificates, passwords, identity). The SDDC Manager UI is deprecated (release notes: "SDDC Manager UI is now deprecated, to be removed in a future major release"), but the SDDC Manager appliance is still deployed with every instance and still orchestrates core-component work.
:::

## Architecture

::diagram[d06-fleet-hierarchy]

The official taxonomy figure shows the same idea from Broadcom's side: VCF Operations manages VCF instances (each a management domain plus workload domains) and also plain vCenter instances, while VCF Automation works with VCF instances.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/8e4db722-a16d-4a51-ab59-442828d317a4.original.svg" caption="Constructs of a VCF private cloud: VCF Operations manages VCF instances and vCenter instances; VCF Automation works with VCF instances." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/c99bb603-c1e2-495b-96ca-47c4d55c33ee.original.png" caption="Example VCF nodes configuration in a VCF fleet." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html"}

### Where things physically run

Everything in the "management" columns above is a virtual appliance. **All of them run in management domains**: fleet-level components in the management domain of the *first* VCF instance, instance-level management appliances (SDDC Manager, the vCenter and NSX Manager instances of *every* domain of that instance, the collectors) in the management domain of *their* instance. Workload domain clusters run business workloads, NSX Edge nodes and (optionally) vSphere Supervisor — not the management appliances of their own domain.

## Components

The component table published in the 9.0 deployment guide ("VCF Management Appliances and Components"):

| Component | Does what | Level |
|---|---|---|
| VCF Operations | Central operations console: monitoring, dashboards, reporting, licensing, fleet management UI | Fleet |
| VCF Operations collector (cloud proxy) | "Collects and monitors data locally in the VCF Instance" | Instance |
| VCF Operations fleet management | "Deployment, lifecycle management, and configuration for the VCF Operations, VCF Automation, and VCF Identity Broker" | Fleet |
| VCF Operations for logs | Log collection and analysis | Fleet |
| VCF Operations for networks (+ its collector) | Network visibility and flow analytics | Fleet (collector per instance) |
| VCF Identity Broker | "Connects an identity provider (IdP) to the components of the VCF fleet for single sign-on" | Fleet (scope configurable) |
| VCF Operations HCX | Workload migration between vCenter instances or clusters | Optional |
| VCF Automation | Cloud consumption, self-service, multi-tenancy | Fleet |
| SDDC Manager | Lifecycle for ESX, vCenter, NSX; workload domain deployment; vCenter import; vSAN stretched cluster configuration; certificate and password automation — exposed through VCF Operations | Instance |
| NSX Manager | Network virtualization and security management/control plane | Domain |
| NSX Edge | North-south connectivity between NSX networks and the physical network | Domain |
| vCenter | Virtualization management for one domain | Domain |
| ESX | Hypervisor | Host |

The 9.0 Bill of Materials ([[bom]]) lists these with one common version, e.g. ESX 9.0.0.0, vCenter 9.0.0.0, NSX 9.0.0.0, SDDC Manager 9.0.0.0, VCF Operations / Collector / Fleet Management / for Logs / for Networks 9.0.0.0, VCF Automation 9.0.0.0 and VCF Identity Broker 9.0.0.0.

## How It Works

How a fleet comes to exist and grows:

1. **Deploy the VCF Installer** appliance (it replaced Cloud Builder) and download binaries to it.
2. **Create a new fleet**: the installer builds the first VCF instance's management domain on your hosts and deploys vCenter, NSX Manager, SDDC Manager, VCF Operations (+ fleet management appliance + collector) and VCF Automation.
3. **Day-2 fleet components**: from VCF Operations fleet management you add VCF Operations for logs, VCF Operations for networks, VCF Identity Broker in appliance mode, and so on.
4. **Add workload domains** from VCF Operations; SDDC Manager of that instance does the actual work (deploys a vCenter and, for the first workload domain, an NSX Manager instance into the management domain, then builds the clusters on commissioned hosts).
5. **Add another VCF instance** (for example a second site): run the VCF Installer again and choose to deploy a new VCF instance into the *existing* fleet. The new instance gets its own management domain, SDDC Manager and VCF Operations collector, but reuses the fleet's VCF Operations and VCF Automation.
6. **Operate**: everything is monitored, licensed and lifecycled from the one VCF Operations console.

## Deep Dive

### Why split fleet and instance?

- **Scale**: one VCF Operations and one VCF Automation serve many instances, so you don't pay the resource and admin cost of a monitoring/automation stack per site.
- **Failure isolation**: an instance keeps running its workloads even if fleet services are down — vCenter, NSX and ESX don't depend on VCF Operations to run VMs. You lose visibility and fleet management, not the data plane.
- **Lifecycle separation**: management components are upgraded first (fleet management appliance, then VCF Operations, then the rest), and each instance's core components follow their own order (SDDC Manager → NSX → vCenter → ESX → vSAN).

### The instance is still the unit of infrastructure

Each instance has exactly one SDDC Manager (design requirement VCF-SDDCM-REQD-CFG-001: "Deploy a new SDDC Manager with each new VCF Instance"). Domains, hosts, network pools and core-component binaries belong to an instance; you cannot put a workload domain of instance A on hosts commissioned in instance B.

### Domains are isolation boundaries

Each domain has its own vCenter. In VCF 9, a new workload domain also gets a **dedicated vCenter Single Sign-On domain** (no Enhanced Linked Mode), while NSX can be dedicated or shared. Details in [Workload Domain Architecture](lesson:workload-domains-architecture).

:::legacy VCF 5.x / Legacy Context
In VCF 5.x the top of the hierarchy was the **VCF instance** managed by SDDC Manager. Product mapping to VCF 9.0 (from the 9.0 component table): VMware Aria Operations → **VCF Operations**; VMware Aria Suite Lifecycle → **VCF Operations fleet management**; Workspace ONE Access → removed, **VCF Identity Broker** is new; Aria Automation → **VCF Automation**; Aria Operations for Logs → **VCF Operations for logs**; Cloud Builder → **VCF Installer**; VMware HCX → **VCF Operations HCX**. ESXi is called **ESX** in 9.x.
:::

## Configuration

There is nothing to "configure" about the hierarchy itself — it results from deployment choices you make:

| Decision | Where you make it | Effect |
|---|---|---|
| New fleet or join existing fleet | VCF Installer wizard | Whether new VCF Operations/Automation are deployed |
| Simple or high-availability components | VCF Installer wizard | 1 node vs 3 nodes for NSX Manager, VCF Operations, VCF Automation |
| New workload domain | VCF Operations (SDDC Manager executes) | New vCenter + SSO domain, dedicated or shared NSX |
| Add cluster to a domain | VCF Operations / SDDC Manager | More capacity inside the same vCenter |

## CLI / API

The hierarchy is visible through the SDDC Manager public API of each instance (authentication with `POST /v1/tokens`):

```http
POST https://sddc-manager.lab.local/v1/tokens
{ "username": "administrator@vsphere.local", "password": "********" }

GET https://sddc-manager.lab.local/v1/domains          # management + workload domains
GET https://sddc-manager.lab.local/v1/clusters         # clusters per domain
GET https://sddc-manager.lab.local/v1/v-centers        # one vCenter per domain
GET https://sddc-manager.lab.local/v1/nsx-t-clusters   # NSX Manager instances
GET https://sddc-manager.lab.local/v1/releases         # BOM / release information
```

Fleet-level objects (VCF Operations, VCF Automation, fleet management) are managed through VCF Operations, not through the SDDC Manager API. You will use both APIs in [APIs and PowerCLI](lesson:vcf-apis-powercli).

## Failure Scenarios

| What fails | Impact | What keeps working |
|---|---|---|
| VCF Operations (fleet level) | No monitoring, no fleet management UI, no license reporting | All instances keep running workloads; vCenter/NSX consoles still work |
| Fleet management appliance | Cannot lifecycle/deploy management components | Monitoring continues |
| SDDC Manager of one instance | No workload domain creation, host commissioning or core LCM for that instance | Workloads, vCenter, NSX of that instance; other instances unaffected |
| Management domain of instance 1 | Fleet services and instance-1 management appliances down | Workload VMs in workload domains keep running (data plane on ESX), but cannot be managed |
| A workload domain vCenter | That domain cannot be managed | Other domains unaffected — domains are isolation boundaries |

## Troubleshooting

When something "in VCF" is broken, first locate it in the hierarchy:

1. **Which fleet / instance / domain?** A problem visible only in one domain usually points at that domain's vCenter or NSX Manager.
2. **Fleet or instance component?** Fleet-level symptoms (all instances show stale data) → VCF Operations or its collectors. Instance-level symptoms (cannot create a domain in site B) → SDDC Manager of site B.
3. **Check dependencies** shared by everything: DNS forward/reverse, NTP, certificates (see [Component Communication](lesson:component-communication)).
4. **Check the integration**: VCF Operations shows an instance through its VMware Cloud Foundation integration account (Administration → Integrations → Accounts → VMware Cloud Foundation). A broken integration looks like "the domain is there but has no children".

## Real-World Scenario

A retailer runs a data center in Bucharest and one in Cluj. They want one operations console, one self-service portal and separate failure domains per site.

- **Fleet**: one VCF fleet, VCF Operations and VCF Automation deployed in Bucharest's management domain.
- **Instances**: Bucharest = instance 1 (management domain + "prod" and "dev" workload domains), Cluj = instance 2 (its own management domain with SDDC Manager, vCenter, NSX Manager and a VCF Operations collector, plus a "prod-cluj" workload domain).
- **Result**: Cluj survives a Bucharest outage for running workloads; only fleet-level visibility and automation are lost until Bucharest recovers (or until fleet components are protected with a DR design — see [Deployment Models](lesson:vcf-deployment-models)).

## Lab

In the lab you will build an inventory map of a running VCF instance — every appliance, its level, where it runs and what it depends on.

::lab[lab-explore-vcf-fleet]

## Exam Focus

:::exam
- Memorize the hierarchy: **fleet → instance → domain → cluster → host**.
- Fleet-level = VCF Operations, fleet management, VCF Automation, Operations for logs/networks, Identity Broker. Instance-level = SDDC Manager, vCenter, NSX Manager, ESX, storage.
- Collectors are deployed **per instance**.
- VCF Operations is the 9.0 console for fleet management; SDDC Manager UI is deprecated but the appliance still exists in every instance.
- Know the renames (Aria → VCF Operations/Automation, Aria Suite Lifecycle → fleet management, Cloud Builder → VCF Installer, WSA → gone, Identity Broker new).
:::

## Common Exam Traps

:::trap
- "SDDC Manager was removed in VCF 9" — **false**. The UI is deprecated; the appliance is deployed with every instance and still executes core lifecycle and domain operations.
- "Each VCF instance has its own VCF Operations" — **false**. One VCF Operations per fleet; each additional instance gets a **collector**.
- "The workload domain's vCenter runs in the workload domain" — **false**. It runs in the management domain of the same instance.
- "Fleet = vCenter SSO domain" — **no**. A fleet is defined by its shared VCF Operations/Automation; SSO is configured separately (VCF SSO / Identity Broker models).
:::

## Knowledge Check

::quiz

## Summary

- VCF 9 organizes infrastructure as **private cloud → fleet → VCF instance → domain → cluster → host**.
- A fleet is defined by one set of fleet-level management components (VCF Operations, VCF Automation, plus fleet management, logs, networks, Identity Broker).
- A VCF instance = one management domain + optional workload domains, managed by its own SDDC Manager.
- Management appliances run in management domains: fleet components in the first instance, instance components in their own instance.
- VCF Operations replaces SDDC Manager as the console; SDDC Manager remains the instance orchestrator.

## Next Topic

Next you open the box that holds all of this: the [management domain](lesson:management-domain) — exactly which appliances it hosts, how many hosts it needs and what storage it can use.
