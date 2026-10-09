---
id: workload-domains-architecture
title: Workload Domain Architecture and Isolation
phase: p06-vcf-architecture
module: m06-structure
version: vcf9
minutes: 40
difficulty: intermediate
summary: What a VI workload domain contains, where its management appliances run, how it is isolated (vCenter, SSO, NSX), and when to share NSX Manager and edge clusters.
topics: [workload-domains, wld-storage, nsx-architecture, identity-sso]
objectives: ["4.1"]
keyTerms: [workload-domain, vi-workload-domain, management-domain, sddc-manager, principal-storage, supplemental-storage, vcf-single-sign-on]
labs: [lab-explore-vcf-fleet, lab-commission-hosts-create-wld]
incidents: [inc-host-commissioning]
components: [workload-domain, vcenter, nsx-manager, nsx-edge-cluster, esx-host, vsan, vds, supervisor, sddc-manager]
related: [vcf9-architecture-overview, management-domain, host-commissioning-wld-creation, workload-domain-storage, supervisor-in-workload-domain]
sources:
  - title: "VCF 9.0 – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "VCF 9.0 – Workload Domain Model (design library)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/workload-domain-deployment-models/workload-domain-deployment-model.html
  - title: "VCF 9.0 – VCF Taxonomy"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 – NSX Edge Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/nsx-edge-cluster-models.html
  - title: "VCF 9.0 – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "VCF 9.0 – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
  - title: "VCF 9.0 – VCF Single Sign-On Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
  - title: "Broadcom KB 442933 – Steps for adding new host to Workload Domain Cluster in VCF 9.x"
    url: https://knowledge.broadcom.com/external/article/442933/steps-for-adding-new-host-to-workload-do.html
  - title: "Broadcom KB 439510 – Creating a new workload domain using VCF Operations fails (Failed to validate domain spec)"
    url: https://knowledge.broadcom.com/external/article/439510/creating-a-new-workload-domain-using-vcf.html
---

## Why This Matters

Workload domains are how VCF (VMware Cloud Foundation) separates "who runs what". Production vs development, PCI vs non-PCI, tenant A vs tenant B — each can be its own domain with its own vCenter, its own SSO (Single Sign-On) domain, its own lifecycle and, if you want, its own NSX. Choosing between a new domain and a new cluster in an existing domain, or between shared and dedicated NSX, is a classic "Given a scenario…" exam question (objective 4.1) and a real design decision with cost consequences.

## Learning Objectives

- Define a VI workload domain and list what VCF deploys for it.
- Explain where the workload domain's vCenter and NSX Manager run.
- Compare **dedicated** and **shared** NSX instances, and know when NSX Edge clusters can be shared.
- Describe workload domain isolation (vCenter, SSO, lifecycle) and its implications.
- Choose cluster models and principal storage for a workload domain.

## Concept

TechDocs defines a workload domain as "a logical unit of application-ready infrastructure that groups ESX hosts managed by a vCenter instance". VCF 9.0 workload domains are **VI workload domains** ([[vi-workload-domain]]): you create them in **VCF Operations** to run consumer workloads, and "for the first workload domain in your environment, VCF Operations deploys a vCenter instance and an NSX Manager instance". SDDC (Software-Defined Data Center) Manager of the instance executes the work.

### Attributes of the workload domain model

| Attribute | VCF 9.0 |
|---|---|
| vCenter | Dedicated — one per workload domain, deployed in the **management domain** |
| vCenter Single Sign-On domain | **Dedicated** (upgraded instances may still have shared SSO domains) |
| Identity provider | Can use a dedicated identity provider |
| NSX | **Dedicated** NSX Manager instance or **shared** with other workload domains |
| NSX Edge clusters | Run in the workload domain; shareable between domains that share the NSX Manager |
| Resource allocation | NSX Edge nodes and business workloads |
| Scale | Up to 24 workload domains per VCF instance (per the Workload Domain Models page; check the configuration maximums for your release) |
| Cluster models | Single-rack, L2 multi-rack, L3 multi-rack, stretched |
| Minimum hosts per cluster | 3 |
| Workload network type | IPv4 or IPv6 |
| Lifecycle | Independent from other domains |

Design recommendation from the design library: "Use workload domains for customer workloads" — separation from management, at the cost of extra hardware.

## Architecture

::diagram[d06-workload-domain-layout]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4d229944-9a22-4b9e-ba1b-8a558a80c6a3.original.svg" caption="Workload Domain Models in VMware Cloud Foundation." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html"}

