---
id: storage-fundamentals-datastores
title: Storage Fundamentals and Datastores
phase: p03-storage-vsan
module: m03-storage
version: vcf9
minutes: 35
difficulty: foundation
summary: How VMware ESX presents block, file and software-defined storage as datastores, and how VMware Cloud Foundation (VCF) 9 distinguishes principal from supplemental storage.
topics: [datastores, wld-storage]
objectives: ["2.3", "4.1"]
keyTerms: [datastore, vmfs, nfs-datastore, vvols, principal-storage, supplemental-storage, spbm, vsan]
labs: [lab-vsan-esa-cluster]
incidents: []
components: [esx-host, vcenter, vsan, workload-domain, management-domain]
related: [vsan-architecture-esa-osa, vsan-storage-policies]
sources:
  - title: "VCF 9.0 Design – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "vSphere 9.0 Storage – Working with Datastores in vSphere Storage Environment"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-storage/working-with-datastores-in-vsphere-storage-environment.html
  - title: "vSphere 9.0 Storage – Introduction to Storage in vSphere Environment"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-storage/introduction-to-storage-in-vsphere-environment.html
  - title: "VCF blog – vSphere and VCF 9 Core Storage: What's New"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/19/vsphere-and-vcf-9-core-storage-whats-new/
  - title: "Broadcom KB 401070 – Deprecation of vSphere Virtual Volumes (vVols) in VCF 9.0 and VVF 9.0"
    url: https://knowledge.broadcom.com/external/article/401070
  - title: "ESXCLI command reference 9.0 – esxcli vsan"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_vsan.html
---

## Why This Matters

Every virtual machine (VM) is represented by configuration, virtual-disk, swap and log files. Those files must remain reachable from the hosts expected to run the VM, or VMware vSphere High Availability (HA), VMware vSphere vMotion and Distributed Resource Scheduler (DRS) operations lose required storage access. A [[datastore]] is the logical container that gives vSphere a consistent way to manage those files.

In VMware Cloud Foundation (VCF) storage is not an afterthought: when you create the management domain or a VI workload domain, you must pick the **principal storage** for the first cluster, and that choice cannot be casually changed afterwards. The exam objective 2.3 starts with "Given a scenario, configure vSphere storage", and objective 4.1 asks you to "configure Workload Domain storage". Both assume you can answer three questions quickly:

1. What kind of datastore is this (block, file, or software-defined)?
2. Is it allowed as principal storage for this kind of domain or cluster in VCF 9?
3. Who configures it: VCF automation, or the storage team with their own tools?

## Learning Objectives

- Explain what a datastore is and how ESX presents block, file and software-defined storage to VMs.
- Compare Virtual Machine File System (VMFS), Network File System (NFS), VMware vSAN and VMware vSphere Virtual Volumes (vVols) datastores, including what is deprecated in VCF 9.0.
- Distinguish **principal** from **supplemental** storage and list which storage types VCF 9.0 accepts for each.
- Identify the storage devices and paths of an ESX host from the command-line interface (CLI) and the vSphere Client.
- Describe how Storage Policy Based Management (SPBM) connects VM requirements to datastore capabilities.

## Concept

### From disk to datastore

A VM never sees a physical disk. The chain is:

| Layer | What it is | Example |
|---|---|---|
| Physical device | A disk, solid-state drive (SSD), Non-Volatile Memory Express (NVMe) device, storage area network (SAN) logical unit number (LUN), or network-attached storage (NAS) export | `naa.600a0980...` LUN on an array, a local NVMe drive |
| Storage adapter | How ESX reaches the device | NVMe controller, Serial Attached SCSI (SAS) host bus adapter (HBA), Fibre Channel (FC) HBA, software Internet Small Computer Systems Interface (iSCSI) adapter, or VMkernel network interface card (NIC) for NFS |
| Datastore | The logical container vSphere manages | VMFS volume, NFS mount, vSAN datastore, vVols container |
| VM files | What lives in the datastore | `.vmx`, `.vmdk`, `.vswp`, `.log` |
| Virtual disk | What the guest sees | A SCSI or NVMe disk inside the VM |

