---
id: clusters-ha-drs-intro
title: Clusters, HA and DRS - An Introduction
phase: p01-virtualization
module: m01-virt-basics
version: general
minutes: 30
difficulty: foundation
summary: How ESX hosts become a vSphere cluster, what vSphere HA does when a host fails (primary/secondary hosts, heartbeats, isolation, admission control), what DRS does (placement, vMotion balancing, automation levels, resource pools), and why every VCF cluster runs both.
topics: [vsphere-cluster, vsphere-ha, drs]
objectives: ["2.2"]
keyTerms: [cluster, ha, drs, resource-pool, vmotion, vmware-tools, vcf-domain]
labs: [lab-vcenter-cluster-ha-drs]
incidents: []
components: [vcenter, esx-host]
related: [cpu-memory-virtualization, vsphere-ha-deep-dive, drs-resource-management, vcf9-terminology]
sources:
  - title: "vSphere 9.0 – Creating and Using vSphere HA Clusters"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters.html
  - title: "vSphere 9.0 – Primary and Secondary Hosts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/primary-and-secondary-hosts.html
  - title: "vSphere 9.0 – Host Failure Types"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works/host-failure-types-and-detection.html
  - title: "vSphere 9.0 – vSphere HA Admission Control"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-admission-control.html
  - title: "vSphere 9.0 – Using DRS Clusters to Manage Resources"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/using-drs-clusters-to-manage-resources.html
  - title: "vSphere 9.0 – Managing Resource Pools"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/managing-resource-pools.html
  - title: "Broadcom KB 391137 – VMware DRS Overview"
    url: https://knowledge.broadcom.com/external/article/391137/vmware-drs-overview-optimizing-resource.html
  - title: "VCF 9.0 – VCF Taxonomy (domains contain clusters with HA and DRS)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/workload-domains-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 – vSphere Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html
---

## Why This Matters

A single ESX host is a single point of failure. The **vSphere cluster** turns several hosts into one pool, and two cluster services make that pool useful: **vSphere HA** (restart VMs after a host failure) and **DRS** (place and balance VMs). The VCF 9 taxonomy states that every domain contains *one or more vSphere clusters with HA and DRS enabled*. This lesson gives you the working model; Phase 2 goes deep into each feature.

## Learning Objectives

- Define a [[cluster]] and list what it provides.
- Explain how [[ha]] detects failures and what it does (and does not) protect against.
- Explain what [[drs]] does, its automation levels, and its dependency on vCenter and [[vmotion]].
- Use [[resource-pool]]s correctly and avoid the "resource pool as folder" mistake.
- Relate clusters to VCF domains and cluster models.

## Concept

A **vSphere cluster** is a vCenter object that groups ESX hosts so their CPU and memory are treated as one pool. Cluster-level features:

| Feature | Purpose | Needs |
|---|---|---|
| **vSphere HA** | Restart VMs on surviving hosts after a host failure; optional VM/app monitoring | Shared storage visible to all hosts, management network |
| **DRS** | Initial placement at power-on and load balancing via vMotion; resource pools; affinity rules | vCenter, vMotion network, shared storage (or vSAN) |
| **vSAN** | Storage built from hosts' local disks | vSAN network, disks per host (Phase 3) |
| **EVC** | Common CPU feature baseline so vMotion works across CPU generations | Same CPU vendor |
| **vSphere Lifecycle Manager** | Desired-state image for all hosts | vCenter (Phase 2 / Lifecycle) |

**vSphere HA ≠ zero downtime.** HA *restarts* VMs after a failure; the VMs reboot. Continuous availability with no restart is **Fault Tolerance**, a different feature with strict limits.

## Architecture

::diagram[d01-cluster-ha-drs]

In VCF, clusters follow documented **cluster models** (single-rack, Layer 2 multi-rack, Layer 3 multi-rack, stretched), and an instance or domain can mix them:

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/f7825f2b-46ba-401c-aeab-4351016078dd.original.png" caption="vSphere Cluster Models in a Single VCF Instance" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-cluster-models.html"}

## Components

