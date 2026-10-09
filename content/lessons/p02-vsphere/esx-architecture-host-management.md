---
id: esx-architecture-host-management
title: ESX Host Architecture and Host Management
phase: p02-vsphere
module: m02-hosts-vcenter
version: vcf9
minutes: 40
difficulty: foundation
summary: What runs inside an ESX 9 host (VMkernel, host agent, vCenter agent, High Availability (HA) agent), how you reach and secure it (Host Client, Direct Console User Interface (DCUI), ESX Shell, Secure Shell (SSH), lockdown mode, firewall), and how VMware Cloud Foundation (VCF) takes over host management through commissioning and cluster workflows.
topics: [esx-host, hypervisors, vsphere-cluster]
objectives: ["2.2"]
keyTerms: [dcui, lockdown-mode, hostd, vpxa, fdm, maintenance-mode, vmkernel-adapter, vsphere-client]
labs: [lab-esx-host-first-vm, lab-vcenter-cluster-ha-drs]
incidents: [inc-esx-host-disconnected]
components: [esx-host, vcenter, sddc-manager]
related: [vcenter-architecture-inventory, vsphere-ha-deep-dive, hypervisors-and-esx, host-commissioning-wld-creation]
sources:
  - title: "vSphere 9.0 – Software Components of vSphere"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-and-host-management/vsphere-concepts-and-features/vsphere-software-components.html
  - title: "vSphere 9.0 Security – Securing ESX Hosts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/securing-esxi-hosts.html
  - title: "vSphere 9.0 Security – Lockdown Mode Behavior"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/securing-esxi-hosts/customizing-hosts-with-the-security-profile/lockdown-mode/lockdown-mode-behavior.html
  - title: "vSphere 9.0 Security – Customizing ESX Host Security (firewall, services, lockdown)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/securing-esxi-hosts/customizing-hosts-with-the-security-profile.html
  - title: "vSphere 9.0 – vCenter Components and Services (VMCA provisions ESX certificates)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup/vcenter-server-components-and-support-tools.html
  - title: "VCF 9.0 Design – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
  - title: "Broadcom KB 442933 – Steps for adding new host to Workload Domain Cluster in VCF 9.x"
    url: https://knowledge.broadcom.com/external/article/442933/steps-for-adding-new-host-to-workload-do.html
  - title: "William Lam – Host lifecycle operations after importing vCenter into a VCF 9.x fleet"
    url: https://williamlam.com/2026/06/what-host-lifecycle-operations-are-available-after-importing-vcenter-into-vcf-9-x-fleet.html
---

## Why This Matters

Every VMware Cloud Foundation (VCF) domain — management or workload — is, at the bottom, a set of **ESX hosts**. vSAN runs in the ESX kernel, NSX installs its data plane into ESX, and vCenter manages ESX through an agent that lives on each host. When something breaks in VCF, the question "what is the host doing?" comes up constantly: is the host connected to vCenter, is the management agent alive, can it reach its storage, is it in maintenance mode, is lockdown blocking my Secure Shell (SSH) session?

Exam objective 2.2 asks you to *deploy and configure VCF compute components (vCenter and ESX)*. You will not install ESX by hand in a production VCF fleet very often (VCF expects hosts prepared to a spec and then *commissioned*), but you must know what is inside a host, how it is managed, and what VCF expects of it.

:::vcf9 Changed in VCF 9
VCF 9 uses the name **ESX** (no "i") for the hypervisor, matching the vSphere 9 documentation. Older material, Knowledge Base (KB) articles and Command-Line Interface (CLI) output still say ESXi — they mean the same product line.
:::

## Learning Objectives

- Describe the main software layers of an ESX host: VMkernel, host agent (hostd), vCenter agent (vpxa), and the vSphere High Availability (HA) agent, Fault Domain Manager (FDM).
- Choose the right access path to a host (vSphere Client via vCenter, Host Client, Direct Console User Interface (DCUI), ESX Shell, SSH) and explain how lockdown mode changes each of them.
- Configure host networking basics: VMkernel adapters and the services they carry.
- Use maintenance mode correctly, and explain why VCF expects host operations to go through its workflows.
- Verify host health from the Command-Line Interface (CLI) and identify the logs that matter first.

