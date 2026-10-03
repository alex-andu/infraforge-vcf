---
id: design-availability-failure-domains
title: Availability, Failure Domains and Fleet Deployment Models
phase: p14-design
module: m14-design
version: vcf9
minutes: 45
difficulty: advanced
summary: How to turn availability and recovery requirements into a VCF 9 design using failure domains (host, rack, availability zone, region), the four vSphere cluster models, and the four fleet deployment models (basic, site HA across zones, DR across regions, fault domains plus DR).
topics: [design-availability, deployment-models, vsan-resilience]
objectives: ["4.1", "2.3"]
keyTerms: [fault-domain, availability-zone, stretched-cluster-design, rpo, rto, network-fabric]
labs: [lab-vcf-planning-workbook]
incidents: []
components: [vcf-fleet, vcf-instance, management-domain, workload-domain, vsan, nsx-manager, vcf-operations]
related: [design-sizing-scalability, design-network-security-tradeoffs, vcf-network-design]
sources:
  - title: "VCF 9.0 – VMware Cloud Foundation Fleet Deployment Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html
  - title: "VCF 9.0 – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
  - title: "VCF 9.0 – Architectural Options"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts.html
  - title: "VCF 9.0 – NSX Management and Control Plane Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-networking-management-and-control-plane.html
  - title: "VCF 9.0 – VCF Operations Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html
  - title: "VCF 9.0 – NSX Edge Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/nsx-edge-cluster-models.html
  - title: "VCF 9.0 Design Library – Physical Data Center Network Design (latency table)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/physical-datacenter-design-9-x.html
  - title: "vSAN Network Design Guide – Stretched cluster bandwidth and latency"
    url: https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-network-design-guide/GUID-F3401655-6EFA-477B-B072-E8F001B50BCC.html
---

## Why This Matters

"How available must it be?" is the first question of every VCF design, and the exam tests it directly (objective
4.1: "identify the appropriate VMware Cloud Foundation deployment models"). The answer is not "as available as
possible": every extra failure domain costs hosts, network, licences and operational complexity. A good designer
maps each **failure the business must survive** to the **cheapest construct that survives it**.

## Learning Objectives

- Define availability, disaster recovery, RTO, RPO and failure domain, and order failure domains by scope.
- Compare the four vSphere cluster models and the failures each one survives.
- Compare the four VCF 9 fleet deployment models and choose one from requirements.
- Choose availability models for management components (NSX Manager, VCF Operations, NSX Edge clusters).
- Identify the network and latency prerequisites of stretched clusters and multi-site designs.

## Concept

### Availability vs recovery

| Term | Meaning | VCF construct |
|---|---|---|
| High availability (HA) | Keep running (or restart automatically) after a local failure | vSphere HA, vSAN FTT, fault domains, stretched clusters |
| Disaster recovery (DR) | Recover service at another site after a site/region loss | Second VCF instance + replication or backup/restore |
| [[rto]] (Recovery Time Objective) | How long recovery may take | Minutes (HA/stretched) vs hours (DR) |
| [[rpo]] (Recovery Point Objective) | How much data may be lost | ~0 with synchronous stretched storage, > 0 with asynchronous replication or backup |

### Failure domains

A [[fault-domain|failure (fault) domain]] is a set of components that can fail together. From small to large:

| Failure domain | Typical cause | Survived by |
|---|---|---|
| Component / disk / NIC | Hardware fault | Redundant NICs, vSAN FTT |
| Host | Host crash, maintenance | vSphere HA, vSAN FTT=1+, N+1 capacity |
| Rack | ToR pair or rack PDU failure | Multi-rack cluster with vSAN fault domains per rack |
| [[availability-zone]] | Power, cooling or network loss in one data hall/building (<10 ms RTT apart) | Stretched cluster across two AZs |
| Region / site | Disaster, regional outage, cyber attack | DR to a second VCF instance |

## Architecture

::diagram[d14-fleet-deployment-models]

### vSphere cluster models (per cluster)

| Model | Storage fault domains | Network | Survives | Limits |
|---|---|---|---|---|
| Single-rack | One | Layer 2 | Host failure | No rack protection |
| Layer 2 multi-rack | Multiple | Layer 2 across racks | Host or rack failure | Needs multiple racks; supported for management domain default cluster |
| Layer 3 multi-rack | Multiple | Layer 3 per rack | Host or rack failure | Complex networking; **not** for management domain default cluster; cannot be stretched; vSAN HCI or compute only |
| Stretched | Two (plus witness) | Across two AZs | Host or **AZ** failure | Layer 3 multi-rack clusters cannot be stretched |

### Fleet deployment models (per fleet)

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4fe239ae-d280-4681-9cff-99099ac27124.original.png" caption="VCF Fleet Deployment Basic Design" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html"}

