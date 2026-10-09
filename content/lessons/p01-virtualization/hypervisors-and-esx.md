---
id: hypervisors-and-esx
title: Hypervisors and ESX
phase: p01-virtualization
module: m01-virt-basics
version: vcf9
minutes: 30
difficulty: foundation
summary: What a hypervisor does, type 1 vs type 2, how ESX is built (VMkernel, Virtual Machine Monitor (VMM), management agents), what a VM really is (files plus virtual hardware), ESX 9 hardware requirements, and how you manage a single host.
topics: [hypervisors, esx-host, virtual-hardware]
objectives: ["2.2"]
keyTerms: [hypervisor, esx, vmkernel, vm, vmware-tools, host-client, vm-hardware-version]
labs: [lab-esx-host-first-vm, lab-homelab-proxmox-prep]
incidents: []
components: [esx-host]
related: [cpu-memory-virtualization, storage-network-virtualization-basics, esx-architecture-host-management, vcf9-terminology]
sources:
  - title: "vSphere 9.0 – ESX Hardware Requirements"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/esx-installation-and-setup/installing-and-setting-up-esxi/esxi-requirements/esxi-hardware-requirements.html
  - title: "vSphere 9.0 – CPU Virtualization Basics"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/cpu-virtualization-basics.html
  - title: "vSphere 9.0 – Single Host Management (VMware Host Client)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-single-host-management-vmware-host-client.html
  - title: "Broadcom KB 312100 – ESX hosts and compatible virtual machine hardware versions"
    url: https://knowledge.broadcom.com/external/article/312100/esxiesx-hosts-and-compatible-virtual-mac.html
  - title: "Broadcom KB 308360 – Common VM tasks with command-line utilities (vim-cmd)"
    url: https://knowledge.broadcom.com/external/article/308360/performing-common-virtual-machinerelated.html
  - title: "ESXCLI 9.0.0 Reference – esxcli system"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_system.html
  - title: "William Lam – Ultimate lab resource for VCF 9.0 (nested ESX notes)"
    url: https://williamlam.com/2025/06/ultimate-lab-resource-for-vcf-9-0.html
---

## Why This Matters

Every VMware Cloud Foundation (VCF) component either *is* an ESX host or *runs on* ESX hosts: vCenter, NSX Managers, Software-Defined Data Center (SDDC) Manager and VCF Operations are all virtual machines (VMs); vSAN and the NSX data plane run inside the ESX kernel. If you understand what the hypervisor does, later topics (High Availability (HA), vSAN, NSX transport nodes, host commissioning) stop being magic. Objective 2.2 also expects you to *deploy and configure ESX*.

## Learning Objectives

- Explain what a [[hypervisor]] does and compare type 1 and type 2.
- Describe the main layers of [[esx]]: [[vmkernel]], Virtual Machine Monitor (VMM), and management agents.
- Describe what a [[vm]] consists of (virtual hardware and files) and why [[vmware-tools]] matters.
- State the ESX 9.0 minimum hardware requirements.
- Manage a single host with the [[host-client]], Direct Console User Interface (DCUI) and shell.

## Concept

A **hypervisor** lets one physical computer run many isolated **virtual machines**. Each VM believes it owns a full computer (Central Processing Unit (CPU), memory, disk, Network Interface Controller (NIC)), while the hypervisor shares the real hardware among them and keeps them apart.

| | Type 1 (bare-metal) | Type 2 (hosted) |
|---|---|---|
| Runs on | Directly on hardware | On top of Windows, Linux or macOS |
| Examples | ESX, Proxmox Virtual Environment (VE), based on Kernel-based Virtual Machine (KVM), Hyper-V | VMware Workstation/Fusion, VirtualBox |
| Overhead / isolation | Low overhead, strong isolation | Host Operating System (OS) overhead; host OS crash stops VMs |
| Use | Data centers, VCF | Desktops, labs, demos |

