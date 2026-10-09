---
id: vsphere-ha-deep-dive
title: vSphere HA Deep Dive
phase: p02-vsphere
module: m02-clusters-vms
version: vcf9
minutes: 45
difficulty: intermediate
summary: How VMware vSphere High Availability (HA) detects failure, isolation and partition, reserves capacity, and restarts virtual machines (VMs), including behavior with VMware vSAN in VMware Cloud Foundation (VCF) clusters.
topics: [vsphere-ha, vsphere-cluster, design-availability]
objectives: ["2.2"]
keyTerms: [fdm, heartbeat-datastore, admission-control, host-isolation, vmcp, vm-restart-priority, proactive-ha]
labs: [lab-vcenter-cluster-ha-drs]
incidents: []
components: [esx-host, vcenter, vsan, management-domain]
related: [clusters-ha-drs-intro, drs-resource-management, esx-architecture-host-management, vsan-resilience-fault-domains, design-availability-failure-domains]
sources:
  - title: "vSphere 9.0 Availability – How vSphere HA Works"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works.html
  - title: "vSphere 9.0 Availability – Primary and Secondary Hosts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/primary-and-secondary-hosts.html
  - title: "vSphere 9.0 Availability – Host Failure Types"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/host-failure-types-and-detection.html
  - title: "vSphere 9.0 Availability – Datastore Heartbeating"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/datastore-heartbeating.html
  - title: "vSphere 9.0 Availability – Determining Responses to Host Issues"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/determining-responses-to-host-issues.html
  - title: "vSphere 9.0 Availability – VM Component Protection"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/vm-component-protection.html
  - title: "vSphere 9.0 Availability – vSphere HA Admission Control"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-admission-control.html
  - title: "vSphere 9.0 Availability – Cluster Resources Percentage Admission Control"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-admission-control/cluster-resources-percentage-admission-control.html
  - title: "vSphere 9.0 Availability – vSphere HA Checklist"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/creating-a-vsphere-ha-cluster/vmware-ha-checklist.html
  - title: "vSphere 9.0 Availability – Create a vSphere HA Cluster in the vSphere Client"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/creating-a-vsphere-ha-cluster/create-vsphere-ha-cluster.html
  - title: "vSphere 9.0 Availability – Using vSphere HA with vSAN"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-interoperability/using-vsphere-ha-with-vsan.html
  - title: "vSphere 9.0 Availability – Using vSphere HA and DRS Together"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-interoperability/using-vmware-ha-and-drs-together.html
  - title: "vSphere Web Services API 9.0 – ClusterDasVmSettingsRestartPriority"
    url: https://developer.broadcom.com/xapis/vsphere-web-services-api/9.0/vim.cluster.DasVmSettings.RestartPriority.html
---

## Why This Matters

VMware vSphere High Availability (HA) is the reason a failed server in a VMware Cloud Foundation (VCF) domain can cause minutes of VM downtime instead of a long manual recovery. It protects management-domain components such as VMware vCenter, VMware NSX Managers, Software-Defined Data Center (SDDC) Manager and VCF Operations, as well as workloads in VI Workload Domain clusters. VCF enables HA on its clusters, while the administrator remains responsible for isolation behavior, reserved failover capacity and VM restart order.

Objective 2.2 (*configure a vSphere cluster*) includes HA scenarios: what happens when a host loses its management network, why admission control blocks a power-on, and why a vSAN datastore cannot act as an HA heartbeat datastore.

## Learning Objectives

- Explain the primary/secondary model and the Fault Domain Manager (FDM) agent.
- Distinguish **host failure**, **isolation** and **partition**, and how network and datastore heartbeats tell them apart.
- Select host-failure response, isolation response, VM restart priority and VM Component Protection (VMCP) behavior for Permanent Device Loss (PDL) and All Paths Down (APD).
- Choose and size an **admission control** policy.
- Describe how HA behaves on a **vSAN** cluster, the default VCF storage model.

## Concept

vSphere HA pools hosts and VMs into a failure-recovery boundary. It is a **restart** technology: when a host fails, its running VMs stop and HA powers them on elsewhere. It does not preserve in-memory execution state or provide zero downtime; vSphere Fault Tolerance is a separate feature for that requirement.

HA runs through the [[fdm]] agent on every cluster host. vCenter installs and configures FDM; the agents elect a primary, exchange heartbeats, track protected VMs and execute failover. This control boundary lets HA restart workloads while vCenter is unavailable and lets HA protect the vCenter appliance itself.

### Requirements (vSphere 9.0 HA checklist)

