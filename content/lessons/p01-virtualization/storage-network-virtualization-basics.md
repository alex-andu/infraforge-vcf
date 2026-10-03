---
id: storage-network-virtualization-basics
title: Storage and Network Virtualization Basics
phase: p01-virtualization
module: m01-virt-basics
version: general
minutes: 30
difficulty: foundation
summary: Where a VM's disks really live (virtual disks, datastores, VMFS/NFS/vSAN, thin vs thick) and how its traffic leaves the host (virtual NICs, port groups, standard and distributed switches, VMkernel adapters, uplinks, VLANs), as the base for the vSAN, networking and NSX phases.
topics: [virtual-hardware, datastores, vds, l2-l3]
objectives: ["2.2"]
keyTerms: [vm, vmkernel, vmware-tools, vm-hardware-version, esx]
labs: [lab-esx-host-first-vm]
incidents: []
components: [esx-host, vsan, vds, physical-network]
related: [hypervisors-and-esx, storage-fundamentals-datastores, network-fundamentals-for-vcf, vsphere-distributed-switch]
sources:
  - title: "vSphere 9.0 – vSphere Storage"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-storage.html
  - title: "vSphere 9.0 – vSphere Networking"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-networking.html
  - title: "vSphere 9.0 – Configuring Virtual Machine Hardware"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-virtual-machine-administration/configuring-virtual-machine-hardware.html
  - title: "Broadcom KB 401070 – Deprecation of vSphere Virtual Volumes (vVols) in VCF 9.0 and VVF 9.0"
    url: https://knowledge.broadcom.com/external/article/401070/deprecation-of-vmware-vsphere-virtual-vo.html
  - title: "VCF 9.0 – What Is VMware Cloud Foundation? (vSAN and NSX roles)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/what-is-vmware-cloud-foundation-and-vmware-vsphere-foundation.html
  - title: "ESXCLI 9.0.0 Reference – esxcli network"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_network.html
  - title: "ESXCLI 9.0.0 Reference – esxcli storage"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_storage.html
---

## Why This Matters

A VM is useless without a disk and a network. In VCF, storage is usually **vSAN** (in the hosts) and networking is **vSphere Distributed Switches plus NSX**. Before those phases you need the basic chain: *VM → virtual device → host object → physical device*. Most beginner troubleshooting ("VM has no network", "datastore full", "host lost storage") is solved by walking that chain.

## Learning Objectives

- Trace a VM's disk I/O from virtual disk to datastore to physical storage.
- Compare datastore types (VMFS, NFS, vSAN) and thin vs thick provisioning.
- Trace a VM's network traffic from virtual NIC through port group, virtual switch and uplink.
- Distinguish VM port groups, VMkernel adapters and uplinks (vmnic vs vmk).
- Explain what a standard switch and a distributed switch are, and where NSX fits.

## Concept

### Storage virtualization

The guest sees a **virtual disk** on a **virtual controller** (PVSCSI, LSI Logic SAS, NVMe or SATA). That disk is really a **.vmdk file** on a **datastore**, a storage container formatted and managed by ESX.

| Datastore type | Backed by | Typical use |
|---|---|---|
| **VMFS** | Block storage: local disk, Fibre Channel, iSCSI, NVMe-oF LUN | Local or SAN storage, shared between hosts in a cluster |
| **NFS** | File share from a NAS (NFS v3 or 4.1) | Shared storage without block protocols; also possible as VCF principal storage in some models |
| **vSAN** | Local disks of the cluster's ESX hosts, pooled by the VMkernel | Default principal storage for VCF clusters; managed through storage policies |
| **vVols** | Storage-array objects | **Deprecated starting with VCF/VVF 9.0** |

Provisioning formats:

| Format | Space allocated at creation | Notes |
|---|---|---|
| **Thin** | Only what is written | Saves space; you must monitor overcommitted datastores |
| **Thick lazy-zeroed** | Full size, zeroed on first write | Default thick type |
| **Thick eager-zeroed** | Full size, zeroed up front | Slower to create; no first-write zeroing penalty; required by some clustering configurations |

