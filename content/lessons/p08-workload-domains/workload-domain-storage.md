---
id: workload-domain-storage
title: Workload Domain Storage
phase: p08-workload-domains
module: m08-wld
version: vcf9
minutes: 40
difficulty: intermediate
summary: Principal versus supplemental storage in VCF 9.0, which storage types are supported where (vSAN ESA/OSA, vSAN storage and compute clusters, NFS v3, VMFS on FC, vVols, NFS 4.1, iSCSI, NVMe), how the choice flows from commissioning to cluster creation, and how to add supplemental storage.
topics: [wld-storage, workload-domains, vsan-architecture, datastores]
objectives: ["4.1", "2.3"]
keyTerms: [principal-storage, supplemental-storage, vsan-storage-cluster, network-pool, host-commissioning]
labs: [lab-commission-hosts-create-wld, lab-vsan-esa-cluster]
incidents: []
components: [vsan, workload-domain, esx-host, vcenter, sddc-manager]
related: [host-commissioning-wld-creation, cluster-host-expansion, storage-fundamentals-datastores, vsan-architecture-esa-osa, management-domain]
sources:
  - title: "VCF 9.0 – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "VCF 9.0 – Create a New Workload Domain Using VCF Operations (storage pages)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/deploy-a-vi-workload-domain-using-the-sddc-manager-ui.html
  - title: "VCF 9.0 – Commission ESX Hosts (storage types)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/commission-hosts.html
  - title: "VCF 9.0 – Add an SDDC Cluster to a VCF Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/expand-a-workload-domain/add-a-cluster-to-a-workload-domain-using-the-sddc-manager-ui.html
  - title: "VCF 9.0 – Shrink a Workload Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/reduce-a-workload-domain-1.html
  - title: "VCF 9.0 – Network Pool Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/about-network-pools.html
  - title: "VCF Blog – Converging VMware vSphere to VCF 9.0: top 10 questions (storage options)"
    url: https://blogs.vmware.com/cloud-foundation/2026/04/16/converging-vmware-vsphere-to-vmware-cloud-foundation-9-0-the-top-10-questions-answered/
---

## Why This Matters

Storage is the decision you cannot undo. The principal storage of a cluster is fixed when the cluster is created; changing it means building a new cluster and migrating workloads. The type also reaches backwards into host commissioning (hosts are tagged with a storage type) and network pools (which VMkernel networks get IPs). Objective 4.1 includes "Given a scenario, configure Workload Domain storage" — expect questions like "which storage can be principal for a VI workload domain?" and "a customer has FC arrays and wants VCF (VMware Cloud Foundation) — what is supported?"

## Learning Objectives

- Define principal and supplemental storage.
- State which storage types are principal and which are supplemental-only in VCF 9.0, per domain/cluster type.
- Explain vSAN ESA vs OSA choices and the vSAN storage cluster / compute cluster models in a workload domain.
- Trace a storage choice through commissioning, network pool and cluster creation.
- Add supplemental storage and understand what happens to storage when a cluster is deleted.

## Concept

TechDocs (Storage Models) defines:

- **[[principal-storage]]** — "used during the creation of a workload domain or a vSphere cluster and is capable of running workloads." One type per cluster.
- **[[supplemental-storage]]** — "can be added after the creation of a workload domain or a vSphere cluster and can run workloads or be used for data at rest storage."

| Storage model | Mgmt domain default cluster | Mgmt domain additional cluster | VI workload domain cluster |
|---|---|---|---|
| vSAN ESA | Principal | Principal | Principal |
| vSAN OSA | Principal | Principal | Principal |
| vSAN storage cluster | Not supported | Principal | Principal |
| vSAN compute cluster | Not supported | Principal | Principal |
| VMFS on Fibre Channel | Principal / Supplemental | Principal / Supplemental | Principal / Supplemental |
| NFS v3 | Principal | Principal | Principal |
| NFS v4.1 | Supplemental | Supplemental | Supplemental |
| iSCSI | Supplemental | Supplemental | Supplemental |
| NVMe/TCP, NVMe/FC, NVMe/RDMA | Supplemental | Supplemental | Supplemental |

**vVols** still appears as a principal storage option in the 9.0 workload domain and cluster wizards (FC, NFS or iSCSI protocol endpoints, VASA provider registered first), but TechDocs states: "Starting with VMware Cloud Foundation 9.0 and vSphere Foundation 9.0, the vSphere Virtual Volumes capability, also known as vVols, is deprecated and will be removed in a future release." vVols is also **not supported for vCenter import**.

:::vcf9 Changed in VCF 9
Earlier VCF versions required vSAN as principal storage of the management domain. VCF 9.0 also allows **NFS v3** and **VMFS on Fibre Channel** for the management domain default cluster, and adds the vSAN storage cluster / compute cluster models and NVMe-based supplemental options. vVols is deprecated.
:::