## Concept

ESX is a **type 1 (bare-metal) hypervisor**: it installs directly on the server and owns the hardware. Its core is the **VMkernel**, a purpose-built Operating System (OS) kernel that schedules Central Processing Unit (CPU) time, manages memory, drives storage and network devices, and runs one *Virtual Machine Monitor (VMM)* per running VM. Everything an administrator touches sits on top of the VMkernel as a user-world process.

Three management processes matter most:

| Process | Official name | What it does |
|---|---|---|
| `hostd` | Host agent | "Collects, communicates, and runs the actions received through the vSphere Client" — the Application Programming Interface (API) endpoint of the host itself. The Host Client and direct API calls talk to it. |
| `vpxa` | vCenter agent | Installed when the host is added to vCenter; it "collects, communicates, and runs the actions received from vCenter". vCenter talks to vpxa, which relays to hostd. |
| `fdm` | vSphere HA agent (Fault Domain Manager) | Pushed by vCenter when vSphere HA is enabled on the cluster; elects a primary, exchanges heartbeats and restarts VMs. Covered in [vSphere HA](lesson:vsphere-ha-deep-dive). |

A standalone host is managed through its own [[hostd]] using the **VMware Host Client** (a web User Interface (UI) served by the host). Once the host joins vCenter, you manage it through the [[vsphere-client]] connected to vCenter, and vCenter speaks to the host through [[vpxa]] using the `vpxuser` account it creates on the host.

### Core terms and operational boundaries

**VMkernel.** VMkernel owns scheduling, memory, drivers, storage and network data paths. It can keep VMs running
when host-management agents fail, but a kernel or hardware failure stops the host. It depends on supported firmware,
devices and drivers. Administrators observe it through performance data, VMkernel adapters, logs and ESXCLI rather
than treating it as a general-purpose operating system.

**hostd and vpxa.** `hostd` owns direct-host management; `vpxa` is the vCenter-side agent that relays operations to
the host. They can inventory and change host state but do not execute VM workloads. Their dependencies include
VMkernel, management networking, certificates, time and vCenter reachability. Restarting an unhealthy agent can
restore management without rebooting VMs; doing so does not repair an underlying storage or network data-plane fault.

**FDM.** Fault Domain Manager is the HA agent installed on clustered hosts. It exchanges heartbeats, participates in
primary election and coordinates restart protection. It depends on cluster HA configuration, management or supported
heartbeat networking, datastore evidence and spare capacity. It cannot provide zero-downtime recovery and does not
replace DRS placement or application-level resilience.

**Lockdown mode.** Lockdown restricts direct host administration so vCenter becomes the controlled access path.
Normal and strict modes differ in DCUI behavior and recovery options. Lockdown can reduce unmanaged changes but
cannot compensate for missing exception-user planning or unavailable vCenter. Administrators configure it in vCenter
and must understand exactly which emergency paths remain before enabling strict mode.

## Architecture

::diagram[d02-esx-architecture]

The diagram shows the layers from hardware to the management plane. Notice that VMs run on the VMkernel, not on hostd: if hostd or vpxa crash, **running VMs keep running** — you only lose the ability to manage them. That distinction drives most host troubleshooting.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/f7825f2b-46ba-401c-aeab-4351016078dd.original.png" caption="vSphere Cluster Models in a Single VCF Instance" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html"}

In VCF, ESX hosts never live alone: they are grouped into vSphere clusters inside a workload domain (single-rack, Open Systems Interconnection Layer 2 (L2) multi-rack, Layer 3 (L3) multi-rack or stretched cluster models, per the VCF 9 design guide), each domain managed by its own vCenter.

## Components

