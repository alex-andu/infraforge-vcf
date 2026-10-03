---
id: nsx-edge-nodes-clusters
title: NSX Edge Nodes and Edge Clusters
phase: p05-nsx
module: m05-nsx-routing
version: vcf9
minutes: 40
difficulty: intermediate
summary: What an NSX Edge is, where Edges run in VCF 9, how to size them, how edge clusters provide active/standby and active/active availability, and how VCF 9 deploys them from vCenter.
topics: [nsx-edge, nsx-routing]
objectives: ["2.4", "4.1"]
keyTerms: [edge-node, edge-cluster, sr, tier-0, bfd, ecmp]
labs: [lab-nsx-tier0-bgp-edge]
incidents: [inc-nsx-edge-north-south]
components: [nsx-edge-cluster, nsx-manager, vcenter, esx-host, physical-network]
related: [nsx-tier0-tier1-routing, nsx-vpcs-and-vcf-networking, nsx-transport-nodes-teps]
sources:
  - title: "VCF 9.0 – Installing NSX Edge"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/installing-nsx-edge.html
  - title: "VCF 9.0 – NSX Edge VM System Requirements"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/installing-nsx-edge/edge-vm-system-requirements.html
  - title: "VCF 9.0 – Create an NSX Edge Cluster"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/installing-nsx-edge/create-an-edge-cluster.html
  - title: "VCF 9.0 – Configure Centralized Network Connectivity with Edge Clusters"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/managing-network-connectivity-in-vcenter/managing-centralized-network-connectivity-with-edge-clusters.html
  - title: "VCF blog – VPC Centralized Network Connectivity with Guided Edge Deployment"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/25/vpc-centralized-network-connectivity-with-guided-edge-deployment/
  - title: "Broadcom KB 435782 – Supervisor deployment fails in VCF 9.0 due to missing NSX Edge Cluster"
    url: https://knowledge.broadcom.com/external/article/435782/supervisor-deployment-fails-in-vcf-90-du.html
  - title: "VCF 9.0 – Tier-0 Gateways"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/tier-0-gateways.html
  - title: "William Lam – MS-A2 VCF 9.0 Lab: Configuring NSX VPC"
    url: https://williamlam.com/2025/07/ms-a2-vcf-9-0-lab-configuring-nsx-virtual-private-cloud-vpc.html
---

## Why This Matters

Hosts can switch and route **inside** the virtual network on their own, but some things cannot be distributed: a
BGP session with a physical router, stateful NAT, a gateway firewall, a load balancer, VPN. Those run on **NSX
Edges**. In VCF 9, Edges are also what you deploy when you choose **centralized connectivity** in vCenter — the path
required for vSphere Supervisor and VCF Automation "All Apps". Objective 4.1 asks you to "describe the deployment of
and configure" the VCF networking gateway; this lesson is the foundation for that.

## Learning Objectives

- Explain what an [[edge-node]] does and why it exists alongside distributed routing.
- Choose an Edge form factor (Small, Medium, Large, Extra Large) and know the CPU prerequisites.
- Describe an [[edge-cluster]]: membership rules, minimum and maximum size, failure domains.
- Compare active/standby and active/active ([[ecmp]]) Tier-0 designs and what each supports.
- Walk through the VCF 9 vCenter workflow that deploys an edge cluster and Tier-0 gateway.

## Concept

An NSX Edge node is a "service appliance with pools of capacity, dedicated to running network and security services
that cannot be distributed to the hypervisors". It is a **transport node** (it has a TEP and joins the overlay) and it
has **uplinks into VLANs** on the physical network. It hosts the **service router ([[sr]])** half of Tier-0 and Tier-1
gateways.

| Form factor | Notes |
|---|---|
| Edge VM | Runs on ESX hosts; the common choice in VCF; deployed from vCenter or NSX Manager |
| Bare-metal Edge | Physical server; very high throughput / low latency use cases |