| Model | Scope | Survives | Cluster models | Main implication |
|---|---|---|---|---|
| **Basic** | One AZ / region | Host failures (vSphere HA) | Single-rack (mgmt); single- or multi-rack (workload) | AZ/region failure = downtime |
| **Site High Availability (across zones)** | Two AZs in one region | AZ power, network, cooling failure | Adds stretched clusters (mgmt and workload) | Low-latency, high-bandwidth inter-AZ links; stretched IPs; higher cost |
| **Disaster Recovery (across regions)** | Primary + second instance in another region | Site/region disaster, cyber attack | Single-rack/multi-rack | Longer RTO, RPO > 0; second site to maintain and test |
| **Fault Domains and Disaster Recovery** | Two AZs + another region | Both of the above | Single-rack, multi-rack, stretched | Highest cost and complexity |

All four share one VCF Operations and one VCF Automation for the fleet. For DR designs, the VCF docs state that VCF
Operations uses replication or backup and restore to protect its components at the secondary site, while VCF
Automation relies on backup and restore.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/d62fd633-c0c8-4bdf-ae11-fe7d14f8a2f3.original.png" caption="VCF Fleet Deployment with Site High Availability (Across Zones) Design" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html"}

## Components

Availability choices for the management components themselves:

| Component | Models (VCF 9) | Trade-off |
|---|---|---|
| NSX Manager | Simple (1 node + VIP) · HA (3 nodes + VIP, anti-affinity) · HA with external load balancer | Simple = smallest footprint, management plane impacted during upgrades; HA needs more hosts |
| VCF Operations | Simple (1 node) · HA (3-node cluster, external load balancer) · Continuous availability (nodes across two AZs, ≤10 ms) | Footprint vs monitoring/fleet-management continuity |
| VCF Identity Broker | Embedded in vCenter · 3-node appliance | Appliance survives host failure without relying only on vSphere HA |
| SSO scope | Fleet-wide · cross-instance · per-instance | Wider scope = simpler, but bigger blast radius |
| NSX Edge cluster | Host-, rack- or AZ-fault-tolerant | Edges carry north-south traffic; their placement must match the availability goal |

:::note
The minimum host count follows from these choices. VCF 9 documentation (as summarised by William Lam) gives a minimum
of 3 hosts with vSAN (or 2 with external storage) for a simple, non-HA management domain and **4 hosts** for the HA
deployment, driven by NSX Manager anti-affinity during upgrades. See [sizing](lesson:design-sizing-scalability).
:::

## How It Works

A design method that works in practice and in the exam:

1. **List the failures to survive** (host, rack, AZ, region, cyber attack) and their RTO/RPO.
2. **Map each to a construct:** host → vSphere HA + N+1; rack → multi-rack + vSAN fault domains; AZ → stretched
   cluster; region → second instance + DR.
3. **Pick the fleet deployment model** that covers the largest required failure domain.
4. **Pick cluster models** per domain (management and each workload domain separately).
5. **Pick management component models** (NSX Manager, VCF Operations, Identity Broker, edges) consistent with it.
6. **Check prerequisites**: latency, bandwidth, stretched VLANs/gateways, witness site, DR tooling.
7. **Document trade-offs** (cost, complexity, operational skills) and get them accepted.

## Deep Dive

### Stretched cluster prerequisites

| Item | Requirement |
|---|---|
| Inter-AZ latency (VCF AZ definition) | < 10 ms RTT, high bandwidth, stretched layer 2 |
| vSAN data-site latency | < 5 ms RTT, ≥ 10 Gbps (vSAN network design guide) |
| Witness | Third site; VCF design table lists 150 ms maximum to the witness; vSAN guidance varies with hosts per site (e.g. < 200 ms up to 10 hosts per site) — check your version |
| VLANs | ESX management, vMotion, vSAN port groups for AZ2; VM management VLAN available in both AZs |
| Gateway | First hop gateway highly available across AZs on the same IP (VCF-NET-RCMD-GTW-002) |
| Capacity | Each AZ must be able to run the protected workloads alone (typically 50% utilisation per AZ) |

### Network portability

Both the site HA and DR models list "network portability – IP addresses stretched between zones" as a design
attribute: seamless failover, at the cost of operational complexity and latency requirements. Without stretched or
re-routable networks, VMs restarted elsewhere need new IPs and DNS updates.

### HA is not DR

A stretched cluster replicates synchronously; a ransomware encryption or a logical corruption is replicated too.
That is why the fleet models list cyber attacks under the **DR** designs: you need point-in-time copies (replication
with history, backups) at another region.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/f39c3fa5-a80d-4b0b-ab1b-e3c736ba88f4.original.png" caption="VCF Fleet Deployment with Disaster Recovery (Across Regions) Design" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html"}