TechDocs describes datastores as logical containers that hide the specifics of physical storage and give a uniform model for storing VM files, ISO images and templates.

### The four datastore types

| Type | Storage it sits on | Who formats it | Key point |
|---|---|---|---|
| [[vmfs]] (VMFS5/VMFS6) | Block devices: local disk, FC, iSCSI, NVMe-oF LUNs | ESX formats the LUN with VMFS | Clustered file system: many hosts can mount it at once, with on-disk locking |
| [[nfs-datastore]] (NFS 3 / 4.1) | A NAS export reached over TCP/IP | The NAS owns the file system; ESX mounts it | ESX supports versions 3 and 4.1 of the NFS protocol |
| [[vsan]] | Local devices of the cluster's own hosts (or of a remote vSAN storage cluster) | vSAN, when you enable it on the cluster | One datastore per vSAN cluster; object-based, policy-driven |
| [[vvols]] | A storage container on a vVols-capable array | The array, via VASA | **Deprecated beginning with VCF 9.0** (KB 401070) |

:::general
**Traditional vs software-defined.** TechDocs separates the *traditional* model (ESX virtualizes capacity: a LUN becomes a VMFS datastore) from the *software-defined* model (vSAN and vVols abstract *capabilities* too, so a VM can ask for "tolerate one failure" rather than "put me on LUN 7").
:::

### Principal and supplemental storage in VCF

VCF uses two words you must know cold:

- [[principal-storage]]: the storage you select **when you create** a workload domain or a vSphere cluster. It must be able to run workloads.
- [[supplemental-storage]]: storage you **add after** the cluster exists. It can run workloads or hold data at rest (templates, ISOs, backups).

The VCF 9.0 Storage Models page lists:

| Cluster | Principal storage options | Supplemental storage options |
|---|---|---|
| Management domain, default (first) cluster | vSAN ESA, vSAN OSA, NFS v3, Fibre Channel (VMFS) | FC, NFS v3 and v4.1, iSCSI, NVMe/TCP, NVMe/FC, NVMe/RDMA |
| Management domain, additional clusters | vSAN ESA, vSAN OSA, vSAN storage cluster, vSAN single-rack compute cluster, NFS v3, FC | Same as above |
| VI workload domain clusters | vSAN ESA, vSAN OSA, vSAN storage cluster, vSAN single-rack compute cluster, NFS v3, FC | Same as above |

:::vcf9 Changed in VCF 9
The VCF 9 storage blog states that for new deployments "VMFS Fibre Channel, and NFSv3 are now supported as principal storage options for the management domain." In VCF 5.x the management domain required vSAN. vVols certifications for VCF/VVF 9.0 are discontinued and vVols are deprecated (KB 401070).
:::

Two constraints from the same page matter in scenarios:

- For FC and NFS, "storage provisioning and configuration is not completed by VMware Cloud Foundation automated workflows" and needs additional tools. VCF mounts what the storage team has already presented; it does not zone your SAN or create your NFS exports.
- iSCSI and NVMe-oF appear **only** as supplemental storage. If a scenario says "the new workload domain must use iSCSI as principal storage", that is not a valid VCF 9.0 design.

## Architecture

The diagram below shows one ESX host reaching all four kinds of storage, and which of them VCF can use as principal storage.

::diagram[d03-datastore-types]

The official VCF 9.0 design guide also shows how vSAN itself can be deployed in different topologies (HCI, storage cluster, compute cluster, stretched):

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/64f242f4-ca49-4bec-9d15-898cca44f980.original.svg" caption="vSAN deployment topologies (figure under 'vSAN Storage', VCF 9.0 Storage Models)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html"}

## Components

