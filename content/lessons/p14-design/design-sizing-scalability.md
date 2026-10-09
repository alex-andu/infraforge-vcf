---
id: design-sizing-scalability
title: Sizing and Scalability Decisions
phase: p14-design
module: m14-design
version: vcf9
minutes: 40
difficulty: advanced
summary: How to size a VCF 9 management domain and workload domains – host counts, N+1 and failure-domain reserves, vSAN capacity, network and IP growth – and how to scale out with clusters, domains and instances without hitting design dead ends.
topics: [design-sizing, deployment-models, vsan-capacity, workload-domains]
objectives: ["4.1"]
keyTerms: [fault-domain, n-plus-one, stretched-cluster-design, availability-zone]
labs: [lab-vcf-planning-workbook]
incidents: []
components: [management-domain, workload-domain, vcf-instance, vcf-fleet, nsx-manager, vcf-operations, vsan]
related: [design-availability-failure-domains, design-network-security-tradeoffs, vcf-network-design]
sources:
  - title: "VCF 9.0 – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "VCF 9.0 – Planning and Preparation (workbook, ConfigMax, Ports and Protocols)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/planning-and-preparation.html
  - title: "William Lam – Clarifying minimum required ESX hosts for VCF deployments"
    url: https://williamlam.com/2026/06/clarifying-minimum-required-esx-hosts-for-vcf-deployments.html
  - title: "VCF 9.0 – NSX Management and Control Plane Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-networking-management-and-control-plane.html
  - title: "VCF 9.0 – VCF Operations Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html
  - title: "VCF 9.0 Design Library – Network Fabric Detailed Design (subnet sizing)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/network-fabric-design.html
  - title: "VMware Configuration Maximums"
    url: https://configmax.broadcom.com/
---

## Why This Matters

Undersize the management domain and the first lifecycle upgrade or the second workload domain stalls for lack of
capacity. Oversize it and the business pays for idle hosts. Sizing in VCF (VMware Cloud Foundation) is not one number: it is the sum of the
management stack you chose, the workloads you expect, the failure reserves your availability design requires, and the
growth headroom in hosts, subnets and limits. Exam scenarios test whether you recognise which of these drives the
answer.

## Learning Objectives

- Identify the inputs to VCF sizing: management component models, workload demand, failure reserves, growth.
- State the VCF 9 minimum host counts for the management domain and explain what drives them.
- Apply N+1 and per-AZ reserves to vSphere HA (High Availability) and vSAN capacity.
- Choose between scaling up (bigger hosts), scaling out (more hosts/clusters) and adding domains or instances.
- Avoid sizing dead ends: subnet masks, configuration maximums, shared-component limits.

## Concept

### The four sizing inputs

| Input | Examples | Source of numbers |
|---|---|---|
| Management stack | vCenter, NSX Manager (1 or 3 nodes), SDDC (Software-Defined Data Center) Manager, VCF Operations (1, 3 or more nodes), VCF Automation, Identity Broker, NSX Edges | Component sizing tables in the docs for your version; Planning and Preparation Workbook |
| Workload demand | vCPU, RAM, storage, IOPS, network throughput, growth per year | Current-state assessment (VCF Operations or other tools) |
| Failure reserve | N+1 host per cluster, vSAN rebuild space, 50% per AZ in stretched clusters | Availability design |
| Limits | Hosts per cluster, domains per instance, objects per NSX Manager | ConfigMax (configmax.broadcom.com) |

### Minimum host counts (management domain)

| Deployment | Minimum hosts | Driver |
|---|---|---|
| Simple (non-HA) management components, vSAN principal storage | 3 | vSAN needs 3 hosts for FTT=1 |
| Simple management components, external principal storage | 2 | No vSAN quorum requirement |
| High availability management components | 4 | NSX Manager 3-node cluster with anti-affinity must stay separated during host maintenance/upgrades |

These are minimums, not recommendations. Minimum + workload + growth + N+1 is the real number.

### Scale units in VCF

| Scale unit | When to add it | VCF 9 notes |
|---|---|---|
| Host | More capacity in an existing cluster | Commission + add host |
| Cluster | Different hardware profile, different vSAN, size limit, separate failure domain | One VDS (vSphere Distributed Switch) set per cluster |
| Workload domain | Separate lifecycle, separate vCenter/SSO (Single Sign-On), isolation, different NSX | Up to 24 workload domains per VCF instance (Workload Domain Models page) |
| VCF instance | Another site/region, independent management domain | Managed together in one fleet by VCF Operations |

