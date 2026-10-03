---
id: nsx-tier0-tier1-routing
title: Tier-0 and Tier-1 Gateways – SR, DR, BGP and Route Advertisement
phase: p05-nsx
module: m05-nsx-routing
version: vcf9
minutes: 45
difficulty: advanced
summary: How NSX splits routing between provider (Tier-0) and tenant (Tier-1) gateways, the SR/DR model, the north-south packet walk, BGP and static routing, route advertisement and redistribution, and the failures that break north-south.
topics: [nsx-routing, nsx-edge]
objectives: ["2.4"]
keyTerms: [tier-0, tier-1, sr, dr, bgp, ecmp, route-advertisement, bfd]
labs: [lab-nsx-tier0-bgp-edge, lab-nsx-segments-tier1]
incidents: [inc-nsx-edge-north-south]
components: [nsx-edge-cluster, nsx-manager, physical-network, esx-host]
related: [nsx-edge-nodes-clusters, nsx-segments-overlay, nsx-vpcs-and-vcf-networking]
sources:
  - title: "VCF 9.0 – Tier-0 Gateways"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/tier-0-gateways.html
  - title: "VCF 9.0 – Tier-1 Gateways"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/tier-1-gateways.html
  - title: "VCF 9.0 – Add an NSX Tier-1 Gateway"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/tier-1-gateways/add-an-nsx-tier-1-gateway.html
  - title: "NSX 4.1 Installation Guide – Key Concepts (SR, DR, Tier-0, Tier-1)"
    url: https://docs.vmware.com/en/VMware-NSX/4.1/installation/GUID-A1BBC650-CCE3-4AC3-A774-92B195183492.html
  - title: "NSX CLI Guide 9.0.1 – BGP commands"
    url: https://developer.broadcom.com/xapis/nsx-cli-guide/9.0.1/all_networking_layer_3_logical_gateway_routing_bgp.html
  - title: "NSX CLI Guide 9.0.2 – get logical-router bgp neighbor summary"
    url: https://developer.broadcom.com/xapis/nsx-cli-guide/9.0.2/GetLogicalRouterUuidBgpNeighborsSummary.html
  - title: "Broadcom KB 339392 – Troubleshooting NSX BGP"
    url: https://knowledge.broadcom.com/external/article/339392/
  - title: "Broadcom KB 428449 – APIs for NSX Edge and Tier-0 Monitoring"
    url: https://knowledge.broadcom.com/external/article/428449/apis-for-nsx-edge-and-tier0-monitoring.html
---

## Why This Matters

