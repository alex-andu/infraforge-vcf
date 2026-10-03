---
id: nsx-transport-nodes-teps
title: Transport Zones, Transport Nodes and TEPs
phase: p05-nsx
module: m05-nsx-fabric
version: vcf9
minutes: 35
difficulty: intermediate
summary: How ESX hosts and Edges are prepared as NSX transport nodes, what transport zones and transport node profiles control, how TEPs and Geneve tunnels work, and why MTU is the number one overlay failure.
topics: [nsx-transport, nsx-architecture]
objectives: ["2.4", "4.1"]
keyTerms: [transport-zone, transport-node, transport-node-profile, tep, geneve, bfd]
labs: [lab-nsx-segments-tier1]
incidents: [inc-mtu-overlay]
components: [nsx-manager, esx-host, vds, physical-network]
related: [nsx-architecture, nsx-segments-overlay, nsx-edge-nodes-clusters]
sources:
  - title: "Broadcom KB 379112 – Troubleshooting NSX TEP/BFD tunnels"
    url: https://knowledge.broadcom.com/external/article/379112
  - title: "VCF 9.0 – Transport Zones and Profiles"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/transport-zones-and-transport-nodes.html
  - title: "VCF 9.0 – MTU Guidance"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/transport-zones-and-transport-nodes/mtu-guidance.html
  - title: "VCF 9.0 – Configure Centralized Network Connectivity with Edge Clusters (TNP, TEP VLAN prerequisites)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/managing-network-connectivity-in-vcenter/managing-centralized-network-connectivity-with-edge-clusters.html
  - title: "NSX 4.1 Installation Guide – Key Concepts (TEP, Geneve, transport node)"
    url: https://docs.vmware.com/en/VMware-NSX/4.1/installation/GUID-A1BBC650-CCE3-4AC3-A774-92B195183492.html
  - title: "NSX CLI Guide 9.0.2 – Layer 2 commands (get tunnel-ports, get vteps)"
    url: https://developer.broadcom.com/xapis/nsx-cli-guide/9.0.2/all_networking_layer_2.html
  - title: "VCF 9.0 – Create a New Workload Domain Using VCF Operations (Host TEP IP pool/DHCP)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/deploy-a-vi-workload-domain-using-the-sddc-manager-ui.html
---

## Why This Matters

