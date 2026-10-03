---
id: cpu-memory-virtualization
title: CPU and Memory Virtualization
phase: p01-virtualization
module: m01-virt-basics
version: general
minutes: 30
difficulty: foundation
summary: How ESX schedules vCPUs onto physical cores, why overcommitment works and when it hurts, how guest memory maps to host memory, the four reclamation techniques, and the shares/reservations/limits controls.
topics: [cpu-memory-virt, drs]
objectives: ["2.2"]
keyTerms: [vcpu, cpu-overcommitment, balloon-driver, vmware-tools, resource-pool, vmkernel, vmotion]
labs: [lab-esx-host-first-vm]
incidents: []
components: [esx-host]
related: [hypervisors-and-esx, clusters-ha-drs-intro, drs-resource-management]
sources:
  - title: "vSphere 9.0 – CPU Virtualization Basics"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/cpu-virtualization-basics.html
  - title: "vSphere 9.0 – Memory Virtualization Basics"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/memory-virtualization-basics.html
  - title: "vSphere 9.0 – Administering Memory Resources"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/administering-memory-resources.html
  - title: "vSphere 9.0 – Memory Tiering over NVMe"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/memory-tiering-over-nvme.html
  - title: "vSphere 9.0 – Configuring Resource Allocation Settings"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/configuring-resource-allocation-settings.html
  - title: "ESXCLI 9.0.0 Reference – esxcli hardware"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_hardware.html
---

## Why This Matters

Most "the VM is slow" tickets are really CPU or memory contention questions. VCF management domains are packed with large appliances (vCenter, NSX Managers, VCF Operations), so knowing how ESX shares CPU and RAM tells you why sizing matters, why reservations exist, and why your nested lab feels slow when you over-allocate. Resource controls (shares, reservations, limits) also appear in exam scenarios about DRS and resource pools.

## Learning Objectives

- Explain how ESX runs guest code on the physical CPU and how [[vcpu]]s are scheduled.
- Explain CPU and memory [[cpu-overcommitment]] and how contention shows up.
- Describe the memory mapping layers and the four reclamation techniques, including the [[balloon-driver]].
- Use shares, reservations and limits correctly.
- Identify the VCF 9 Memory Tiering feature and its limits.

## Concept

### CPU

ESX does **not emulate** a CPU. Guest instructions run **directly on the physical processor** whenever possible; the VMkernel steps in only when needed. With **hardware-assisted virtualization** (Intel VT-x, AMD-V), the CPU has a special *guest mode* so even privileged guest code runs natively until it exits to the hypervisor.

A **vCPU** is a schedulable entity. The VMkernel CPU scheduler time-slices vCPUs onto **logical CPUs** (cores, or hyper-threads if hyper-threading is on). By default every vCPU receives **equal shares**.

### Memory

There are three layers of addresses:

1. **Guest virtual memory** – what applications see, managed by the guest OS.
2. **Guest physical memory** – what the guest OS thinks is RAM.
3. **Machine (host physical) memory** – real RAM in the host.

ESX maps guest physical to machine memory. With hardware-assisted MMU (Intel EPT, AMD RVI), the CPU walks both page-table layers in hardware; ESX backs guest memory with **2 MB large pages** by default to reduce TLB-miss cost.

Each VM consumes its active memory **plus overhead memory** (frame buffer and virtualization data structures).

## Architecture

::diagram[d01-cpu-memory-scheduling]

The official vSphere figure shows the mapping between guest virtual, guest physical and machine memory:

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vsphere/vsphere/9-0/_jcr_content/assetversioncopies/eddce705-fe72-4c1c-9242-67911545edad.original.svg" caption="ESX Memory Mapping" source="https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/memory-virtualization-basics.html"}

## Components

### Resource allocation controls