| Component | Where it runs | Role in storage | Managed by |
|---|---|---|---|
| ESX storage stack (PSA, NMP/HPP, VMFS driver, NFS client) | VMkernel of every host | Discovers devices, handles paths and multipathing, mounts datastores | vCenter / host |
| Storage adapters | Host hardware or software (software iSCSI, NVMe/TCP) | Present devices to the VMkernel | Host configuration |
| VMkernel adapters | Each host | Carry IP storage traffic (NFS, iSCSI, NVMe/TCP, vSAN) | vCenter (VDS in VCF) |
| vCenter | Management domain | Creates/mounts datastores across hosts, holds SPBM policies | VCF / vSphere admin |
| VASA providers | Built into vSAN; array-supplied for vVols | Tell vCenter what the storage can do (capabilities) | vCenter |
| VCF Operations fleet workflows / SDDC Manager | Management domain | Automate vSAN during domain and cluster creation; consume pre-provisioned NFS/FC | VCF admin |

### Component responsibilities and limits

**ESX storage stack.** The VMkernel discovers devices, claims paths, applies multipathing and mounts datastores. It can isolate a failed path and continue over healthy paths when the design provides them. It cannot correct array zoning, export permissions, physical fabric failures or inconsistent presentation between hosts.

**Datastore.** A datastore provides a common namespace and access model for VM files. Its type determines who owns the file system and how capabilities are exposed. A datastore does not by itself guarantee redundancy, performance or access from every cluster host; those properties depend on the backing system, network/fabric and policy.

**Storage adapter and VMkernel network.** Adapters provide the transport from host to storage. Block transports expose devices that ESX can format with VMFS, while NFS mounts a file-system export. Multiple adapters or paths can improve availability, but only when zoning, addressing, path policy and the storage target are configured consistently.

**Storage Policy Based Management (SPBM).** SPBM compares a VM storage policy with advertised datastore capabilities and reports compatibility and compliance. It can select an appropriate datastore and, with vSAN, control object layout. It cannot make an incompatible datastore satisfy a requirement or replace capacity and failure-domain planning.

**VCF storage workflow.** VCF can configure supported vSAN storage during domain and cluster creation and can consume prepared NFS or FC storage. It does not provision an external array, create SAN zoning or authorize NAS exports; those remain storage-team responsibilities.

## How It Works

For VMFS on traditional block storage, the storage system first presents the same LUN to every intended host. Each host discovers the device and paths; the Pluggable Storage Architecture (PSA) claims them and applies a multipathing policy. ESX writes VMFS once, and all authorized hosts mount that shared clustered file system. HA and vMotion can then use the VM files only where device presentation is consistent.

For NFS, the NAS owns the file system and exports a path. ESX acts as an NFS client and mounts that export on each selected host; it does not format the export with VMFS. Protocol version, network reachability and export authorization must remain consistent across the cluster.

For vSAN, cluster hosts contribute claimed devices to a distributed object store, and one vSAN datastore is exposed to the cluster. Policy determines how each VM object is placed and protected. The following lessons cover its architectures and policies in depth.

## Deep Dive

### VMFS in a sentence or three

VMFS is a clustered file system: several hosts mount the same volume and coordinate with on-disk locks, so one host can run a VM while another can take it over after a failure. VMFS6 is the current format; TechDocs for vSphere 9.0 still lists VMFS5 and VMFS6 as supported datastore formats. The VCF 9 storage blog also notes that SEsparse becomes the default snapshot format for NFS and all VMFS-5 VMDKs.

### NFS 3 vs NFS 4.1

| | NFS 3 | NFS 4.1 |
|---|---|---|
| VCF 9.0 principal storage | Yes | No (supplemental only) |
| Multipathing | No native session trunking | Session trunking (multiple paths) |
| Security | AUTH_SYS | Kerberos options; VCF 9 adds krb5p in-transit encryption (blog) |
| Locking | Proprietary lock files | Protocol-native locking |

:::trap
Do not mount the **same** NFS export as NFS 3 on some hosts and NFS 4.1 on others. The two versions use different locking, and mixing them risks data corruption. Pick one version per export.
:::

