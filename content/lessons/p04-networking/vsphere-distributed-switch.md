---
id: vsphere-distributed-switch
title: The vSphere Distributed Switch in VCF
phase: p04-networking
module: m04-vsphere-networking
version: vcf9
minutes: 40
difficulty: intermediate
summary: How the vSphere Distributed Switch splits its management plane (vCenter) from its data plane (each ESX host), and how port groups, uplinks, teaming, failover, NIOC, LACP and port binding are configured in VCF 9.
topics: [vds, vcf-network-design]
objectives: ["2.4"]
keyTerms: [vds, distributed-port-group, uplink, nic-teaming, load-based-teaming, lag, nioc, vmkernel-adapter, port-binding]
labs: [lab-network-readiness]
incidents: [inc-mtu-overlay]
components: [vds, vcenter, esx-host, physical-network]
related: [network-fundamentals-for-vcf, vcf-network-design]
sources:
  - title: "VCF 9.0 – Distributed Switch Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/cluster-network-deployment-models.html
  - title: "VCF 9.0 Design Library – Single Distributed Switch Model (common VDS requirements and recommendations)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/network-designs/vsphere-cluster-network-models/simple-network-model.html
  - title: "VCF 9.0 Design Library – Physical Data Center Network Design (link aggregation)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/physical-datacenter-design-9-x.html
  - title: "vSphere API 9.0 – DistributedVirtualSwitchNicTeamingPolicyMode"
    url: https://developer.broadcom.com/xapis/virtual-infrastructure-json-api/9.0/data-structures/DistributedVirtualSwitchNicTeamingPolicyMode_enum/
  - title: "VCF Installer API 9.0 – DvsSpec"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/data-structures/DvsSpec
  - title: "Broadcom KB 430982 – Best practices for configuring network redundancy in vSphere and NSX"
    url: https://knowledge.broadcom.com/external/article/430982
---

## Why This Matters

Every VCF cluster uses the [[vds|vSphere Distributed Switch (VDS)]]. VCF creates it for you during deployment and
domain creation, NSX attaches its overlay and VLAN transport zones to it, and vMotion, vSAN and management all ride
on its port groups. When a host loses a NIC, the VDS teaming policy decides whether anything notices. When vCenter is
down, the VDS design decides whether you can bring it back. You need to understand its parts and the VCF 9 defaults.

## Learning Objectives

- Explain the VDS split between the vCenter management plane and the per-host data plane.
- Describe distributed port groups, uplinks, VMkernel adapters and port binding types.
- Compare teaming policies and pick the VCF 9 recommended one for each traffic type.
- Explain failover detection, NIOC shares and the VCF 9 position on LACP and static link aggregation.
- Verify VDS configuration from an ESX host and recognize common VDS failures.

## Concept

A standard switch (vSS) is configured separately on each host. A **VDS** is configured once in **vCenter** and
pushed to every member host, so all hosts in a cluster get identical port groups, VLANs, MTU and teaming.

| Plane | Lives in | Does what | If it fails |
|---|---|---|---|
| Management plane | vCenter | Stores the VDS configuration, pushes changes to hosts | No changes possible; **traffic keeps flowing** |
| Data plane | Each ESX host ("host proxy switch") | Forwards frames between vNICs, vmks and physical uplinks | That host loses connectivity for affected ports |

Building blocks:

- **[[distributed-port-group|Distributed port group]]** — a policy template (VLAN ID, teaming, security, port
  binding) applied to the ports that VMs and vmks connect to.
- **[[uplink|Uplinks]]** — logical uplink slots (uplink1, uplink2…) on the VDS; on each host you map a physical NIC
  (vmnic) to each slot. Policies refer to uplink names, not vmnic names, so hosts can differ physically.
- **[[vmkernel-adapter|VMkernel adapters]]** — host IP interfaces (vmk0 management, vmk1 vMotion, vmk2 vSAN,
  vmk10/11 NSX TEPs) connected to distributed port groups.
- **[[nic-teaming|NIC teaming]] and failover** — how traffic is spread over uplinks and what happens when one fails.
- **[[nioc|Network I/O Control (NIOC)]]** — bandwidth shares per traffic type when uplinks are congested.

:::vcf9 Changed in VCF 9
NSX runs directly on the VDS (no separate N-VDS on ESX hosts). The VCF 9 design library recommends **Enhanced
Datapath Standard** for NSX-enabled VDS (VCF-VDS-COM-RCMD-CFG-002) and lists it as the default data path mode for
the single distributed switch model. VCF 9 also states the requirement "do not share a vSphere Distributed Switch
across different vSphere clusters" for greenfield automated workflows (VCF-VDS-COM-REQD-CFG-001).
:::

## Architecture

::diagram[d04-vds-uplinks-teaming]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/d0fb1757-f765-4639-b561-491069410bd8.original.svg" caption="Single Distributed Switch Model with 2 physical NICs per ESX host (VCF 9 Design Library)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/network-designs/vsphere-cluster-network-models/simple-network-model.html"}