## Architecture

::diagram[d08-storage-options]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/64f242f4-ca49-4bec-9d15-898cca44f980.original.svg" caption="vSAN storage models (VCF 9.0 design, Storage Models – vSAN Storage section)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/9d5fa5d0-3cf3-486e-8d88-1af6fc57f88a.original.png" caption="Choosing a vSAN storage architecture model (VCF 9.0 design, Storage Models)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html"}

The storage decision touches four layers:

| Layer | Where the storage type matters |
|---|---|
| Host commissioning | Host tagged as `VSAN_ESA`, `VSAN`, `VSAN_MAX`, `VSAN_REMOTE`, `NFS`, `VMFS_FC` or `VVOL` |
| Network pool | Must contain the matching network: vSAN, vSAN Storage Client, NFS or iSCSI (plus vMotion) |
| Cluster creation | Wizard storage page: vSAN (ESA/OSA, HCI or storage), NFS, VMFS on FC, vVols |
| Day 2 | Supplemental datastores added in vSphere Client; policies in SPBM |

## Components

| Option | What you provide in the WLD wizard | Notes |
|---|---|---|
| vSAN OSA | Failures to tolerate (drives minimum host count), dedup + compression checkbox | Cache + capacity disk groups |
| vSAN ESA | Cluster type **vSAN HCI** (compute + storage) or **vSAN Storage** (storage only); optional dedicated vSAN Storage Client network; local vSAN datastore; storage policy auto-managed | Single-tier NVMe storage pool |
| NFS (v3) | Datastore name, folder (share path), NFS server IPv4 | NFS VMkernels from the network pool |
| VMFS on FC | Datastore name | Zoning, LUN presentation and datastore creation done beforehand |
| vVols (deprecated) | VASA protocol (FC/NFS/iSCSI), VASA provider, storage container, VASA user, datastore name | VASA provider must be added to inventory first |

## How It Works

Storage choice end to end for an NFS-backed workload domain:

1. Storage team exports `/export/wld01` to the NFS VLAN (Virtual Local Area Network) subnet with read-write for all host IPs.
2. Create a **network pool** with **vMotion** and **NFS** networks.
3. **Commission** hosts with storage type **NFS** and that pool.
4. **Create the workload domain**: storage page → NFS → datastore name, folder `/export/wld01`, server IP.
5. VCF assigns NFS VMkernel IPs from the pool and mounts the datastore on every host.
6. Later, add a supplemental **NFS 4.1** or **iSCSI** datastore in the vSphere Client if needed.

For vSAN ESA instead: pool with vMotion + vSAN; hosts commissioned as `VSAN_ESA` (vSAN-certified NVMe, empty devices); wizard → vSAN → ESA → HCI; storage policy managed automatically.

## Deep Dive

### Rules worth memorising

| Rule | Source / reason |
|---|---|
| One principal storage type per cluster; all hosts in it use the same type | Add-cluster page: "Each cluster can use a different type of principal storage, as long as all hosts within an SDDC (Software-Defined Data Center) cluster use the same type." |
| Principal storage cannot be changed after creation | Installer storage page note; same logic for clusters |
| Hosts commissioned for vSAN can only join vSAN clusters | Commissioning page |
| VMFS on FC needs zoning/LUN/datastore ready before commissioning or expansion | FC prerequisites |
| Deleting a cluster **destroys vSAN datastores**; other storage types are **unmounted** | Shrink-a-domain page |
| Minimum 3 hosts for clusters other than the management domain default cluster | Storage Models design page |

### vSAN storage cluster and compute cluster

A **vSAN storage cluster** ([[vsan-storage-cluster]], the disaggregated model often called vSAN Max) provides storage only, from NVMe devices; a **vSAN compute cluster** has no local vSAN capacity and mounts a remote vSAN datastore. In VCF 9.0 both can be principal storage of a workload domain cluster or an additional management domain cluster, but **not** of the management domain default cluster. The vSAN Storage Client network in the network pool carries the traffic between them.

### Supplemental storage in practice

Supplemental datastores are configured with normal vSphere workflows (add iSCSI adapter/targets, mount NFS 4.1, create VMFS on FC/NVMe) on the cluster's hosts. SDDC Manager does not create them for you, so keep them consistent across all hosts in the cluster or DRS (Distributed Resource Scheduler)/HA (High Availability) placement suffers. For iSCSI, the network pool can provide iSCSI VMkernel IPs.

### vSAN ESA or OSA for a new workload domain?