| Control | Meaning | CPU unit | Memory unit | Used when |
|---|---|---|---|---|
| **Shares** | Relative priority under contention | Shares (Low/Normal/High/Custom) | Shares | Only when resources are contended |
| **Reservation** | Guaranteed minimum | MHz | MB | Always; VM cannot power on if the reservation cannot be met |
| **Limit** | Hard maximum | MHz | MB | Always, even if the host is idle |

Memory reservation also changes the **swap file**: the `.vswp` file size is *configured memory minus reservation*. A full reservation means no swap file space is needed.

### Memory reclamation techniques (cheapest first)

| Technique | How it works | Requirement / note |
|---|---|---|
| **Transparent page sharing (TPS)** | Identical pages stored once | Inter-VM sharing is **disabled by default** for security; sharing is restricted to within a VM |
| **Ballooning** | The balloon driver (vmmemctl) inside the guest allocates memory, letting the guest choose its least valuable pages to give back | Needs **VMware Tools** |
| **Memory compression** | Pages are compressed and kept in a cache in RAM | **Enabled by default** |
| **Host swapping** | ESX swaps VM pages to the VM's `.vswp` file without guest involvement | Last resort, large performance impact; can use host swap cache on SSD |

## How It Works

What happens on a host under growing memory pressure:

1. VMs use memory; ESX maps guest pages to machine pages on demand.
2. Free host memory drops. ESX starts **ballooning** in VMs with VMware Tools; guests page out their own least valuable pages.
3. Pressure continues. ESX **compresses** pages instead of swapping them.
4. Still not enough. ESX **swaps** VM pages to `.vswp` files. Guest performance falls sharply.
5. Throughout, **shares** decide which VMs lose memory first; **reservations** are never reclaimed; **limits** cap a VM even when memory is free.

CPU contention flow:

1. More vCPUs are runnable than there are logical CPUs.
2. Some vCPUs must wait; this waiting time is **CPU ready**.
3. The scheduler uses shares (and reservations/limits) to decide who runs next.
4. Very wide VMs (many vCPUs) wait longer because they need more logical CPUs at once, which is why right-sizing matters.

## Deep Dive

### Right-sizing vCPUs

The vSphere documentation recommends deploying **single-threaded applications on uniprocessor VMs** rather than multi-vCPU VMs. Extra vCPUs that the application cannot use add scheduling overhead. Size VMs for what they actually use and add vCPUs when monitoring shows sustained high usage.

### CPU features and vMotion

A VM detects the specific processor model it runs on, so applications may use processor-specific features. That can block [[vmotion]] between hosts with different CPU generations. **EVC (Enhanced vMotion Compatibility)** masks newer features at the cluster level so VMs can move between generations. Details in Phase 2.

### Hyper-threading and NUMA (one paragraph each)

Hyper-threading gives each core two logical CPUs; it adds throughput but two threads share one core's execution resources, so a logical CPU is not a full core. NUMA (non-uniform memory access) means each CPU socket has local memory; ESX tries to keep a VM's vCPUs and memory on the same NUMA node. Very large VMs that span nodes pay a latency cost. Your lab server has two sockets, so it has at least two NUMA nodes.

:::vcf9 Changed in VCF 9
**Memory Tiering over NVMe** (vCenter and ESX 9.0 or later) lets a host use local NVMe devices as a second, slower memory tier: DRAM is tier 0, NVMe is tier 1, and ESX moves VM memory between them. It is **deactivated by default**, requires the host in maintenance mode to configure, local (not fabric) NVMe, partitions up to 4 TB, and cannot use vSAN disks. It is **not interoperable with nested ESX**, so you cannot use it in your Proxmox lab.
:::

## Configuration

Where to set these controls:

| What | vSphere Client / Host Client path |
|---|---|
| vCPU count, cores per socket | VM → Edit Settings → CPU |
| CPU reservation / limit / shares | VM → Edit Settings → CPU (expand) |
| Memory size, reservation, limit, shares | VM → Edit Settings → Memory (expand) |
| Reserve all guest memory | VM → Edit Settings → Memory → "Reserve all guest memory (All locked)" |
| Resource pool settings | Cluster (DRS on) → New Resource Pool |