### vVols: why it still appears in questions

vVols map each VM disk to an object on the array and let SPBM push policies to the array through VASA. It is a software-defined model like vSAN, but it depends on third-party arrays. Broadcom announced that vVols are deprecated beginning with VCF/VVF 9.0, certifications for 9.0 were discontinued, and vVols will be fully discontinued in a future release. For the exam, treat vVols as legacy context, never as a VCF 9 principal storage answer.

### SPBM: the glue

[[spbm|Storage Policy Based Management]] lets you define requirements (availability, performance, encryption, space efficiency) as a **VM storage policy**. Capabilities are advertised by VASA providers (vSAN has one built in) or by tags you assign to datastores. When you deploy a VM with a policy, vCenter shows which datastores are **compatible**, and afterwards whether the VM is **compliant**. For vSAN, the policy goes further: it decides how the VM's objects are physically laid out. That is the topic of [vSAN storage policies](lesson:vsan-storage-policies).

### Device names you will see

| Identifier | Meaning |
|---|---|
| `naa.xxxx` | NAA (Network Addressing Authority) ID, typical for SAN LUNs and SAS devices |
| `t10.xxxx` | T10 vendor ID, common for SATA/NVMe devices |
| `eui.xxxx` | EUI-64, common for NVMe namespaces |
| `mpx.vmhbaX:C0:T0:L0` | Path-based name used when the device reports no unique ID (common on virtual or USB devices) |
| `vmhba2:C0:T1:L4` | Runtime path name: adapter, channel, target, LUN |

## Configuration

Storage configuration begins with ownership and evidence:

| Decision | Management surface | Evidence |
|---|---|---|
| Which storage type satisfies the domain role? | VCF domain/cluster design and storage-model rules | Principal or supplemental classification and supported type |
| Is external storage ready? | Array/NAS tooling plus host adapter views | LUN/export identifier, zoning or authorization, and matching presentation |
| Can every intended host reach it? | Host devices, paths and cluster datastore views | Consistent device identity, healthy paths and datastore mounted on all hosts |
| Which workloads are compatible? | VM storage policies and datastore capability view | Policy compatibility, capacity and compliance result |
| Is redundancy working? | Path, network/fabric and datastore health views | Expected path count, failover behavior and no unresolved alarms |

The separate practical guide owns exact VCF 9.0.2 and vSphere Client navigation. The theory boundary is that VCF configures supported vSAN workflows, consumes already prepared NFS v3 or FC principal storage, and adds supported supplemental storage after cluster creation.

Automation can use an application programming interface (API) or CLI, but it must preserve the same device identity, host-consistency and destructive-operation checks.

## CLI / API

List devices the host sees (works for local, SAN and NVMe devices):

```shell
esxcli storage core device list
```

```log
t10.NVMe____Samsung_SSD_980_PRO_1TB_________________0A1B2C3D4E5F6071
   Display Name: Local NVMe Disk (t10.NVMe____Samsung_SSD_980_PRO_1TB...)
   Has Settable Display Name: true
   Size: 953869
   Device Type: Direct-Access
   Multipath Plugin: HPP
   Is Local: true
   Is SSD: true
   Is Boot Device: false
```

List mounted file systems (VMFS, NFS, vSAN) with their UUIDs and free space:

```shell
esxcli storage filesystem list
```

List NFS 3 mounts:

```shell
esxcli storage nfs list
```

Check whether this host is a vSAN cluster member (covered in the next lesson):

```shell
esxcli vsan cluster get
```

PowerCLI equivalent for a quick inventory: `Get-Datastore | Select Name, Type, CapacityGB, FreeSpaceGB`.

## Failure Scenarios

