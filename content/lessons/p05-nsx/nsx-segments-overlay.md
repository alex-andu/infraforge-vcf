---
id: nsx-segments-overlay
title: Segments, Overlay and the East-West Packet Walk
phase: p05-nsx
module: m05-nsx-fabric
version: vcf9
minutes: 40
difficulty: intermediate
summary: Overlay versus VLAN-backed segments, how a segment appears in vCenter, and exactly what happens to a packet between two VMs on the same host, on different hosts, and on different segments.
topics: [nsx-segments, nsx-transport]
objectives: ["2.4"]
keyTerms: [segment, overlay-segment, vlan-segment, geneve, tep, dr]
labs: [lab-nsx-segments-tier1]
incidents: [inc-mtu-overlay]
components: [nsx-manager, esx-host, vds]
related: [nsx-transport-nodes-teps, nsx-tier0-tier1-routing, nsx-security-dfw-gateway-firewall]
sources:
  - title: "VCF 9.0 – Segments"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/segments.html
  - title: "VCF 9.0 – Create an NSX Segment"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/segments/add-an-nsx-segment.html
  - title: "VCF 9.0 – Transport Zones and Profiles"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/transport-zones-and-transport-nodes.html
  - title: "NSX 4.1 Installation Guide – Key Concepts"
    url: https://docs.vmware.com/en/VMware-NSX/4.1/installation/GUID-A1BBC650-CCE3-4AC3-A774-92B195183492.html
  - title: "NSX CLI Guide 9.0.2 – Layer 2 commands"
    url: https://developer.broadcom.com/xapis/nsx-cli-guide/9.0.2/all_networking_layer_2.html
---

## Why This Matters

