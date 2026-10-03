---
id: vsan-resilience-fault-domains
title: vSAN Resilience, Fault Domains and Stretched Clusters
phase: p03-storage-vsan
module: m03-vsan-ops
version: vcf9
minutes: 45
difficulty: advanced
summary: How vSAN keeps data available when devices, hosts, racks or whole sites fail — component states and repair timers, quorum, fault domains, maintenance mode options, two-node and stretched clusters with a witness, and how these appear in VCF 9.
topics: [vsan-resilience, design-availability, vsan-policies]
objectives: ["2.3"]
keyTerms: [fault-domain, stretched-cluster-design, witness-host, vsan-witness-component, ftt, vsan-component, absent-component, degraded-component, resync]
labs: [lab-vsan-storage-policies]
incidents: [inc-vsan-degraded-objects]
components: [vsan, esx-host, vcenter]
related: [vsan-storage-policies, vsan-health-troubleshooting, vsan-architecture-esa-osa]
sources:
  - title: "vSAN 9.0 – vSAN Terms and Definitions (component states, witness, voting)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/what-is-vsan/vsan-concepts/virtual-san-terms-and-definitions.html
  - title: "vSAN 9.0 – What Are vSAN Stretched Clusters"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/working-with-virtual-san-stretched-cluster/introduction-to-stretched-clusters.html
  - title: "vSAN 9.0 – What Are Two-Node vSAN Clusters"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/working-with-virtual-san-stretched-cluster/using-two-host-vsan-clusters.html
  - title: "vSAN 9.0 – Networking Requirements for vSAN (RTT limits)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/requirements-for-creating-a-virtual-san-cluster/network-requirements.html
  - title: "VCF blog – Using Fault Domains in vSAN ESA"
    url: https://blogs.vmware.com/cloud-foundation/2023/06/08/using-fault-domains-in-vsan-esa/
  - title: "VCF blog – Improved Maintenance and Recovery Options for vSAN Stretched Clusters (VCF 9.0)"
    url: https://blogs.vmware.com/cloud-foundation/2025/08/01/improved-maintenance-and-recovery-options-for-vsan-stretched-clusters/
  - title: "VCF 9.0 Design – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "ESXCLI command reference 9.0 – esxcli vsan"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_vsan.html
---

## Why This Matters

Storage policies say "tolerate one failure". Resilience design answers the harder questions: *one failure of what?* A device, a host, a rack, a room, a whole site? *What happens in the minutes after the failure?* *Can vSAN heal itself, and how long until it is safe again?*

Exam objective 2.3 asks you to "identify the options for Resilience and Data Availability in VMware vSAN". Questions are usually scenarios: a rack loses power, a host is rebooted for patching, a site link is cut. You need to say whether VMs stay up, whether vSAN rebuilds, and what the administrator should do.

## Learning Objectives

- Explain quorum (votes), witness components and the object states healthy / reduced availability / inaccessible.
- Distinguish **absent** from **degraded** components and the repair behaviour of each.
- Design fault domains for rack awareness, including the "+1 fault domain" recommendation.
- Choose the right maintenance mode option for a task.
- Describe two-node and stretched cluster architectures, the witness host, and their failure behaviour.

## Concept

### Quorum and votes

Every component of an object carries one or more votes. TechDocs: "Greater than 50 percent of the votes that make up a virtual machine's storage object must be accessible at all times." In addition, at least one full RAID-1 replica, or enough RAID-5/6 segments to rebuild the data, must be available.

- RAID-1 FTT=1: replica A (1 vote) + replica B (1 vote) + witness (1 vote). Lose any one → 2 of 3 votes remain → **accessible**.
- Lose two → 1 of 3 → **inaccessible**.

[[vsan-witness-component|Witness components]] contain only metadata ("approximately 4 MB" each) and exist to break ties.

### Component states