:::tip
Some VCF and NSX appliances ship with reservations by design. Do not remove reservations from management appliances to "save memory" in a lab; it can destabilize them. Size the lab instead.
:::

## CLI / API

```shell
# Logical CPUs the VMkernel sees (one entry per logical CPU)
esxcli hardware cpu list

# Package / core / thread totals and hyper-threading state
esxcli hardware cpu global get

# Physical memory (reported in bytes) and NUMA node count
esxcli hardware memory get
```

For live contention, `esxtop` (interactive) on the host shows CPU ready (%RDY) and memory ballooning/swapping counters; performance charts in vCenter and VCF Operations show the same metrics over time. These are covered in the Operations and Troubleshooting phases.

## Failure Scenarios

| Situation | Symptom | Cause |
|---|---|---|
| Heavy CPU overcommit with wide VMs | High CPU ready, sluggish VMs, host CPU not at 100% | vCPUs waiting for enough free logical CPUs |
| Memory overcommit beyond reclaimable | Host swapping, very slow VMs | Active memory demand exceeds RAM |
| Limit set below configured memory | VM swaps even though host has free RAM | Limit is enforced regardless of free memory |
| Reservation cannot be met | VM fails to power on (insufficient resources) | Unreserved capacity too small |
| VMware Tools missing | No ballooning; host goes straight to compression/swapping | Balloon driver absent |

## Troubleshooting

1. **Is the problem contention or the guest?** Compare guest-reported CPU with host-reported CPU ready and memory ballooned/swapped.
2. **CPU ready high?** Reduce vCPU count on oversized VMs, spread VMs (DRS), or add hosts.
3. **Ballooning/swapping?** Check total configured vs physical RAM, look for unexpected memory **limits**, ensure VMware Tools is running.
4. **VM will not power on with "insufficient resources"?** Check reservations on the VM and its resource pool.

## Real-World Scenario

In a nested lab, a learner gives each of four nested ESX VMs 64 GB RAM on a 256 GB Proxmox server, then deploys appliances inside them. Proxmox itself overcommits, the nested hosts start swapping, and the vCenter appliance becomes unresponsive. Two layers of overcommitment multiply the effect. The fix: total the RAM of all nested hosts, keep it under physical RAM minus Proxmox overhead, and plan appliance sizes before deploying.

## Lab

Use your nested ESX host to observe CPU and memory settings:

::lab[lab-esx-host-first-vm]

In the lab, run `esxcli hardware cpu global get` and `esxcli hardware memory get` and compare them with what you configured for the nested ESX VM in Proxmox.

## Exam Focus

:::exam
- Reclamation order and requirements: TPS (intra-VM by default) → ballooning (needs VMware Tools) → compression (on by default) → swapping.
- Shares matter only under contention; reservations guarantee; limits cap always.
- `.vswp` size = configured memory − reservation.
- CPU virtualization runs guest code directly on the CPU; it is not emulation.
:::

## Common Exam Traps

:::trap
- "Setting a limit improves performance." A limit only restricts; it can cause swapping on an idle host.
- "Shares guarantee resources." They only set priority under contention; reservations guarantee.
- "Inter-VM TPS is on by default." It is disabled by default.
- "More vCPUs is always faster." Oversized VMs increase scheduling wait.
:::

## Knowledge Check

::quiz

## Summary

- Guest code runs natively on the CPU with hardware assistance; vCPUs are time-sliced onto logical CPUs.
- Guest memory is mapped to machine memory; ESX reclaims memory via sharing, ballooning, compression, swapping.
- Shares = priority, reservation = guarantee, limit = cap.
- VCF 9 adds NVMe Memory Tiering (off by default, not for nested labs).

## Next Topic

[Storage and Network Virtualization Basics](lesson:storage-network-virtualization-basics): where VM disks live and how VM traffic leaves the host.
