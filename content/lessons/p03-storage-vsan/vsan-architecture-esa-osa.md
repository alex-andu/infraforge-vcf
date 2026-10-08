---
id: vsan-architecture-esa-osa
title: "vSAN Architecture: ESA and OSA"
phase: p03-storage-vsan
module: m03-storage
version: vcf9
minutes: 45
difficulty: intermediate
summary: How vSAN builds one shared datastore from local devices, the difference between the Express Storage Architecture (storage pools, NVMe only) and the Original Storage Architecture (disk groups), objects and components, deployment models including vSAN storage clusters, and how to deploy a vSAN cluster in VCF 9.
topics: [vsan-architecture, wld-storage]
objectives: ["2.3"]
keyTerms: [vsan, vsan-esa, vsan-osa, storage-pool, disk-group, vsan-object, vsan-component, vsan-storage-cluster, vsan-compute-cluster, principal-storage]
labs: [lab-vsan-esa-cluster]
incidents: [inc-vsan-degraded-objects]
components: [vsan, esx-host, vcenter, workload-domain, management-domain]
related: [storage-fundamentals-datastores, vsan-storage-policies, vsan-space-efficiency-capacity]
sources:
  - title: "vSAN 9.0 – vSAN Terms and Definitions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/what-is-vsan/vsan-concepts/virtual-san-terms-and-definitions.html
  - title: "vSAN 9.0 – vSAN Concepts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/what-is-vsan/vsan-concepts.html
  - title: "vSAN 9.0 – Hardware Requirements for vSAN"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/requirements-for-creating-a-virtual-san-cluster/hardware-requirements-for-virtual-san.html
  - title: "vSAN 9.0 – Networking Requirements for vSAN"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/requirements-for-creating-a-virtual-san-cluster/network-requirements.html
  - title: "vSAN 9.0 – Cluster Requirements for vSAN"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/requirements-for-creating-a-virtual-san-cluster/cluster-requirements.html
  - title: "VCF 9.0 Design – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "vSAN Storage Clusters Design and Operations (VMware)"
    url: https://www.vmware.com/docs/vmw-vsan-storage-clusters-design-and-operations
  - title: "ESXCLI command reference 9.0 – esxcli vsan"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_vsan.html
---

## Why This Matters

vSAN is the default principal storage of VCF. The management domain you will build in your lab almost certainly runs vCenter, NSX Manager and VCF Operations on a vSAN datastore. If you do not understand how vSAN places data, you cannot predict what happens when a host reboots, a drive fails, or you add a node.

VCF 9 offers two vSAN architectures. The **Express Storage Architecture (ESA)** is the modern, NVMe-only design and the one Broadcom recommends for new deployments with high performance needs. The **Original Storage Architecture (OSA)** is the classic two-tier design and is still a supported principal storage option. Exam objective 2.3 asks you to "describe the use cases for VMware vSAN ESA or VMware vSAN OSA" and to "deploy a VMware vSAN cluster" — this lesson covers both.

## Learning Objectives

- Explain how vSAN aggregates local devices into one shared datastore and what objects and components are.
- Compare ESA (storage pool, single tier, NVMe only) with OSA (disk groups, cache + capacity tiers).
- Choose ESA or OSA from a scenario using hardware, network and feature requirements.
- Describe vSAN HCI, vSAN storage cluster, vSAN compute cluster and stretched topologies and where VCF allows them.
- Outline the steps and verification commands to deploy a vSAN cluster.

## Concept

### What vSAN is

TechDocs defines vSAN as "an easy to manage, object-based enterprise software distributed storage (SDS) system". It runs **inside the ESX kernel** of each host in a cluster. Each host contributes local devices; vSAN pools them into **one** [[vsan|vSAN datastore]] that every host in the cluster can use, whether or not that host contributes capacity.

There is no storage controller VM and no external array. The "array" is the cluster itself, and the network between hosts is its backplane.

### Objects and components

vSAN does not store VM files as files on a file system. It stores [[vsan-object|objects]]:

| Object type | Contents |
|---|---|
| VM home namespace | `.vmx`, logs, descriptor files |
| VMDK | The virtual disk contents |
| VM swap | Created when the VM powers on |
| Snapshot delta | OSA only: vSAN ESA does not create delta disks for snapshots |
| Memory object | Snapshot memory or suspend state |

Each object is split into [[vsan-component|components]] that vSAN places on different hosts according to the VM's storage policy: replicas (RAID-1), data/parity segments (RAID-5/6), and witness components (metadata only, used as tiebreakers). An object stays accessible as long as **more than 50 % of its votes** are available.

### ESA vs OSA in one table

| | [[vsan-esa\|vSAN ESA]] | [[vsan-osa\|vSAN OSA]] |
|---|---|---|
| Device grouping | [[storage-pool]] per host: all devices in one pool | [[disk-group\|Disk groups]]: 1 cache device + 1–7 capacity devices; up to 5 per host |
| Tiers | Single tier: every device provides capacity **and** performance | Two tiers: cache (not counted as capacity) + capacity |
| Device types | NVMe only (TLC); "each storage pool must have at least one NVMe TLC device" | SAS, SATA, NVMe; hybrid (flash cache + HDD) or all-flash |
| Host memory | At least 128 GB per host (TechDocs) | Varies with disk groups (use the vSAN sizer) |
| Network | 10 GbE minimum (limited ReadyNode profile), 25 GbE+ recommended | 1 GbE dedicated (hybrid), 10 GbE (all-flash) |
| Failure blast radius | A device failure affects only that device's data | Cache device failure takes down the whole disk group |
| Erasure coding | RAID-5/6 with RAID-1-like performance; adaptive RAID-5 (2+1 / 4+1) | RAID-5 (3+1) / RAID-6 (4+2), all-flash only |
| Compression | On by default, controlled per policy | Optional, cluster-wide, all-flash only, per disk group |
| Snapshots | Native, no delta objects | Delta objects (redo logs) |
| Checksum | Always on, cannot be disabled | On by default, can be disabled per policy |
| Advanced topologies | Required for vSAN storage clusters; global dedup (limited availability) | Not supported as a vSAN storage cluster |

## Architecture

::diagram[d03-esa-vs-osa]

The diagram shows the same three-host cluster built two ways. On the OSA side each host has a disk group where writes land in the cache device and are later destaged to capacity devices. On the ESA side every NVMe device is part of a single storage pool, and data placement is handled by the ESA log-structured layer.

The second diagram shows the deployment models that VCF 9 can use for principal storage:

::diagram[d03-vsan-deployment-models]

The official decision chart from the VCF 9.0 design guide:

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/9d5fa5d0-3cf3-486e-8d88-1af6fc57f88a.original.png" caption="Choosing a vSAN storage architecture model (VCF 9.0 Storage Models)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html"}

## Components

| Component | Where it runs | What it does |
|---|---|---|
| vSAN kernel modules | Every ESX host in the vSAN cluster | Data path: object I/O, replication, erasure coding, checksums |
| CMMDS (cluster membership, monitoring and directory service) | Every host; one leader, one backup | Keeps the cluster directory: which hosts are members, where each component lives |
| CLOM (cluster-level object manager) | Every host (`clomd`) | Decides component placement and repairs when policies or failures require it |
| vSAN VMkernel adapter | Every host, including hosts that contribute no capacity | Carries vSAN traffic between hosts (L2 or L3, IPv4 or IPv6) |
| vSAN health service and VASA provider | vCenter (plus host-side agents) | Health checks, performance service, and SPBM capabilities |
| Witness host (stretched/2-node only) | A third site, usually the vSAN witness appliance | Holds witness components only, never VM data |

## How It Works

### A write on vSAN ESA (simplified)

1. The VM writes a block to its virtual disk; the host running the VM sends it to the vSAN layer.
2. ESA compresses (if the policy allows) and, if data-at-rest encryption is enabled, encrypts the data **once, near the top of the stack**, before it crosses the network.
3. The data is written to the object's components on other hosts according to the policy (for example two replicas for RAID-1, or data + parity for RAID-5).
4. Each host persists the write to NVMe and acknowledges. When enough components acknowledge, the VM gets its write completion.
5. ESA later writes full stripes efficiently in the background, which is why ESA erasure coding performs close to mirroring.