### vSphere HA roles

| Role | Responsibilities |
|---|---|
| **HA agent** (on every host) | Uploaded to each host when it joins an HA cluster; talks to the other agents |
| **Primary host** (one per cluster, elected) | Monitors secondary hosts and protected VMs' power state, manages the lists of hosts and protected VMs, decides which VMs to restart, reports cluster health to vCenter |
| **Secondary hosts** | Run VMs, monitor their runtime state, report to the primary |

All active hosts (not in standby, maintenance mode or disconnected) take part in the election; the host that mounts the **most datastores** has the advantage.

### DRS automation levels

| Level | Initial placement | Load balancing |
|---|---|---|
| **Manual** | Recommendations only, you choose | Recommendations only |
| **Partially Automated** | Automatic | Recommendations you must apply |
| **Fully Automated** | Automatic | Automatic vMotion |

A **migration threshold** slider (conservative ↔ aggressive) sets how much imbalance DRS tolerates before it migrates VMs.

## How It Works

### HA: a host fails

1. Agents exchange **network heartbeats every second**.
2. The primary stops receiving heartbeats from host 3.
3. It **pings host 3's management IP** (ICMP).
4. It checks whether host 3 is still updating **datastore heartbeats**. If yes, host 3 is alive but isolated or partitioned; if no, it is **failed**.
5. For a failed host, the primary **restarts its protected VMs** on the remaining hosts, honouring restart priority and available capacity.

The three failure types HA distinguishes:

| Type | Meaning | What HA does |
|---|---|---|
| **Failure** | Host stops functioning | Restart its VMs elsewhere |
| **Isolation** | Host loses its management network; it pings the cluster **isolation addresses** and, if they also fail, declares itself isolated | Applies the configured **isolation response** (for example power off / shut down VMs so they can restart elsewhere, or leave them running) |
| **Partition** | Host loses connectivity with the primary but not with all others | Hosts in the other partition elect their own primary; VMs keep running |

**VM Monitoring** (optional) restarts an individual VM when its **VMware Tools heartbeats** stop for a set time, which catches a hung guest OS.

**Admission control** reserves enough spare capacity in the cluster so that VMs can actually be restarted after a failure; it can block power-on of new VMs when that capacity would be used up.

### DRS: a VM powers on

1. You power on a VM in the cluster.
2. DRS (in vCenter) evaluates host load, reservations, rules and resource pools.
3. It places the VM (automatically or as a recommendation, depending on level).
4. Periodically DRS re-evaluates and, in Fully Automated mode, **vMotions** VMs to fix imbalance.
5. When a host enters **maintenance mode**, DRS evacuates its running VMs with vMotion.

## Deep Dive

### HA keeps working without vCenter; DRS does not

vCenter *configures* HA, but the HA agents on the hosts detect failures and restart VMs on their own. If vCenter is down (or is the VM that failed), HA still restarts VMs. DRS and vMotion are vCenter functions and stop while vCenter is unavailable. This matters in VCF because vCenter itself is a VM in the management domain, protected by HA.

### Resource pools are not folders

A resource pool carries **shares, reservations and limits**. Putting VMs in pools just to organise them changes their resource entitlement, sometimes badly (for example a pool with "High" shares containing 100 VMs gives each VM less than a pool with "Normal" shares containing 5). Use **VM folders** for organisation and pools for resource policy. Resource pools in a cluster require **DRS** to be enabled.

### Affinity rules (preview)

DRS supports VM-VM rules (keep together / keep apart) and VM-Host rules (run on / should run on a group of hosts). VCF and NSX use anti-affinity to keep, for example, NSX Manager nodes on separate hosts; this is part of why a high-availability VCF deployment needs four hosts.

## Configuration

Creating a cluster in the vSphere Client (you do this in the vCenter lab):

1. Right-click the data center → **New Cluster**. Name it; optionally turn on DRS, HA and vSAN, and choose image-based lifecycle management.
2. Add hosts (in VCF: through the VCF workflow, not by hand).
3. Configure **HA**: host monitoring on, admission control policy, isolation response, datastore heartbeating, VM monitoring.
4. Configure **DRS**: automation level and migration threshold.
5. Verify the **vMotion** VMkernel network and shared storage.