| Failure | What you see | Impact |
|---|---|---|
| A LUN is unpresented on the array (permanent device loss) | Device state "lost communication"/PDL; VMs on that datastore fail | HA can restart VMs only if the storage is reachable from another host |
| All paths to a LUN go down temporarily (APD) | Datastore inaccessible, I/O retried | VMs hang; VM Component Protection (if configured) can react |
| NFS server or its network unreachable | Datastore shows inaccessible; VMs freeze I/O | Every VM on the export is affected |
| One host loses its storage VMkernel NIC | Only that host loses the datastore | HA/DRS move workloads; the host shows the datastore as inaccessible |
| vSAN host fails | Objects lose a replica/segment; policy decides if VMs stay up | Covered in [resilience](lesson:vsan-resilience-fault-domains) |

## Troubleshooting

1. **Is the device visible?** `esxcli storage core device list` and a rescan. No device means zoning, masking, cabling or target discovery.
2. **Are the paths healthy?** `esxcli storage core path list` shows each path state. One dead path out of four is degraded redundancy; all dead is an outage.
3. **Is the datastore mounted on all hosts?** Check the cluster **Datastores** tab; a datastore missing from one host breaks HA and vMotion for VMs on that host.
4. **For NFS:** `vmkping -I vmkX <nas-ip>` from the NFS VMkernel interface, then check export permissions and the NFS version.
5. **For vSAN:** use Skyline Health first (see [vSAN health](lesson:vsan-health-troubleshooting)).

## Real-World Scenario

A company is planning a VCF 9.0 VI workload domain for a database team that already owns a Fibre Channel array with spare capacity, and also wants an iSCSI datastore for ISO images.

- **Principal storage:** FC (VMFS) is valid for a VI workload domain. The storage team must create and zone the LUN first; VCF will not do it.
- **Supplemental:** iSCSI is valid only as supplemental storage, added after the cluster exists.
- **Rejected option:** "Use iSCSI as principal storage" is not in the VCF 9.0 list.
- **Alternative:** if they wanted hyperconverged storage that VCF configures end to end, vSAN ESA would be the default recommendation.

In Alex's home lab, the Proxmox server's 1 TB NVMe is the natural backing for nested vSAN ESA devices, while the 2 TB HDDs could back an NFS export (from a small NAS VM) used as supplemental storage for ISOs and templates.

## Exam Focus

:::exam
- Know the four datastore types and which is block, file or software-defined.
- Memorize the VCF 9.0 principal storage list: **vSAN ESA, vSAN OSA, vSAN storage cluster / compute cluster (not for the management domain's default cluster), NFS v3, Fibre Channel**.
- iSCSI, NVMe/TCP, NVMe/FC, NVMe/RDMA and NFS 4.1 are **supplemental only**.
- VCF automates vSAN configuration; FC and NFS must be provisioned outside VCF.
- vVols: deprecated in VCF 9.0.
:::

## Common Exam Traps

:::trap
- **"NFS 4.1 as principal storage"**: wrong for VCF 9.0; principal NFS is **v3 only**.
- **"vSAN storage cluster for the management domain's first cluster"**: not listed for the default management cluster; it is listed for additional clusters and VI workload domains.
- **"VCF will create the LUN"**: it will not; FC/NFS provisioning is outside VCF workflows.
- **Principal vs supplemental is about *when* (at creation vs after) and *what is allowed*, not about performance.**
:::

## Knowledge Check

::quiz

## Summary

- A datastore is the logical container for VM files; ESX supports VMFS, NFS (3 and 4.1), vSAN and vVols.
- VMFS is a clustered file system on block devices; NFS is mounted from a NAS; vSAN is built from the hosts' own devices; vVols are deprecated in VCF 9.0.
- Principal storage is chosen when a domain or cluster is created; supplemental storage is added later.
- VCF 9.0 principal options: vSAN ESA/OSA, vSAN storage cluster and compute clusters (not for the default management cluster), NFS v3, FC.
- SPBM connects VM requirements to datastore capabilities and, for vSAN, drives data placement.

## Next Topic

Next you will open up the vSAN datastore itself: [vSAN Architecture: ESA and OSA](lesson:vsan-architecture-esa-osa) explains storage pools, disk groups, objects and components, and when to choose each architecture.
