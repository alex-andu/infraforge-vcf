---
id: management-domain
title: The Management Domain
phase: p06-vcf-architecture
module: m06-structure
version: vcf9
minutes: 40
difficulty: intermediate
summary: What the management domain hosts in the first and in additional VCF instances, minimum hosts, supported principal storage and cluster models, and how to protect management workloads.
topics: [management-domain, vcf-fleet, sddc-manager, wld-storage]
objectives: ["4.1"]
keyTerms: [management-domain, vcf-instance, sddc-manager, vcf-operations, fleet-management, vcf-operations-collector, vcf-identity-broker, principal-storage, supplemental-storage]
labs: [lab-explore-vcf-fleet, lab-deploy-vcf-management-domain]
components: [management-domain, sddc-manager, vcenter, nsx-manager, vcf-operations, vcf-operations-fleet-management, vcf-operations-collector, vcf-automation, vcf-identity-broker, vsan, nsx-edge-cluster]
related: [vcf9-architecture-overview, workload-domains-architecture, vcf-deployment-models, vcf-installer-workflow]
sources:
  - title: "VCF 9.0 – Management Domain Model"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/workload-domain-deployment-models/management-domain-deployment-model.html
  - title: "VCF 9.0 – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "VCF 9.0 – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "VCF 9.0 – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
  - title: "VCF 9.0 – What Is the VCF Installer?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/what-is-the-vcf-installer-.html
  - title: "VCF 9.0 – Fleet Level Components Networking Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/fleet-level-component-backing-networking-models.html
  - title: "VCF 9.0 – SDDC Manager Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/vcf-operations-design/sddc-manager-design.html
---

## Why This Matters

The management domain is the "control room" of a VCF (VMware Cloud Foundation) instance. Every vCenter, every NSX Manager, SDDC (Software-Defined Data Center) Manager and — in the first instance — the whole fleet management stack run here. If the management domain is undersized, badly placed or unprotected, *every* domain of the instance (and possibly the whole fleet) loses its management plane at once. Exam questions love to ask "where does component X run?" and "how many hosts do I need?", and the answers are almost always "in the management domain" and "it depends on simple vs highly available".

## Learning Objectives

- List the appliances in the management domain of the **first** VCF instance and of **additional** instances.
- State the minimum host count of the management domain default cluster for simple and highly available installs.
- Choose a supported principal storage type for the management domain default cluster and for additional management clusters.
- Explain why workload-domain vCenter and NSX Manager instances run in the management domain.
- Apply the recommendation for running business workloads in the management domain (resource pools).

## Concept

TechDocs: "The management domain in a VCF fleet hosts the management components of the VCF Instance where it is deployed and the management components of the fleet." It is **created during deployment (VCF Installer) or convergence** of existing vSphere, and there is exactly one per [[vcf-instance|VCF instance]].

Design requirement **VCF-WLD-REQD-CFG-001**: "Deploy a management domain to host all management components for the VCF instance." The justification: guaranteed resources for management, the option of dedicated hardware, and a lifecycle separate from workloads. The implication: you must size it for the future (every new workload domain adds a vCenter and possibly an NSX Manager cluster here).

### What it hosts

| Category | First VCF instance of the fleet | Additional VCF instances |
|---|---|---|
| Instance management | ESX hosts, vCenter, NSX Manager (dedicated to the management domain), SDDC Manager | Same |
| Fleet management | VCF Operations (+ fleet management appliance, collector), VCF Automation; later VCF Operations for logs/networks, VCF Identity Broker appliance | Only instance-level VCF Operations **collector(s)** (and networks collector if used) |
| Workload-domain management | vCenter and NSX Manager instances of every workload domain in this instance | Same |
| Data plane | NSX Edge nodes (allowed) | Same |
| Business workloads | Allowed (with resource pools) | Allowed |

### Minimum hosts and storage

From the Storage Models page:

| Cluster | Minimum hosts |
|---|---|
| Management domain **default** cluster, Simple install | **3** |
| Management domain **default** cluster, Highly Available install | **4** |
| All workload-domain clusters, including additional clusters in the management domain | 3 |

With vSAN, three hosts tolerate one host failure but cannot rebuild objects back to policy compliance; four hosts tolerate one failure *and* automatically rebuild — that is why the HA (High Availability) install needs four.

| Principal storage | Mgmt default cluster | Additional mgmt clusters | VI workload domain |
|---|---|---|---|
| vSAN ESA | Yes | Yes | Yes |
| vSAN OSA | Yes | Yes | Yes |
| vSAN storage cluster | **No** | Yes | Yes |
| vSAN compute cluster | **No** | Yes | Yes |
| Fibre Channel (VMFS) | Yes | Yes | Yes |
| NFS v3 | Yes | Yes | Yes |
| iSCSI, NVMe/TCP, NVMe/FC, NVMe/RDMA, NFS 4.1 | Supplemental only | Supplemental only | Supplemental only |

