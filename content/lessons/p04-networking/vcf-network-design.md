---
id: vcf-network-design
title: VCF Network Design – Traffic Types, VLANs and Switch Models
phase: p04-networking
module: m04-vsphere-networking
version: vcf9
minutes: 45
difficulty: intermediate
summary: The networks a VCF 9 instance needs per cluster (ESX management, VM management, vMotion, vSAN/IP storage, host TEP, edge TEP and uplinks), how they map onto the six VCF 9 distributed switch models, and how to plan VLANs, subnets and MTU for a domain.
topics: [vcf-network-design, vds, mtu, deployment-planning]
objectives: ["2.4", "4.1"]
keyTerms: [vmkernel-adapter, vds, vlan, mtu, tep, first-hop-gateway, network-fabric, stretched-cluster-design]
labs: [lab-network-readiness, lab-vcf-planning-workbook]
incidents: [inc-mtu-overlay]
components: [vds, physical-network, esx-host, nsx-manager, nsx-edge-cluster]
related: [vsphere-distributed-switch, network-fundamentals-for-vcf, dns-ntp-dependencies, design-network-security-tradeoffs]
sources:
  - title: "VCF 9.0 – Distributed Switch Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/cluster-network-deployment-models.html
  - title: "VCF 9.0 Design Library – Single Distributed Switch Model"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/network-designs/vsphere-cluster-network-models/simple-network-model.html
  - title: "VCF 9.0 Design Library – VMkernel Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/network-designs/vmkernel-design.html
  - title: "VCF 9.0 Design Library – Network Fabric Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/network-fabric-design.html
  - title: "VCF 9.0 – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
  - title: "VCF Installer API 9.0 – DvsSpec"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/data-structures/DvsSpec
  - title: "Broadcom KB 442925 – Host Overlay distributed switch MTU must be at least 1600"
    url: https://knowledge.broadcom.com/external/article/442925/the-provided-mtu-for-distributed-vsphere.html
---

## Why This Matters

A VCF network design is a contract between you and the network team: which VLANs, which subnets, which gateways,
which MTU, on which ports, for which cluster. VCF automates everything above the physical switch — but only if the
physical side matches your input exactly. This lesson turns the fundamentals into a design you can write into the
Planning and Preparation Workbook and defend in an exam scenario.

## Learning Objectives

- List the infrastructure networks of a VCF 9 management domain and workload domain cluster, with VCF 9 MTU guidance.
- Describe the six VCF 9 distributed switch models and choose one from NIC count and separation requirements.
- Explain how layer 3 multi-rack and stretched clusters change the VLAN/port-group plan.
- Plan VLANs, subnets, gateways and IP counts for a new cluster.
- Validate the plan before running the VCF Installer.

## Concept

### Traffic types in a VCF instance

| Network | Carries | Lives on | MTU guidance (VCF 9) |
|---|---|---|---|
| ESX management | vmk0: host management, vCenter–host communication, HA heartbeats by default | Every host | 1500 |
| VM management | vCenter, NSX Manager, SDDC Manager, VCF Operations, edges' management interfaces | Management domain (can share the ESX management VLAN) | 1500 |
| vMotion | vmk on the vMotion TCP/IP stack | Every host | 9000 |
| vSAN (or NFS/iSCSI) | Principal storage VMkernel | Every host of a vSAN/IP-storage cluster | 9000 |
| Host TEP (host overlay) | NSX Geneve between hosts and edges | Every NSX-prepared host | ≥1600 enforced, 1700 design minimum, 9000 recommended |
| Edge TEP | Geneve on NSX Edge nodes | Edge cluster | Same as host TEP |
| Edge uplinks | North-south, BGP peering to ToR | Edge nodes | 1500 minimum, 9000 recommended |
| Edge RTEP (optional) | NSX Federation inter-instance traffic | Edges | 1500 minimum, 9000 recommended |
| Workload networks | VM traffic (VLAN port groups, NSX segments or VPCs) | Workload clusters | Customer defined (overlay ≤ TEP − 200) |