## Architecture

::diagram[d14-sizing-management-domain]

The diagram shows a four-host HA management domain: three NSX Manager nodes spread by anti-affinity, vCenter, SDDC
Manager, VCF Operations and VCF Automation nodes, and the capacity reserve that lets one host enter maintenance mode
while everything still fits.

## Components

| Component | Availability options | Sizing effect |
|---|---|---|
| NSX Manager | 1 node (simple) or 3 nodes (HA) | 3 nodes triple the footprint and require hosts for anti-affinity |
| VCF Operations | 1 node, 3-node HA, or continuous availability across AZs; add data nodes and collectors to scale | Larger fleets need more/larger nodes |
| VCF Automation | Deployment models per VCF Automation models page | Significant memory footprint; include it from day one if planned |
| NSX Edge nodes | Form factor sizes; edge clusters per throughput/services | Edges placed in management domain or a dedicated cluster consume capacity there |
| Workload domain vCenter | Runs in the **management domain** | Each new workload domain adds a vCenter (and possibly NSX Managers) to the management domain |

:::warning
The last row is the most common sizing mistake: workload domain vCenters (and dedicated NSX Manager clusters) are
deployed into the **management domain**. Plan management domain capacity for the number of workload domains you will
create, not just for the first one. The Workload Domain Models page notes the implication: "resource expansion may be
needed to accommodate future additional workload domains and management components."
:::

## How It Works

A repeatable sizing workflow:

1. **Choose availability models** for management components (see
   [availability design](lesson:design-availability-failure-domains)).
2. **Add up management component footprints** for your version from the docs/workbook, including future workload
   domain vCenters and NSX Managers.
3. **Add workload demand** with growth (e.g. 3 years at the expected rate) and target utilisation (often 70–80% for
   CPU/RAM).
4. **Add failure reserve:** N+1 (or N+2 for large clusters / maintenance during failure); stretched clusters need
   each AZ able to run the protected load (≈50% per AZ).
5. **Convert to hosts** using the host profile (cores, RAM, disks), then check vSAN raw → usable capacity for the
   chosen storage policy plus slack.
6. **Check limits** in ConfigMax and the per-cluster/per-instance limits.
7. **Size networks:** hosts × IPs per host per network, plus growth; choose subnet masks now.
8. **Review the scale-out path:** where will host 17, cluster 3, domain 5 go?

## Deep Dive

### Worked example (CPU/RAM)

Requirement: 400 vCPU at 4:1 consolidation and 3 TB RAM of workload, 30% growth, hosts with 64 cores / 1 TB RAM.

| Step | CPU | RAM |
|---|---|---|
| Demand | 400 vCPU / 4 = 100 cores | 3 TB |
| + 30% growth | 130 cores | 3.9 TB |
| ÷ 80% target utilisation | 163 cores | 4.9 TB |
| Hosts needed | 163 / 64 = 2.6 → 3 | 4.9 / 1 = 4.9 → **5** |
| + N+1 | — | **6 hosts** |

RAM, not CPU, drives this cluster. Always compute both and take the larger.

### vSAN capacity factors

- Storage policy overhead: RAID-1 FTT=1 stores two copies (2×), RAID-5 and RAID-6 use parity (lower overhead but
  need more hosts).
- Keep free space for rebuilds and operations (slack) — size usable capacity, not raw.
- In a stretched cluster each site holds a full copy; usable capacity per raw TB is lower.
- Space efficiency (compression, deduplication where supported) is a bonus, not something to bank on.

### Network and IP sizing

- Infrastructure subnet masks cannot be changed later; adding IP ranges within the existing mask is supported.
  Size management, vMotion, vSAN and TEP (Tunnel Endpoint) subnets for the **maximum** cluster size.
- Per host: 1 management IP, 1 vMotion IP, 1 per storage vmk, typically 2 TEP IPs (one per uplink).
- Uplink bandwidth: 2 × 25 GbE is common for vSAN ESA; check vSAN guidance for your storage architecture.

### Scale up vs scale out

| Approach | Pros | Cons |
|---|---|---|
| Fewer, bigger hosts | Fewer hosts to patch, fewer IPs, fewer switch ports | Bigger blast radius per host; N+1 reserve is larger |
| More, smaller hosts | Smaller failure impact; finer growth | More ports, IPs, management |
| More clusters | Isolation, different hardware | More VDS/vSAN to manage |
| More workload domains | Separate lifecycle and isolation | Each adds vCenter (and maybe NSX) load on the management domain |

