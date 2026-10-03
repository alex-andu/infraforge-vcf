---
id: network-fundamentals-for-vcf
title: Network Fundamentals for VCF
phase: p04-networking
module: m04-net-fundamentals
version: vcf9
minutes: 40
difficulty: foundation
summary: Layer 2 vs layer 3, VLANs and 802.1Q trunks, gateways, routing and MTU, explained through the networks every VCF host needs and the physical-fabric requirements VCF 9 documents.
topics: [l2-l3, mtu, vcf-network-design]
objectives: ["2.4"]
keyTerms: [vlan, vlan-trunk, mtu, jumbo-frame, first-hop-gateway, vmkernel-adapter, network-fabric, tep]
labs: [lab-network-readiness]
incidents: [inc-mtu-overlay]
components: [physical-network, esx-host, vds]
related: [dns-ntp-dependencies, vsphere-distributed-switch, vcf-network-design]
sources:
  - title: "VCF 9.0 Design Library – Network Fabric Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/network-fabric-design.html
  - title: "VCF 9.0 Design Library – Physical Data Center Network Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/physical-datacenter-design-9-x.html
  - title: "VCF 9.0 Design Library – VMkernel Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/network-designs/vmkernel-design.html
  - title: "VCF 9.0 – Network Fabric Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/nsx-t-services-design-for-the-management-domain.html
  - title: "Broadcom KB 344313 – Testing VMkernel network connectivity with vmkping"
    url: https://knowledge.broadcom.com/external/article/344313
  - title: "Broadcom KB 313061 – Testing jumbo frame pings from ESXi over the network"
    url: https://knowledge.broadcom.com/external/article/313061/testing-jumbo-frame-pings-from-esxi-over.html
---

## Why This Matters

VCF is a software-defined data center, but every byte it moves still crosses a physical switch. The VCF Installer
will not even start a deployment if the host overlay network cannot carry at least a 1600-byte frame, and most failed
deployments trace back to something unglamorous: a VLAN not allowed on a trunk, a missing gateway, an MTU mismatch
on one switch port. Before you learn NSX or workload domains, you need a clear model of **layer 2**, **layer 3**,
**VLANs**, **gateways** and **MTU** — and of exactly which networks a VCF host uses.

For the 2V0-17.25 exam (objective 2.4, "VMware Network Fundamentals"), expect scenario questions where you must
pick the right MTU, explain why a vMotion or overlay test fails, or tell a VLAN problem apart from a routing problem.

## Learning Objectives

- Explain the difference between layer 2 switching and layer 3 routing, and where VLANs and gateways fit.
- List the infrastructure networks of a VCF ESX host (management, vMotion, vSAN/IP storage, host TEP) and their VCF 9 MTU guidance.
- State the VCF 9 MTU minimum (1600) and recommendation (1700 minimum design value, 9000 recommended) for overlay traffic and explain why fragmentation is not an option.
- Configure and validate an 802.1Q trunk to an ESX host and test end-to-end MTU with `vmkping -d -s`.
- Distinguish single-rack, multi-rack and multi-AZ network fabric models.

## Concept

### Layer 2: the broadcast domain

A **layer 2** network is a set of devices that reach each other by MAC address through switches, without a router.
Everything in one layer 2 domain receives the same broadcasts (ARP, for example). Hosts in the same layer 2 domain
normally share one **IP subnet**.

A [[vlan]] (Virtual LAN, IEEE 802.1Q) splits one physical switch into many isolated layer 2 domains. Each frame
carries a 12-bit VLAN ID (1–4094). A switch port that carries many VLANs with tags is a [[vlan-trunk|trunk]]; a port
that carries one VLAN without a tag is an *access* port. ESX host uplinks in VCF are trunks: VCF 9 design
recommendation **VCF-NET-RCMD-SWT-001** is "configure switch host ports in Trunk mode using 802.1q tagging", and
**VCF-NET-RCMD-SWT-002** adds "trunk PortFast" so ports forward immediately after a link change.

### Layer 3: routing between subnets

A **layer 3** device (router or L3 switch) forwards packets between subnets by IP address. When an ESX host wants to
reach an IP outside its own subnet, it sends the packet to its **default gateway** — the
[[first-hop-gateway|first hop gateway]]. VCF 9 requires a first hop gateway for every infrastructure VLAN
(VCF-NET-REQD-GTW-001) and recommends a floating VRRP or HSRP address so a single switch failure does not remove the
gateway (VCF-NET-RCMD-GTW-001).

### MTU: the largest frame a link carries

The [[mtu]] (Maximum Transmission Unit) is the largest IP packet a link forwards without fragmenting it. Standard
Ethernet MTU is 1500 bytes; anything larger is a [[jumbo-frame]]. MTU matters in VCF for two reasons:

1. **Overlay encapsulation.** NSX wraps each VM frame in a Geneve header between [[tep|tunnel endpoints (TEPs)]].
   The outer packet is bigger than the inner one, and VCF 9 documents that "Geneve packets between Host TEPs and Edge
   TEPs have the DF flag set and can not be fragmented". If any device on the path has a smaller MTU, those packets
   are **silently dropped**.
2. **Efficiency.** vMotion and vSAN move large amounts of data; 9000-byte frames reduce per-packet overhead.

:::vcf9 Changed in VCF 9
VCF 9 design guidance states that Geneve overlay requires a **1600** MTU minimum, but specifies **1700** as the
minimum design value for Host/Edge TEP VLANs (VCF-NET-REQD-MTU-006) "to address future expansion of the geneve
header", and recommends **9000** (VCF-NET-RCMD-MTU-005). The VCF Installer validates the host overlay switch MTU and
rejects values below 1600. Earlier VCF generations documented 1600 as the overlay minimum without the 1700 note.
:::

## Architecture

The diagram shows one VCF ESX host with two physical NICs connected to two top-of-rack (ToR) switches. Each
infrastructure network is its own VLAN and subnet, and every VLAN has a highly available gateway on the ToR pair.

::diagram[d04-vcf-host-vlan-l3-layout]

The key idea: **VLANs are layer 2, subnets and gateways are layer 3, and MTU must be consistent end to end on
both.** A packet from the vMotion VMkernel adapter of host A to host B in the same VLAN never touches the gateway; a
packet from the management VMkernel adapter to the DNS server in another subnet always does.

## Components

| Component | Layer | Role in VCF | Who manages it |
|---|---|---|---|
| Physical NIC (vmnic) | 1/2 | Host uplink, connected to a ToR trunk port | Server/ESX admin |
| ToR switch port | 2 | 802.1Q trunk carrying all host VLANs; MTU 9000 or larger recommended (VCF-NET-RCMD-SWT-004) | Network team |
| VLAN | 2 | One per traffic type (management, vMotion, vSAN, host TEP, VM management, edge uplinks) | Network team |
| Subnet + gateway (SVI) | 3 | Routing between VLANs; VRRP/HSRP for availability | Network team |
| [[vmkernel-adapter]] (vmk) | 3 (host) | The host's own IP interface for one traffic type | VCF / vCenter |
| [[vds]] port group | 2 (virtual) | Applies VLAN ID, teaming and security to vmk and VM ports | vCenter (VCF-deployed) |
| Host TEP | 3 (host) | NSX tunnel endpoint vmk (vmk10/vmk11 typically) carrying Geneve | NSX Manager |

### Infrastructure VLANs and their MTU (VCF 9 guidance)

| Traffic type | Minimum MTU | Recommended MTU | Notes |
|---|---|---|---|
| ESX management VMkernel | 1500 | 1500 | Kept at 1500: vSAN witness traffic may cross WAN links without jumbo support (VCF-NET-RCMD-MTU-001) |
| VM management (vCenter, NSX Manager, VCF Operations…) | 1500 | 1500 | Optional separate VLAN |
| vMotion VMkernel | 1500 | 9000 | VCF-NET-RCMD-MTU-004 |
| vSAN / NFS / iSCSI VMkernel | 1500 | 9000 | VCF-NET-RCMD-MTU-003 |
| NSX Host/Edge TEP | 1700 (1600 hard floor) | 9000 | DF bit set, no fragmentation |
| Edge node uplinks (BGP peering) | 1500 | 9000 | VCF-NET-RCMD-MTU-006 |
| Workload VM segments | customer | customer | Overlay segment MTU = TEP MTU − 200 |

:::note
The VMkernel Detailed Design page summarises the defaults VCF applies: management 1500, vMotion 9000, vSAN 9000,
NFS 9000, Host TEPs 9000. The VCF Installer API `DvsSpec.mtu` defaults to **9000** (allowed range 1280–9190).
:::

## How It Works

Follow one overlay packet from a VM on host A to a VM on host B in another rack:

1. The VM sends a 1500-byte frame to its overlay segment.
2. The NSX data plane on host A encapsulates it in Geneve (outer IP + UDP + Geneve header + options), source = host
   A's TEP IP, destination = host B's TEP IP. The outer packet is now larger than 1500 bytes, with the **DF** bit set.
3. Host A's TEP vmk sends it out a vmnic, tagged with the host TEP VLAN ID, to the ToR trunk port.
4. If host B's TEP is in the same subnet, the ToR switches the frame at layer 2. If host B is in another rack
   (layer 3 fabric, different TEP subnet), the ToR routes it via the TEP VLAN gateway.