- At least **two hosts** in the cluster.
- Static Internet Protocol (IP) addresses, or persistent Dynamic Host Configuration Protocol (DHCP) reservations, on hosts.
- At least one **management network in common**; two management networks recommended.
- Hosts see the same VM networks and datastores; VMs on **shared storage**.
- VMware Tools in guests for VM Monitoring.
- APD timeout enabled on hosts for VMCP.

## Architecture

::diagram[d02-ha-failure-restart]

## Components

| Component | Where | Role |
|---|---|---|
| FDM agent | Every host in the cluster | HA logic; logs to `/var/log/fdm.log` |
| Primary host | One host, elected | Monitors secondaries, tracks protected VMs, orchestrates restarts, reports cluster health to vCenter |
| Secondary hosts | All other hosts | Run VMs, monitor them locally, report state to the primary |
| Network heartbeats | Management network (or vSAN network when vSAN is on) | Exchanged **every second** between primary and secondaries |
| [[heartbeat-datastore|Heartbeat datastores]] | Shared datastores (not vSAN) | Second channel to tell failure from isolation/partition |
| `.vSphere-HA` folder | Root of each datastore | Heartbeat files and the protected-VM list; do not delete |
| Isolation addresses | Default: management network gateway; extra via `das.isolationaddressX` | What a host pings to decide it is isolated |
| vCenter | Management domain | Configures HA, shows status; not required for failover |

### Component responsibilities and limits

**FDM agent.** FDM owns host-level detection and coordinated restart. It depends on working HA networks, consistent cluster configuration and access to VM files. It can elect a new primary and act without vCenter, but it cannot repair failed hardware, recover unsaved guest memory or start a VM whose files and compatible capacity are unavailable.

**Primary host.** The primary maintains the protected-VM list, evaluates missing agents and coordinates placement attempts. It is a cluster role rather than a permanent host designation. Losing it triggers a new election; it is not a single point of failure, although an unstable network can delay reliable decisions.

**Heartbeat channels.** Network heartbeats prove agent reachability, datastore heartbeats provide a second observation channel, and isolation-address checks help a host decide whether it has lost the wider network. These signals reduce false restarts but cannot make a physically partitioned network consistent or turn vSAN into a heartbeat datastore.

**Admission control.** Admission control protects future restart capacity by rejecting operations that would consume the reserve. It depends heavily on host capacity, VM reservations and the chosen policy. It can preserve a capacity margin; it cannot guarantee restart when storage, networking, compatibility rules or multiple failures prevent placement.

### Election

When HA is enabled, the agents elect a **primary**. The host that mounts the **greatest number of datastores** has an advantage. A new election occurs if the primary fails, shuts down, enters standby mode, or is removed from the cluster. Protected-VM information is stored on datastores, so it survives a new election. Disconnecting a host from vCenter **unprotects** the VMs registered on it.

## How It Works

### Detecting what happened to a silent host

The primary stops receiving network heartbeats from secondary *H*. It then checks two things:

| Datastore heartbeats from H? | H answers ICMP on its management IPs? | Verdict | Action |
|---|---|---|---|
| No | No | **Host failed** | Restart H's VMs on other hosts |
| Yes | No | **Isolated or partitioned** — H is alive | Keep monitoring; H applies its isolation response if it considers itself isolated |

From the host's point of view: if H stops hearing the primary (and other agents), it pings the **cluster isolation addresses**. If those fail too, H **declares itself isolated** and applies the configured **host isolation response** to its VMs.

A **partition** is different: a group of hosts can still talk to each other but not to the primary's group. Each partition behaves as its own island; a VM is protected only if it runs in the same partition as the primary responsible for it, and that primary must be communicating with vCenter.

### Restart sequence after a host failure

1. Primary declares the host failed.
2. It builds the list of protected VMs that were running there.
3. VMs are restarted in **restart priority** order (Highest → High → Medium → Low → Lowest). With several failed hosts, all VMs from the first host are restarted in priority order, then those of the second host.
4. Before moving to the next priority tier, HA waits for the configured *VM restart priority condition* plus any additional delay (or a timeout).
5. Placement respects reservations, host compatibility, file accessibility and **required** VM-host affinity rules.
6. When DRS is on, it later rebalances the cluster (HA prioritizes availability, DRS tidies up).

### Responses you configure (Failures and responses tab)