### Blast radius

Shared things fail together: one SSO scope for the whole fleet, one NSX Manager shared by many workload domains, one
edge cluster for every tenant. Sharing saves resources but widens the failure domain. The VCF docs call this out for
SSO scope ("single point of failure for entire fleet authentication") and for shared NSX instances.

## Configuration

Design decisions are recorded, not clicked. A design decision record:

```yaml
decision: DD-AVL-01
requirement: "Tier-1 apps survive loss of one data hall with RPO 0, RTO < 15 min"
choice: "Fleet deployment with Site High Availability (across zones); stretched workload cluster; vSAN stretched"
alternatives: ["Basic + backups (RPO hours)", "DR across regions (RPO > 0)"]
implications: ["Witness at third site", "< 5 ms RTT between halls", "AZ2 VLANs + HA gateway", "50% capacity reserve per AZ"]
```

## CLI / API

Design work has no single CLI. You validate design assumptions with tools you already know: `vmkping` for latency and
MTU between AZs, vSAN health checks for stretched cluster and witness status, and the VCF Operations dashboards for
capacity. The deployment itself is driven by the VCF Installer and SDDC Manager workflows covered in the deployment
phase.

## Failure Scenarios

| Event | Basic | Site HA (across zones) | DR (across regions) |
|---|---|---|---|
| Host failure | vSphere HA restart | vSphere HA restart | vSphere HA restart |
| Rack failure | Outage unless multi-rack cluster | Survived by multi-rack or stretched | Outage at site unless multi-rack |
| AZ power loss | Outage | VMs restart in other AZ (RPO 0) | Failover to region 2 (RPO > 0) |
| Region disaster | Outage, restore from off-site backup | Outage | Failover to region 2 |
| Ransomware | Restore from backup | Replicated corruption; restore from backup | Recover from point-in-time copy |

## Troubleshooting

Availability designs fail in predictable places: the witness becomes unreachable (vSAN health shows witness
issues), a VLAN or gateway exists only in one AZ (VMs restart but are unreachable), capacity in the surviving AZ is
too small (HA admission control blocks restarts), or DR runbooks were never tested. Test failure scenarios on a
schedule; the docs explicitly list "plan and test regularly" as a DR implication.

## Real-World Scenario

A hospital asks for "no downtime ever". Interviews reveal: EHR must survive a data-hall outage with no data loss
(two halls 2 km apart); everything must survive a regional disaster within 4 hours with up to 15 minutes data loss.
Result: **Fault Domains and Disaster Recovery** design — stretched clusters across the two halls for the EHR
workload domain, a second VCF instance in another region with asynchronous replication, VCF Operations protected at
the secondary site, VCF Automation via backup/restore. Non-critical workloads stay on single-AZ clusters to save
cost.

## Lab

Work through the availability design scenario (`scn-availability-design`) in the Scenarios section, then record
your decisions in the planning workbook lab. Your single Proxmox server is one failure domain by definition: you can
simulate host failures with nested ESX, but not rack or AZ failures with real independence.

::lab[lab-vcf-planning-workbook]

## Exam Focus

:::exam
- Four fleet deployment models: **Basic**, **Site HA across zones**, **DR across regions**, **Fault Domains + DR**.
  Map requirement keywords: "AZ power/cooling/network failure" → Site HA; "regional disaster, cyber attack" → DR.
- Four cluster models; layer 3 multi-rack cannot be stretched and is not for the management domain default cluster.
- NSX Manager: simple vs 3-node HA; VCF Operations: simple, HA, continuous availability.
- Stretched clusters: < 5 ms between data sites for vSAN, witness at a third site, AZ2 networks, HA gateway.
:::

## Common Exam Traps

:::trap
- Stretched clusters are **HA**, not DR: they do not protect against logical corruption or regional disasters.
- DR across regions has RPO > 0 unless something synchronous is involved; it also means a longer RTO.
- "Single-rack" clusters can still survive host failures; they just cannot survive a rack failure.
- Choosing the most available model when the requirement only mentions host failures is over-design.
:::

## Knowledge Check

::quiz

## Summary

- Match each failure to survive with the cheapest construct: HA for hosts, multi-rack for racks, stretched for AZs,
  a second instance for regions.
- VCF 9 offers four cluster models and four fleet deployment models; know what each survives.
- Management components have their own availability models that drive host counts.
- Stretched designs need strict latency, witness, AZ2 networks and HA gateways; DR needs tested runbooks.

## Next Topic

Availability decides how many failure domains you need; [sizing and scalability](lesson:design-sizing-scalability)
decides how big each one must be.