### Home lab vs production sizing

Your Proxmox server (2 × 28 cores / 56 threads, 256 GB RAM, one 1 TB NVMe, two 256 GB SSDs, four 2 TB HDDs) shows the
same principles at small scale:

| Factor | Production | Home lab |
|---|---|---|
| Constraint | Usually RAM or vSAN capacity | RAM (256 GB shared by every nested host and appliance) and fast disk (one NVMe) |
| Failure reserve | N+1 hosts | None in reality — one physical server is one failure domain |
| Management stack | HA models (3 NSX Managers, VCF Operations cluster) | Simple models (single nodes) to fit the RAM budget |
| Storage | vSAN ESA on certified NVMe | Nested vSAN on virtual disks on the NVMe — functional, not performant or supported |

The exercise of adding up appliance memory before deploying is identical; only the numbers change. Refer to the Home
Lab section for the actual build profile.

### Questions to ask before you size

1. How many workload domains in three years, and will each have dedicated NSX?
2. Which availability model for each management component?
3. Which workloads need stretched or DR protection (and therefore double capacity)?
4. What is the host hardware profile, and is it constrained by RAM, cores or disk slots?
5. What is the maximum cluster size you will grow to (drives subnet masks and NIC/port counts)?

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Sizing results go into the **VCF Planning and Preparation Workbook** (downloadable from the Planning and Preparation
page), which collects inputs for the fleet, workload domains, Identity Broker, vSphere Supervisor and VCF Automation.
Use **ConfigMax** for limits and **ports.broadcom.com** for firewall planning.

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Sizing is a planning activity. After deployment you validate it with VCF Operations capacity views and with vSAN
capacity reports in vCenter; the operations phase covers those tools.

## Failure Scenarios

| Sizing mistake | Consequence |
|---|---|
| Management domain sized for day 1 only | Cannot deploy the second workload domain's vCenter/NSX Manager |
| No N+1 | HA admission control blocks power-on or restarts after a host failure; upgrades cannot evacuate a host |
| 3 hosts with HA NSX Manager | Anti-affinity cannot be honoured when one host is in maintenance |
| vSAN sized on raw capacity | Datastore full during rebuild; policy non-compliance |
| /26 subnets for TEP in a 40-host cluster | Expansion blocked; subnet mask cannot be changed |
| Stretched cluster sized at 100% across both AZs | AZ failure leaves workloads without capacity |

## Troubleshooting

When capacity problems appear, separate **demand** (workload growth) from **reserve** (HA admission control, vSAN
slack) from **overhead** (management components). VCF Operations capacity analytics and vSAN capacity views show
which one is consuming the space. A sudden "out of capacity" after adding a workload domain usually means the
management domain was not sized for the extra management appliances.

## Real-World Scenario

A company starts with a 4-host management domain and one workload domain. A year later it plans three more workload
domains for business units that need separate lifecycle. Each new domain brings its own vCenter into the management
domain and the business units want dedicated NSX Managers. Capacity review: management domain RAM would exceed 90%.
Options: add two hosts to the management domain, or share one NSX Manager across the new domains. They add hosts
(cheaper than the loss of isolation) and update the design record.


## Exam Focus

:::exam
- Minimum management domain hosts: 3 (vSAN, simple), 2 (external storage, simple), 4 (HA, NSX Manager
  anti-affinity).
- Workload domain vCenters run in the management domain — size it for future domains.
- Up to 24 workload domains per VCF instance (VCF 9 Workload Domain Models).
- N+1 reserve; stretched clusters need each AZ to carry the protected load.
- Subnet masks for infrastructure networks cannot be changed later.
:::

## Common Exam Traps

:::trap
- A minimum host count is not a sizing result.
- CPU is not always the constraint — RAM or storage often decide.
- Adding a workload domain does not only consume workload hosts; it consumes management domain capacity.
- Deduplication/compression savings should not be assumed in a base sizing.
:::

## Knowledge Check

::quiz

## Summary

- Size = management stack + workload demand + failure reserve + growth, checked against limits.
- Management domain minimums: 3/2 hosts for simple, 4 for HA (NSX Manager anti-affinity).
- Plan management capacity for all future workload domains' vCenters and NSX Managers.
- Size subnets for the maximum, since masks cannot change.

## Next Topic

Finish the design module with [network and security trade-offs](lesson:design-network-security-tradeoffs).