**ESX** is VMware's type 1 hypervisor. In VCF 9 it is called ESX (ESXi in versions 5.0–8.x; see [VCF 9 Terminology](lesson:vcf9-terminology)).

Four properties make VMs useful: **partitioning** (many VMs per server), **isolation** (a crash in one VM does not affect others), **encapsulation** (a VM is a set of files you can copy or move), and **hardware independence** (a VM sees standard virtual hardware, so it can move between different servers).

### Core terms and operational boundaries

**Hypervisor.** A hypervisor schedules physical processor time and memory, presents virtual devices and isolates
workloads. A type 1 hypervisor runs directly on server hardware; a type 2 hypervisor depends on a host operating
system. The hypervisor can partition and protect local resources, but it does not by itself provide cluster restart,
central inventory or VCF lifecycle. For ESX, administrators use the Host Client for isolated-host work and vCenter
or VCF workflows once the host belongs to managed infrastructure.

**ESX and VMkernel.** ESX is the product; VMkernel is its kernel and data plane. VMkernel schedules worlds, owns
drivers and implements storage and networking stacks. It depends on compatible processors, firmware, adapters and
drivers. It can continue running VMs when a management agent fails, which is why an unreachable Host Client does
not prove that workloads stopped. The exam commonly tests this management-plane versus data-plane distinction.

**Virtual Machine Monitor (VMM).** A VMM executes each running VM's virtual processors with hardware-assisted
virtualization and mediates privileged operations. It cannot grant a VM more physical capacity than the scheduler
can supply, and it does not manage cluster placement. Its evidence appears in the VM's runtime state and
`vmware.log`; ordinary administration happens through the Host Client or vCenter rather than by manipulating a VMM.

**VMware Tools.** VMware Tools supplies optimized guest drivers, heartbeat, shutdown and guest coordination. It
depends on a supported guest operating system and must be installed and maintained inside the guest. It improves
integration but does not replace guest patching, application monitoring or hypervisor availability. Missing Tools
can explain absent heartbeat and graceful-shutdown behavior even while the VM itself continues to run.

## Architecture

::diagram[d01-type1-vs-type2]

## Components

| Layer / component | What it does | Where you see it |
|---|---|---|
| **VMkernel** | The ESX kernel: CPU scheduler, memory manager, storage and network stacks, drivers | Not directly; through ESX Command-Line Interface (ESXCLI) and performance charts |
| **VMM** (virtual machine monitor) | One per running VM; executes virtual Central Processing Units (vCPUs) using hardware virtualization | The VM's `vmware.log` |
| **hostd** | Host agent: serves the Host Client and host Application Programming Interface (API) | Host Client at `https://<host>/ui` |
| **vpxa** | vCenter agent, installed when the host joins vCenter | Host "connected" state in vCenter |
| **DCUI** | Direct Console UI on the server console | Initial IP/DNS setup, restart management agents |
| **ESX Shell / Secure Shell (SSH)** | Command line (esxcli, vim-cmd) | Disabled by default; enable only when needed |
| **VMkernel adapters** (vmk0…) | Host's own IP interfaces (management, vMotion, vSAN) | Networking settings |

### What a VM is made of

| File | Purpose |
|---|---|
| `.vmx` | Configuration: virtual hardware, settings |
| `.vmdk` + `-flat.vmdk` | Virtual disk descriptor and data |
| `.nvram` | VM firmware (Basic Input/Output System (BIOS) or Unified Extensible Firmware Interface (UEFI)) settings |
| `.vswp` | Swap file created at power-on (size = configured memory − reservation) |
| `vmware.log` | VM log, first place to look for VM start/stop problems |
| `.vmsd` / `-delta.vmdk` / `-sesparse.vmdk` | Snapshot metadata and delta disks |

The [[vm-hardware-version]] (VM compatibility) decides which virtual hardware features a VM can use: **ESX 9.0 supports up to version 22**, ESXi 8.0 Update 2/Update 3 (U2/U3) up to version 21. A VM at version 22 cannot run on an 8.x host.