[[principal-storage|Principal storage]] is chosen when the domain/cluster is created; [[supplemental-storage|supplemental storage]] is added afterwards.

## Architecture

::diagram[d06-management-domain-components]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/c611c880-bc04-4267-8bd0-56b9ac91b17b.original.svg" caption="Management Domain Model (VCF 9.0 design library)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/workload-domain-deployment-models/management-domain-deployment-model.html"}

### Networks

By default the fleet-level components are deployed on the **management domain VM management network** — the same VLAN-backed distributed port group used for vCenter and NSX Manager. Alternatives (dedicated port group, NSX VLAN (Virtual Local Area Network) segment, NSX overlay segment, stretched overlay segment) are Day-2, API-driven options. Collectors stay on the VM management network of their instance's management domain.

SDDC Manager is placed in the first availability zone of the management domain, on the VM management network.

## Components

| Appliance | Simple install | HA install | Deployed by |
|---|---|---|---|
| vCenter (management) | 1 | 1 (protected by vSphere HA) | VCF Installer |
| SDDC Manager | 1 | 1 | VCF Installer (the installer appliance itself switches to SDDC Manager mode if deployed on a management host) |
| NSX Manager (management) | 1 node | 3 nodes | VCF Installer |
| VCF Operations | 1 node (primary) | 3 nodes (primary, replica, data) | VCF Installer |
| VCF Operations fleet management | 1 | 1 | VCF Installer |
| VCF Operations collector | 1 | 1 | VCF Installer |
| VCF Automation | 1 node | 3 nodes | VCF Installer (or later) |
| **Total at deployment** | **7 appliances** | **13 appliances** | |
| VCF Operations for logs, for networks, Identity Broker appliance, HCX | — | — | Day 2 via fleet management |
| NSX Edge cluster | — | — | Day 2 |

The [[vcf-identity-broker|VCF Identity Broker]] can also run **embedded** in the management domain vCenter (no extra appliance) — a 3-node appliance cluster is the alternative.

## How It Works

Bring-up sequence of a management domain (first instance), simplified:

1. ESX hosts are installed and prepared (DNS (Domain Name System) forward/reverse records, NTP (Network Time Protocol), network).
2. The VCF Installer validates the hosts and the network specification.
3. vSAN (or other principal storage) is configured on the default cluster and vCenter is deployed onto it.
4. The vSphere Distributed Switch and port groups (management, vMotion, vSAN, …) are created.
5. NSX Manager is deployed and the hosts are prepared as NSX transport nodes.
6. SDDC Manager is deployed (or the installer converts itself into SDDC Manager).
7. VCF Operations, the fleet management appliance and the collector are deployed; VCF Automation is deployed now or later.
8. The instance is registered in VCF Operations; from now on, workload domains are created from there.

Details of the installer workflow: [VCF Installer Workflow](lesson:vcf-installer-workflow).

## Deep Dive

### Why workload-domain management lives here

Each new workload domain gets a vCenter and (first time, or when dedicated) an NSX Manager instance. SDDC Manager deploys these appliances **into the management domain**. Benefits: the management plane of a workload domain is not affected by workload resource contention, and workload clusters can be rebuilt or upgraded without moving their own vCenter. Cost: the management domain grows with every domain — plan capacity for N vCenters and N×(1 or 3) NSX Managers.

### Running business workloads in the management domain

Allowed (the management domain model lists "Can also run business workloads"). Recommendation **VCF-WLD-RCMD-CFG-001**: create resource pools `<cluster>-rp-sddc-mgmt`, `<cluster>-rp-sddc-edge`, `<cluster>-rp-user-edge`, `<cluster>-rp-user-vm` so management appliances always win contention. Implication: you manage those pools yourself.

### Cluster models

| Model | Mgmt default (first) cluster | Additional mgmt clusters |
|---|---|---|
| Single-rack | Yes | Yes |
| Layer 2 multi-rack | Yes | Yes |
| Layer 3 multi-rack | **No** | Yes |
| Stretched | Yes, **Day 2** | Yes |

:::legacy VCF 5.x / Legacy Context
In VCF 5.x, Cloud Builder deployed the management domain with a **4-host minimum** and vSAN as principal storage; the "consolidated architecture" ran workloads in the management domain, while the "standard architecture" separated them. Aria products (Operations, Logs, Automation) were optional and deployed via Aria Suite Lifecycle, often in the management domain or an Aria-specific network. In 9.0, the default management cluster can be 3 hosts (simple) and can use vSAN ESA/OSA, FC or NFS v3, and VCF Operations is a mandatory part of every fleet.
:::