The overlay only works if every host and Edge can reach every other host and Edge **on its TEP address, with a
big enough MTU**. Most "NSX is broken" tickets in new environments are not NSX bugs; they are a missing VLAN on a
trunk, a TEP pool with the wrong gateway, or a switch port at MTU 1500. For the exam (objective 2.4, "configure
virtual networking fabrics") you must know the building blocks — transport zone, transport node, transport node
profile, uplink profile, TEP pool — and how they fit together. For your lab, TEPs and MTU are exactly where nested
environments on Proxmox go wrong.

## Learning Objectives

- Define [[transport-zone|transport zones]] (overlay and VLAN) and their scope rules.
- Explain how an ESX host becomes a [[transport-node]] through a [[transport-node-profile]] attached to a vSphere cluster.
- Describe a [[tep]], how TEP addresses are assigned and how [[geneve]] tunnels are formed and monitored with [[bfd]].
- State the MTU numbers: 1600 minimum, 1700 recommended/default, 9000 best, and the VM-vs-fabric headroom rule.
- Verify TEPs and tunnels from the UI, nsxcli and vmkping.

## Concept

### Transport zone

A **transport zone (TZ)** defines *which transport nodes can see which segments*. It is a scope, not a network:

| Type | Segments in it | Backing |
|---|---|---|
| **Overlay** | Overlay segments | Geneve tunnels between TEPs |
| **VLAN** | VLAN-backed segments (e.g. Edge uplinks, VLAN workloads) | 802.1Q VLAN on the physical uplinks |

Rules from the NSX documentation:
- A transport node can belong to **multiple** transport zones.
- A segment belongs to **exactly one** transport zone.
- A transport zone can span one or more clusters.
- NSX ships with two defaults: `nsx-overlay-transportzone` and `nsx-vlan-transportzone`.

If a host is not in the transport zone of a segment, VMs on that host simply cannot attach to that segment — a classic
"the port group doesn't appear on host-04" cause.

### Transport node

A **transport node** is a fabric node prepared to take part in NSX networking. Two kinds:

- **Host transport node** — an ESX host with NSX kernel modules installed, attached to a VDS that NSX uses.
- **Edge transport node** — an NSX Edge VM or bare-metal Edge (see [Edge nodes](lesson:nsx-edge-nodes-clusters)).

### TEP

A **tunnel endpoint (TEP)** is the IP address a transport node uses as the source and destination of overlay
tunnels. On ESX it is a dedicated VMkernel adapter in its own TCP/IP stack; on an Edge it is an interface of the
data-path. Each transport node encapsulates overlay VM traffic and sends it to the destination TEP.

### Geneve

**Geneve** (Generic Network Virtualization Encapsulation) is the overlay encapsulation NSX uses. The original
Ethernet frame is wrapped in Geneve + UDP + outer IP + outer Ethernet. The Geneve header carries the **VNI**
(the segment's 24-bit identifier) plus options NSX uses for metadata. The outer header adds overhead, which is why
the underlay needs a larger MTU than the VMs use.

## Architecture

::diagram[d05-transport-nodes-teps]

Two ESX hosts and one Edge are transport nodes in the same overlay transport zone. Each has a TEP on the TEP
VLAN (here the hosts and Edge share a routed TEP network). Every pair of TEPs that needs to exchange traffic forms a
Geneve tunnel; BFD runs inside these tunnels so each node knows whether its peers are reachable. The Edge
additionally sits in a VLAN transport zone for its uplinks to the physical router.

## Components

| Object | What it defines | Where configured |
|---|---|---|
| Transport zone | Scope of segments (overlay or VLAN) | NSX Manager → System → Fabric → Transport Zones |
| Uplink profile | Teaming policy (failover order, load balance source), active/standby uplink names, **transport VLAN** for TEPs, optional MTU | System → Fabric → Profiles → Uplink Profiles |
| TEP IP pool | Range, gateway and CIDR for TEP addresses (or use DHCP / static list) | Networking → IP Address Pools |
| Transport node profile (TNP) | Template: which VDS, which TZs, which uplink profile, TEP addressing, uplink-to-pNIC mapping | System → Fabric → Profiles → Transport Node Profiles |
| Host transport node | An ESX host prepared with NSX | Applied automatically when a TNP is attached to its cluster |
| Global fabric MTU | Default Tunnel Endpoint MTU | System → Global Fabric Settings |

In VCF, you rarely build these by hand for the management domain or new workload domains: the VCF Installer and the
workload-domain workflow create the TNP and apply it, asking you for the **Host TEP VLAN** and either a **static IP
pool or a DHCP server** on that VLAN.

## How It Works

Host preparation and tunnel formation:

1. vCenter is registered in NSX as a compute manager, so NSX sees clusters and hosts.
2. A transport node profile is attached to the vSphere cluster.
3. NSX pushes its kernel modules to each host and configures the VDS for NSX.
4. Each host gets its TEP VMkernel adapter(s) with an IP from the pool (or DHCP), tagged with the transport VLAN from the uplink profile.
5. The host joins the transport zones listed in the TNP; its LCP connects to the CCP.
6. The CCP tells each host which other TEPs participate in the segments it carries.
7. Hosts bring up Geneve tunnels to those TEPs on demand and run BFD inside them; tunnel state appears in the UI as up or down.
8. When a new host is added to the cluster, the TNP prepares it automatically — consistency by design.

### Multiple TEPs

With a teaming policy that uses two active uplinks (for example load balance source), a host gets **two TEPs**,
one pinned to each uplink. VMs are spread across the TEPs, using both links for overlay traffic. If an uplink fails,
its TEP moves to the surviving uplink.

## Deep Dive

### MTU: the numbers to memorize

From the NSX MTU guidance in VCF 9.0:

| Setting | Value |
|---|---|
| Minimum MTU for overlay | **1600** bytes |
| Recommended (and default Global Tunnel Endpoint MTU) | **1700** bytes |
| Best performance | **9000** bytes if the underlay supports it |
| Global logical interface (gateway) MTU default | 1500 bytes; keep it at least 200 bytes below the fabric MTU |
| VM MTU | Normally 1500; can go up to 8800 on a 9000 fabric — keep it 100 (preferably 200) bytes below the fabric |

The **VDS MTU** set in vCenter overrides the uplink-profile value, so the effective host MTU is what the VDS says.
Every switch port, trunk and router hop on the TEP path must support the larger MTU.

### Testing MTU properly

The TEP VMkernel lives in a separate TCP/IP stack, so a plain `vmkping` uses the wrong stack. Use the `vxlan`
netstack and the "don't fragment" bit:

```shell
vmkping ++netstack=vxlan -d -s 1572 192.168.13.12
```

`-s 1572` = 1600 total minus 28 bytes of IP/ICMP headers. Broadcom KB 379112 writes the same test as
`vmkping -I vmk10 -S vxlan -d -s 1572 <destination TEP>` (pick the TEP vmk explicitly), and on the host
`nsxdp-cli bfd sessions list` shows the BFD state of every tunnel. For a 9000 fabric test with `-s 8972`. If small pings
work and large ones fail, you have an MTU problem, not a routing problem.

### TEP addressing and routing

TEPs on different hosts can be on the same subnet or different (routed) subnets — Geneve is plain UDP/IP, so it
routes. What matters is IP reachability with the right MTU end to end. In VCF 9's centralized-connectivity workflow
the **Edge TEP VLAN may be the same as the host TEP VLAN**; when Edges run on NSX-prepared hosts and share that
VLAN, the prerequisite "Activate NSX on DVPG" must be enabled.

:::legacy VCF 5.x / Legacy Context
In older NSX-T designs, Edge VMs running on NSX-prepared hosts usually needed their TEPs on a **different VLAN** from
the host TEPs (with routing between them), or the inter-TEP traffic would not leave the host correctly. Many
blogs still describe that rule. The VCF 9 vCenter workflow documents reusing the same VLAN.
:::

### BFD on tunnels

NSX runs Bidirectional Forwarding Detection inside the Geneve tunnels between transport nodes. The UI's tunnel
status and the Edge's ability to detect a dead peer quickly both depend on it. "Tunnel down" usually means the
underlay path between two TEPs is broken (VLAN, routing, MTU, or a firewall in the path).

## Configuration

Typical checklist when adding hosts to the overlay (most of it automated by VCF):

| Step | Where | Check |
|---|---|---|
| Plan the Host TEP VLAN, subnet and gateway | Physical network | VLAN trunked to every host uplink, MTU ≥ 1700 (9000 preferred) |
| Provide TEP addresses | IP pool in VCF workflow, or DHCP on the TEP VLAN | Enough addresses for 2 TEPs per host if multi-TEP |
| Set VDS MTU | vCenter → VDS → Settings | Matches the fabric |
| Attach TNP to cluster | NSX → System → Fabric → Hosts → Clusters | All hosts show "Success"/up |
| Confirm transport zone membership | NSX → Transport Zones | Overlay TZ contains the hosts |

## CLI / API

```shell
# ESX shell: list VMkernel adapters (TEPs are typically vmk10/vmk11 in the vxlan stack)
esxcli network ip interface ipv4 get

# Enter NSX CLI on the host and inspect tunnels
nsxcli
esx-01> get tunnel-ports
esx-01> get vteps
```

`get tunnel-ports` lists each tunnel port with its remote TEP IP and encapsulation (GENEVE). API to inspect a host
transport node's realized state:

```http
GET https://nsx-vip.lab.local/api/v1/transport-nodes/<node-id>/state
```

## Failure Scenarios

| Failure | Symptom | Root cause area |
|---|---|---|
| TEP VLAN missing on a trunk | Tunnels from one host down; VMs there can't reach VMs elsewhere on overlay | Physical switch config |
| MTU 1500 somewhere on the path | Ping works, SSH/HTTPS stalls; large vmkping fails | MTU (see the MTU incident) |
| TEP pool exhausted | New host fails NSX preparation | IP pool sizing |
| Wrong TEP gateway | Tunnels to routed TEP subnets down, same-subnet tunnels up | Pool/DHCP config |
| Host not in overlay TZ | Segment not visible on that host | TNP / TZ membership |
| One uplink fails | Its TEP fails over to the other uplink; brief disruption | Teaming |

::incident[inc-mtu-overlay]

## Troubleshooting

1. In NSX Manager → System → Fabric → Hosts, check the host's NSX configuration state and **tunnel status**.
2. `vmkping ++netstack=vxlan <remote-TEP>` — basic reachability.
3. `vmkping ++netstack=vxlan -d -s 1572 <remote-TEP>` — MTU along the path.
4. `get tunnel-ports` on the host or Edge — which remote TEPs are known.
5. Check the physical switch: VLAN allowed on the trunk, MTU on every port and SVI.
6. Check the TNP: correct uplink profile, transport VLAN and IP pool.

## Real-World Scenario

A new rack is added and four hosts are commissioned into an existing workload-domain cluster. NSX prepares them
successfully, but VMs vMotioned to the new hosts lose connectivity for large transfers while pings still work.
`vmkping ++netstack=vxlan -d -s 1572` fails from new hosts to old ones but works between the new hosts. The new
rack's leaf switches were left at MTU 1500 on the uplinks to the spine. Raising the MTU fixes it — no NSX change
was needed.

## Lab

Your nested lab must carry TEP traffic through Proxmox bridges: set MTU 9000 (or at least 1700) on the Proxmox
bridge/VLAN interfaces and the nested ESX VDS, then verify with vmkping.

::lab[lab-nsx-segments-tier1]

## Exam Focus

:::exam
- Transport zone = scope; overlay vs VLAN; one segment → one TZ; one node → many TZs.
- Transport node profile attached to a vSphere cluster prepares every host consistently.
- TEP = source/destination of Geneve tunnels; addresses from IP pool, DHCP or static list.
- MTU: 1600 minimum, 1700 recommended, 9000 ideal. VDS MTU wins over the uplink profile.
- Tunnel down → think underlay: VLAN, routing, MTU.
:::

## Common Exam Traps

:::trap
- **"A transport zone is a broadcast domain."** No — a segment is the L2 domain; the TZ only defines which nodes can host it.
- **"Overlay needs MTU 9000."** No — 1600 is the minimum, 1700 recommended; 9000 is optimal.
- **"Geneve needs the TEPs in one L2 subnet."** No — Geneve is UDP/IP and routes.
- **"vmkping to a TEP with default options proves MTU."** No — you need `++netstack=vxlan` and `-d -s <size>`.
:::

## Knowledge Check

::quiz

## Summary

- Transport zones scope segments; transport nodes (ESX hosts, Edges) carry them.
- Transport node profiles prepare whole clusters consistently, including TEPs and teaming.
- TEPs are tunnel endpoints; Geneve wraps VM frames with a VNI and UDP/IP headers.
- MTU 1600/1700/9000 and end-to-end checks with vmkping on the vxlan netstack.
- Tunnel failures are almost always underlay problems.

## Next Topic

With the fabric in place you can build networks on it: [Segments and Overlay](lesson:nsx-segments-overlay).