| State | Trigger | What vSAN does |
|---|---|---|
| Active | Normal | — |
| [[absent-component\|Absent]] | Temporary loss: host reboot, host disconnected, device pulled | Waits for the repair delay (**60 minutes** default) before rebuilding elsewhere |
| [[degraded-component\|Degraded]] | Permanent failure detected (device failed, will not return) | Rebuilds **immediately** if resources exist |
| Out of date | Policy changed and not yet reapplied | Reapply the policy |

Object states shown in the vSphere Client: **healthy**, **reduced availability** (accessible but noncompliant, with or without an active rebuild), **inaccessible** (quorum lost).

### Fault domains

A [[fault-domain]] is a group of hosts that can fail together — usually a rack (shared power and top-of-rack switches). When fault domains are defined, vSAN places the components of one object in **different fault domains**, so FTT counts **fault-domain failures**, not host failures.

| Policy | Minimum fault domains | Recommended |
|---|---|---|
| RAID-1 FTT=1 | 3 | 4 |
| RAID-5 2+1 (ESA) | 3 | 4 |
| RAID-5 4+1 (ESA) | 6 | 7 |
| RAID-6 4+2 | 6 | 7 |

The VCF blog recommends "having at least one more fault domain than the minimum required for the storage policy", so vSAN can restore full compliance after losing a whole rack. That means the realistic rack-aware ESA cluster sizes quoted there are 12 hosts (4 FDs × 3) for RAID-5 2+1 and 21 hosts (7 FDs × 3) for RAID-6.

## Architecture

Rack-aware layout with four fault domains:

::diagram[d03-fault-domains]

Stretched cluster with a witness at a third site:

::diagram[d03-stretched-cluster]

## Components

| Component | Where | Role |
|---|---|---|
| Fault domain definitions | vCenter / vSAN cluster config | Tell CLOM which hosts share a failure boundary |
| CLOM repair logic | Every host | Starts rebuilds for degraded components; for absent ones after the repair delay |
| Witness host | Third site (stretched) or remote office (two-node) | Holds witness components only; "does not store customer data, only metadata"; cannot run VMs |
| vSAN witness appliance | A nested ESX VM (OVA) deployed at the witness site | The usual form of the witness host |
| Preferred / secondary site | Two data sites of a stretched cluster | The preferred site keeps running on an inter-site partition |
| vSphere HA | Cluster | Restarts VMs whose host or site failed; uses the vSAN network for heartbeats when vSAN is enabled |

## How It Works

### A host fails in a 5-host FTT=1 RAID-1 cluster

1. Host 3 loses power. Other hosts stop receiving its CMMDS heartbeats; its components become **absent**.
2. Objects with a component on host 3 are now **reduced availability** but remain accessible (2 of 3 votes).
3. vSphere HA restarts the VMs that were running on host 3 on the surviving hosts.
4. The 60-minute repair timer runs. If host 3 returns in time, vSAN only resyncs the changes written meanwhile.
5. If it does not, CLOM rebuilds the absent components on host 4 or 5 (there is room: 5 hosts > 3 required).
6. When resync finishes, objects return to **healthy** and compliant.

### A device fails on ESA

1. The NVMe device reports a permanent error; its components become **degraded**.
2. Rebuild starts immediately on other hosts' devices; on ESA only that device's data is affected.
3. The administrator replaces the device and claims the new one into the storage pool.

### Maintenance mode options

| Option | Data movement | Use when |
|---|---|---|
| **Ensure accessibility** (default) | Moves only what is needed so every object stays accessible; some objects run with reduced redundancy | Short reboots and patching |
| **Full data migration** | Evacuates all components from the host | Decommissioning a host or long maintenance |
| **No data migration** | Nothing moved; objects with FTT=0 on the host become inaccessible | Whole-cluster shutdown, or when you accept the risk |

Always run the vSAN data migration pre-check first; it shows what would become inaccessible or noncompliant.

## Deep Dive

### Stretched clusters

TechDocs defines a [[stretched-cluster-design|stretched cluster]] as one vSAN cluster extended across two availability zones that "continue to function if a failure or scheduled maintenance occurs at one zone". Key facts:

- **Three fault domains**: preferred site, secondary site, witness site.
- **Witness host** at a third location; one witness supports only one stretched cluster (two-node clusters can share a witness).
- **Storage policy**: *Site disaster tolerance = Site mirroring – stretched cluster*, plus an in-site failures-to-tolerate rule (for example RAID-5 in each site), so the object survives a site loss **and** a host failure in the surviving site.
- **Network**: up to **5 ms RTT** between the data sites, up to **200 ms RTT** to the witness (TechDocs network requirements).
- **Failure behaviour**: one site fails → HA restarts VMs in the other site. Witness fails → objects noncompliant but accessible. Inter-site link fails → the preferred site keeps running ("the site that leads to maximum data availability is the one that remains in operation").

:::vcf9 Changed in VCF 9
VCF 9.0 adds **site maintenance mode** for stretched clusters (generally available): put all hosts of one site into maintenance mode in one operation instead of host by host. **Manual site takeover** — recovering when a data site and the witness fail together — launched as limited availability through Broadcom's Technical Qualification Request process. vSAN storage clusters stretched across two sites can now be consumed by stretched vSphere clusters.
:::

### Two-node clusters

Two data hosts at a branch plus a witness appliance elsewhere (typically next to vCenter). TechDocs: "A single witness host can support up to 64 two-node vSAN clusters", depending on witness memory. Policy: *Host mirroring – 2 node cluster*. Witness traffic is often separated onto the management VMkernel so the data hosts can be cabled back to back.

### Stretched clusters in VCF

VCF 9's design guide lists vSAN stretched clusters as a vSAN topology. Stretching in VCF has its own prerequisites (networks for both availability zones, witness deployment, NSX considerations). For the exam, know the vSAN mechanics above; detailed VCF stretch workflows belong to the availability design material.

### Self-healing needs spare capacity

Three hosts with FTT=1 RAID-1 survive one host failure but **cannot rebuild** (no fourth host to place the missing component). That is why VCF's 3-node management domain is called "Simple" and states it "does not support rebuild of vSAN objects to storage policy compliance", while 4 nodes is the "Highly Available" option. Capacity must also be free on the survivors: see host rebuild reserve in [space efficiency and capacity](lesson:vsan-space-efficiency-capacity).

## Configuration

**Fault domains**: cluster → **Configure → vSAN → Fault Domains** → create a fault domain per rack and drag hosts into it. Keep the same number of hosts (and capacity) in each fault domain.

**Stretched cluster** (standalone vSphere): deploy the witness appliance at the third site, then cluster → **Configure → vSAN → Fault Domains → Configure Stretched Cluster**, choose preferred and secondary hosts and the witness host. Then create policies with *Site mirroring – stretched cluster*.

**Maintenance mode**: host → **Maintenance Mode → Enter Maintenance Mode**, choose the vSAN data migration option; or run the pre-check under the cluster's **Monitor → vSAN → Data Migration Pre-check**.

**HA with vSAN**: enable vSphere HA after vSAN; HA then uses the vSAN network for heartbeats.

## CLI / API

Which fault domain this host belongs to:

```shell
esxcli vsan faultdomain get
```

```log
   Fault Domain Id: 9a1f5c2e-0b6d-4e1a-9f0c-3d2b7a6e5f10
   Fault Domain Name: rack-a
```

Object health summary (counts per state):

```shell
esxcli vsan debug object health summary get
```

Resync progress after a failure or maintenance:

```shell
esxcli vsan debug resync summary get
```

Stretched clusters: the preferred fault domain as seen by this host:

```shell
esxcli vsan cluster preferredfaultdomain get
```

## Failure Scenarios