All Edges in one edge cluster must be the **same type** (all VMs or all bare metal); Edge VMs of **different sizes**
are allowed in one cluster but uniform sizing is the sane design.

### Sizing (Edge VM)

| Size | vCPU | Memory | Disk | Documented use |
|---|---|---|---|---|
| Small | 2 | 4 GB | 200 GB | Proof-of-concept only |
| Medium | 4 | 8 GB | 200 GB | L2–L4 features, < 2 Gbps (routing, NAT, L4 firewall/LB) |
| Large | 8 | 32 GB | 200 GB | 2–10 Gbps, adds L7 load balancer and TLS inspection |
| Extra Large | 16 | 64 GB | 200 GB | High-throughput L7, VPN, TLS inspection, URL filtering, IDS/IPS |

Prerequisites: VMXNET3 vNICs only; the host CPU must support **AES-NI** and **1 GB huge pages** (the DPDK fast
path depends on them); Intel or AMD x86; with EVC enabled, Haswell or later. In the VCF 9 Network Connectivity
workflow, Edges get **100% CPU shares and memory reservation**. William Lam notes **Medium** is the smallest size to
use if you plan to enable vSphere Supervisor.

## Architecture

::diagram[d05-edge-cluster-ha]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/fcfef3eb-51c4-40c7-b8d0-de6522847456.original.png" caption="NSX Edge Transport Node in VM Form Factor within ESX (VCF 9.0 documentation, NSX Edge Networking Setup)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/installing-nsx-edge/nsx-edge-networking-setup.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/1771eb31-5496-4100-884a-d5e948db7683.original.png" caption="One Suggested Link Setup for NSX Edge VM Networking (VCF 9.0 documentation)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/installing-nsx-edge/nsx-edge-networking-setup.html"}

