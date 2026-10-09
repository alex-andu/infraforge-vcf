---
id: vcf-deployment-models
title: "VCF 9 Deployment Models: Components, Fleets, Clusters"
phase: p06-vcf-architecture
module: m06-management
version: vcf9
minutes: 50
difficulty: advanced
summary: The Architectural Options of VCF 9.0 — simple vs high-availability component models, fleet deployment designs, cluster models (single-rack, multi-rack, stretched), SSO and edge models — and how to pick one for a scenario.
topics: [deployment-models, vcf-fleet, design-availability, management-domain, identity-sso]
objectives: ["4.1"]
keyTerms: [simple-deployment-model, ha-deployment-model, fleet, vcf-instance, management-domain, vcf-identity-broker, vcf-single-sign-on]
labs: [lab-vcf-planning-workbook, lab-explore-vcf-fleet]
components: [vcf-fleet, vcf-instance, management-domain, vcf-operations, vcf-automation, nsx-manager, vcf-identity-broker, vcf-operations-logs, vcf-operations-networks, nsx-edge-cluster, vcf-installer]
related: [management-domain, workload-domains-architecture, deployment-planning-prereqs, vcf-installer-workflow, design-availability-failure-domains]
sources:
  - title: "VCF 9.0 – Architectural Options"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts.html
  - title: "VCF 9.0 – VCF Fleet Deployment Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html
  - title: "VCF 9.0 – VCF Operations Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html
  - title: "VCF 9.0 – VCF Automation Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-automation-deployment-models.html
  - title: "VCF 9.0 – NSX Management and Control Plane Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-networking-management-and-control-plane.html
  - title: "VCF 9.0 – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
  - title: "VCF 9.0 – VCF Single Sign-On Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
  - title: "VCF 9.0 – NSX Edge Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/nsx-edge-cluster-models.html
  - title: "VCF 9.0 – vSphere Supervisor Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-supervisor-deployment-types.html
  - title: "VCF 9.0 – VCF Edge Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-edge.html
  - title: "VCF 9.0 – What Is the VCF Installer?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/what-is-the-vcf-installer-.html
  - title: "VCF Blog – VCF 9.0 Deployment Pathways"
    url: https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/
---

## Why This Matters

Exam objective 4.1 includes "Given a scenario identify the appropriate VMware Cloud Foundation deployment models". In VCF (VMware Cloud Foundation) 9.0 "deployment model" is not one choice but a stack of choices, documented under **Architectural Options** in TechDocs: how many nodes each management component has (simple vs high availability), how the fleet spans sites (basic, site HA (High Availability), DR, both), how clusters span racks and zones, and how identity is scoped. A scenario gives you requirements (budget, availability, sites, latency); you must map them to the right model.

## Learning Objectives

- Compare the **simple** and **high availability** deployment of management components (node counts, host counts).
- Describe the four **fleet deployment designs** and the events each protects against.
- Choose a **vSphere cluster model** (single-rack, L2/L3 multi-rack, stretched) and know its restrictions.
- Describe VCF Operations, VCF Automation, NSX Manager, Identity Broker and VCF SSO (Single Sign-On) models.
- Name the four **deployment pathways** of VCF 9 (new fleet, new instance, converge, import).

## Concept

### Deployment pathways

| Pathway | What happens |
|---|---|
| New fleet | VCF Installer deploys the first VCF instance and the fleet components |
| New instance in existing fleet | VCF Installer deploys a new instance that uses the existing VCF Operations/Automation |
| Converge existing vCenter | Existing vSphere environment becomes the management domain of a VCF instance |
| Import vCenter | Existing vCenter becomes a workload domain of an existing instance |

### Simple vs high availability (VCF Installer)

| Appliance | Simple | High availability |
|---|---|---|
| vCenter | 1 | 1 |
| SDDC (Software-Defined Data Center) Manager | 1 | 1 |
| NSX Manager | 1 | 3 |
| VCF Operations | 1 (primary) | 3 (primary, replica, data) |
| Fleet management appliance | 1 | 1 |
| VCF Operations collector | 1 | 1 |
| VCF Automation | 1 | 3 |
| **Total** | **7** | **13** |
| Management default cluster minimum hosts | **3** | **4** |

[[simple-deployment-model|Simple]] relies on vSphere HA restarting single nodes (smallest footprint, longer recovery, disruption during upgrades). [[ha-deployment-model|High availability]] uses three-node clusters with DRS (Distributed Resource Scheduler) anti-affinity (no single-node outage of the service, smoother upgrades), recommended for production.

## Architecture

::diagram[d06-deployment-models]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4fe239ae-d280-4681-9cff-99099ac27124.original.png" caption="VMware Cloud Foundation Fleet Deployment Basic Design." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/f7825f2b-46ba-401c-aeab-4351016078dd.original.png" caption="vSphere Cluster Models in a Single VCF Instance." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html"}