### A write on vSAN OSA (simplified)

1. The VM write goes to the owning host's vSAN layer.
2. vSAN mirrors (or stripes with parity) the write to the cache devices of the disk groups holding the components.
3. Cache devices acknowledge; the write completes.
4. Later the cache **destages** the data to the capacity devices. If deduplication and compression are enabled, they happen during this destage, per disk group.

### Deploying a vSAN cluster (standalone vSphere)

1. Hosts meet the requirements: certified devices/drivers/firmware, NVMe TLC for ESA, 128 GB+ memory for ESA, and supported NICs.
2. Each host gets a VMkernel adapter tagged for **vSAN** traffic (MTU consistent end to end, often 9000).
3. Create or select a vSphere cluster and run **Quickstart** or **Configure → vSAN → Services → Configure vSAN**.
4. Choose the architecture (ESA or OSA) and the type (single site, two-node, stretched).
5. Claim devices: ESA puts eligible NVMe devices into each host's storage pool; OSA asks you to assign cache and capacity tiers.
6. vSAN creates the datastore and assigns the default storage policy.
7. Verify: Skyline Health, `esxcli vsan cluster get`, and the datastore capacity view.

Treat deployment as four gates rather than one “Enable vSAN” action:

| Gate | Evidence before continuing | Typical failure if skipped |
|---|---|---|
| Compatibility | Every capacity device, driver and firmware combination is listed in the Broadcom Compatibility Guide; ESA hardware meets its profile | Unsupported or unclaimable devices, health warnings |
| Cluster | Standard design has at least three capacity-contributing ESX hosts; each host belongs to only this cluster | Unsupported topology or insufficient fault placement |
| Network | Every host has a vSAN-tagged VMkernel adapter with IP reachability and consistent MTU | Network partition and absent cluster membership |
| Storage claim | ESA storage-pool devices or OSA cache/capacity tiers match the selected architecture | No datastore capacity or incorrect disk layout |

After enabling the service, a datastore appearing is only an intermediate result. Close the deployment by checking
membership, health, capacity and a policy-compliant test object. In VCF workflows the installer or domain/cluster
workflow performs the enablement, but the same hardware, network and health gates still apply.

### In VCF 9

VCF performs these steps for you when vSAN is the principal storage: the VCF Installer builds the management domain cluster, and workload domain / cluster creation workflows configure vSAN on new clusters, including device claiming. The hosts must already pass the vSAN compatibility checks; for ESA, VCF validates disks against the vSAN ESA hardware compatibility data.

## Deep Dive

### Why ESA changed the rules

OSA was designed when flash was expensive: a small fast cache in front of slower capacity. NVMe made that split pointless, so ESA removes it. Practical consequences:

- **No disk groups** means no single device that can take a whole group offline.
- **RAID-5/6 becomes the normal choice**, not a capacity compromise: ESA's log-structured design writes full stripes, avoiding the read-modify-write penalty that made RAID-5/6 slower on OSA.
- **Compression and encryption run once, at the source host**, reducing CPU work on the receiving hosts and network traffic.
- **Snapshots are native**: a virtual disk and its snapshots share one object, so long snapshot chains are much less painful than with OSA delta objects.

### When OSA is still the right answer

| Situation | Why OSA |
|---|---|
| Existing hardware with SAS/SATA SSDs or HDDs | ESA requires NVMe TLC and ESA-certified hardware |
| Hosts with less memory than ESA requires | ESA expects at least 128 GB per host |
| 10 GbE network that cannot be upgraded and nodes not in the 10 GbE ESA profile | ESA wants 25 GbE+; 10 GbE is limited to specific ReadyNode profiles |
| A converged/imported environment that already runs OSA | Keep running it; plan a migration to ESA on new hardware |