| Question | ESA | OSA |
|---|---|---|
| Hardware | NVMe devices certified for ESA (single tier, storage pool) | Cache + capacity disk groups (SSD/HDD or all-flash) |
| Typical use | New hardware purchases | Re-used older hardware certified for OSA |
| WLD wizard options | Cluster type HCI or Storage; optional vSAN Storage Client network; auto-managed policy | FTT (drives minimum hosts) and dedup + compression |
| Commissioning tag | `VSAN_ESA` | `VSAN` |

The tag is the trap: a host commissioned as `VSAN` will never appear in the host list of an ESA cluster, even if its NVMe devices would qualify. Decide ESA vs OSA before commissioning.

### Network pool sizing for storage networks

Every host placed in a cluster consumes one IP per storage network type in its pool (vSAN, NFS, iSCSI or vSAN Storage Client) plus one for vMotion. IP ranges in a pool cannot be edited — only added — and the subnet cannot be changed, so size the subnet for the largest cluster you expect plus spares for maintenance replacements.

### Policies

vSAN ESA clusters created by VCF use auto-policy management; OSA lets you choose FTT and space efficiency at creation. Storage policies are covered in [vSAN Storage Policies](lesson:vsan-storage-policies).

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Choosing principal storage for three common scenarios:

| Scenario | Recommendation | Why |
|---|---|---|
| New HCI hardware with NVMe | vSAN ESA HCI | Highest integration; VCF manages the whole lifecycle |
| Existing FC SAN, compute-only blades | VMFS on FC principal | Uses existing array; LUN prep is your job |
| Large shared storage pool for many compute clusters | vSAN storage cluster + vSAN compute clusters | Scale storage and compute independently |
| Lab on Proxmox with a NAS/NFS export | NFS v3 principal | Avoids nested vSAN overhead and HCL checks |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

```shell
# On a host: list mounted NFS datastores and VMFS extents
esxcli storage nfs list
esxcli storage vmfs extent list

# vSAN cluster membership on a host
esxcli vsan cluster get
```

```http
GET /v1/hosts?storageType=VSAN_ESA&status=UNASSIGNED_USEABLE   # SDDC Manager API: candidate ESA hosts
```

## Failure Scenarios

| Situation | Result |
|---|---|
| Hosts commissioned as `VSAN` (OSA) for an ESA domain | Not offered in host selection — re-commission (decommission, re-image, commission) |
| NFS export not writable by all host IPs | Datastore mount fails on some hosts during domain creation |
| FC LUN not presented to a new host | Host addition to FC cluster fails |
| Network pool lacks NFS network | NFS hosts cannot be commissioned with that pool |
| vVols chosen for a long-lived domain | Works in 9.0 but deprecated — migration debt |
| Cluster deleted on vSAN | vSAN datastore and its data destroyed |

## Troubleshooting

Check in this order: storage type tag of the hosts (Unassigned Hosts view or API), the network pool's networks and free IPs, the physical storage side (export permissions, zoning, LUN masking), then VMkernel connectivity (`vmkping -I <nfs-vmk> <nfs-server>`). For vSAN, see [vSAN Health and Troubleshooting](lesson:vsan-health-troubleshooting).

## Real-World Scenario

A bank has a recent FC array and wants VCF 9.0. The architect proposes: management domain on vSAN ESA (four new HCI nodes), and VI workload domains on **VMFS on FC** as principal storage, with **NVMe/FC** supplemental datastores for a latency-sensitive database cluster. A vendor suggests vVols for the workload domains; the architect rejects it because vVols is deprecated in VCF 9.0. iSCSI is accepted only as supplemental for a file-gateway use case.


## Exam Focus

:::exam
- Principal: vSAN ESA/OSA, NFS v3, VMFS on FC (and vVols in WLDs, deprecated). Supplemental only: NFS 4.1, iSCSI, NVMe/TCP, NVMe/FC, NVMe/RDMA.
- vSAN storage/compute cluster models: not for the management domain default cluster.
- Storage type chosen at commissioning → network pool networks → cluster.
- Deleting a cluster destroys vSAN datastores; other types are unmounted.
:::

## Common Exam Traps

:::trap
- "iSCSI as principal storage" — supplemental only.
- "NFS 4.1 as principal" — principal NFS is v3.
- "Change a cluster from NFS to vSAN" — principal storage cannot be changed; build a new cluster.
- "vVols is the recommended external storage in VCF 9" — it is deprecated.
:::

## Knowledge Check

::quiz

## Summary

Every VCF cluster has exactly one principal storage type, chosen at creation and fixed thereafter; supplemental storage is added later with vSphere workflows. VCF 9.0 widens principal options to vSAN ESA/OSA, NFS v3 and VMFS on FC (plus vSAN storage/compute clusters outside the management default cluster, and deprecated vVols for workload domains), while NFS 4.1, iSCSI and NVMe transports are supplemental only.

## Next Topic

Next: [Cluster and Host Expansion](lesson:cluster-host-expansion).