Tier-0 and Tier-1 are the heart of NSX routing and a favourite exam area ("configure virtual networking connectivity
and routing"). Most north-south outages come down to one of four things: the Tier-0 SR has no working uplink/BGP,
the Tier-1 isn't advertising its segments, the Tier-0 isn't redistributing them, or the physical router has no route
back. If you can draw the SR/DR picture and walk a packet through it, you can troubleshoot all four.

## Learning Objectives

- Explain the two-tier model: [[tier-0]] (provider, north-south) and [[tier-1]] (tenant, segments).
- Describe the [[sr]] and [[dr]] components, where each runs and when an SR exists.
- Walk a packet north-south from a VM through Tier-1, Tier-0 and an Edge to the physical router, and back.
- Configure BGP or static routing on a Tier-0 and [[route-advertisement]] on a Tier-1; know Tier-0 redistribution.
- Diagnose north-south failures with the Edge CLI and API.

## Concept

| | Tier-0 gateway | Tier-1 gateway |
|---|---|---|
| Role | Provider router: connects NSX to the physical network | Tenant router: connects segments, links north to one Tier-0 |
| Northbound | Physical routers via **external (uplink) interfaces** on VLAN segments | Exactly one Tier-0 (or none) |
| Southbound | Tier-1 gateways and/or segments | Segments |
| Routing protocols | BGP, OSPF, static | Static; advertises routes to its Tier-0 (no BGP) |
| HA modes | Active/Active, Active/Standby | Active/Standby (with SR), Active/Active (stateful A/A), or **Distributed Only** |
| Needs an edge cluster | Yes (always has SRs for uplinks) | Only if it needs an SR (services) |

Every gateway is made of up to two components:

- **DR (distributed router)** — present in the kernel of **every** transport node (hosts and Edges) that needs it. Does routing between connected segments locally.
- **SR (service router)** — instantiated on **Edge nodes** of the selected edge cluster. Hosts centralized things: uplinks to physical routers and BGP (Tier-0), NAT, gateway firewall, load balancer, VPN, DHCP server, and anything stateful.

Important rule from the Tier-1 documentation: *"If an NSX Edge cluster is selected, a service router will always be
created (even if you do not configure stateful services), affecting the north/south traffic pattern."* So do not
attach an edge cluster to a Tier-1 that doesn't need services.

## Architecture

::diagram[d05-north-south-packet-walk]

Step through the north-south walk. Then compare it with the component view:

::diagram[d05-sr-dr-components]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/9321c4f3-4347-4fd3-b8bb-0e7ae370f115.original.png" caption="One Suggested ECMP VLAN Setup for NSX Edges to TORs (VCF 9.0 documentation, NSX Edge Networking Setup)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/installing-nsx-edge/nsx-edge-networking-setup.html"}

NSX creates internal links automatically:

| Link | Default subnet | Between |
|---|---|---|
| Router link (Tier-0 ↔ Tier-1) | `100.64.0.0/16` (a /31 per Tier-1) | Tier-1 DR/SR and Tier-0 DR |
| Intra-tier transit | `169.254.0.0/24` | A gateway's DR and its SRs |

Avoid these ranges in your own addressing (or change them before building gateways).

## Components

| Interface / object | On | Purpose |
|---|---|---|
| External interface (uplink) | Tier-0 SR on each Edge | VLAN-segment interface toward a ToR; BGP/static next hop |
| Service interface | Tier-0 or Tier-1 SR | Connects a VLAN segment for services (e.g. a VLAN-attached LB) |
| Loopback | Tier-0 SR | Router ID / BGP source |
| Downlink | DR | Gateway interface on a segment (the VMs' default gateway) |
| HA VIP | Tier-0 A/S | Shared next hop for static routing from the physical router |
| Route advertisement | Tier-1 | Which Tier-1 routes are sent to the Tier-0 |
| Route redistribution | Tier-0 | Which routes (connected, Tier-1 advertised, NAT, static…) go into BGP/OSPF |

## How It Works

### North-south: VM to the internet (Tier-1 without SR)

1. VM `172.16.10.11` on `seg-web` sends to `8.8.8.8`. Its default gateway `172.16.10.1` is the **Tier-1 DR on the local host**.
2. Tier-1 DR: no specific route → default route to the Tier-0 via the router link (100.64.x.x). Because the Tier-0 DR is also on the host, routing continues **locally**.
3. Tier-0 DR: next hop is a Tier-0 **SR** (via the intra-tier transit 169.254.0.0/24). With A/A there are several SRs — ECMP picks one.
4. The SR lives on an Edge, so the host **encapsulates in Geneve** from its TEP to the Edge's TEP.
5. The Edge decapsulates; the Tier-0 SR looks up its routing table (learned via BGP or static) and forwards out its **external interface** on the uplink VLAN to the ToR.
6. The physical network delivers the packet.

### The return path

1. The physical router has a route for `172.16.10.0/24` learned from the Tier-0 via BGP (or a static route pointing at the SR uplink / HA VIP).
2. Packet arrives at a Tier-0 SR on an Edge → Tier-0 DR **on the Edge** → Tier-1 DR **on the Edge** → segment `seg-web`.
3. The Edge encapsulates in Geneve to the host TEP where the VM lives → delivered.

The return path is routed on the Edge's DR instances — the DR exists on Edges too.

### With a Tier-1 SR (NAT, gateway firewall, LB…)

Outbound becomes: Tier-1 DR (host) → **Tier-1 SR (Edge)** → Tier-0 DR (on that Edge) → Tier-0 SR → uplink. All
traffic of that Tier-1 now passes through an Edge, even traffic you didn't intend to service. That is the "affecting
the north/south traffic pattern" note.

## Deep Dive

### Getting routes from segments to the physical network

Two switches must both be on, and engineers forget one of them all the time:

1. **Tier-1 route advertisement** — checkboxes on the Tier-1: *All Connected Segments and Service Ports*, *All Static
   Routes*, *All NAT IP's*, *All LB VIP Routes*, *All LB SNAT IP Routes*, *All DNS Forwarder Routes*, *All IPSec Local
   Endpoints*. Without "All Connected Segments…", the Tier-0 never learns the Tier-1's subnets.
2. **Tier-0 route redistribution** — which sources the Tier-0 puts into BGP: Tier-0 connected subnets, Tier-1
   advertised connected subnets, NAT IPs, static routes and so on. Without it, BGP neighbors never hear about your
   segments.

Then the physical side must accept them (prefix lists on the ToR, correct ASNs).

### BGP on the Tier-0

| Setting | Notes |
|---|---|
| Local AS | Tier-0's ASN (e.g. 65001) |
| Neighbors | ToR IPs, remote AS, source address (uplink IP), timers, password, BFD |
| ECMP | On for A/A; multiple equal routes to the physical network |
| Graceful restart | Helper/restarter modes; useful during Edge failover |
| Route maps / prefix lists | Filter what is learned/advertised |

BGP states you'll see: **Idle → Connect → Active → OpenSent → OpenConfirm → Established**. Only *Established*
exchanges routes. KB 339392 lists the usual causes when it isn't: no IP reachability (VLAN, IP, MTU), mismatched
AS numbers, timers or BFD, wrong password, TCP 179 blocked, neighbor admin-down.

### Static routing

A static default route on the Tier-0 pointing at the ToR; on the ToR, static routes to the NSX prefixes pointing at
the Tier-0. For active/standby, point them at the **HA VIP**, so the next hop survives SR failover. The VCF 9 workflow
requires an HA VIP when you pick static routing for an A/S Tier-0.

### Failover modes (A/S)

- **Non-preemptive** (default on Tier-1): a recovered preferred Edge stays standby — avoids a second interruption.
- **Preemptive**: the preferred Edge takes back the active role when it returns.

### Tier-1 HA mode "Distributed Only"

VCF 9.0 Tier-1 options include **Distributed Only** — a DR-only gateway with no SR at all. Use it when you only need
east-west routing plus a path to the Tier-0, which is the most efficient pattern.

:::legacy VCF 5.x / Legacy Context
NSX-T 2.x/3.x documentation called gateways *logical routers*, and the Edge CLI still uses `get logical-routers`.
In VCF 9, much tenant routing is consumed as **VPC gateways and transit gateways**, which are built on the same
SR/DR machinery (the transit gateway in centralized mode connects to a Tier-0).
:::

## Configuration

Tier-1 (Networking → Tier-1 Gateways → Add):

| Field | Lab value |
|---|---|
| Name | `t1-lab` |
| Linked Tier-0 Gateway | `t0-lab` |
| HA mode | Distributed Only (no services) |
| Edge Cluster | (none — avoids an SR) |
| Route Advertisement | All Connected Segments and Service Ports |

Tier-0 (Networking → Tier-0 Gateways → Add): name, HA mode, edge cluster; **Interfaces**: one external interface per
Edge on the uplink VLAN segment; **BGP**: local AS, neighbors; **Route Re-distribution**: Tier-0 connected + Tier-1
connected segments.

## CLI / API

On an Edge, enter the Tier-0 SR routing context first:

```shell
edge-01> get logical-routers
edge-01> vrf 1
edge-01(tier0_sr)> get bgp neighbor summary
edge-01(tier0_sr)> get route
edge-01(tier0_sr)> get bgp neighbor 10.27.11.1 advertised-routes
edge-01(tier0_sr)> get high-availability status
```

`get logical-routers` shows each instance with its type (e.g. `SERVICE_ROUTER_TIER0`, `DISTRIBUTED_ROUTER_TIER1`) and
VRF number. Without entering a VRF you can use `get logical-router <uuid> bgp neighbor summary`. API:

```http
GET https://nsx-vip.lab.local/policy/api/v1/infra/tier-0s
GET https://nsx-vip.lab.local/policy/api/v1/infra/tier-0s/t0-lab/locale-services/default/bgp/neighbors/status
```

## Failure Scenarios

| Symptom | Likely cause | Check |
|---|---|---|
| East-west fine, north-south dead for all segments | BGP down / uplink VLAN wrong / Edge TEP unreachable | `get bgp neighbor summary`, uplink VLAN, `get tunnel-ports` |
| North-south dead for one new segment only | Tier-1 route advertisement or Tier-0 redistribution missing; ToR prefix filter | `get route` on SR, ToR routing table |
| BGP stuck in Active | No TCP 179 reachability: VLAN/IP mismatch, ACL | ping ToR from SR VRF |
| BGP Idle | Neighbor config/AS mismatch, admin down | Config both sides |
| Asymmetric drops after Edge failover | Static routes not using HA VIP | ToR static routes |
| Traffic hairpins through Edge unexpectedly | Edge cluster attached to Tier-1 → SR created | Tier-1 settings |

::incident[inc-nsx-edge-north-south]

## Troubleshooting

1. Separate east-west from north-south: if VMs on different segments talk, the DR and overlay are fine — focus on SR, uplinks, BGP and the physical side.
2. On the Edge: `get logical-routers` → `vrf <tier0 SR>` → `get bgp neighbor summary`. Established? Prefixes in/out non-zero?
3. `get route` on the SR: do you see the segment prefixes (learned from the Tier-1 via the router link) and a default route?
4. `get bgp neighbor <ip> advertised-routes`: are your segments advertised?
5. Physical router: does it have routes to the segments?
6. Traceflow from a VM to an external IP to see where it stops.

## Real-World Scenario

A new tenant Tier-1 with `seg-app` (`172.16.30.0/24`) can reach other segments but not the corporate network.
`get route` on the Tier-0 SR shows no `172.16.30.0/24`. The Tier-1 was created with route advertisement empty. After
enabling *All Connected Segments and Service Ports*, the route appears on the SR, `advertised-routes` toward the ToR
now lists it, and connectivity works — no Edge or BGP change needed.

## Lab

Build the Tier-0 with BGP in your lab, then connect your Tier-1 from the segments lab and watch the routes appear
on a router VM.

::lab[lab-nsx-tier0-bgp-edge]

## Exam Focus

:::exam
- Tier-0 = north-south provider gateway with uplinks, BGP/OSPF/static; Tier-1 = tenant gateway linked to one Tier-0.
- DR on every transport node; SR only on Edges. Selecting an edge cluster on a Tier-1 always creates an SR.
- Route advertisement (Tier-1) + route redistribution (Tier-0) + physical acceptance = reachability.
- A/S supports stateful services; A/A gives ECMP. Static routing on A/S uses an HA VIP.
- BGP Established is the only working state; Active ≈ trying to connect.
:::

## Common Exam Traps

:::trap
- **"Tier-1 runs BGP with the physical routers."** No — only the Tier-0 peers with physical routers.
- **"The DR runs only on Edges."** No — it runs on every transport node; the SR runs on Edges.
- **"BGP Active state means the session is up."** No — it means it is actively trying to connect and failing.
- **"Creating a segment on a Tier-1 automatically makes it reachable from outside."** Not without Tier-1 advertisement and Tier-0 redistribution.
- **"A Tier-1 with an edge cluster but no services stays fully distributed."** No — an SR is created anyway.
:::

## Knowledge Check

::quiz

## Summary

- Two tiers: Tier-0 (provider, physical peering) and Tier-1 (tenant, segments).
- Each gateway = DR (everywhere) + SR (Edges, only when needed).
- North-south: host DRs → Geneve to an Edge → Tier-0 SR → uplink VLAN → ToR; return is routed on the Edge.
- Reachability needs advertisement on Tier-1, redistribution on Tier-0, and BGP Established.
- Know the CLI: `get logical-routers`, `vrf`, `get bgp neighbor summary`, `get route`.

## Next Topic

VCF 9 wraps all this in a consumption model: [NSX VPCs and VCF Networking](lesson:nsx-vpcs-and-vcf-networking).