On vSAN, space is governed by the **storage policy** rather than these formats (Phase 3).

### Network virtualization

The guest sees a **virtual NIC** (usually **vmxnet3**, which needs VMware Tools drivers; or e1000e for compatibility). The vNIC connects to a **port group**, a set of ports on a **virtual switch** sharing the same VLAN and policies. The switch forwards traffic between VMs on the same host in memory, or out through **uplinks** (physical NICs, named vmnic0, vmnic1…) to the physical switch.

The host itself also needs IP connectivity, for management, vMotion, vSAN, NFS and so on. For that ESX uses **VMkernel adapters** (vmk0, vmk1…), each attached to a port group and enabled for specific services.

| Name | What it is | Example |
|---|---|---|
| **vNIC** | VM's virtual network card | Network adapter 1 (vmxnet3) |
| **Port group** | Named group of switch ports with VLAN/policy | "VM Network", "Management Network" |
| **vmk** | Host's own IP interface | vmk0 = management |
| **vmnic** | Physical NIC used as uplink | vmnic0, vmnic1 |

## Architecture

::diagram[d01-vm-storage-network-path]

## Components

| Component | Scope | Configured in | VCF usage |
|---|---|---|---|
| **vSphere Standard Switch (vSS)** | One host | Each host individually | vSwitch0 at install; used before VCF converts hosts to VDS |
| **vSphere Distributed Switch (VDS)** | Many hosts, one config | vCenter | Used by every VCF domain for system traffic (management, vMotion, vSAN) and NSX |
| **NSX segments** | Many hosts, overlay or VLAN | NSX Manager | Workload networks in VCF (Phase 5) |
| **VMFS datastore** | Hosts that see the LUN | vCenter / Host Client | Supplemental storage, local lab storage |
| **vSAN datastore** | One cluster | vCenter (cluster setting) | Principal storage for VCF clusters |

## How It Works

### A VM writes a block

1. The guest OS writes to its disk through the virtual controller driver (e.g. PVSCSI from VMware Tools).
2. The VMkernel translates the write to an offset in the VM's `.vmdk` file.
3. The datastore layer writes it: to a VMFS volume on a LUN, to an NFS server, or to vSAN components on several hosts.
4. The physical device acknowledges; the acknowledgement travels back to the guest.

### A VM sends a packet

1. The guest sends through its vNIC (vmxnet3 driver).
2. The port group applies VLAN tagging and policies (security, teaming).
3. The virtual switch looks up the destination MAC. Same host and port group → delivered in memory. Otherwise → out an uplink chosen by the teaming policy.
4. The physical switch receives an 802.1Q-tagged frame on a trunk port and forwards it.

## Deep Dive

### VLAN tagging modes

Most designs use **virtual switch tagging (VST)**: the port group has a VLAN ID, the virtual switch adds/removes the tag, and the physical switch port is a trunk. That is why "VM has no network" is often a missing VLAN on the physical trunk, not a vSphere problem.

### MTU

Overlay (NSX Geneve) and storage (vSAN, vMotion) traffic usually need a larger MTU (jumbo frames). The MTU must match end to end: VMkernel adapter, virtual switch, physical switch. Mismatches cause strange partial failures (small packets work, large do not). The Networking phase covers how to test this with `vmkping`.

### Where NSX fits

A VDS gives you VLAN-backed networks that still depend on the physical network for every new VLAN. **NSX** adds **overlay segments**: Layer 2 networks carried inside Geneve tunnels between hosts' tunnel endpoints, plus distributed routing and firewalling in the ESX kernel. New networks become software objects that need no physical switch change. This is the network half of the SDDC idea.

### Virtual hardware choices for a new VM

| Device | Recommended default | Why |
|---|---|---|
| Disk controller | PVSCSI or NVMe | Lower CPU per I/O than emulated controllers |
| NIC | vmxnet3 | Paravirtual, best performance |
| Disk format | Thin (labs), per policy (vSAN) | Saves space |
| Hardware version | The newest your oldest host supports | Version 22 for ESX 9.0 only clusters |