| Setting | Options | Notes |
|---|---|---|
| Host failure response | Disabled / **Restart VMs** | Disabled turns off host monitoring |
| [[vm-restart-priority|VM restart priority]] (cluster default and per-VM override) | Disabled, Lowest, Low, **Medium** (default), High, Highest | Disabled = HA does not restart that VM |
| Response for host isolation | **Disabled** (default), Shut down and restart VMs, Power off and restart VMs | Shutdown needs VMware Tools; waits up to 300 s (`das.isolationshutdowntimeout`) then powers off |
| Datastore with PDL | Disabled, Issue events, Power off and restart VMs | Part of [[vmcp]] |
| Datastore with APD | Disabled, Issue events, Power off and restart VMs (conservative or aggressive) | Part of VMCP; ESX 6.0+ |
| VM monitoring | Disabled, VM Monitoring only, VM and Application Monitoring | Uses VMware Tools / application heartbeats |

## Deep Dive

### Datastore heartbeating

vCenter auto-selects heartbeat datastores, **two per host by default**, up to **five** with `das.heartbeatdsperhost`, preferring datastores that don't share the same back-end storage. HA creates a `.vSphere-HA` directory on each datastore (about 3 MB on VMFS); deleting it hurts HA.

**vSAN datastores cannot be heartbeat datastores.** On an all-vSAN cluster — the default VCF principal storage — there may be no heartbeat datastore at all, and vCenter shows a configuration warning until you add another shared datastore (NFS, VMFS on FC/iSCSI) reachable over an independent path.

### HA with vSAN (typical in VCF)

From the vSphere 9.0 docs:

- When vSAN is enabled, "the HA interagent traffic flows over this storage network rather than the management network".
- You can **activate vSAN only if vSphere HA is deactivated**. To change vSAN network settings: deactivate Host Monitoring, change, reconfigure HA on all hosts, re-enable Host Monitoring.
- A vSAN host is declared isolated when the isolation addresses are not pingable **and** the vSAN network is inaccessible — so set isolation addresses reachable on the vSAN network (`das.isolationaddressX`, and optionally `das.usedefaultisolationaddress=false`).
- vSAN's *failures to tolerate* in the storage policy must not be lower than the capacity HA admission control reserves.

### Admission control

[[admission-control]] reserves capacity so failover can actually happen. Operations that would violate it are refused: **powering on VMs, migrating VMs, increasing CPU/memory reservations**.

| Policy | How capacity is expressed | Notes |
|---|---|---|
| **Cluster resource percentage** | % of cluster CPU and memory reserved | Can be calculated from "host failures cluster tolerates"; adapts to uneven hosts |
| **Slot policy** | Number of host failures to tolerate, measured in slots | Slot size from the largest reservations; conservative with one big VM |
| **Dedicated failover hosts** | Named hosts kept empty | Simple; wastes capacity |
| Disabled | — | Docs: do not permanently deactivate |

Percentage-policy maths (vSphere 9.0 example): three hosts with 24 GHz / 21 GB total, VM reservations 7 GHz / 6 GB → current CPU failover capacity 70%, memory 71%. With 25% configured, there is 45%/46% left for new VMs. VMs **without** reservations are counted with a default of **32 MHz** CPU and **0 MB** memory (`das.vmcpuminmhz` changes the CPU default). That is why HA admits "too many" VMs when nobody sets reservations — and why the separate **Performance degradation VMs tolerate** setting (default 100%, requires DRS) exists to warn you.

:::warning
Admission control can block maintenance mode: with HA admission control on, DRS may refuse to evacuate a host because that would break the reserved failover capacity. In a two- or three-host lab this happens often.
:::

### Proactive HA and VM dependencies

**Proactive HA** reacts to partial hardware failures reported by a vendor provider (for example a failed power supply) by evacuating or quarantining a host *before* it fails; it requires **DRS**. **VM dependencies** let you restart one VM group only after another group is *Ready* (for example databases before application servers).

## Configuration

In VCF, cluster workflows establish HA. Administrators then compare the resulting state with the availability design:

| Design decision | Management surface | Evidence |
|---|---|---|
| Which failures should trigger action? | Cluster vSphere Availability failures and responses | Host monitoring, isolation response and VMCP state |
| How much capacity must survive? | Admission control policy | Policy type, tolerated failures, calculated reserve and blocking events |
| Which workloads return first? | Cluster default and per-VM overrides | Restart priority and dependency groups |
| Are detection channels independent? | HA network, datastore-heartbeat and advanced settings | Redundant HA paths, selected datastores and reachable isolation addresses |
| Is HA healthy? | Cluster summary and HA monitoring views | Elected primary, protected-VM count and zero unresolved configuration issues |