A [[segment]] is what a VM actually plugs into. Understanding *where* a packet goes between two VMs — does it stay
in the host, cross the physical network in a tunnel, or hit an Edge? — is the single most useful mental model in
NSX. It predicts performance ("why is east-west traffic not touching my Edges?"), failure impact ("Edge down, why
does the app tier still talk to the DB tier?") and troubleshooting scope. The exam's "configure virtual networking
fabrics and features" and "connectivity and routing" items assume you can follow these flows.

## Learning Objectives

- Distinguish [[overlay-segment|overlay segments]] from [[vlan-segment|VLAN-backed segments]] and pick the right one.
- Describe the options when creating a segment: connected gateway, transport zone, subnet/gateway, VLAN, DHCP, profiles.
- Walk a packet between two VMs on the same segment on the same host, on different hosts, and across segments.
- Explain how NSX learns MAC/IP-to-TEP mappings and how broadcast/unknown traffic is replicated.
- Verify a segment from vCenter, NSX Manager and nsxcli.

## Concept

In NSX, "segments are virtual layer 2 domains" (formerly *logical switches*). Each segment lives in one transport
zone, and its type follows the zone:

| | Overlay segment | VLAN-backed segment |
|---|---|---|
| Transport zone | Overlay | VLAN |
| How hosts carry it | Geneve tunnels between TEPs, identified by a VNI | 802.1Q tag on the host uplinks |
| Physical network changes to add one | **None** (only the TEP network must exist) | VLAN must exist on every trunk |
| Typical use | Workload networks, VPC subnets, Tier-1 downlinks | Edge uplinks to physical routers, workloads that must sit in a physical VLAN |
| Can attach to Tier-0/Tier-1 as downlink | Yes | Service interfaces on gateways; uplinks on Tier-0 |

When you create a segment you choose:

| Field | Meaning |
|---|---|
| **Connected Gateway** | None (isolated L2), a Tier-1 or a Tier-0 gateway |
| **Transport Zone** | Overlay or VLAN zone |
| **Subnets / Gateway CIDR** | The gateway IP on the router, e.g. `172.16.10.1/24`; required if connected to a gateway |
| **VLAN** | For VLAN segments: the VLAN ID (must be in the zone's allowed range) |
| **Set DHCP Config** | Gateway DHCP, segment DHCP server or relay. A standalone (not connected) segment only supports a local DHCP server |
| **Segment Profiles** | SpoofGuard, IP discovery, MAC discovery, segment security, QoS |
| Uplink teaming policy | Named teaming policy to pin the segment to an uplink |

In vCenter a segment appears as a port group on the NSX-enabled VDS, so a VM administrator attaches VMs as usual.

## Architecture

::diagram[d05-east-west-packet-walk]

Step through the diagram. It contains two hosts, three VMs and two segments joined by a Tier-1 gateway. The steps
show the three cases you must know: same segment same host, same segment different hosts, and different segments
(routed by the distributed router).

## Components

| Component | Role in east-west forwarding |
|---|---|
| VM vNIC / segment port | Attachment point; DFW enforces here |
| VDS with NSX | Switches frames locally within the host |
| Segment (VNI) | Identifies the L2 domain inside Geneve |
| TEP | Encapsulates/decapsulates Geneve |
| Distributed router ([[dr]]) | Instance of every connected gateway present in every host kernel; routes between segments locally |
| CCP | Distributes MAC/IP-to-TEP tables and ARP information to hosts |

## How It Works

### Case 1 — same segment, same host

1. VM-A (`172.16.10.11`) sends a frame to VM-B (`172.16.10.12`) on segment *web*.
2. The host's switching module looks up VM-B's MAC: it is a local port.
3. The frame is delivered locally. **It never leaves the host** — no TEP, no Geneve, no physical network.

### Case 2 — same segment, different hosts

1. VM-A on host-01 sends to VM-C (`172.16.10.13`) on host-02, same segment.
2. Host-01 looks up VM-C's MAC in the segment's table: remote, behind host-02's TEP (learned via the CCP).
3. Host-01 encapsulates the frame in Geneve with the segment's VNI, outer source = its TEP, outer destination = host-02's TEP.
4. The underlay routes/switches the UDP packet between TEPs (MTU must allow the extra header).
5. Host-02 decapsulates, sees the VNI, and delivers the original frame to VM-C.

### Case 3 — different segments, same Tier-1 (routed east-west)

1. VM-A on *web* (`172.16.10.11`) sends to VM-D on *app* (`172.16.20.21`) on host-02. VM-A's default gateway is `172.16.10.1` — the Tier-1 interface.
2. That gateway is answered **locally** by the Tier-1 DR on host-01. The DR routes the packet into segment *app*.
3. Host-01 now forwards on segment *app*: VM-D is behind host-02's TEP, so it encapsulates with the *app* VNI.
4. Host-02 decapsulates and delivers to VM-D. The return path is routed by the DR on host-02.

Routing happened **at the source host**. No Edge was touched — as long as the Tier-1 has no service router in the
path (more in [Tier-0 and Tier-1](lesson:nsx-tier0-tier1-routing)).

## Deep Dive

### How hosts learn where MACs live

Each host reports the MAC and IP of its local VMs (and which TEP they are behind) to the CCP. The CCP distributes
these tables to the other hosts that carry the segment. This also lets NSX answer many ARP requests locally
(ARP suppression) instead of flooding them. If a host has no entry, it can learn from received traffic.

The NSX documentation notes a default limit of **2048** remote MAC addresses learned on an overlay segment
(API field `remote_overlay_mac_limit`).

### BUM replication

Broadcast, unknown-unicast and multicast (BUM) frames on an overlay segment must reach every host carrying the
segment. NSX replicates them in software, using the segment's replication mode:

| Mode | Behaviour |
|---|---|
| Hierarchical two-tier (default) | Source sends a copy to each host in its own TEP subnet, and one copy to a proxy host in each remote TEP subnet, which replicates locally |
| Head | Source host sends a copy to every other host itself |

No multicast is needed in the physical network for either.

### VLAN-backed segments in VCF 9

VLAN segments are not "second class": Edge uplinks are VLAN segments, and VCF 9 also lets NSX protect plain VDS port
groups with the distributed firewall ("distributed security for VDS"), so you can micro-segment VLAN workloads without
moving them to overlay.

### Bridging overlay and VLAN

An Edge bridge can extend an overlay segment into a VLAN (for migrations or physical servers in the same subnet).
It runs on Edges and is a centralized service, so it is a specialist tool rather than a default design.

:::vcf9 Changed in VCF 9
In VCF 9 many workload networks are created as **VPC subnets** from vCenter rather than as hand-built segments.
Under the covers a VPC subnet is still an overlay segment connected to the VPC gateway. See
[VPCs and VCF Networking](lesson:nsx-vpcs-and-vcf-networking).
:::

## Configuration

Create an overlay segment connected to a Tier-1 (NSX Manager → Networking → Segments → Add Segment):

| Field | Example |
|---|---|
| Name | `seg-web` |
| Connected Gateway | `t1-lab` (Tier-1) |
| Transport Zone | `nsx-overlay-transportzone` |
| Subnets | `172.16.10.1/24` |
| DHCP | Optional — Gateway DHCP or segment DHCP server |

Create a VLAN segment for an Edge uplink:

| Field | Example |
|---|---|
| Name | `seg-uplink-v2711` |
| Connected Gateway | None |
| Transport Zone | VLAN TZ used by Edges |
| VLAN | `2711` |

## CLI / API

```shell
# On an ESX host
nsxcli
esx-01> get logical-switches
esx-01> get segment <vni-or-uuid> mac-table
esx-01> get segment <vni-or-uuid> arp-table
```

`get logical-switches` lists segments realized on the host with their VNI. API (Policy):

```http
GET https://nsx-vip.lab.local/policy/api/v1/infra/segments
GET https://nsx-vip.lab.local/policy/api/v1/infra/segments/seg-web
```

## Failure Scenarios

| Failure | East-west impact |
|---|---|
| Edge cluster down | **None** for traffic between segments on the same Tier-1 with no SR in path |
| TEP network broken between two hosts | Same-segment traffic across those hosts fails; same-host traffic fine |
| MTU too small on underlay | Small packets ok, large transfers hang |
| Host not in the overlay TZ | Segment port group missing on that host |
| CCP unreachable from a host | Existing flows ok; new VMs on that host may not be reachable |
| DFW rule blocking | Looks like a network failure; check DFW before blaming routing |

## Troubleshooting

1. Same host or different hosts? If two VMs on the same host can talk but not across hosts → underlay/TEP.
2. Same segment or different segments? If same-segment works but routed fails → gateway interface, VM gateway, DFW.
3. Use **Traceflow** in NSX Manager (Plan & Troubleshoot) to inject a synthetic packet and see each hop, including DFW decisions.
4. Check the segment realization status in NSX Manager and the host's `get logical-switches`.
5. Check TEPs with `vmkping ++netstack=vxlan -d -s 1572`.

## Real-World Scenario

An application team reports that the web tier on `seg-web` cannot reach the app tier on `seg-app`, but only for
some VMs. Traceflow from a failing web VM shows the packet routed by the Tier-1 DR and then **dropped by a DFW rule**
on the destination vNIC — a new "deny app from any" rule was placed above the allow rule. The network was fine; the
policy order was not. Moving the allow rule above the deny fixed it.

## Lab

Build two overlay segments on a Tier-1, place VMs on two nested hosts and prove each packet-walk case with ping,
Traceflow and `get logical-switches`.

::lab[lab-nsx-segments-tier1]

## Exam Focus

:::exam
- Overlay segment = Geneve/VNI, no physical VLAN per network. VLAN segment = physical VLAN required.
- Segment options: Connected Gateway (None/Tier-1/Tier-0), Transport Zone, Subnets, VLAN, DHCP, profiles.
- East-west routing between segments on the same Tier-1 is done by the DR **on the source host**.
- Same-host traffic never leaves the host; cross-host traffic is Geneve-encapsulated TEP to TEP.
:::

## Common Exam Traps

:::trap
- **"Traffic between two segments goes to the Edge to be routed."** Not by default — the DR routes it locally. Only SR services (NAT, gateway firewall, etc.) force traffic through an Edge.
- **"Every new overlay segment needs a new VLAN on the switches."** No — that is a VLAN-backed segment.
- **"BUM traffic needs multicast on the physical network."** No — NSX replicates in software (hierarchical two-tier or head).
- **"A segment can be in two transport zones."** No — exactly one.
:::

## Knowledge Check

::quiz

## Summary

- Segments are NSX L2 domains: overlay (Geneve, no physical change) or VLAN-backed.
- Same-host traffic stays in the host; cross-host traffic is tunnelled between TEPs.
- Routing between segments on the same gateway happens in the DR on the source host.
- The CCP distributes MAC/IP-to-TEP knowledge; BUM is replicated in software.
- Traceflow, `get logical-switches` and vmkping on the vxlan stack are your verification tools.

## Next Topic

East-west is distributed. To leave the virtual network you need Edges: [Edge Nodes and Edge Clusters](lesson:nsx-edge-nodes-clusters).