5. Every hop compares the packet size with its MTU. Any hop below the packet size **drops** it (no fragmentation
   because of DF). Small packets — ping, ARP, BGP keepalives, SSH — still pass, which is why MTU faults look like
   "it works for some things".
6. Host B decapsulates and delivers the original frame to the destination VM.

The same logic applies to vMotion and vSAN with 9000 MTU: if one switch is still at 1500, large transfers stall
while management traffic looks healthy.

## Deep Dive

### Why 8972 and 1472?

`vmkping -s` sets the **ICMP payload** size. An IPv4 header is 20 bytes and an ICMP header 8 bytes, so:

| Path MTU to prove | `-s` value | Calculation |
|---|---|---|
| 1500 | 1472 | 1500 − 28 |
| 1600 | 1572 | 1600 − 28 |
| 1700 | 1672 | 1700 − 28 |
| 9000 | 8972 | 9000 − 28 |

Always add `-d` (set the **DF**, do-not-fragment, bit). Without `-d`, the IP stack may fragment the ping and it
succeeds even on a 1500 path, which proves nothing.

### Overlay segment MTU = TEP MTU − 200

VCF 9 requirement VCF-NET-REQD-OVL-001: overlay segment MTU must be the host TEP MTU minus 200 bytes. With a 9000
TEP MTU, the maximum overlay segment MTU is 8800. With a 1700 TEP MTU, workload VMs can use a normal 1500 MTU.

### Physical switch MTU vs host MTU

Switch vendors count MTU differently (some include the Ethernet header, some do not). That is why physical
switches are usually set to **9216** or similar and hosts to **9000**: the switch must be at least as large as the
largest host frame. VCF-NET-REQD-MTU-001 states every VLAN segment MTU must be less than or equal to the fabric MTU,
and VCF-NET-REQD-GTW-002 extends that to the gateway interface.

### Network fabric models

| Fabric model | Supported cluster models | Key point |
|---|---|---|
| Single-Rack | Single-Rack cluster | Simplest; a cluster cannot span racks |
| Multi-Rack | Layer 2 or Layer 3 multi-rack clusters | Tolerates a rack outage; layer 3 multi-rack uses per-rack VLANs/subnets and is workload-domain only |
| Multi Availability Zone | Stretched cluster | Tolerates an AZ outage; VLANs and gateway must be available in both AZs |

In a **layer 2 fabric** the same VLAN exists in every rack. In a **layer 3 leaf-spine** fabric each rack has its own
VLANs and subnets and the spine routes between racks (BGP-EVPN can restore a single VLAN across racks).

### Addressing rules worth memorising

- Infrastructure networks (management VMkernel, storage, vMotion) must be **IPv4** in VCF 9.
- Management components need **static IPv4 addresses and hostnames** (VCF-NET-REQD-IPA-001) and **forward and
  reverse DNS records** (VCF-NET-REQD-IPA-002) — see [DNS and NTP](lesson:dns-ntp-dependencies).
- Size subnets for growth: "VCF does not support changing of subnet masks for infrastructure networks"
  (VCF-NET-RCMD-IPA-001). Adding address ranges inside an existing subnet is supported.
- NSX inter-tier transit links use 100.64.0.0/10 (RFC 6598) by default — avoid that range in the data center or
  override it at deployment.
- Maximum latency between ESX hosts within one vSphere cluster is **10 ms** (VCF-NET-REQD-LAT-001).

## Configuration

Typical physical switch configuration for a VCF host port (vendor-neutral pseudo-config):

```shell
interface Ethernet1/1
  description esx-01 vmnic0
  switchport mode trunk
  switchport trunk allowed vlan 1610-1614   # mgmt, vMotion, vSAN, TEP, VM-mgmt
  spanning-tree port type edge trunk        # "trunk PortFast"
  mtu 9216
interface Vlan1613                          # host TEP VLAN gateway
  ip address 172.16.13.2/24
  vrrp 13 address 172.16.13.1
  mtu 9216
```

On the ESX side the VLAN ID lives on the port group, never on the vmk itself. VCF creates the VDS and port groups
from your deployment input (VCF Installer wizard or JSON spec) — your job is to make the physical side match.

:::tip
Do not mix "native VLAN" (untagged) traffic and tagged port groups for the same network. Pick one approach per
network and document it in the planning workbook.
:::

## CLI / API

```shell
# Which VMkernel adapters exist, on which port group/netstack, with which MTU?
esxcli network ip interface list
esxcli network ip interface ipv4 get

# Physical NIC link state and speed
esxcli network nic list

# Routing table of the default netstack
esxcli network ip route ipv4 list

# Prove 9000 end to end from the vMotion vmk (vMotion netstack)
vmkping -I vmk1 -S vmotion -d -s 8972 172.16.11.12

# Prove 1700 on the host TEP path (NSX uses the "vxlan" netstack name)
vmkping -I vmk10 -S vxlan -d -s 1672 172.16.13.12
```