**VMware Tools** (or `open-vm-tools` on Linux) installs optimised drivers (vmxnet3 and Paravirtual Small Computer System Interface (PVSCSI)), the balloon driver, time sync, graceful shutdown and the heartbeat used by vSphere HA VM Monitoring.

## How It Works

An ESX host moves through four conceptual states. The separate practical guide contains the exact screens, fields,
checks and rollback steps.

1. **Hardware and firmware become an execution platform.** The installer verifies supported devices and processor
   features such as Intel Virtualization Technology (VT-x), AMD Virtualization (AMD-V) and
   No-Execute/Execute Disable (NX/XD).
2. **VMkernel boots and claims the hardware.** It loads drivers, creates system storage and starts management agents.
   A failure here is a host boot or compatibility problem, before any VM can run.
3. **Management identity and services become reachable.** The host receives its management Internet Protocol (IP)
   configuration, Fully Qualified Domain Name (FQDN), Domain Name System (DNS) resolution and Network Time Protocol
   (NTP) synchronization. These are prerequisites for certificates, vCenter registration and VCF commissioning.
4. **The host joins an operating model.** It can remain standalone and use the Host Client, join vCenter as part of
   a vSphere cluster, or be commissioned through VCF before a VCF workflow allocates it to a domain or cluster.

The distinction matters: installing ESX creates a functioning hypervisor, adding it directly to vCenter creates a
vSphere-managed host, and commissioning it creates a host known to VCF inventory. Those states are not interchangeable.

## Deep Dive

### ESX 9.0 hardware requirements

| Item | Requirement (vSphere 9.0 docs) |
|---|---|
| CPU | At least 2 CPU cores; NX/XD bit enabled; hardware virtualization (Intel VT-x or AMD Rapid Virtualization Indexing (RVI)) enabled to run 64-bit VMs |
| Memory | Minimum 8 gigabytes (GB); at least 12 GB to run VMs in typical production |
| Network | One or more Gigabit or faster Ethernet controllers |
| Boot disk | At least 32 GB persistent storage (Hard Disk Drive (HDD), Solid-State Drive (SSD) or Non-Volatile Memory Express (NVMe)); **128 GB recommended** for new servers |
| OSDATA | ESX-OSData is a unified partition; scratch and VMware Tools content are consolidated into it |

VCF management domain hosts need far more than these minimums because they run the management appliances.

### Nested ESX (your home lab)

In your lab, ESX runs as a **VM on Proxmox VE** (KVM). This works because modern CPUs support nested virtualization: Proxmox must have nesting enabled and the ESX VM's CPU type set to **host** so ESX sees VT-x/AMD-V. Points to know:

- Nested ESX is fine for learning and is widely used for VCF labs, but it is **not supported for production**.
- Use a NIC model ESX has drivers for: **vmxnet3** is the usual choice on Proxmox. Use Serial ATA (SATA) for disks (nested ESX 9 no longer supports an Integrated Drive Electronics (IDE) controller).
- Some ESX 9 features do not work nested, for example **NVMe Memory Tiering**.
- Older processor generations may be flagged as unsupported by ESX 9; William Lam documents the `allowLegacyCPU=true` boot option for labs (CPUs without XSAVE cannot be forced).

Proxmox preparation is covered in the Home Lab section and its lab.

## Configuration

Key first-boot settings and where to make them:

| Setting | DCUI | Host Client |
|---|---|---|
| Management IP / gateway / Virtual Local Area Network (VLAN) | Configure Management Network | Networking → VMkernel NICs → vmk0 |
| DNS servers / hostname | Configure Management Network → DNS | Networking → Transmission Control Protocol/Internet Protocol (TCP/IP) stacks |
| NTP | – | Manage → System → Time & date |
| SSH / ESX Shell | Troubleshooting Options | Manage → Services |
| Datastore | – | Storage → New datastore |