:::note
In VCF you do not build domain clusters by hand: the VCF Installer builds the management cluster, and VCF Operations / SDDC Manager workflows create workload domain clusters with HA and DRS enabled. You still tune and troubleshoot them in vCenter.
:::

## CLI / API

Clusters, HA and DRS are configured in vCenter (vSphere Client, API, PowerCLI), not on individual hosts. On a host you can check and set maintenance mode:

```shell
esxcli system maintenanceMode get
esxcli system maintenanceMode set --enable true
```

On a clustered host, prefer entering maintenance mode from vCenter so DRS migrates the VMs first; `esxcli` will not move VMs for you.

## Failure Scenarios

| Scenario | HA behaviour | DRS behaviour |
|---|---|---|
| Host hardware failure | Restarts its VMs on survivors (with downtime) | Rebalances afterwards (if vCenter is up) |
| vCenter VM fails | HA restarts vCenter on another host | DRS paused until vCenter returns |
| Management network isolated on one host | Isolation response applies | – |
| Not enough spare capacity | Admission control blocks new power-ons; or some VMs cannot restart if admission control was disabled | – |
| Guest OS hangs | Restarted only if **VM Monitoring** is enabled and Tools heartbeats stop | – |
| vMotion network broken | – | Balancing and maintenance-mode evacuation fail |

## Troubleshooting

1. **HA errors on a host** ("cannot configure HA agent"): check management network, DNS, and that the host is not in maintenance mode; reconfigure HA on the host.
2. **VMs did not restart after a failure**: was admission control disabled and capacity exhausted? Were the VMs protected? Restart priority "disabled"?
3. **DRS not balancing**: automation level Manual/Partially Automated? vMotion VMkernel adapter enabled and reachable? Affinity rules constraining placement?
4. **Maintenance mode stuck**: VMs that cannot be vMotioned (local ISO attached, CPU incompatibility, rules) must be dealt with manually.

## Real-World Scenario

A three-host cluster runs at 85% memory with admission control disabled "to fit more VMs". One host fails: HA tries to restart 40 VMs, but only about half fit. The business-critical database was not given a high restart priority and is among those left powered off. Fixes: enable admission control with a policy that reserves one host's worth of capacity, set restart priorities, and right-size the cluster. In VCF, the same discipline applies to the management domain, where vCenter, NSX and SDDC Manager must always be able to restart.

## Lab

Clusters need vCenter, which you deploy in Phase 2:

::lab[lab-vcenter-cluster-ha-drs]

## Exam Focus

:::exam
- HA restarts VMs (downtime); FT provides continuous availability.
- HA failure types: failure, isolation, partition; heartbeats every second; datastore heartbeating distinguishes failure from isolation.
- HA works without vCenter; DRS and vMotion need vCenter.
- DRS levels: Manual, Partially Automated (auto placement only), Fully Automated.
- Every VCF domain cluster has HA and DRS enabled.
:::

## Common Exam Traps

:::trap
- "HA uses vMotion to move VMs off a failed host." A failed host's VMs are **restarted**, not migrated.
- "DRS keeps working when vCenter is down." It does not.
- "Partially Automated means DRS migrates automatically but asks before placement." It is the opposite.
- "Resource pools are a way to organise VMs." Use folders; pools change resource entitlement.
:::

## Knowledge Check

::quiz

## Summary

- A cluster pools hosts; HA, DRS, vSAN, EVC and vLCM are cluster features.
- HA: elected primary, heartbeats, datastore heartbeating, isolation response, admission control, VM Monitoring via Tools heartbeats.
- DRS: placement + vMotion balancing, three automation levels, resource pools and rules; needs vCenter.
- VCF domains always contain HA- and DRS-enabled clusters.

## Next Topic

Phase 2 starts with [ESX Host Architecture and Host Management](lesson:esx-architecture-host-management), which goes deeper into what runs inside each host.