### Management plane vs data plane placement

| Item | Runs in |
|---|---|
| WLD vCenter appliance | Management domain |
| WLD NSX Manager node(s) | Management domain (first WLD or dedicated NSX) |
| NSX Edge nodes for the WLD | Workload domain clusters (or shared edge cluster) |
| Business VMs, Supervisor, VKS clusters | Workload domain clusters |
| ESX hosts of the WLD | Commissioned into the instance, assigned to WLD clusters |

## Components

| Component | Role in the workload domain |
|---|---|
| ESX hosts | Commissioned into SDDC Manager inventory (with a network pool), then assigned to a cluster |
| vCenter | Manages the domain's clusters; its own SSO domain |
| vSphere Distributed Switch | Created per cluster profile for management, vMotion, storage and NSX traffic |
| Principal storage | vSAN ESA/OSA, vSAN storage cluster, vSAN compute cluster, FC (VMFS) or NFS v3 |
| Supplemental storage | iSCSI, NVMe/TCP, NVMe/FC, NVMe/RDMA, NFS 4.1, plus FC/NFS added later |
| NSX Manager | Dedicated or shared; prepares the hosts as transport nodes |
| NSX Edge cluster | North-south routing and stateful services for the domain |
| vSphere Supervisor (optional) | Kubernetes/VM self-service on the domain's clusters |

A **vSAN compute cluster** has no local vSAN storage and mounts a remote vSAN datastore; it "must be co-located in the same workload domain as its corresponding vSAN storage cluster".

## How It Works

Creating a workload domain:

1. **Commission hosts** into the instance inventory (prepared ESX hosts + a **network pool** that provides vMotion/storage IPs).
2. **Download binaries**: the vCenter and NSX install binaries must be available (missing binaries fail validation with "Failed to retrieve component binary" — KB 439510).
3. **Start the wizard in VCF Operations**: name, SSO/vCenter details, NSX choice (new/dedicated or join an existing NSX instance), cluster, storage, networking.
4. **SDDC Manager validates the spec** (domainmanager service) and starts the workflow.
5. SDDC Manager deploys the new **vCenter** into the management domain and creates the first cluster with the commissioned hosts.
6. **NSX**: either deploys a new NSX Manager instance into the management domain or registers the new vCenter with an existing shared NSX instance; hosts become transport nodes.
7. Storage, VDS (vSphere Distributed Switch) and NSX host preparation complete; the domain appears in VCF Operations inventory.
8. Day 2: add edge cluster, Supervisor, more clusters or hosts (host additions via VCF Operations/SDDC Manager — not "Add Host" directly in vCenter).

Full procedure: [Host Commissioning and Workload Domain Creation](lesson:host-commissioning-wld-creation).

## Deep Dive

### Shared vs dedicated NSX

| | Dedicated NSX | Shared NSX |
|---|---|---|
| NSX Manager appliances | New instance (1 or 3 nodes) per domain | Reuse the NSX Manager of another workload domain |
| Management domain footprint | Grows per domain | Grows only once |
| Blast radius | NSX failure / upgrade affects one domain | Affects all domains sharing it |
| Edge clusters | Per domain | Can be shared between the sharing domains |
| Security policy | Separate DFW policy space | One policy space spanning the domains |
| Typical use | Regulated/tenant isolation, independent NSX lifecycle | Many similar domains, save resources |

The management domain model lists its NSX Manager as **dedicated**; sharing is a workload-domain-to-workload-domain option.

### Domain vs cluster

| Need | New workload domain | New cluster in existing domain |
|---|---|---|
| Separate vCenter / SSO / RBAC (Role-Based Access Control) | ✔ | ✘ |
| Separate lifecycle (upgrade timing) | ✔ | ✘ (domain upgrades together) |
| Extra management overhead | vCenter (+ NSX), passwords, certificates | Minimal |
| Just more capacity / different hardware | Overkill | ✔ |

Implication from TechDocs: every workload domain adds **password management overhead** (more vCenter/NSX accounts to rotate).

:::legacy VCF 5.x / Legacy Context
In VCF 4.x and early 5.x, workload domain vCenter instances joined the management domain's SSO domain by default (Enhanced Linked Mode), giving one shared vsphere.local. VCF 5.0 introduced **isolated workload domains** with their own SSO domain as an option. In 9.0 a new workload domain gets a **dedicated** SSO domain, ELM is deprecated, and single sign-on across domains is delivered by VCF SSO with the VCF Identity Broker. Workload domains were created in the **SDDC Manager UI**; in 9.0 you create them from **VCF Operations**.
:::