:::warning
Set the hostname as a Fully Qualified Domain Name (FQDN) that resolves forward and reverse **before** you add the host to vCenter or VCF. Changing names and certificates later is painful.
:::

## CLI / API

The two Command-Line Interfaces (CLIs) on an ESX host are `esxcli` (configuration and status, organised by namespaces) and `vim-cmd` (host agent operations, mostly VMs).

```shell
# What exactly is this host running?
esxcli system version get

# Which VMs are registered here, and their Vmid
vim-cmd vmsvc/getallvms

# Power state of VM with Vmid 1
vim-cmd vmsvc/power.getstate 1

# Running VMs and their World IDs
esxcli vm process list
```

## Failure Scenarios

| Failure | Effect on VMs | Recovery |
|---|---|---|
| Host hardware failure | All VMs on the host stop | Standalone: fix and restart. In a cluster: vSphere HA restarts them elsewhere |
| hostd stopped/hung | VMs keep running; Host Client/vCenter cannot manage the host | Restart management agents from the DCUI |
| Boot device failure | Host may keep running from memory, but cannot reboot cleanly | Replace device, reinstall/restore configuration |
| VM guest OS crash | Only that VM is affected (isolation) | Reset VM; read `vmware.log` and guest logs |
| VT-x/AMD-V disabled (or not exposed in nested lab) | 64-bit VMs cannot power on | Enable in BIOS / set Proxmox CPU type to host |

## Troubleshooting

1. **Cannot reach the Host Client**: check vmk0 IP in the DCUI, VLAN tag, gateway; ping from your workstation; check DNS resolves the FQDN.
2. **Host Client reachable but slow/errors**: restart management agents from the DCUI (Troubleshooting Options).
3. **VM will not power on**: read the task error, then the VM's `vmware.log`; check datastore free space (the `.vswp` file needs room) and CPU virtualization support.
4. **No network in the guest**: is VMware Tools/open-vm-tools installed (vmxnet3 driver)? Is the VM's NIC connected to the right port group?

## Real-World Scenario

A team builds a four-host management domain and the VCF Installer validation fails for one host. `esxcli system version get` shows that host on a different build from the other three because it was installed from an older International Organization for Standardization (ISO) image. The fix is to install the same ESX build on all hosts before deployment. The habit to learn: **check versions and DNS on every host before VCF ever sees it**.

## Exam Focus

:::exam
- ESX is a **type 1** hypervisor; the VMkernel owns the hardware.
- Know what hostd, vpxa and the DCUI are for at a high level.
- ESX 9.0 minimums: 2 cores, 8 GB of Random Access Memory (RAM) (12 GB for typical production VMs), 32 GB boot device (128 GB recommended), NX/XD and VT-x/AMD-V enabled.
- VM files: .vmx (config), .vmdk (disk), .vswp (swap), vmware.log (log).
- Hardware version 22 = ESX 9.0.
:::

## Common Exam Traps

:::trap
- Calling ESX a type 2 hypervisor because "it has a shell". It runs directly on hardware.
- Thinking a hostd failure stops VMs. VMs keep running; only management is affected.
- Assuming VMware Tools is optional for HA VM Monitoring and graceful shutdown. Both need it.
- Expecting a hardware version 22 VM to run on an ESXi 8.x host.
:::

## Knowledge Check

::quiz

## Summary

- A hypervisor partitions, isolates and encapsulates; ESX is a type 1 hypervisor built on the VMkernel.
- hostd serves the Host Client; vpxa connects the host to vCenter; the DCUI is the console UI.
- A VM is files (.vmx, .vmdk, .nvram, .vswp, logs) plus virtual hardware at a given hardware version.
- ESX 9.0 needs at least 2 cores, 8 GB of Random Access Memory (RAM) and a 32 GB boot device; nested ESX works for labs but not production.

## Next Topic

[CPU and Memory Virtualization](lesson:cpu-memory-virtualization): how ESX shares processors and RAM between VMs.