Each infrastructure network is "its own VMkernel and L2 domain" per cluster, and "using a separate 802.1q-based VLAN
for each type of infrastructure network traffic within each cluster is advisable" (Network Fabric Detailed Design).

:::vcf9 Changed in VCF 9
The VCF Installer validates the host overlay switch MTU: a value of 1500 produces the error "The provided MTU for
Distributed vSphere Switch which is going to be used for Host Overlay is 1500. Must be at least 1600" (KB 442925,
reported for 9.1; the 1600 floor is also documented for 9.0). Design guidance adds 1700 as the minimum design value
and 9000 as the recommendation.
:::

## Architecture

::diagram[d04-vcf-host-network-types]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/50eadc71-6d37-4996-aded-66d5ef711d70.original.svg" caption="Distributed Switch Models (VCF 9 Architectural Options)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/cluster-network-deployment-models.html"}

### The six distributed switch models

| Model | VDS layout | pNICs (with redundancy) | Choose when |
|---|---|---|---|
| Single distributed switch | One VDS for everything | 2 (1 possible via API, no redundancy) | Default; simplest; lowest port count |
| Storage separation | VDS1: mgmt, vMotion, workload · VDS2: storage (vSAN/iSCSI) | 4–6 | Storage needs dedicated bandwidth or a separate (even air-gapped) storage fabric |
| Workload separation | VDS1: mgmt, vMotion, storage · VDS2: VM/NSX workload | 4–6 | Workload traffic needs dedicated NICs/fabric |
| Storage and workload separation | VDS1: mgmt+vMotion · VDS2: storage · VDS3: workload | 6 minimum | Full separation; most complex |
| Dedicated vSphere cluster for NSX Edge nodes | VDS1: management · VDS2: edge traffic on all remaining NICs | typically 4–6 | Edge-only cluster for maximum north-south bandwidth (NIOC disabled manually afterwards) |
| vSAN storage cluster separation | VDS1: vSAN client traffic · VDS2: vSAN server traffic | 4 minimum | vSAN storage clusters serving compute clusters |

All models keep the common rules: VDS MTU 9000 recommended, one VDS set **per cluster** (not shared across
clusters), load-based teaming for infrastructure port groups.

## Components

What you must provide per cluster:

| Item | Per | Example (management domain, single-rack) |
|---|---|---|
| VLAN ID + subnet + gateway | ESX management | VLAN 1611, 172.16.11.0/24, gw .1 (VRRP) |
| VLAN ID + subnet + gateway | VM management (optional separate) | VLAN 1610, 172.16.10.0/24 |
| VLAN ID + subnet + gateway | vMotion | VLAN 1612, 172.16.12.0/24 |
| VLAN ID + subnet + gateway | vSAN | VLAN 1613, 172.16.13.0/24 |
| VLAN ID + subnet + gateway | Host TEP | VLAN 1614, 172.16.14.0/24 |
| IPs | per host | ≥1 management, 1 vMotion, 1 per storage vmk, TEP IP(s) per host (typically one per uplink) |
| IPs | per appliance | vCenter, NSX Manager nodes + VIP, SDDC Manager, VCF Operations, etc. |
| DNS A + PTR | each host and appliance | See [DNS and NTP](lesson:dns-ntp-dependencies) |

TEP IP addressing: NSX supports assigning host TEP addresses from a static IP pool or from DHCP. Which options the
VCF workflow offers for your version is captured in the Planning and Preparation Workbook — check it rather than
assuming.

## How It Works

From design to running network:

1. **Pick the cluster model** (single-rack, layer 2 multi-rack, layer 3 multi-rack, stretched) — it decides
   whether VLANs are shared or per rack/AZ.
2. **Pick the distributed switch model** from NIC count and separation needs.
3. **Allocate VLANs and subnets** per traffic type (and per rack/AZ where required). Size subnets for growth —
   masks cannot change later.