Step through the diagram: first the Edge VM anatomy (management interface, fast-path interfaces carrying TEP and
uplink VLANs), then an active/standby Tier-0 (one active SR, one standby SR), then active/active (several SRs, each
peering with the physical routers, ECMP from the hosts' Tier-0 DR).

### Where Edges run in VCF 9

- On a vSphere cluster of the **workload domain** whose traffic they serve (or a cluster dedicated to Edges in larger designs). The workflow asks for a vSphere cluster, datastore, optional resource pool and optional **host group affinity** to pin Edges to specific hosts (e.g. the hosts cabled to the uplink VLANs).
- All hosts in that cluster/host group need identical access to the management, gateway uplink, host TEP and Edge TEP networks.
- All Edges of one edge cluster must sit on vSphere clusters of the same type (standard or stretched).
- Edge VMs get a **Best Effort Restart** policy for graceful handling during host maintenance.

## Components

| Component | Description |
|---|---|
| Management interface | Edge VM management IP (static or DHCP) on the management port group; talks to NSX Manager |
| Fast-path interfaces (fp-eth0, fp-eth1, …) | DPDK data-path NICs; the VCF workflow auto-creates **two trunk port groups** in vCenter for fp-eth0 and fp-eth1 |
| Edge TEP | Overlay endpoint(s) on the Edge TEP VLAN — may reuse the host TEP VLAN in VCF 9 |
| Uplinks | VLAN interfaces of the Tier-0 SR toward the physical routers (e.g. two VLANs, one per ToR) |
| Edge cluster | Group of Edges that backs gateways; 2–10 nodes in the VCF workflow |
| Edge cluster profile | HA/BFD settings for the cluster (default profile available) |
| Failure domain | Logical grouping of Edges (e.g. per rack) so active/standby SRs are placed in different domains |

## How It Works

The VCF 9 vCenter workflow (Networks > Network Connectivity > **Configure Network Connectivity** > Gateway type
**Centralized Connectivity**):

1. **Prerequisites page** — VDS uplinks configured, compute manager registered, Transport Node Profile attached, DNS records for Edges, Edge TEP VLAN planned, IP pool or DHCP for TEPs; for BGP, two peers on the ToR with ASN and password; for static routing, an HA VIP for an active/standby Tier-0.
2. **Edge cluster** — name and Tunnel Endpoint MTU (pre-selected from Global Fabric Settings).
3. **Edge nodes** — Edge Form Factor, passwords (or "Manage Edge Password with VCF"), then **Add** each node: FQDN, vSphere cluster, datastore, management IP, uplink mapping to host pNICs, TEP VLAN and IP allocation. **Clone** speeds up the second node.
4. **Workload Domain Connectivity** — the Tier-0: Gateway Name, **High Availability Mode**, Gateway Routing Type (BGP or Static), Local Autonomous System, per-Edge gateway uplinks (VLAN, interface CIDR, BGP peer IP, MTU, BGP password).
5. **VPC External Connectivity** — External IP Blocks and Private Transit Gateway IP Blocks.
6. Review (the wizard draws a topology) → **Deploy**. You may **Skip** the gateway part and set it later from the Edge Cluster page.

## Deep Dive

### Active/standby vs active/active

| | Active/Standby | Active/Active |
|---|---|---|
| SRs forwarding | One active SR, one standby | Several SRs forward simultaneously |
| North-south bandwidth | One Edge's worth | Scales with Edges via ECMP |
| Stateful services (SNAT/DNAT, stateful gateway firewall) | Yes | Only in **stateful active-active** mode; otherwise use reflexive (stateless) NAT |
| Uplink Edges | VCF workflow: up to **two** Edge nodes with gateway uplinks | Multiple Edges with uplinks |
| Required for | vSphere Supervisor and VCF Automation All Apps (Centralized **Active/Standby**) | High-throughput routing designs |
| Failover modes | Preemptive or non-preemptive | n/a (all active) |

The VCF blog table shows the VPC services (External IP, NAT, default outbound NAT, DHCP, E/W and N/S firewall, L4
load balancer) available for both modes of the centralized transit gateway, but the hard requirement remains:
**Supervisor and VCF Automation All Apps require Centralized Active/Standby**. KB 435782 shows the symptom when
it is missing: Supervisor validation fails with "No valid edge cluster for VDS".

### How Edges detect failure

Edges in a cluster check each other with BFD over the management and overlay (TEP) paths; the uplink/BGP state is
also considered. When the active SR is declared down, the standby takes over its interfaces and announces itself;
with active/active, the hosts' Tier-0 DR simply removes the failed SR from its ECMP set.

### One Tier-0 per Edge

The NSX documentation states that "an Edge node can support only one tier-0 gateway". Additional routing contexts
on the same Edges are done with **Tier-0 VRF gateways**, not more Tier-0s. Tier-1 SRs, however, can be many per Edge.

:::legacy VCF 5.x / Legacy Context
In VCF 4.x/5.x you deployed edge clusters from **SDDC Manager** ("Add Edge Cluster"). In VCF 9.0 the guided
workflow lives in the **vSphere Client** (Networks > Network Connectivity), and it can also manage pre-existing
edge clusters after an upgrade.
:::

## Configuration

Minimal production-like inputs:

| Input | Example |
|---|---|
| Edge cluster name | `ec-wld01` |
| Form factor | Medium (Large if L7 LB/TLS) |
| Edge nodes | `edge-01.lab.local`, `edge-02.lab.local` |
| Management | Static IPs on the management VLAN, DNS A+PTR records |
| Edge TEP VLAN | Same as host TEP VLAN, or a dedicated routed VLAN |
| Uplink VLANs | 2711 (to ToR-A), 2712 (to ToR-B) |
| Tier-0 HA mode | Active/Standby if Supervisor/VCF Automation; Active/Active for ECMP throughput |
| Routing | BGP, local AS 65001, peers 10.27.11.1 / 10.27.12.1 AS 65000 |

## CLI / API

SSH to an Edge as `admin`:

```shell
edge-01> get edge-cluster status
edge-01> get logical-routers
edge-01> get tunnel-ports
edge-01> get interfaces
```

`get logical-routers` lists the SR and DR instances (with their VRF IDs) hosted on this Edge; `get edge-cluster
status` shows the peers and their health. Via API:

```http
GET https://nsx-vip.lab.local/api/v1/infra/tier-0s/state
```

## Failure Scenarios

| Failure | Impact |
|---|---|
| Active Edge VM crashes (A/S) | Standby SR becomes active after detection; short north-south interruption; stateful sessions may need re-establishment |
| One Edge fails (A/A) | ECMP path removed; capacity reduced, traffic continues |
| Both Edges on one host (no anti-affinity) | Single host failure takes out all north-south |
| Edge TEP VLAN broken | Edge isolated from overlay; hosts' tunnels to Edge down → north-south fails while east-west works |
| Uplink VLAN missing on trunk | BGP down on that uplink; with all uplinks down, no north-south |
| Undersized Edge (Small) | CPU saturation, drops under load; not supported for production |

## Troubleshooting

1. NSX Manager → System → Fabric → Nodes → Edge Transport Nodes: configuration state, node status, tunnels.
2. On the Edge: `get edge-cluster status`, `get logical-routers`, then enter the Tier-0 SR VRF (`vrf <id>`) and `get high-availability status`.
3. Tunnels: `get tunnel-ports` and `get bfd-sessions` — are host TEPs reachable?
4. Uplinks: `get interfaces`, ping the ToR from the SR VRF, check VLAN on the port groups/trunks.
5. Placement: are the two Edges on different hosts (and failure domains)?

## Real-World Scenario

During a maintenance window, the infrastructure team puts host esx-05 into maintenance mode. Both Edge VMs of the
only edge cluster were on esx-05 and esx-06; DRS had migrated the second Edge to esx-05 earlier. North-south traffic
for every tenant drops while the Edges migrate. Fix: a DRS **VM/Host anti-affinity rule** for the Edges, host-group
affinity to the uplink-capable hosts, and failure domains so active and standby are placed apart.

## Lab

Deploy two Edge VMs and an active/standby Tier-0 with BGP to a router VM in your nested lab.

::lab[lab-nsx-tier0-bgp-edge]

## Exam Focus

:::exam
- Edges run SRs: anything centralized (uplinks/BGP, NAT, gateway firewall, LB, VPN, DHCP server).
- Sizes: Small = PoC; Medium = 4 vCPU/8 GB; Large = 8/32; XL = 16/64. AES-NI + 1 GB huge pages required.
- Edge cluster: same type, sizes may differ, one cluster per Edge, VCF workflow min 2 max 10.
- VCF 9 deploys edges from **vCenter → Networks → Network Connectivity**, not SDDC Manager.
- Supervisor / VCF Automation All Apps → Centralized connectivity, **Active/Standby** Tier-0.
:::

## Common Exam Traps

:::trap
- **"Edges route all east-west traffic."** No — DRs on hosts do; Edges handle north-south and centralized services.
- **"Active/active supports SNAT/DNAT just like active/standby."** Only in stateful active-active; classic A/A uses reflexive NAT.
- **"Put several Tier-0 gateways on one Edge."** One Tier-0 per Edge; use VRF gateways for more routing tables.
- **"Small Edges are fine for production."** Documented as proof-of-concept only.
:::

## Knowledge Check

::quiz

## Summary

- Edges are transport nodes that host SRs and centralized services, with TEPs into the overlay and VLAN uplinks to the physical network.
- Pick size by services and throughput; Medium is the practical minimum for Supervisor.
- Edge clusters provide availability: A/S for stateful services and Supervisor; A/A for ECMP scale.
- VCF 9 deploys edge clusters and the Tier-0 through the vCenter Network Connectivity workflow.

## Next Topic

Now look inside the gateways the Edges host: [Tier-0 and Tier-1 Routing](lesson:nsx-tier0-tier1-routing).