## Configuration

In the Host Client on a fresh host:

| Task | Path |
|---|---|
| Create a VMFS datastore | Storage → Datastores → New datastore |
| Upload an ISO | Storage → Datastore browser → Upload |
| See port groups | Networking → Port groups |
| See VMkernel adapters | Networking → VMkernel NICs |
| See physical NICs | Networking → Physical NICs |
| Add a VLAN port group | Networking → Port groups → Add port group (VLAN ID, vSwitch) |

## CLI / API

```shell
# Datastores mounted on this host, with type, size and free space
esxcli storage filesystem list

# Physical NICs (uplinks): driver, link state, speed, MTU
esxcli network nic list

# VMkernel adapters and their IPv4 addresses
esxcli network ip interface ipv4 get

# Standard switches and port groups
esxcli network vswitch standard list
esxcli network vswitch standard portgroup list
```

## Failure Scenarios

| Failure | Symptom | Typical cause |
|---|---|---|
| Datastore full | VMs pause/stun, snapshots fail, VMs won't power on | Thin disks grew, snapshots left behind, `.vswp` needs space |
| Path/LUN lost | Datastore inaccessible, VMs hang on I/O | SAN zoning, cable, array issue |
| Uplink down | Traffic fails over to other uplink; if none, VMs lose network | Cable, switch port, driver |
| VLAN missing on trunk | VMs on that port group cannot reach gateway | Physical switch configuration |
| MTU mismatch | Small pings work, large transfers/vMotion/vSAN fail | Jumbo frames not set end-to-end |

## Troubleshooting

Walk the chain, inside to outside:

1. **Guest**: IP/gateway correct? VMware Tools (vmxnet3 driver) installed?
2. **vNIC**: connected? On the right port group?
3. **Port group**: correct VLAN ID?
4. **Virtual switch**: which uplinks are active? (`esxcli network nic list`)
5. **Physical switch**: VLAN allowed on the trunk? MTU?

For storage: datastore free space and accessibility (`esxcli storage filesystem list`), then paths and the array.

## Real-World Scenario

After moving a VM to a new port group "App-VLAN30", it cannot reach its gateway, while VMs on VLAN 20 are fine. The port group has VLAN ID 30; both uplinks are up. The physical switch trunk allows VLANs 10 and 20 only. Adding VLAN 30 to the trunk fixes it. Lesson: a port group VLAN ID is only half the configuration.

## Lab

In the ESX lab you create a VMFS datastore, upload an ISO and connect a VM to the "VM Network" port group, then verify with the commands above.

::lab[lab-esx-host-first-vm]

## Exam Focus

:::exam
- Datastore types: VMFS (block), NFS (file), vSAN (local disks pooled); vVols deprecated in 9.0.
- Thin vs thick lazy-zeroed vs thick eager-zeroed.
- vmnic = physical uplink; vmk = host IP interface; port group = VLAN/policy for VMs or vmks.
- vSS is per host; VDS is configured in vCenter and used by VCF.
:::

## Common Exam Traps

:::trap
- Confusing **vmk** (VMkernel adapter) with **vmnic** (physical NIC).
- Assuming a VLAN ID on the port group is enough without the physical trunk.
- Thinking thin provisioning reserves space. It does not; the datastore can run out.
- Choosing vVols for a new VCF 9 design. It is deprecated.
:::

## Knowledge Check

::quiz

## Summary

- Storage chain: virtual controller/disk → .vmdk → datastore (VMFS/NFS/vSAN) → physical storage.
- Network chain: vNIC → port group → virtual switch → uplink (vmnic) → physical switch.
- VMkernel adapters carry the host's own management, vMotion and vSAN traffic.
- VCF uses vSAN and VDS by default and adds NSX overlay networking.

## Next Topic

[Clusters, HA and DRS](lesson:clusters-ha-drs-intro): how several hosts become one resilient pool.