| Event | FTT=1 RAID-1, 4 hosts, no FDs | Stretched, site mirroring + in-site RAID-1 |
|---|---|---|
| One device fails | Degraded → immediate rebuild | Same, within the site |
| One host reboots (10 min) | Absent → no rebuild, delta resync on return | Same |
| One host lost permanently | Rebuild after 60 min onto the 4th host | Rebuild in the same site |
| Rack with two hosts loses power (no FDs defined!) | Objects with both replicas in that rack become **inaccessible** | — |
| One site lost | — | VMs restarted in the surviving site; data available |
| Witness lost | Witness components absent; objects accessible | Same; objects noncompliant |
| Data site + witness lost | — | Remaining site loses quorum; VCF 9.0 manual takeover (LA) is the recovery path |

The rack scenario is why fault domains exist: without them vSAN may place two components of one object in hosts that share a rack.

## Troubleshooting

1. **Objects reduced availability**: check **Monitor → vSAN → Virtual Objects** and `esxcli vsan debug object health summary get`. Are components absent (wait or bring the host back) or degraded (replace hardware, ensure rebuild can proceed)?
2. **Rebuild not starting**: is there a spare host/fault domain? Is there free capacity? A 3-host or 3-FD design cannot rebuild.
3. **Stretched cluster partitioned**: check inter-site links and RTT; confirm which site is preferred (`esxcli vsan cluster preferredfaultdomain get`).
4. **Witness unreachable**: test with `vmkping` from the witness-traffic VMkernel; check RTT ≤ 200 ms.
5. **After maintenance**: large resync numbers are normal after "Ensure accessibility" (stale components catch up); watch "bytes left to resync" decrease.

## Real-World Scenario

A hospital runs a VCF VI workload domain in two buildings 3 km apart (RTT 1.2 ms) and wants to survive the loss of either building.

- Design: vSAN ESA stretched cluster, 4 hosts per site, witness appliance in a third building's small server room (RTT < 200 ms).
- Policy: *Site mirroring – stretched cluster* + in-site FTT=1 RAID-5 (2+1 at 4 hosts per site).
- Maintenance: building A's power work is handled with site maintenance mode in VCF 9.0.
- Test plan: power off one data host (VMs stay up), disconnect the witness (objects noncompliant, VMs up), simulate the inter-site link failure (preferred site keeps running).

## Lab

Use the policy lab to watch component states change when you reboot one nested host and when you put a host in maintenance mode with different options.

::lab[lab-vsan-storage-policies]

## Exam Focus

:::exam
- >50 % votes rule; witness = metadata only.
- Absent → 60-minute repair delay; degraded → immediate rebuild.
- Fault domains change FTT from "hosts" to "racks"; keep +1 fault domain for rebuild.
- Stretched cluster: 3 fault domains, witness at third site, 5 ms RTT between sites, 200 ms to witness, preferred site wins a partition.
- Two-node: two hosts + witness; one witness can serve up to 64 two-node clusters.
- Maintenance mode: Ensure accessibility (default), Full data migration, No data migration.
:::

## Common Exam Traps

:::trap
- **"The witness host can run VMs"** — no.
- **"vSAN rebuilds immediately after a host reboot"** — no, components are absent and the 60-minute timer applies.
- **"Full data migration for a 10-minute patch reboot"** — wasteful; Ensure accessibility is the intended option.
- **"One witness for several stretched clusters"** — only two-node clusters can share a witness.
- **"3 hosts + FTT=1 is self-healing"** — it survives, but cannot rebuild until a host returns.
:::

## Knowledge Check

::quiz

## Summary

- Objects need >50 % of votes and a full replica or enough segments; witnesses hold metadata for quorum.
- Absent components wait 60 minutes; degraded components rebuild immediately.
- Fault domains make vSAN rack-aware; plan one more fault domain than the policy minimum.
- Stretched clusters mirror across two sites with a witness at a third; two-node clusters are the small-site variant.
- VCF 9.0 adds site maintenance mode (GA) and manual site takeover (limited availability).

## Next Topic

Resilience costs capacity. [vSAN Space Efficiency and Capacity](lesson:vsan-space-efficiency-capacity) explains compression, deduplication, erasure coding and the reserves vSAN needs to heal.