In the diagram, vCenter holds the VDS definition; each host has a proxy switch with two uplinks mapped to vmnic0 and
vmnic1, each cabled to a different ToR switch. Port groups for management, vMotion and vSAN use both uplinks with
"Route based on physical NIC load"; NSX host TEPs use the NSX uplink profile teaming.

## Components

| Component | Configured where | VCF 9 recommendation |
|---|---|---|
| VDS MTU | vCenter (VDS settings) | 9000 (VCF-VDS-COM-RCMD-CFG-001); installer API default 9000, range 1280–9190 |
| VM management port group | vCenter | **Ephemeral** port binding (VCF-VDS-COM-RCMD-DPG-001) — lets you recover vCenter |
| Other port groups | vCenter | **Static** port binding (VCF-VDS-COM-RCMD-DPG-002) |
| Management, vMotion, storage port groups | vCenter | Teaming "Route based on physical NIC load" (RCMD-DPG-003/004/005, SDS-RCMD-DPG-001) |
| NIOC | vCenter | Enabled (default). Shares: management Normal, vMotion Low, VMs High, principal IP storage High |
| NSX host TEP teaming | NSX uplink profile | Defined by NSX/VCF during host preparation |
| Physical NICs | Host | At least two per VDS, to two different ToR switches (KB 430982) |

## How It Works

What happens when a VM sends a frame and an uplink fails:

1. The VM's vNIC is connected to a VDS port in a distributed port group (for example VLAN 1620 "app").
2. The host proxy switch tags the frame with the port group VLAN ID and selects an uplink according to the teaming
   policy (with physical NIC load, by originating port, rebalanced when an uplink exceeds 75% utilization over 30
   seconds).
3. The frame leaves through vmnic0 to ToR-A.
4. vmnic0 loses link. With **link status only** failure detection, the host notices immediately.
5. The VDS moves the affected ports to the remaining active uplink (vmnic1). With **Notify switches = Yes**, it sends
   RARP frames so the physical switches update their MAC tables at once.
6. When vmnic0 returns, **Failback = Yes** moves the ports back.
7. Throughout, vCenter is not involved: the data plane on the host does all of this. vCenter only shows the alarm.

## Deep Dive

### Teaming policies

| Policy (API value) | How uplink is chosen | Needs physical switch config | Notes |
|---|---|---|---|
| Route based on originating virtual port (`loadbalance_srcid`) | Hash of VDS port ID | No | vSS default; a VM uses one uplink |
| Route based on source MAC hash (`loadbalance_srcmac`) | Hash of source MAC | No | Rarely used |
| Route based on IP hash (`loadbalance_ip`) | Hash of source+destination IP per packet | **Yes** — EtherChannel/LACP | Mis-matched switch config causes MAC flapping and loss |
| Route based on physical NIC load (`loadbalance_loadbased`) | Originating port, moved when an uplink is >75% busy | No | VDS only; VCF 9 recommendation for infrastructure port groups |
| Use explicit failover order (`failover_explicit`) | First active uplink in the list | No | No load balancing; used to pin traffic (e.g. per-uplink TEPs or stretched designs) |

[[load-based-teaming|Load-based teaming]] needs no switch configuration, so a ToR misconfiguration cannot break
it — that is the justification VCF gives for recommending it.

### Failover detection and the standby list

- **Link status only** — detects NIC/cable/switch-port down. Does not detect an upstream failure beyond the ToR.
- **Beacon probing** — sends probes between uplinks to detect upstream failures; needs three or more uplinks to be
  useful and is generally avoided. KB 430982 recommends link status only.
- **Active / standby / unused** — per port group you can order uplinks. Unused uplinks are never used by that port
  group.

### LACP and link aggregation in VCF 9

A [[lag]] (link aggregation group) bundles physical links into one logical link. VCF 9 physical design states:

- **Static** link aggregation (static EtherChannel) is **not supported**.
- Only **LACP** is allowed, with conditions (the first pNIC port must support LACP fallback so the host can
  communicate before LACP negotiates; the fabric must support NSX Edge BGP peering over the aggregation).
- Recommendation VCF-NET-REQD-LAG-001: "Ensure each connection between the fabric switch and host operates as an
  independent uplink."

In other words: **independent uplinks + load-based teaming** is the VCF default; LACP is an exception.

### Port binding

| Binding | Port assigned | Use |
|---|---|---|
| Static | When a VM is connected; persists | Default; supports monitoring and port history |
| Ephemeral | When the VM powers on; no persistent port | Can be assigned on the host without vCenter — used for the VM management port group so you can reconnect a vCenter VM when vCenter itself is down |

### NIOC version 3 shares

NIOC applies only when an uplink is congested. Shares are relative: High = 100, Normal = 50, Low = 25. VCF defaults
put VM and principal storage traffic at High, management at Normal and vMotion at Low, so a vMotion storm cannot
starve vSAN. Reservations can guarantee bandwidth for specific traffic.

### VDS health check

The VDS health check (vCenter: **VDS > Configure > Settings > Health Check**) can compare VLAN, MTU and teaming
configuration on the VDS with what the physical switch ports accept. It is a quick way to find a trunk missing a
VLAN or a port with a smaller MTU.