## Components

### Fleet deployment designs

| Design | Protects against | Cluster models | Notes |
|---|---|---|---|
| **Basic** | Host failures (vSphere HA) | Mgmt: single-rack; WLD: single- or multi-rack | One zone/region; zone failure takes the fleet down |
| **Site high availability (across zones)** | Zone power/network/cooling failure | Mgmt: single-rack or stretched; WLD: single-rack, multi-rack, stretched | Two availability zones, needs low-latency high-bandwidth links and stretched L2/IP |
| **Disaster recovery (across regions)** | Site-wide/regional disasters, cyber attacks | Mgmt: single-rack; WLD: single- or multi-rack | Second instance in another region; replication + failover (e.g. VMware Live Recovery); RPO/RTO apply |
| **Fault domains + DR** | Both of the above | As site HA | Highest resilience, cost and complexity |

In the DR designs, "VCF Operations utilizes replication or backup and restore mechanisms to protect components at a secondary site, while VCF Automation relies on backup and restore processes".

### Component models

| Component | Models |
|---|---|
| VCF Operations | **Simple** (1 node + fleet mgmt + collector), **High availability** (3-node analytics cluster, optional external load balancer; collectors can be grouped), **Continuous availability** (node pairs across two availability zones, ≤ 10 ms latency between zones) |
| VCF Operations for logs | Simple (1 node, relies on vSphere HA), High availability (3 nodes: primary + 2 workers, integrated load balancer) |
| VCF Operations for networks | Simple (1 platform + 1 collector), "HA" (3-node platform cluster — for performance and scale, *not* redundancy) |
| VCF Automation | Simple (1 node, POC/dev), High availability (3 nodes, production; simple can be scaled to 3 by resizing) |
| NSX Manager | Simple (1 node with VIP), High availability (3 nodes, VIP), HA with external load balancer (API (Application Programming Interface) spread over all 3) |
| NSX Global Manager (federation) | HA 3-node cluster, or HA with standby cluster |
| VCF Identity Broker | **Embedded** (service in the management vCenter, protected by vSphere HA), **Appliance** (3-node cluster) |
| VCF SSO scope | **Fleet-wide** (one broker for all), **Cross-instance** (one broker for several instances), **Per-instance** (one broker per instance) |

### vSphere cluster models

| Model | Fault domains | Network between hosts | Restrictions |
|---|---|---|---|
| Single-rack | 1 | L2 | No rack-failure protection; supported in all domains |
| Layer 2 multi-rack | Several (racks) | L2 | Mgmt default cluster supported |
| Layer 3 multi-rack | Several (racks) | L3 per rack | **Not** for the mgmt default cluster; vSAN HCI or compute cluster only |
| Stretched | 2 (availability zones) | Stretched | L3 multi-rack clusters cannot be stretched; mgmt default cluster stretched on Day 2 |

### NSX Edge cluster models

Host fault tolerant (single rack), rack fault tolerant (several racks), and availability-zone fault tolerant (either NSX HA across zones or vSphere HA in a stretched cluster). Edges are virtual appliances (vCenter/NSX deployed, VCF Operations lifecycle) or bare metal (manual registration, own lifecycle).

### Other models in the Architectural Options

- **vSphere Supervisor**: simplified (single control-plane VM, no load balancer), single management zone or three management zones, simple (1) or HA (3) control plane, NSX / Avi / Foundation Load Balancer.
- **VCF Edge**: optimized configuration for distributed edge sites (TechDocs lists, among other criteria, a minimum of 10 sites and a dedicated vCenter for edge workloads).

## How It Works

Choosing a model for a scenario:

1. **Production or lab/POC?** Production → HA component model (4 mgmt hosts, 13 appliances). POC → simple (3 hosts, 7 appliances).
2. **How many sites/zones?** One zone → Basic. Two zones within metro latency → Site HA with stretched clusters. Two regions → DR design. Both → FD + DR.
3. **Rack failure tolerance?** Multi-rack (L2 for mgmt, L2/L3 for workload domains).
4. **Identity scope?** One IdP for everything → fleet-wide SSO; regulatory separation → per-instance.
5. **API scale?** High churn on NSX or VCF Operations → external load balancer models.

## Deep Dive

### What "simple" really costs

Simple uses single nodes that vSphere HA restarts after a host failure — service interruption of several minutes, and upgrades of a single-node service imply downtime of that service (NSX Manager simple: "management plane impact during upgrades"). It is fully supported, but plan maintenance windows accordingly.

### Converting later

- VCF Automation simple can be resized to medium/large which forces a 3-node expansion.
- NSX Manager simple has a VIP "for future expansion" to 3 nodes.
- Identity Broker embedded → appliance requires an SSO reset (TechDocs trade-off), so decide early.
- VCF Operations supports scale-up and scale-out (data nodes, collector nodes).

### Stretched vs DR