TechDocs' own guidance: "For high-performance workloads requiring low latency and high IOPS, vSAN ESA should be chosen."

### vSAN deployment models

| Model | What it is | VCF 9.0 principal storage? |
|---|---|---|
| vSAN HCI cluster | Hosts provide compute and storage | Yes, all domain types |
| [[vsan-storage-cluster]] (formerly vSAN Max) | A vSAN ESA cluster that provides disaggregated storage to other clusters | Yes for additional management clusters and VI workload domains; not for the default management cluster |
| [[vsan-compute-cluster]] | A vSphere cluster with no local vSAN storage that mounts a remote vSAN datastore | Yes; must be in the same workload domain as its storage cluster |
| vSAN stretched cluster | One vSAN cluster across two availability zones + witness | See [resilience](lesson:vsan-resilience-fault-domains) |
| Two-node cluster | Two data hosts + external witness host | Edge/ROBO design |

vSAN storage cluster facts from the VMware design guide: built on ESA only, at least **4 hosts** (7+ recommended to allow FTT=2 RAID-6 with spare capacity), up to **10 client clusters** and **128 hosts** in total connected to one storage cluster's datastore, with separate VMkernel tags for server-side vSAN traffic and "vSAN storage cluster client" traffic. VCF guidance: it is "not recommended to run virtual machines workloads directly on the vSAN Storage Clusters."

:::vcf9 Changed in VCF 9
"vSAN Max" is now called **vSAN storage cluster**. It is a selectable principal storage type for VI workload domain clusters and for additional management domain clusters. Global deduplication for ESA arrived in 9.0 as a limited-availability feature (see [space efficiency](lesson:vsan-space-efficiency-capacity)).
:::

### Host count rules you will be asked about

- A standard vSAN cluster needs **at least three hosts** contributing capacity; two-node clusters need an external witness.
- A host in a vSAN cluster must not participate in other clusters.
- VCF management domain default cluster: **3 hosts** (simple install, but "three nodes does not support rebuild of vSAN objects to storage policy compliance") or **4 hosts** (highly available install, automatic rebuild). Other workload domain clusters: minimum 3 hosts.
- ESA and OSA are not mixed inside one cluster: the architecture is a cluster-level choice.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x the management domain had to use vSAN (OSA or ESA), and vSAN Max was the name of the disaggregated offering. ESA was introduced in vSAN 8.0; earlier releases only had what is now called OSA.
:::

## Configuration

Key settings in the vSphere Client for a vSAN cluster (cluster → **Configure → vSAN**):

| Page | What you set |
|---|---|
| Services | Enable vSAN, architecture, data services (encryption, space efficiency for OSA), performance service |
| Disk Management | Claim devices (ESA storage pool / OSA disk groups), view device health |
| Fault Domains | Define fault domains or stretched cluster sites |
| Remote Datastores | Mount a vSAN storage cluster datastore on a compute/client cluster |

Network: create a VMkernel adapter on each host with the **vSAN** service enabled, on a dedicated VLAN, with consistent MTU. Single-site clusters need RTT of 1 ms or less between hosts.

## CLI / API

Check membership, role and whether ESA is enabled:

```shell
esxcli vsan cluster get
```

```log
Cluster Information
   Enabled: true
   Local Node Type: NORMAL
   Local Node State: AGENT
   Local Node Health State: HEALTHY
   Sub-Cluster Member Count: 4
   Unicast Mode Enabled: true
   Maintenance Mode State: OFF
   vSAN ESA Enabled: true
```

ESA devices in the storage pool (ESA only):

```shell
esxcli vsan storagepool list
```

OSA devices and disk groups:

```shell
esxcli vsan storage list
```

Which VMkernel adapter carries vSAN traffic:

```shell
esxcli vsan network list
```

Unicast peers known to this host (useful when a host is partitioned):

```shell
esxcli vsan cluster unicastagent list
```

## Failure Scenarios