The separate practical guide owns the exact VCF 9.0.2 click path and controlled failure exercise. The theory requirement is to connect each setting to a failure assumption and retain evidence that the cluster can still place its protected VMs.

## CLI / API

```powershell
# Enable HA with admission control tolerating one host failure (PowerCLI)
Set-Cluster -Cluster "wld01-cl01" -HAEnabled:$true -HAAdmissionControlEnabled:$true `
  -HAFailoverLevel 1 -HARestartPriority Medium -Confirm:$false

# Review HA settings
Get-Cluster "wld01-cl01" | Select-Object Name, HAEnabled, HAAdmissionControlEnabled, HAFailoverLevel, HARestartPriority, HAIsolationResponse
```

```shell
# On a host: HA agent log
tail -n 50 /var/log/fdm.log
```

## Failure Scenarios

| Event | Detection | Result |
|---|---|---|
| Host power loss | No network or datastore heartbeat, no ping | VMs restarted on survivors by priority |
| Host loses management (or vSAN) network only | Datastore heartbeats continue; host cannot ping isolation addresses | Host isolated; isolation response applied (default Disabled = VMs keep running) |
| Switch failure splits cluster | Two groups that can't talk | Partition; protection only within primary's partition |
| Storage array returns PDL | VMCP | Configured response (power off & restart elsewhere) |
| APD on datastore | VMCP after APD timeout + delay | Conservative/aggressive restart |
| Guest OS hang | VMware Tools heartbeats stop | VM Monitoring resets the VM |
| vCenter down | — | HA still restarts VMs |
| Not enough capacity | Admission control disabled earlier | Some VMs stay off; lowest priority first to lose |

## Troubleshooting

1. **Cluster → Monitor → vSphere HA → Summary / Configuration Issues** — agent errors, missing heartbeat datastores, isolation address warnings.
2. **"Insufficient resources to satisfy vSphere HA failover level"** — admission control. Check reservations, percentages, and hosts in maintenance.
3. **Agent errors on a host** — *Reconfigure for vSphere HA* on the host; check `fdm.log`, DNS and time.
4. **Unexpected VM power-offs** — check whether isolation response is set to power off and whether the management/vSAN network flapped.
5. **No heartbeat datastore on vSAN** — expected; add a supported shared datastore or accept the warning by design.
6. **Changing vSAN networking** — deactivate Host Monitoring first.

## Real-World Scenario

A VCF management domain cluster of four vSAN hosts loses one host to a motherboard fault at 02:00. The FDM primary sees no network heartbeats and no ping; there are no heartbeat datastores (all-vSAN), and the host is unreachable on the vSAN network too, so it is declared failed. HA restarts the NSX Manager node and the workload domain vCenter that were on it, using restart priority *Highest* for vCenter and NSX Managers set by the platform team. Because admission control reserved 25% (one host of four), everything fits. In the morning DRS has rebalanced the cluster and the team opens a hardware ticket.

## Exam Focus

:::exam
- HA is executed by **FDM agents**; vCenter only configures it — failover works without vCenter.
- Heartbeats every **second**; datastore heartbeats + ping separate failure from isolation/partition.
- Isolation response default **Disabled**; options power off/shutdown and restart.
- Restart priority default **Medium**; Highest/High/Medium/Low/Lowest plus Disabled.
- Admission control policies: **cluster resource percentage, slot policy, dedicated failover hosts**.
- vSAN: HA traffic uses the **vSAN network**; vSAN datastores **cannot** be heartbeat datastores; disable HA before enabling vSAN.
:::

## Common Exam Traps

:::trap
- Thinking HA gives zero downtime — that is Fault Tolerance.
- Choosing the management network for HA heartbeats on a vSAN cluster.
- Choosing the vSAN datastore as heartbeat datastore.
- Believing admission control stops VMs from *running*; it blocks **power-on, migrations and reservation increases** that would break the reserve.
- Forgetting Proactive HA requires DRS.
:::

## Knowledge Check

::quiz

## Summary

- One primary, many secondaries; FDM agents exchange heartbeats every second.
- No network heartbeat + no datastore heartbeat + no ping = failed host → restart VMs by priority.
- Isolated hosts apply the isolation response; partitions protect VMs only within the primary's partition.
- Admission control (percentage, slots, dedicated hosts) guarantees restart capacity.
- On vSAN (the VCF default) HA runs over the vSAN network and cannot use vSAN for datastore heartbeats.

## Next Topic

Next: [DRS and Resource Management](lesson:drs-resource-management) — keeping the cluster balanced and dividing capacity with shares, reservations, limits and resource pools.