`-I` picks the outgoing vmk, `-S` the TCP/IP stack instance, `-d` sets DF, `-s` the payload size (KB 344313).

## Failure Scenarios

| Failure | What you observe | Impact |
|---|---|---|
| One ToR port left at MTU 1500 | Small pings work; `vmkping -d -s 8972` fails to one host only | vMotion to that host stalls; vSAN latency; overlay VMs on that host lose large-packet traffic |
| VLAN missing from trunk allowed list | vmk cannot reach peers or gateway at all | Host fails validation/commissioning; vSAN partition |
| Gateway has no VRRP and its switch reboots | Routed traffic (DNS, NTP, vCenter from other subnets) lost | Host appears disconnected in vCenter; VCF tasks fail |
| Subnet sized too small | Cannot add hosts | Expansion blocked — mask cannot be changed later |
| Latency > 10 ms between hosts in a cluster | vSAN write latency | Not a supported design |

## Troubleshooting

Work from layer 1 up:

1. **Link:** `esxcli network nic list` — is the vmnic Up, at the expected speed?
2. **VLAN:** are you on the right port group/VLAN? Can you reach a peer in the **same** subnet with a small ping
   (`vmkping -I vmkX <peer>`)? If not, suspect trunk allowed list or VLAN ID.
3. **Gateway/route:** can you reach the gateway, then something beyond it? If same-subnet works but routed fails,
   it is layer 3 (gateway, route, ACL).
4. **MTU:** small ping works, `-d -s 8972` (or 1672 for TEP) fails → MTU mismatch. Test host by host to find the
   odd one out; then check vmk MTU, VDS MTU, switch port MTU and gateway MTU.
5. **Netstack:** vMotion and TEP vmks live on their own TCP/IP stacks; a test without `-S` may use the wrong routing
   table and give a misleading result.

::incident[inc-mtu-overlay]

## Real-World Scenario

A team adds a fourth host to a workload domain. Commissioning succeeds, but VMs vMotioned to the new host lose
connectivity for large transfers (web pages half-load, file copies hang), while ping works. `vmkping -I vmk10 -S vxlan
-d -s 1672` from the new host fails to every other TEP; from any old host to another old host it succeeds. The new
host is cabled to a spare switch pair whose ports still have the default MTU 1500. Fix: set the ports to 9216, retest
with 8972 and 1672, then re-run the workload. Lesson: MTU is a per-hop property — validate each new cabling path,
not only the first rack.

## Lab

In the lab you prepare the learner home lab's network for VCF: VLAN-aware Proxmox bridge, gateways, DNS forward and
reverse zones, NTP and jumbo-frame `vmkping` tests from nested ESX hosts.

::lab[lab-network-readiness]

## Exam Focus

:::exam
- Know the VCF 9 MTU numbers: **1600** hard minimum for overlay, **1700** design minimum for TEP VLANs, **9000**
  recommended for vMotion, vSAN and TEP, management VMkernel at **1500**.
- Know `vmkping -I vmkX -d -s 8972` and why 8972 (9000 − 28).
- Distinguish a VLAN/trunk problem (no connectivity at all) from an MTU problem (small packets OK, large fail) from a
  routing problem (same subnet OK, other subnets fail).
- Know that overlay segment MTU = TEP MTU − 200.
:::

## Common Exam Traps

:::trap
- "Set MTU 9000 on the VMkernel adapter" alone is never the full fix — the VDS, every physical port and the gateway
  must match or exceed it.
- A successful normal ping does **not** prove MTU. Without `-d` the ping may be fragmented.
- Geneve overlay traffic is not fragmented by the network; it is dropped. Answers that rely on fragmentation are wrong.
- Management VMkernel MTU is recommended at 1500, not 9000, in VCF 9 guidance.
:::

## Knowledge Check

::quiz

## Summary

- VLANs separate layer 2 domains; subnets and gateways provide layer 3 routing between them.
- Each VCF host carries management, vMotion, storage and host TEP traffic on separate VLANs over 802.1Q trunks.
- VCF 9: overlay needs ≥1600 (1700 design minimum), 9000 recommended; management stays at 1500.
- MTU must be consistent end to end: vmk ≤ VDS ≤ switch port ≤ gateway.
- Validate with `vmkping -I vmkX [-S netstack] -d -s <MTU−28>` between every pair of hosts.

## Next Topic

Next you will study the two external services VCF cannot live without: [DNS and NTP](lesson:dns-ntp-dependencies).