:::vcf9 Changed in VCF 9
Workload domains are created and managed from VCF Operations; SDDC Manager executes. vCenter ELM is deprecated — VCF Operations grouping replaces the "single pane" ELM used to give.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Decisions you make in the workload domain wizard:

| Decision | Options |
|---|---|
| NSX | New dedicated NSX Manager (simple 1 node / HA (High Availability) 3 nodes) or shared existing |
| Cluster model | Single-rack, L2 multi-rack, L3 multi-rack, stretched |
| Principal storage | vSAN ESA/OSA, vSAN storage/compute cluster, FC, NFS v3 |
| Hosts | ≥ 3 commissioned hosts, uniform image/NIC layout |
| Networking | VDS profile, network pool, IPv4/IPv6 workload network |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

```http
GET  https://sddc-manager.lab.local/v1/domains       # list domains (MANAGEMENT / VI)
GET  https://sddc-manager.lab.local/v1/hosts         # commissioned hosts and their status
POST https://sddc-manager.lab.local/v1/hosts         # commission hosts
POST https://sddc-manager.lab.local/v2/domains       # create a domain from a JSON spec
GET  https://sddc-manager.lab.local/v1/nsx-t-clusters # see which domains share an NSX instance
```

SDDC Manager log for domain workflows (KB 439510): `/var/log/vmware/vcf/domainmanager/domainmanager.log`.

## Failure Scenarios

| Failure | Impact |
|---|---|
| WLD vCenter down | Only that domain unmanageable; VMs keep running; other domains fine |
| Shared NSX Manager cluster down | Management/control plane loss for **all** domains sharing it; existing data plane keeps forwarding |
| Shared edge cluster down | North-south loss for all domains using it |
| Domain creation fails at validation | Missing binaries, bad DNS (Domain Name System), host issues — nothing is deployed yet |
| Host added outside VCF (directly in vCenter) | Drift between SDDC Manager inventory and vCenter; future LCM (Lifecycle Management) problems |

## Troubleshooting

1. **Validation fails**: read the message in VCF Operations, then `domainmanager.log` on SDDC Manager. "Failed to retrieve component binary" → download vCenter/NSX install binaries.
2. **Domain created but empty in VCF Operations inventory**: re-validate the VMware Cloud Foundation integration account (Administration → Integrations → Accounts) — KB 440502.
3. **Host can't be added to a cluster**: commission it first; NIC count/layout must match the cluster image (KB 442933).
4. **NSX problems in several domains at once**: check whether they share one NSX Manager instance.

## Real-World Scenario

A bank needs: a PCI domain whose admins must not see other environments, a general production domain and a dev domain. Design: **PCI** = workload domain with **dedicated** NSX (HA, 3 nodes) and a dedicated identity provider; **prod** and **dev** = two workload domains **sharing** one NSX instance and one edge cluster. The management domain is sized for 4 vCenters (mgmt + 3) and 3 NSX instances (mgmt + PCI + shared).


## Exam Focus

:::exam
- A workload domain = dedicated vCenter + dedicated SSO domain + dedicated or shared NSX + ≥ 3-host clusters.
- WLD vCenter/NSX Manager run in the **management domain**; edges and workloads run in the WLD.
- Edge clusters can be shared only between domains sharing the NSX Manager.
- Created from **VCF Operations**; executed by SDDC Manager.
:::

## Common Exam Traps

:::trap
- "Two workload domains can share a vCenter" — no, one vCenter per domain; to share a vCenter add a **cluster**.
- "Workload domains share the management domain SSO by default in 9.0" — no, dedicated SSO domain (shared only in some upgraded instances).
- "An edge cluster can be shared by any domains" — only those sharing the same NSX Manager.
- "Sharing NSX gives the strongest isolation" — the opposite; dedicated NSX isolates better.
:::

## Knowledge Check

::quiz

## Summary

- VI workload domains provide isolated, independently lifecycled infrastructure for workloads.
- Each has its own vCenter and SSO domain; NSX is dedicated or shared.
- Their management appliances live in the management domain; edges and workloads in the domain.
- Use a new domain for isolation/lifecycle separation; a new cluster for capacity.

## Next Topic

Next: [Fleet Management in VCF Operations](lesson:vcf-operations-fleet-management) — the console that creates domains, rotates passwords, replaces certificates and runs lifecycle across the fleet.
