---
id: troubleshooting-network-nsx-vsan
title: "Troubleshooting Networking, NSX and vSAN in VCF"
phase: p13-troubleshooting
module: m13-method
version: vcf9
minutes: 45
difficulty: advanced
summary: A layer-by-layer approach to data-path problems in VCF 9 — physical fabric, VDS and vmknics, MTU, NSX TEPs and overlay, edges and north-south routing, and vSAN networking and object health — with the commands that prove each layer.
topics: [mtu, vds, nsx-transport, nsx-edge, nsx-routing, vsan-health, troubleshooting-method]
objectives: ["2.3", "2.4", "4.3"]
keyTerms: [root-cause-analysis, vcf-health, remote-syslog]
labs: [lab-network-readiness, lab-nsx-segments-tier1, lab-nsx-tier0-bgp-edge, lab-vsan-esa-cluster, lab-troubleshooting-drill]
incidents: [inc-mtu-overlay, inc-nsx-edge-north-south, inc-vsan-degraded-objects]
components: [physical-network, vds, nsx-manager, nsx-edge-cluster, vsan, esx-host, vcf-operations-networks]
related: [troubleshooting-methodology, troubleshooting-vcf-services, vcf-network-design, nsx-transport-nodes-teps, nsx-tier0-tier1-routing, vsan-health-troubleshooting]
sources:
  - title: "VCF 9.0 – Distributed Switch Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/cluster-network-deployment-models.html
  - title: "VCF 9.0 – NSX Management and Control Plane Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-networking-management-and-control-plane.html
  - title: "Broadcom KB 376813 – Troubleshooting NSX Installation Operations"
    url: https://knowledge.broadcom.com/external/article/376813/troubleshooting-nsx-installation-operati.html
  - title: "Broadcom KB 425724 – How to check the log file via NSX CLI"
    url: https://knowledge.broadcom.com/external/article/425724/how-to-check-the-logfile-via-nsxcli.html
  - title: "Broadcom KB 320280 – Restarting Management Agents in ESXi"
    url: https://knowledge.broadcom.com/external/article/320280
  - title: "William Lam – Ultimate lab resource for VCF 9.0 (MTU values in deployment JSON)"
    url: https://williamlam.com/2025/06/ultimate-lab-resource-for-vcf-9-0.html
  - title: "NSX 4.2 – NSX Edge VM system requirements"
    url: https://docs.vmware.com/en/VMware-NSX/4.2/installation/GUID-22F87CA8-01A9-4F2E-B7DB-9350CA60EA4E.html
---

## Why This Matters

Most "VCF is slow / VMs can't talk / vSAN is degraded" incidents are data-path problems, and the data path crosses the most teams: the physical network team owns switches and routers, the virtualization team owns the VDS and vmknics, the NSX admin owns TEPs, segments and gateways, and vSAN rides on all of it. Each team can honestly say "my side looks fine" while traffic dies in between.

The skill this lesson builds is **walking the data path layer by layer with a test that proves each layer**, from the physical link up to the vSAN object or the overlay segment. It ties directly to exam objectives 2.3 (vSAN resilience and health) and 2.4 (networking components, fabrics, connectivity and routing), and to 4.3 (monitoring networks and vSAN with VCF Operations).

## Learning Objectives

- Troubleshoot bottom-up: physical link → VLAN → IP/gateway → MTU → VDS/vmknic → NSX TEP/overlay → logical routing/edges → workload.
- Prove MTU end-to-end with `vmkping` don't-fragment tests on the correct vmknic or netstack.
- Distinguish NSX management-plane, control-plane and data-plane failures and their impact.
- Diagnose edge/north-south problems (uplink VLANs, BGP/static routing, route advertisement).
- Diagnose vSAN network partitions and degraded/inaccessible objects, and choose safe remediation.

## Concept

Think of the data path as a stack where each layer depends on the one below:

| Layer | Healthy means | Typical failure |
|---|---|---|
| Physical | Links up, correct speed, LACP/teaming consistent | Cable/port down, wrong port mode (access vs trunk) |
| VLAN | Every required VLAN trunked to every host port | VLAN missing on one switch port → one host isolated for that traffic |
| IP / gateway | vmknics in the right subnet, gateway reachable where routing is needed | Wrong IP pool/network pool, missing gateway for routed TEPs |
| MTU | Every hop supports the configured MTU (switch, VDS, vmknic) | Jumbo on hosts but 1500 on one switch port or inter-switch link |
| VDS / vmknic | Port groups, uplinks and teaming correct; vmknic tagged for its service | vMotion/vSAN tag on wrong vmknic, wrong uplink order |
| NSX overlay ([[tep|TEPs]]) | Geneve tunnels up between all transport nodes | TEP IP pool/VLAN wrong, MTU < required |
| NSX routing (edges) | [[tier-0|Tier-0]] uplinks up, BGP/static routes established, routes advertised | Uplink VLAN wrong, BGP neighbour mismatch, no route advertisement on Tier-1 |
| vSAN | All hosts in one partition, objects compliant | Partition from VLAN/MTU problems, disk/host failure, policy not satisfiable |