Stretched clusters give automatic failover (vSphere HA) between zones with zero data loss but need low latency and L2/stretched IP. DR across regions tolerates distance but has an RPO and a failover process. The exam often hides this behind wording like "metro distance, no data loss" (stretched) vs "300 km away, recovery within 4 hours" (DR).

:::legacy VCF 5.x / Legacy Context
VCF 5.x talked about **standard vs consolidated architecture** (workloads separated from or combined with the management domain) and about **VCF instances in regions/availability zones**; Cloud Builder deployed a single "standard" management domain with 4+ hosts and Aria components were deployed separately through Aria Suite Lifecycle. In 9.0 the vocabulary is **fleet deployment designs** + **simple/HA component models**, and the installer deploys the fleet stack.
:::

:::vcf9 Changed in VCF 9
The "simple" model with 3 management hosts and single-node NSX Manager/VCF Operations/VCF Automation is an official, installer-supported option in 9.0.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

| Choice | Where |
|---|---|
| Simple vs HA | VCF Installer wizard (or JSON spec) |
| New fleet vs join existing fleet | VCF Installer wizard |
| Stretch management cluster | Day 2 (SDDC Manager / VCF Operations workflow) |
| Day-2 network for fleet components (dedicated PG, NSX segment) | API-driven Day-2 deployment |
| Logs / networks / Identity Broker appliance models | Fleet management, Day 2 |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

The VCF Installer accepts a **JSON specification** instead of the wizard, so the deployment model is captured as code and can be reviewed and reused. Inspect what is deployed afterwards with the SDDC Manager API (`GET /v1/nsx-t-clusters` shows NSX node count; `GET /v1/clusters` shows clusters and stretch state) and in VCF Operations inventory.

## Failure Scenarios

| Model | Host failure in mgmt cluster | Zone failure | Region failure |
|---|---|---|---|
| Simple, Basic | Restart via vSphere HA (minutes) | Fleet down | Fleet down |
| HA, Basic | Service continues on remaining nodes | Fleet down | Fleet down |
| HA, Site HA (stretched) | Service continues | vSphere HA restarts in other zone | Fleet down |
| HA, DR | Service continues | Fleet down at that site → DR | Recover at second region |
| HA, FD + DR | Service continues | Restart in other zone | Recover at second region |

## Troubleshooting

- **Installer refuses HA with 3 hosts**: the HA install requires 4 hosts in the management default cluster.
- **Cannot stretch a cluster**: L3 multi-rack clusters can't be stretched; storage clusters using vSAN storage client traffic separation can't be stretched.
- **Continuous availability VCF Operations unstable**: check inter-zone latency (≤ 10 ms).
- **Nested lab deploy fails host-count checks**: the wizard enforces minimums; William Lam documents unsupported JSON-based workarounds for single-host labs — fine for learning, never for production.

## Real-World Scenario

A hospital has two buildings 2 km apart with dark fibre and a DR site 200 km away. Requirement: survive a building failure with no data loss; survive a regional disaster within hours. Design: **Fault domains + DR** — HA component model, management and critical workload domains as **stretched clusters** across the two buildings, a second VCF instance in the DR region with VMware Live Recovery replication, VCF Operations protected by replication/backup and VCF Automation by backup and restore, per-instance or cross-instance SSO depending on how authentication should behave if the primary site is lost.


## Exam Focus

:::exam
- Simple = 3 mgmt hosts, 7 appliances, single nodes. HA = 4 mgmt hosts, 13 appliances, 3-node NSX/VCF Ops/VCF Automation.
- Fleet designs: Basic, Site HA (across zones), DR (across regions), FD + DR.
- L3 multi-rack: not for mgmt default cluster, cannot be stretched. Stretching the mgmt cluster is Day 2.
- Identity Broker: embedded vs 3-node appliance; SSO models fleet-wide / cross-instance / per-instance.
- VCF Operations continuous availability needs ≤ 10 ms between zones.
:::

## Common Exam Traps

:::trap
- "HA VCF Operations for networks gives redundancy" — its 3-node cluster is for performance/scale, not HA.
- "Stretched cluster = disaster recovery" — stretched is HA across zones (metro); DR across regions is a separate design.
- "The fleet management appliance is tripled in the HA model" — it stays a single node (so does the collector and SDDC Manager).
- "Consolidated architecture" — a VCF 5.x term, not a 9.0 model.
:::

## Knowledge Check

::quiz

## Summary

- VCF 9 deployment models stack: component model (simple/HA), fleet design (basic/site HA/DR/FD+DR), cluster model (single-rack, L2/L3 multi-rack, stretched), identity/SSO model, edge and Supervisor models.
- Pick by requirements: availability target, sites/latency, rack resilience, identity separation, budget.

## Next Topic

Phase 7 puts this into practice: [Deployment Planning and Prerequisites](lesson:deployment-planning-prereqs).