| Component | Where it runs | Managed by | Depends on | If it fails |
|---|---|---|---|---|
| VMkernel | ESX host | Host itself | Hardware, drivers | Host purple-screens or hangs; HA restarts its VMs elsewhere |
| hostd (host agent) | ESX user world | `/etc/init.d/hostd` | VMkernel | Host shows *Not responding* in vCenter; VMs keep running |
| vpxa (vCenter agent) | ESX user world | vCenter (installed on add) | hostd, network to vCenter | Host *Disconnected / Not responding*; VMs keep running |
| Fault Domain Manager (FDM), the HA agent | ESX user world | vCenter (HA enable) | Management (or vSAN) network, datastores | HA protection degraded on that host |
| DCUI | Host console | Host | Physical/remote console (Integrated Lights-Out (iLO), Integrated Dell Remote Access Controller (iDRAC)…) | Last-resort local access lost |
| VMkernel adapters (vmk0, vmk1…) | ESX networking stack | vCenter / VCF | Virtual switch, Virtual Local Area Networks (VLANs) | The service on that vmk (management, vMotion, vSAN…) breaks |
| Host firewall | VMkernel | vSphere Client / esxcli | Service rules | Blocks traffic for services not enabled |
| Host certificate | ESX | VMware Certificate Authority (VMCA) in vCenter by default | vCenter | Trust/connection errors |

:::note
Per vSphere 9.0 docs, **VMware Certificate Authority (VMCA)**, part of vCenter) "provisions each ESX host with a signed certificate that has VMCA as the root certificate authority, by default". Certificate replacement across VCF is covered in the security phase.
:::

## How It Works

Host management moves through a chain of trust and ownership:

1. **Direct-host state.** `hostd` exposes the host inventory and API over Hypertext Transfer Protocol Secure (HTTPS).
   The host has its own certificate, management identity and local emergency interfaces.
2. **vCenter registration.** vCenter validates identity and version, establishes its service account and deploys
   `vpxa`. Inventory and performance data become visible centrally.
3. **Cluster service membership.** When the host joins an HA cluster, vCenter deploys FDM and cluster agents begin
   heartbeating and protection-state exchange.
4. **Desired-state compliance.** The cluster image and VCF inventory determine whether the host is compatible and
   eligible for lifecycle and topology workflows.

Registration does not erase local management, and agent installation does not move the VM data plane into vCenter.
It establishes a controlled management relationship whose health can fail independently from running workloads.

### How VCF changes this

In a VCF domain you do **not** use plain *Add Host* on a VCF-provisioned cluster. The VCF workflow is:

1. Prepare the host to the spec (supported ESX build, Network Time Protocol (NTP), Domain Name System (DNS), management Internet Protocol (IP) address, matching Network Interface Controllers (NICs)).
2. **Commission** the host into the VCF inventory (Software-Defined Data Center (SDDC) Manager workflow), where it is validated and assigned to a network pool.
3. Use the VCF workflow to **create a cluster or expand a cluster** with commissioned (unassigned) hosts. VCF then configures the vSphere Distributed Switch (VDS), VMkernel adapters (vMotion, vSAN), NSX host preparation and the cluster image for you.

Per Broadcom KB 442933 and William Lam's VCF 9.x analysis, the one exception is a cluster that came in through a **vCenter import**: those clusters were not built by VCF, so their hosts are still added/removed directly in vCenter. Details: [Host commissioning](lesson:host-commissioning-wld-creation).

::figure{src="https://api-broadcomcms-software.wolkenservicedesk.com/es/attachments/get_attachment_content?uniqueFileId=2264506900271" caption="Official Broadcom example accompanying KB 442933: the VCF 9 host-addition workflow and its management-surface distinction" source="https://knowledge.broadcom.com/external/article/442933/steps-for-adding-new-host-to-workload-do.html"}

## Deep Dive

### Access paths and lockdown mode

| Path | What it is | Default |
|---|---|---|
| vSphere Client → vCenter | Normal day-to-day management | Always preferred |
| VMware Host Client (`https://<host>/ui`) | Web UI of hostd | Available unless lockdown restricts the API |
| [[dcui]] | Text console on the physical/remote console | Running |
| ESX Shell | Local shell on the console | **Deactivated by default** (vSphere 9.0 docs) |
| SSH | Remote shell | Deactivated by default; enable only for troubleshooting |

[[lockdown-mode]] forces management through vCenter. The vSphere 9.0 lockdown-mode table:

| Service | Normal mode | Normal lockdown | Strict lockdown |
|---|---|---|---|
| vSphere Web Services API | All users (by permission) | vpxuser (vCenter), exception users | vpxuser, exception users |
| Common Information Model (CIM) providers | Admin users | vpxuser, exception users | vpxuser, exception users |
| DCUI | Admins + users in `DCUI.Access` | Users in `DCUI.Access`; exception users with admin privileges | **DCUI service stopped** |
| ESX Shell / SSH (if enabled) | Admin users | `DCUI.Access` users; exception users with admin privileges | `DCUI.Access` users; exception users with admin privileges |

Two consequences you must remember:

- Normal lockdown can be turned on/off from the DCUI; **strict** lockdown can only be activated from the vSphere Client.
- In strict lockdown, if vCenter is lost and you have no exception user and no shell/SSH access, you have no way back into the host short of a reinstall. Plan exception users before enabling it.

### VMkernel adapters

A **VMkernel adapter** (vmk) is the host's own IP interface. Each one is tagged with the services it carries: Management, vMotion, vSAN, Provisioning, Fault Tolerance logging, vSphere Replication, Non-Volatile Memory Express (NVMe) over Transmission Control Protocol (TCP) or Remote Direct Memory Access (RDMA), and so on. `vmk0` is created at install time for management. In VCF, the VCF workflows create the vMotion and vSAN adapters from the network pool you defined, on the domain's VDS — you do not create them by hand.

### Host firewall and services

"The ESX firewall is configured to block incoming and outgoing traffic, except traffic for services that are enabled" in the host security profile (vSphere 9.0 docs). Turning on SSH also opens its firewall rule; turning it off closes it. Manage both from **Host → Configure → System → Services / Firewall** in the vSphere Client.

### Maintenance mode

[[maintenance-mode]] tells the cluster that the host is about to be worked on: no new VMs are placed on it, and with DRS in fully automated mode the running VMs are evacuated by vMotion. The host only *enters* maintenance mode when it runs no powered-on VMs. With vSAN, you also choose a data-migration option (ensure accessibility, full data migration, or no data migration) — covered in the vSAN phase. vSphere Lifecycle Manager uses maintenance mode automatically during remediation.

## Configuration

Configuration follows ownership and evidence rather than one checklist of clicks:

| Area | Owner / management surface | Evidence that matters |
|---|---|---|
| Time and name identity | Host settings before commissioning; VCF validates them | Active synchronization plus matching forward/reverse DNS |
| Services and firewall | vCenter host security profile or limited Host Client recovery | Required service running, matching firewall rules, unnecessary services stopped |
| Lockdown and exception access | vCenter security profile | Intended mode, tested exception users and documented recovery path |
| VMkernel adapters and VDS membership | VCF workflow for VCF-managed clusters | Correct service tags, VLAN, Maximum Transmission Unit (MTU), uplinks and end-to-end reachability |
| Host certificate | vCenter/VMCA and VCF certificate workflows | Trusted chain, correct identity and valid dates |
| Cluster image | VCF lifecycle or vSphere Lifecycle Manager | Host compliant with the desired image and supported bill of materials |

The separate ESX and vCenter practical guides provide exact UI sequences. Direct edits to VCF-owned networking,
NSX preparation or desired-state image can create drift even when the local screen reports success.

Changes that VCF owns (VDS membership, vmk for vSAN/vMotion, NSX host preparation, cluster image) should be made through VCF workflows; manual edits create **drift** that later breaks lifecycle prechecks.

## CLI / API

Run these in the ESX Shell or over SSH (enable SSH temporarily):

```shell
# Version and build of ESX
esxcli system version get

# VMkernel interfaces and their IPv4 settings
esxcli network ip interface list
esxcli network ip interface ipv4 get

# Is the host in maintenance mode? Enter it.
esxcli system maintenanceMode get
esxcli system maintenanceMode set --enable true

# List registered VMs as hostd sees them
vim-cmd vmsvc/getallvms

# Restart management agents (running VMs are not affected)
/etc/init.d/hostd restart
/etc/init.d/vpxa restart
```

Logs to check first (under `/var/log/`): `hostd.log` (host agent), `vpxa.log` (vCenter agent), `vmkernel.log` (storage/network/driver events), `fdm.log` (HA agent).

:::tip
Prefer entering maintenance mode from vCenter: the vSphere Client can evacuate VMs via DRS. `esxcli system maintenanceMode set --enable true` waits for the host to have no running VMs — it does not vMotion them for you.
:::