| Failure | ESA impact | OSA impact |
|---|---|---|
| One capacity device fails | Only components on that device are affected; rebuild elsewhere | That device's components fail; with dedup and compression enabled, the whole disk group fails |
| Cache device fails | No cache tier in ESA | The entire disk group goes offline |
| Host reboots | Components on it become **absent**; vSAN waits (60 min default) before rebuilding | Same |
| vSAN network partition of one host | Host is isolated; its components are absent for the other hosts | Same |
| Two hosts lost in a 3-host FTT=1 cluster | Objects lose quorum; VMs become inaccessible | Same |

## Troubleshooting

- **Host not contributing capacity on ESA**: the devices are not NVMe, are not eligible or were not claimed. Check `esxcli vsan storagepool list` and the **Disk Management** page. In nested labs this is the classic symptom of disks attached to a SCSI controller instead of NVMe.
- **"No vSAN ESA certified disks found" in VCF**: hardware compatibility validation failed (see the [lab](lesson:vsan-architecture-esa-osa#lab) for the nested workaround and why it is lab-only).
- **Cluster partition**: compare `Sub-Cluster Member Count` on every host; check `esxcli vsan network list` and `vmkping -I <vsan-vmk>` with the right MTU.
- **Health first**: start with Skyline Health under the cluster's Monitor tab (see [vSAN health](lesson:vsan-health-troubleshooting)).

## Real-World Scenario

A retailer is designing two VCF 9 workload domains:

1. **Payments platform**: new servers, NVMe drives, 25 GbE, latency-sensitive databases. → **vSAN ESA HCI**, RAID-5 or RAID-6 policies, compression on.
2. **Branch file archives on existing servers** with SATA SSDs and 10 GbE. → **vSAN OSA** (hardware does not meet ESA requirements). Plan an ESA refresh at the next hardware cycle.
3. Later, a third cluster needs a lot of capacity but little compute. → A **vSAN storage cluster** in the same VI workload domain serving **vSAN compute clusters**, so storage and compute scale independently.

## Lab

Build a four-host nested vSAN ESA cluster on Proxmox, including virtual NVMe devices and the hardware-compatibility workaround needed for nested labs.

::lab[lab-vsan-esa-cluster]

## Exam Focus

:::exam
- ESA = storage pool, NVMe TLC only, single tier, 128 GB+ memory, 25 GbE recommended.
- OSA = disk groups (1 cache + 1–7 capacity, max 5 per host), hybrid or all-flash.
- vSAN storage cluster = ESA only, disaggregated storage; vSAN compute cluster = mounts a remote vSAN datastore.
- Minimum 3 hosts for a standard cluster; 2-node needs a witness; VCF management default cluster 3 (simple) or 4 (HA).
- Use-case questions: performance + modern hardware → ESA; legacy SAS/SATA hardware → OSA.
:::

## Common Exam Traps

:::trap
- **"Cache device capacity counts toward the datastore"**: no, only capacity devices count in OSA.
- **"A disk group in ESA"**: ESA has storage pools, not disk groups.
- **"A host without local disks cannot use the vSAN datastore"**: wrong. Every member host can use the datastore, and a vSAN compute cluster has no local vSAN storage at all.
- **"Three hosts give full self-healing"**: with three hosts and FTT=1 RAID-1 there is no spare host to rebuild onto after a host failure.
- **"OSA can be a vSAN storage cluster"**: storage clusters are ESA only.
:::

## Knowledge Check

::quiz

## Summary

- vSAN runs in the ESX kernel and pools local devices into one datastore per cluster; data is stored as objects made of components.
- ESA uses a single-tier storage pool on NVMe; OSA uses disk groups with a cache tier.
- ESA brings efficient erasure coding, default compression, native snapshots and a smaller failure blast radius.
- vSAN can run as HCI, storage cluster + compute clusters, stretched or two-node.
- In VCF 9 vSAN is configured automatically by the deployment and workload domain workflows; your job is to provide compliant hardware and networks.

## Next Topic

How does vSAN decide how many copies to keep and where? [vSAN Storage Policies](lesson:vsan-storage-policies) covers FTT, RAID-1/5/6, adaptive RAID-5 and policy compliance.