## Configuration

In VCF you do not hand-build the VDS for the management domain: you describe it in the VCF Installer (switch name,
MTU, vmnic-to-uplink mapping, which networks — `MANAGEMENT`, `VM_MANAGEMENT`, `VMOTION`, `VSAN`, `NFS` — and NSX
switch configuration). The installer API `DvsSpec` fields are `dvsName`, `mtu`, `vmnicsToUplinks`, `networks`,
`nsxtSwitchConfig`, `nsxTeamings` and `lagSpecs`. Workload domain clusters get their VDS from the domain/cluster
creation workflow in the same way.

Day-2 changes in the vSphere Client: **Networking > VDS > Configure** for MTU/NIOC/LACP; **Distributed port group >
Edit Settings > Teaming and failover** for teaming.

:::warning
Avoid editing VCF-managed VDS objects ad hoc (renaming, changing teaming on TEP-related uplinks). VCF workflows and
NSX expect the configuration they created; change only what VCF design guidance and documented procedures allow.
:::

## CLI / API

```shell
# VDS seen from the host: uplinks, MTU, ports
esxcli network vswitch dvs vmware list

# vmk adapters with their port group, netstack and MTU
esxcli network ip interface list

# Physical NIC state
esxcli network nic list
```

Example `esxcli network vswitch dvs vmware list` output (trimmed):

```log
vcf-mgmt-vds01
   Name: vcf-mgmt-vds01
   MTU: 9000
   CDP Status: listen
   Uplinks: vmnic1, vmnic0
```

## Failure Scenarios

| Failure | Effect with VCF defaults | Effect with poor design |
|---|---|---|
| One vmnic or ToR fails | Ports fail over to the other uplink; brief loss only | Single-NIC host: host isolated, HA restarts VMs elsewhere |
| vCenter down | Data plane unaffected; no config changes | VM management port group static-only: cannot reconnect a restored vCenter VM easily |
| IP hash without matching switch EtherChannel | — | MAC flapping, intermittent loss |
| Static EtherChannel used | — | Unsupported in VCF 9 |
| VDS MTU 9000, switch port 1500 | — | Large frames dropped on that path only |
| Upstream (beyond ToR) failure with link-status detection | Uplink still "up"; traffic may black-hole | Mitigate with redundant ToR uplinks/routing, not beacon probing |

## Troubleshooting

1. Check the VDS view in vCenter: are all hosts in sync (no "out of sync" warning)? Proxy switch out of sync means
   a host did not receive the latest configuration — usually a host-to-vCenter communication issue.
2. On the host: `esxcli network vswitch dvs vmware list` — expected uplinks and MTU?
3. `esxcli network nic list` — are both vmnics Up at the right speed?
4. Run the VDS health check to catch VLAN/MTU mismatches on the physical ports.
5. For a single VM: compare its port group VLAN and teaming with a working VM; check the active uplink in `esxtop`
   (network view, `n`).

## Real-World Scenario

A team configures "Route based on IP hash" on the vMotion port group to "get more bandwidth" without configuring
EtherChannel on the switches. vMotion becomes erratic and the switches log MAC flapping. Reverting to "Route based on
physical NIC load" fixes it and requires no switch change. If more vMotion bandwidth is really needed, the right
answer is faster NICs or additional uplinks, not hashing against an unconfigured switch.

## Lab

Use the readiness lab to create VLAN-tagged port groups and VMkernel adapters with MTU 9000 on nested ESX and verify
them with `esxcli` and `vmkping`.

::lab[lab-network-readiness]

## Exam Focus

:::exam
- Management plane (vCenter) vs data plane (host): VDS keeps forwarding when vCenter is down.
- VCF 9 recommendations: VDS MTU 9000, load-based teaming for infrastructure port groups, NIOC enabled, ephemeral
  binding for VM management port group, one VDS per cluster (do not share across clusters).
- Static link aggregation is unsupported; LACP only with conditions; independent uplinks preferred.
- IP hash requires physical switch configuration; load-based teaming does not.
:::

## Common Exam Traps

:::trap
- "Load-based teaming requires LACP" — false; it needs no switch configuration.
- "If vCenter fails, VMs on a VDS lose network" — false; only management changes stop.
- Beacon probing is not the general recommendation; link status only is.
- Uplink names on the VDS are logical; vmnic numbering can differ per host.
:::

## Knowledge Check

::quiz

## Summary

- VDS = one configuration in vCenter, enforced by a proxy switch on every host.
- Port groups carry VLAN, teaming, security and binding policy; uplinks map to vmnics per host.
- VCF 9 defaults: MTU 9000, load-based teaming, NIOC on, ephemeral VM management port group, independent uplinks.
- LACP only with conditions; static EtherChannel unsupported; IP hash needs matching switch configuration.
- Verify with `esxcli network vswitch dvs vmware list`, `esxcli network nic list` and the VDS health check.

## Next Topic

Now combine VLANs, MTU, DNS/NTP and the VDS into a full [VCF network design](lesson:vcf-network-design), including the
six VCF 9 distributed switch models.