## Failure Scenarios

| Failure | What you see | Impact | Who reacts |
|---|---|---|---|
| hostd hung | Host *Not responding*; Host Client unavailable | VMs keep running; no management | Admin restarts hostd |
| vpxa stopped or vCenter cannot reach host | Host *Disconnected/Not responding* | VMs keep running; HA keeps protecting if FDM is healthy | Admin |
| Host hardware failure / Purple Screen of Diagnostics (PSOD) | Host down, VMs down | HA restarts VMs on surviving hosts | vSphere HA |
| Management network loss on one host | HA may declare isolation | Isolation response (if configured) | vSphere HA |
| Wrong NTP/DNS on a host | Commissioning or validation fails in VCF | Host cannot join a domain | Admin before commissioning |
| Strict lockdown + vCenter lost + no exception user | No access path to host | Host unmanageable until vCenter returns | Avoid by design |

## Troubleshooting

1. **Scope it:** one host or all hosts? All hosts disconnected points at vCenter or the management network; one host points at that host.
2. **Ping and resolve:** from vCenter, resolve the host FQDN forward and reverse and ping it. DNS errors are the #1 cause of add/commission failures in VCF.
3. **Console:** open the DCUI via the server's remote console. Check the management IP, VLAN and *Test Management Network*.
4. **Agents:** if the host answers ping but is *Not responding*, check `hostd.log` and `vpxa.log`; restart the management agents.
5. **Certificates and time:** a host with time skew can fail Transport Layer Security (TLS) handshakes with vCenter. Check NTP.
6. **Reconnect:** in vCenter, *Connect* the host again; if the `vpxuser` password got out of sync, reconnecting with root credentials repairs it.

::incident[inc-esx-host-disconnected]

## Real-World Scenario

A VCF workload domain shows host `esx-wld01-03` as *Not responding*. VMs on it are still serving users. The on-call engineer opens the iDRAC console: the DCUI responds and the management network test passes. Over SSH (the host is in normal lockdown, and the engineer's account is in the exception list), `vpxa.log` shows repeated failures to reach vCenter after a firewall change on the management VLAN. The firewall team restores the rule, vCenter reconnects the host, and no VM was ever down — because the VMkernel, not the agents, runs the VMs. The engineer then turns SSH back off.

## Exam Focus

:::exam
- Know the roles of **hostd**, **vpxa** and **FDM**, and that VMs keep running when agents fail.
- Know the **lockdown mode** table: strict stops the DCUI; exception users keep access; normal lockdown can be toggled from the DCUI, strict only from the vSphere Client.
- In VCF, hosts are **commissioned** and clusters are **created/expanded** through VCF workflows; do not use plain *Add Host* on VCF-built clusters.
- Maintenance mode is required before patching or hardware work; DRS fully automated evacuates VMs for you.
:::

## Common Exam Traps

:::trap
- "Restarting the management agents powers off the VMs" — false; agents are not in the VM data path.
- Confusing **Host Client** (talks to hostd directly) with the **vSphere Client** (talks to vCenter).
- Assuming strict lockdown still allows DCUI logins for `DCUI.Access` users — the DCUI service is stopped.
- Creating vMotion/vSAN VMkernel adapters by hand on a VCF cluster instead of letting the VCF workflow do it.
:::

## Knowledge Check

::quiz

## Summary

- ESX = VMkernel plus user-world agents: **hostd** (host API), **vpxa** (vCenter's agent), **FDM** (HA agent).
- Running VMs depend on the VMkernel, not on the agents.
- Access paths: vSphere Client (preferred), Host Client, DCUI, ESX Shell and SSH (off by default). **Lockdown mode** funnels management through vCenter; strict mode also stops the DCUI.
- VMkernel adapters carry host services (management, vMotion, vSAN…); in VCF they are created by VCF workflows.
- VCF hosts are prepared, **commissioned**, then consumed by cluster/domain workflows; manual changes cause drift.

## Next Topic

Next: [vCenter Architecture and Inventory](lesson:vcenter-architecture-inventory) — the management server that every VCF domain gets, its services and how it organizes hosts, clusters and VMs.