:::vcf9 Changed in VCF 9
The management domain of the *first* instance now hosts **fleet** services as well as instance services. Additional instances do not get their own VCF Operations — only collectors.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Planning checklist for a management domain:

| Item | Decision |
|---|---|
| Install type | Simple (3 hosts, 7 appliances) vs HA (4 hosts, 13 appliances) |
| Principal storage | vSAN ESA / OSA, FC, NFS v3 |
| Cluster model | Single-rack or L2 multi-rack (stretch on Day 2) |
| Network for fleet components | Default VM management network (installer) or Day-2 alternative |
| Capacity headroom | +1 vCenter per future workload domain, + NSX Manager node(s) when dedicated NSX |
| Business workloads? | Only with resource pools |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

```http
GET https://sddc-manager.lab.local/v1/domains
# the management domain has "type": "MANAGEMENT"
GET https://sddc-manager.lab.local/v1/clusters
GET https://sddc-manager.lab.local/v1/sddc-managers
```

In the vSphere Client of the management vCenter you see the appliances as VMs; in VCF Operations you see them as objects under the instance's management domain.

## Failure Scenarios

| Failure | Impact | Mitigation |
|---|---|---|
| One host fails (4-host vSAN) | vSphere HA restarts appliances; vSAN rebuilds | HA install, admission control |
| One host fails (3-host vSAN) | Appliances restart; objects stay non-compliant until host returns | Replace host quickly |
| Management vCenter down | No vSphere management of management domain; SDDC Manager workflows fail | vCenter backup, vSphere HA |
| Management NSX Manager (simple) down | NSX management of mgmt domain unavailable; existing data plane continues | HA NSX model (3 nodes) |
| Whole management domain down | Management plane of every domain of the instance (and fleet services if first instance) lost; workload VMs keep running | Sizing, backups, DR design |

## Troubleshooting

- **Appliance won't power on after host failure**: check vSphere HA admission control and resource pools.
- **Management cluster low on capacity after adding domains**: each workload domain added a vCenter (and possibly 3 NSX Managers) — add hosts to the management cluster.
- **Deployment fails at storage step**: verify the chosen principal storage is supported for the *default* management cluster (no vSAN storage cluster / compute cluster).
- **DNS/NTP**: management bring-up stops early if forward/reverse DNS or time sync is wrong — see [DNS and NTP](lesson:dns-ntp-dependencies).

## Real-World Scenario

A mid-size company wants VCF for production with high availability but has budget for only 4 management hosts. Using the HA install they get 3-node NSX Manager, 3-node VCF Operations and 3-node VCF Automation on 4 vSAN ESA hosts, with DRS (Distributed Resource Scheduler) anti-affinity keeping cluster nodes apart. They plan three workload domains, so they size the management cluster for 4 extra vCenters (management + 3) and decide that two domains will **share** one NSX Manager cluster to save 3 appliances.


## Exam Focus

:::exam
- Management domain = created at deployment/convergence; one per instance.
- First instance: also VCF Operations, fleet management, collector, VCF Automation. Additional instances: collectors only.
- Workload-domain vCenter and NSX Manager run in the management domain.
- Default cluster minimum: **3 hosts (simple)**, **4 hosts (HA)**.
- Default cluster cannot be a vSAN storage cluster or vSAN compute cluster, and cannot use the L3 multi-rack model.
:::

## Common Exam Traps

:::trap
- "The management domain must have 4 hosts" — legacy thinking; in 9.0 it is 3 for simple, 4 for HA.
- "iSCSI can be principal storage" — no, iSCSI and NVMe variants are **supplemental** only.
- "Business workloads are not allowed in the management domain" — they are allowed; use resource pools.
- "Each VCF instance deploys its own VCF Operations" — only collectors.
:::

## Knowledge Check

::quiz

## Summary

- The management domain hosts instance management (vCenter, NSX Manager, SDDC Manager), the management appliances of all workload domains and — in the first instance — the fleet services.
- Simple install: 3 hosts, 7 appliances. HA install: 4 hosts, 13 appliances.
- Principal storage for the default cluster: vSAN ESA/OSA, FC or NFS v3.
- Size it for growth; protect it with HA, anti-affinity and backups.

## Next Topic

Continue with [Workload Domain Architecture](lesson:workload-domains-architecture): what a VI workload domain contains, how it is isolated, and when to share NSX.