4. **Hand the physical spec to the network team:** trunk ports with allowed VLANs, MTU 9000+, PortFast trunk,
   VRRP/HSRP gateways with MTU matching the VLAN.
5. **Create DNS records** for every host and appliance; configure NTP.
6. **Fill the Planning and Preparation Workbook / VCF Installer spec** (`DvsSpec`: `dvsName`, `mtu`,
   `vmnicsToUplinks`, `networks`, `nsxtSwitchConfig`).
7. **Validate:** run your own `vmkping -d -s` tests and DNS checks, then the installer validation.
8. **Deploy:** VCF creates VDS, port groups, vmks and NSX host preparation exactly as specified.

## Deep Dive

### Cluster models change the VLAN plan

| Cluster model | VLAN scope | Consequence |
|---|---|---|
| Single-rack | Same VLANs on all hosts | Simplest |
| Layer 2 multi-rack | Same VLANs stretched across racks | Fabric must span VLANs between racks; supported for the management domain default cluster |
| Layer 3 multi-rack | Different VLANs/subnets **per rack** for ESX management, vMotion and storage port groups (VCF-VDS-SDS-REQD-CFG-003) | More subnets; not supported for the management domain default cluster; cannot be stretched |
| Stretched | Separate ESX management, vMotion and vSAN port groups for availability zone 2 (VCF-VDS-SDS-REQD-CFG-004); VM management VLAN and its gateway must be present in both AZs | Needs gateway available in both AZs on the same IP |

VM-facing infrastructure VLANs (VM management, workload VLANs) "must be equally accessible to all hosts within the
cluster… The VLAN ID must be consistent across all hosts/racks/AZ."

### Latency budgets (VCF 9 physical design)

| Between | Maximum |
|---|---|
| ESX hosts within a vSphere cluster | 10 ms |
| NSX Edge nodes in the same edge cluster | 10 ms |
| vSphere clusters in a workload domain | 100 ms |
| Workload domains in a VCF instance | 100 ms |
| vSAN stretched cluster to witness (VCF design table) | 150 ms |

vSAN's own stretched-cluster guidance is stricter between data sites (under 5 ms RTT) — see
[availability design](lesson:design-availability-failure-domains).

### NIOC and the dedicated edge cluster model

In the dedicated edge cluster model, VCF notes that Network I/O Control on both switches must be disabled manually
after deployment, so edge data-path traffic can use all NICs without share-based throttling. This is a good example
of a model-specific day-2 step that exam scenarios like to test.

### What VCF builds for NSX

During host preparation, NSX attaches to the VDS (transport zones on the VDS), creates host TEP vmks (vmk10, vmk11
when two uplinks are used) on the NSX netstack, and applies an uplink profile with the TEP VLAN and teaming. You
provide the TEP VLAN, the addressing and the MTU; you do not create TEP vmks by hand.

## Configuration

A compact design record for one workload domain cluster (single VDS, 2 × 25 GbE):

```yaml
cluster: wld01-cl01
vds: { name: wld01-cl01-vds01, mtu: 9000, uplinks: { uplink1: vmnic0, uplink2: vmnic1 } }
networks:
  esx-mgmt: { vlan: 1711, subnet: 172.17.11.0/24, gw: 172.17.11.1, mtu: 1500 }
  vmotion:  { vlan: 1712, subnet: 172.17.12.0/24, gw: 172.17.12.1, mtu: 9000 }
  vsan:     { vlan: 1713, subnet: 172.17.13.0/24, gw: 172.17.13.1, mtu: 9000 }
  host-tep: { vlan: 1714, subnet: 172.17.14.0/24, gw: 172.17.14.1, mtu: 9000 }
physical: { trunk-vlans: 1711-1714, port-mtu: 9216, gateway: VRRP, portfast-trunk: true }
```

## CLI / API