:::general
**Why [[mtu|MTU]] bites overlays and vSAN.** [[geneve|Geneve]] adds headers to every frame. NSX requires an underlay MTU of at least 1600 bytes and most VCF designs simply run 9000 end-to-end (William Lam's VCF 9 lab JSON uses 8900 on vMotion and vSAN networks). When one hop is still at 1500, small packets (ping, ARP, TCP handshakes) work and large ones silently drop. The symptom is "connects but hangs", not "cannot connect".
:::

## Architecture

::diagram[d13-network-storage-layers]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/50eadc71-6d37-4996-aded-66d5ef711d70.original.svg" caption="Distributed Switch Models in VMware Cloud Foundation (Broadcom TechDocs)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/cluster-network-deployment-models.html"}

The distributed switch model determines **which physical NICs carry which traffic**, which in turn determines where to look. TechDocs lists models from a single VDS carrying everything (management, vMotion, vSAN, NSX and workloads — possible even with one physical NIC via the API) through storage separation, workload separation, storage-and-workload separation (minimum six NICs with redundancy), dedicated edge clusters and vSAN storage cluster separation. In a single-VDS design, one bad trunk configuration affects every traffic type at once; in separated designs, the symptom points at the specific fabric.

## Components

| Component | Data-path role | Where its evidence is |
|---|---|---|
| Physical switches/router | VLANs, MTU, routing between TEP subnets, BGP peers for Tier-0 | Switch CLI/logs (physical team) |
| VDS | Port groups, uplinks, teaming; MTU per switch | vCenter (*Networking*), host `esxcli network vswitch dvs vmware list` |
| vmknics | Management, vMotion, vSAN, TEP interfaces | `esxcli network ip interface list` / `ipv4 get` |
| NSX Manager cluster | Management + control plane (desired state, topology) | NSX UI/API, `/var/log/syslog`, NSX CLI `get cluster status` |
| Transport nodes (ESX) | Data plane: TEPs, distributed routing and firewall in the kernel | NSX UI host status/tunnels, host vmkernel logs |
| NSX Edge nodes | Tier-0/Tier-1 service routers, uplinks, BGP, NAT | NSX UI, edge `/var/log/syslog` |
| vSAN | Distributed storage over the vSAN vmknics | vSAN health (vCenter cluster *Monitor → vSAN*), `esxcli vsan ...`, VCF Operations storage operations |
| VCF Operations for networks / VCF Operations | Flows, paths, alerts, vSAN monitoring | VCF Operations UI |

NSX Manager models in VCF 9 (TechDocs): **simple** (single node + VIP, smallest footprint, slower recovery, management/control plane impacted during upgrades), **high availability** (three nodes + VIP, anti-affinity) and **HA with external load balancer**. A manager outage affects configuration and control-plane changes; it is not the same thing as a data-plane outage.

## How It Works

Bottom-up walk for "VM on overlay segment cannot reach VM on another host":

1. **Scope**: same host works? Same segment different hosts fails? Only large transfers fail? Only one host involved?
2. **Physical/VLAN**: is the TEP VLAN trunked on *every* host uplink port? Check with the physical team or by testing TEP-to-TEP.
3. **TEP reachability**: from host A, `vmkping ++netstack=vxlan <TEP-of-host-B>`.
4. **MTU**: `vmkping ++netstack=vxlan -d -s 1572 <TEP-B>` (proves ≥1600) and, if the fabric is 9000, `-s 8972`.
5. **NSX state**: in NSX Manager check host transport node status and tunnel status; check the segment exists on both hosts (realized state).
6. **DFW**: rule hits/drops for the flow (security policy may be the "network problem").
7. **Verify**: application test with real payload sizes, not just ping.

For north-south ("overlay VMs cannot reach the internet"):

1. Tier-1 connected to Tier-0? Tier-1 **route advertisement** enabled for connected segments?
2. Tier-0 uplink interfaces up on the edge nodes; uplink VLANs correct on the edge's port groups and physical switch.
3. BGP neighbours established (or static routes present) on Tier-0; physical router has routes back to the overlay subnets.
4. Edge TEP to host TEP reachability and MTU (edges are transport nodes too).

## Deep Dive

### MTU testing done right

`vmkping` sends from a VMkernel interface. Use `-I vmkX` to choose the interface, `-d` to forbid fragmentation, and `-s` for the ICMP payload size: payload = MTU − 28 bytes (20 IP + 8 ICMP).

| Target MTU | Payload `-s` | Use |
|---|---|---|
| 1500 | 1472 | Baseline: if this fails the problem is not MTU |
| 1600 | 1572 | NSX minimum underlay |
| 9000 | 8972 | Full jumbo path |

TEP interfaces live in a separate TCP/IP stack; reach it with `++netstack=vxlan` instead of `-I`. If 1472 works but 8972 fails, the path has a hop with a smaller MTU. If even 1472 fails, it is VLAN/IP/routing, not MTU.

### NSX planes and their failure impact

| Plane | Lives on | If it fails |
|---|---|---|
| Management | NSX Manager cluster | No configuration changes; UI/API unavailable; existing forwarding continues |
| Control | Central control plane on managers + local control plane on transport nodes | New topology/changes not propagated; existing state on hosts continues to forward |
| Data | ESX transport nodes and edges | Actual traffic loss — urgent |

This is why "NSX Manager is down" is serious but often not a workload outage, while "TEP VLAN removed from a trunk" is an immediate outage for that host's overlay traffic.

### Edge and north-south

Edge VM sizes (NSX 4.2 documentation): small 2 vCPU/4 GB, medium 4 vCPU/8 GB, large 8 vCPU/32 GB, extra large 16 vCPU/64 GB, 200 GB disk; DPDK requires AES-NI and 1 GB huge page support from the CPU — which matters in nested labs where the virtual CPU must expose those features. Typical north-south root causes: uplink VLAN ID mismatch between the edge uplink segment and the physical router interface, BGP AS/neighbour IP/password mismatch, missing route redistribution on the Tier-0 or [[route-advertisement|route advertisement]] on the [[tier-1|Tier-1]], asymmetric routing with the physical firewall.

### vSAN: network first, then objects

vSAN is a distributed system over the vSAN vmknics; most "storage" alarms in labs are network alarms:

- **Network partition**: hosts split into more than one partition. Check `esxcli vsan cluster get` on each host (member count, sub-cluster UUID), `esxcli vsan network list` (which vmknic carries vSAN), then `vmkping -I <vsan-vmk> -d -s 8972 <peer>`.
- **Degraded / reduced availability objects**: a component is missing (host down, disk failure, maintenance mode). vSAN will rebuild if capacity and fault domains allow it.
- **Inaccessible objects**: not enough components available to satisfy the policy (for example both copies of an FTT=1 RAID-1 object are on unreachable hosts). Do *not* start rebooting more hosts.

`esxcli vsan debug object health summary get` gives a quick count of object health states from any host. The vSAN health view in vCenter and VCF Operations storage operations give the cluster-wide picture.

:::warning
On vSAN hosts never use `services.sh restart` (Broadcom KB 320280). Before maintenance mode on a degraded cluster, check what data the host holds: "Ensure accessibility" vs "Full data migration" choices change the risk.
:::

## Configuration

Reference values to compare against when troubleshooting a VCF 9 lab or design (your own design document is the authority):

| Network | VLAN-backed? | Recommended MTU | Gateway needed? |
|---|---|---|---|
| ESX/VM management | Yes | 1500 | Yes |
| vMotion | Yes | 9000 (8900 in Lam's lab JSON) | Only if routed |
| vSAN | Yes | 9000 (8900 in Lam's lab JSON) | Only if routed (or stretched) |
| Host TEP | Yes | ≥1600, typically 9000 | Yes if TEPs in different subnets / edge TEP routed |
| Edge TEP | Yes | ≥1600, typically 9000 | Yes |
| Edge uplinks | Yes | Match the physical router interface | — (they *are* the routed boundary) |
| Overlay segments | No (Geneve) | Typically 1500 for guests | Tier-1/Tier-0 |

## CLI / API

```shell
# ESX: vmknics, their IPv4 config and MTU
esxcli network ip interface list
esxcli network ip interface ipv4 get

# ESX: jumbo test on the vSAN vmknic (vmk2 here) to a peer, no fragmentation
vmkping -I vmk2 -d -s 8972 10.10.30.102

# ESX: TEP-to-TEP test over the NSX overlay netstack (proves >=1600)
vmkping ++netstack=vxlan -d -s 1572 10.10.40.102

# ESX: vSAN membership, vSAN vmknic, object health summary
esxcli vsan cluster get
esxcli vsan network list
esxcli vsan debug object health summary get

# ESX: physical NICs, link state and speed
esxcli network nic list
```

```text
# NSX Manager CLI (admin): cluster state and live syslog
get cluster status
get log-file syslog follow
```

## Failure Scenarios

| Scenario | Symptom | Proof | Fix |
|---|---|---|---|
| TEP VLAN missing on one host's switch port | Overlay VMs on that host isolated; tunnels down for that host | `vmkping ++netstack=vxlan` from that host fails at all sizes | Trunk the VLAN |
| MTU 1500 on inter-switch link | Overlay web pages hang, SSH works | `-s 1572`/`8972` fail, `1472` works | Raise MTU on the link |
| vSAN vmknic tag missing on one host | vSAN partition; that host alone in its partition | `esxcli vsan network list` empty on that host | Tag/configure the vmknic |
| Tier-1 not advertising connected segments | Overlay VMs reach each other, not outside | Physical router lacks the routes | Enable route advertisement |
| BGP neighbour down | No north-south | Tier-0 BGP neighbour state not Established | Correct AS/IP/password/VLAN |
| Inaccessible vSAN objects after two hosts down (FTT=1) | VMs inaccessible | Object health summary | Bring hosts back; don't reboot more |

## Troubleshooting

1. **Start with the smallest test that crosses the suspect layer**: link state → `vmkping` 1472 → `vmkping -d` at full size → protocol (BGP/vSAN membership) → application.
2. **Always test from both directions and from more than one host.** One good host proves the design; one bad host points at its ports.
3. **Separate planes**: is the UI/API (management) the problem or the traffic (data)?
4. **Check recent physical changes**: firmware, port profile templates, new switches.
5. Use **VCF Operations** network views and VCF Operations for networks for flows/paths when the topology is large.

## Real-World Scenario

After moving his lab server to a new 10 GbE switch, Alex sees vSAN health warnings and NSX tunnels down on all three nested hosts. Management (vCenter UI) works.

- Scope: all hosts, two traffic types (vSAN and TEP), management fine → shared change below the hosts: the new switch.
- Hypothesis: MTU (vSAN and TEP use 9000; management uses 1500 — exactly the split observed).
- Validate: `vmkping -I vmk2 -d -s 1472` works, `-s 8972` fails between nested hosts.
- Remediate: enable jumbo frames (9216) on the new switch ports and confirm the Proxmox bridge still has MTU 9000.
- Verify: `-s 8972` succeeds, vSAN health green after resync, tunnels up.

## Lab

::lab[lab-network-readiness]

::lab[lab-troubleshooting-drill]

## Exam Focus

:::exam
- MTU math: payload = MTU − 28; test with `vmkping -d -s`. NSX underlay ≥1600; jumbo 9000 common.
- Know which traffic types use which networks/VLANs and which need routing.
- NSX management/control plane outage ≠ data plane outage.
- vSAN: partition (network) vs degraded (component missing, can rebuild) vs inaccessible (policy can't be satisfied).
- North-south needs Tier-1 route advertisement + Tier-0 uplinks + BGP/static routing to the physical router.
:::

## Common Exam Traps

:::trap
- Testing MTU without `-d`: fragmentation makes the large ping "succeed".
- Using `-s 9000` for a 9000 MTU (it must be 8972).
- Pinging TEPs from the default netstack instead of `++netstack=vxlan`.
- Blaming vSAN for a storage alarm that is a VLAN/MTU problem.
- Thinking a DFW drop is a routing problem — check firewall rules for the flow.
:::

## Knowledge Check

::quiz

## Summary

- Walk the data path bottom-up with a proof at each layer: link, VLAN, IP, MTU, VDS/vmknic, TEP, routing, workload.
- MTU problems look like hangs, not failures; prove with `vmkping -d` at the right payload size.
- NSX planes fail differently; edges and Tier-0/Tier-1 configuration own north-south.
- vSAN problems are often network problems; understand partition vs degraded vs inaccessible before acting.

## Next Topic

Phase 14 turns from fixing to designing: [Availability and Failure Domains](lesson:design-availability-failure-domains). When you are ready for the exam itself, read [Exam Strategy for 2V0-17.25](lesson:exam-strategy-2v0-17-25).