```shell
# After deployment: confirm vmks, port groups, netstacks and MTU per host
esxcli network ip interface list
esxcli network ip netstack list

# Validate every network path at its design MTU
vmkping -I vmk0 -d -s 1472 172.17.11.12             # management at 1500
vmkping -I vmk1 -S vmotion -d -s 8972 172.17.12.12  # vMotion at 9000
vmkping -I vmk2 -d -s 8972 172.17.13.12             # vSAN at 9000
vmkping -I vmk10 -S vxlan -d -s 8972 172.17.14.12   # host TEP at 9000
```

## Failure Scenarios

| Design error | Symptom | Prevention |
|---|---|---|
| Host overlay MTU 1500 | Installer validation error: must be at least 1600 | Set VDS/TEP MTU 9000 |
| TEP VLAN missing on one rack's trunks | BFD tunnels down to that rack; overlay VMs unreachable there | Physical checklist per rack |
| Subnet /27 for vMotion in a cluster planned to grow to 40 hosts | Expansion blocked | Size subnets for maximum cluster size |
| VM management VLAN not present in AZ2 | Management VMs fail over to AZ2 but are unreachable | Stretch VM management VLAN + HA gateway |
| Shared VDS across clusters | Lifecycle coupling between clusters | One VDS per cluster (VCF requirement for automated workflows) |

## Troubleshooting

1. Compare the deployed state (`esxcli network ip interface list`, VDS settings) against the design record.
2. Test each network at its MTU from every host to at least one host in every rack/AZ.
3. For overlay issues check NSX tunnel status (BFD) — tunnels down to a subset of hosts usually means VLAN or MTU on
   that subset's path.
4. For validation failures read the exact message; VCF messages usually name the network and value.

::incident[inc-mtu-overlay]

## Real-World Scenario

A retailer plans a workload domain for 16 hosts per rack across three racks using a layer 3 leaf-spine fabric. They
want to stretch it later across two sites. Problem: layer 3 multi-rack clusters cannot be stretched. They choose
single-rack clusters per rack (each its own vSphere cluster) for the current phase and plan a separate stretched
cluster design for the second site. The VLAN plan uses per-rack VLANs for management/vMotion/vSAN and a single TEP
design per rack, and every subnet is sized /24 for growth.

## Lab

Plan your home-lab VLAN table in the readiness lab, then validate it end to end. The full planning workbook exercise is
in the deployment phase.

::lab[lab-network-readiness]

## Exam Focus

:::exam
- Know every traffic type and its VCF 9 MTU guidance (management 1500; vMotion, vSAN, TEP 9000; TEP minimum
  1600/1700).
- Know the six distributed switch models and the NIC counts: single (2), storage separation (4–6), workload
  separation (4–6), storage+workload (6), dedicated edge cluster (4–6), vSAN storage cluster separation (4).
- Layer 3 multi-rack: per-rack port groups, not for management domain default cluster, cannot be stretched.
- Stretched: extra port groups for AZ2; VM management VLAN and gateway available in both AZs.
:::

## Common Exam Traps

:::trap
- More VDS is not automatically better: separation costs NICs, switch ports and management overhead.
- The single VDS model still has redundancy with two NICs — "single" refers to the number of switches.
- TEP vmks are created by NSX host preparation, not manually.
- Overlay workload MTU cannot equal the TEP MTU; it must be at least 200 bytes smaller.
:::

## Knowledge Check

::quiz

## Summary

- VCF clusters need ESX management, vMotion, storage and host TEP networks; the management domain adds VM management
  and usually edge networks.
- VCF 9 offers six distributed switch models trading simplicity against separation and NIC count.
- Cluster model (single-rack, L2/L3 multi-rack, stretched) determines VLAN scope.
- Size subnets for growth, keep MTU consistent, and validate every path before the installer does.

## Next Topic

Continue with NSX in phase 5, or jump to [availability and failure domains](lesson:design-availability-failure-domains)
to see how these network choices feed VCF design decisions.
