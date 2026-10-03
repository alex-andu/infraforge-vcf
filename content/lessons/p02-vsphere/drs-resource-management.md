---
id: drs-resource-management
title: DRS and Resource Management
phase: p02-vsphere
module: m02-clusters-vms
version: vcf9
minutes: 45
difficulty: intermediate
summary: How DRS places and balances VMs (automation levels, migration threshold, DRS score), how shares, reservations and limits divide CPU and memory under contention, how resource pools and affinity rules work, and how vCLS, HA and VCF interact with DRS.
topics: [drs, vsphere-cluster, cpu-memory-virt]
objectives: ["2.2"]
keyTerms: [shares, reservation, limit, resource-pool, expandable-reservation, vmotion, vcls, affinity-rule, maintenance-mode]
labs: [lab-vcenter-cluster-ha-drs]
incidents: []
components: [vcenter, esx-host, supervisor]
related: [vsphere-ha-deep-dive, cpu-memory-virtualization, clusters-ha-drs-intro, vm-lifecycle-templates, supervisor-in-workload-domain]
sources:
  - title: "vSphere 9.0 – vSphere Resource Management (guide index)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management.html
  - title: "vSphere 9.0 – Configure Your Resource Allocation Settings"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/configuring-resource-allocation-settings.html
  - title: "vSphere Web Services API 9.0 – SharesLevel"
    url: https://developer.broadcom.com/xapis/vsphere-web-services-api/9.0/vim.SharesInfo.Level.html
  - title: "vSphere 9.0 – Create a vSphere DRS Cluster"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/creating-a-drs-cluster.html
  - title: "vSphere 9.0 – Managing Resource Pools"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/managing-resource-pools.html
  - title: "vSphere 9.0 – Using VM-Host Affinity Rules"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/using-drs-clusters-to-manage-resources/using-vm-host-affinity-rules.html
  - title: "vSphere 9.0 – Use DRS Clusters to Manage Resources"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/using-drs-clusters-to-manage-resources.html
  - title: "vSphere 9.0 – vSphere Cluster Services (vCLS)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/vsphere-cluster-services-vcls.html
  - title: "vSphere 9.0 Availability – Using vSphere HA and DRS Together"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-interoperability/using-vmware-ha-and-drs-together.html
  - title: "PowerCLI Reference – Set-Cluster"
    url: https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/set-cluster
---

## Why This Matters

A VCF workload domain is sold to its consumers as a pool of capacity. DRS (Distributed Resource Scheduler) is what turns a group of hosts into that pool: it picks a host when a VM powers on, moves VMs with vMotion when hosts get busy, and evacuates hosts for maintenance — which is exactly what vSphere Lifecycle Manager relies on when VCF patches a cluster. Shares, reservations, limits and resource pools decide **who wins when there is not enough**.

Exam objective 2.2 (*configure a vSphere cluster*, *deploy and configure VMs*) tests these settings constantly: "the CFO's VM is slow under contention", "a VM won't power on because of a reservation", "two domain controllers must never share a host".

## Learning Objectives

- Configure DRS automation level and migration threshold and interpret the DRS score.
- Calculate the effect of **shares**, **reservations** and **limits** under contention.
- Design a resource pool hierarchy and explain expandable reservations.
- Choose between VM-VM and VM-Host rules, and between *must* and *should* rules.
- Explain DRS dependencies: vMotion, shared storage, vCenter, vCLS.

## Concept

DRS is a **vCenter** service that works on a cluster:

| Function | What DRS does |
|---|---|
| Initial placement | Chooses a host when a VM powers on |
| Load balancing | Recommends or performs vMotion to improve "VM happiness" |
| Maintenance evacuation | Moves VMs off a host entering maintenance mode |
| Rules enforcement | Keeps VMs together/apart, on/off host groups |
| Resource pools | Enforces the cluster-wide resource tree |
| Power management (DPM, optional) | Puts hosts in standby when capacity is idle |

Requirements (vSphere 9.0 docs): hosts on a **vMotion network**, and **shared storage** for the VMs DRS should move. DRS needs vCenter to run, and in vSphere 9.0 it also depends on healthy **vCLS** VMs.

### Automation levels

| Level | Initial placement | Load balancing |
|---|---|---|
| Manual | Recommendation | Recommendation |
| Partially automated | **Automatic** | Recommendation |
| Fully automated | Automatic | Automatic |
| Disabled (per VM override) | — | vCenter neither migrates the VM nor recommends it |

The **migration threshold** has five levels from *Conservative* (only priority-one, mandatory recommendations such as rule or maintenance-mode moves) to *Aggressive* (more frequent moves to improve VM happiness).

The **DRS score** on the cluster Summary is "a weighted average of the VM DRS Scores of all the powered on VMs in the cluster" — a measure of how well VMs get the resources they want, not of host utilization balance.

## Architecture

::diagram[d02-drs-resource-pools]

## Components

| Component | Where | Purpose |
|---|---|---|
| DRS engine | vCenter (vpxd) | Placement and balancing decisions |
| vCLS VMs (Embedded vCLS) | Up to two per cluster, vSphere Pod-based | Keep cluster services available; DRS depends on them |
| vMotion VMkernel adapters | Each host | Data path for live migrations |
| Root resource pool | Implicit, per cluster | Equals the cluster's total resources (hidden) |
| Child resource pools | Cluster | Divide capacity among teams or tiers |
| VM/Host groups and rules | Cluster configuration | Placement constraints |

## How It Works

### Resource controls on a VM or pool

| Control | Meaning | Applies |
|---|---|---|
| [[reservation|Reservation]] | Guaranteed minimum (MHz / MB) | Always — and a VM cannot power on unless it can be satisfied |
| [[limit|Limit]] | Hard maximum, even if capacity is free | Always |
| [[shares|Shares]] | Relative priority | **Only under contention** |

Share presets (vSphere 9.0 API `SharesLevel`):

| Level | CPU shares | Memory shares |
|---|---|---|
| Low | 500 × vCPUs | 5 × MB of configured memory |
| Normal | 1000 × vCPUs | 10 × MB |
| High | 2000 × vCPUs | 20 × MB |
| Custom | Any value | Any value |

### Worked contention example

Two VMs compete for 6 GHz of CPU on the same host:

| VM | vCPU | Shares level | Shares | Entitlement under contention |
|---|---|---|---|---|
| finance01 | 2 | High | 4000 | 4000/6000 × 6 GHz = **4 GHz** |
| test01 | 2 | Normal | 2000 | 2000/6000 × 6 GHz = **2 GHz** |

If test01 had a **1 GHz limit**, it would never get more than 1 GHz, even at 3 a.m. with the host idle. If finance01 had a **3 GHz reservation**, it would always get at least 3 GHz, and the cluster must have 3 GHz unreserved to power it on.

### Resource pools

A [[resource-pool]] is a node in the cluster's resource tree with its own shares, reservation, limit and an **expandable reservation** flag. Key behaviours (vSphere 9.0):

- Every host and DRS cluster has an invisible **root resource pool** equal to its total resources.
- [[expandable-reservation|Expandable reservation]] lets a child pool **borrow unreserved capacity from its ancestors** (recursively) when its own reservation is exhausted. It is the default; *fixed* means admission control only looks at the pool itself.
- Shares on pools are relative **among siblings**: a pool with *High* shares and 50 VMs can give each VM less than a *Normal* pool with 2 VMs. Size pool shares by workload count, or use scalable shares where available.

### What happens at power-on

1. User powers on a VM in pool *Prod*.
2. **Resource pool admission control**: is there enough unreserved capacity in *Prod* (or its ancestors, if expandable) for the VM's reservation plus overhead?
3. **HA admission control**: would the power-on break the failover reserve?
4. **DRS initial placement** picks a host that satisfies reservations and rules (automatic in partially/fully automated).
5. VM runs; DRS re-evaluates periodically and recommends or performs vMotions according to the threshold.

## Deep Dive

### Affinity rules

| Rule | Type | Example |
|---|---|---|
| Keep VMs together | VM-VM affinity | App and cache VM on same host for latency |
| Separate VMs | VM-VM anti-affinity | Two domain controllers, NSX Manager nodes |
| VM-Host **Must run on / Must not run on** | Required | Licensing-bound workloads |
| VM-Host **Should run on / Should not run on** | Preferential | Rack or site preference |

Per vSphere 9.0: "DRS, vSphere HA, and vSphere DPM never take any action that results in the violation of **required** affinity rules", while **preferential** rules can be violated so those features keep working. Required rules can therefore block maintenance-mode evacuation and **HA failover**. Use *should* rules unless there is a hard requirement.

### vCLS in vSphere 9.0

[[vcls]] is *Embedded vCLS* with up to two VMs per cluster. vCenter 9.0 deprecates vCLS. If vCLS VMs are unhealthy, DRS cannot function in that cluster. If you must evacuate the datastore holding them, Storage vMotion them or put the cluster in **retreat mode**.

### HA and DRS together

- After an HA failover, DRS rebalances the cluster.
- With HA admission control on, VMs **might not be evacuated** from a host entering maintenance mode because that would consume the failover reserve; you may need to migrate manually or adjust capacity.
- HA can ask DRS to defragment resources or bring DPM standby hosts back to make room for a failover.

### Resource pools in VCF

- **vSphere Supervisor** namespaces are implemented on top of the vSphere cluster resource model; namespace CPU/memory limits are enforced by vSphere (see [Supervisor](lesson:supervisor-in-workload-domain)).
- Avoid using resource pools as folders: they change resource entitlement. Use **VM folders** for organization and permissions.

:::legacy VCF 5.x / Legacy Context
vSphere 7.0 U1 to 8.0 U2 used three *external* vCLS agent VMs running Photon OS per cluster. vSphere 8.0 U3 introduced Embedded vCLS (two VMs), which is what vSphere 9.0 uses.
:::

## Configuration

**Enable DRS:** cluster → **Configure → Services → vSphere DRS → Edit** → turn on, choose automation level and migration threshold. Optional: Predictive DRS, VM automation overrides, DPM (*Power Management*).

**Create a resource pool:** right-click cluster → **New Resource Pool** → set CPU/memory shares, reservation, expandable, limit.

**Edit VM resources:** VM → **Edit Settings** → CPU / Memory → Reservation, Limit, Shares.

**Rules:** cluster → **Configure → Configuration → VM/Host Groups** (create groups) → **VM/Host Rules** (create rules).

**VM overrides:** cluster → **Configure → Configuration → VM Overrides** — per-VM DRS automation level, HA restart priority, isolation response.

## CLI / API

```powershell
# Turn on DRS fully automated
Set-Cluster -Cluster "wld01-cl01" -DrsEnabled:$true -DrsAutomationLevel FullyAutomated -Confirm:$false

# Create a resource pool with high CPU shares and a memory reservation
New-ResourcePool -Location (Get-Cluster "wld01-cl01") -Name "Prod" `
  -CpuSharesLevel High -MemReservationGB 16 -MemExpandableReservation:$true

# Keep two domain controllers apart
New-DrsRule -Cluster (Get-Cluster "wld01-cl01") -Name "dc-separate" -KeepTogether:$false `
  -VM (Get-VM "dc01","dc02")

# Live-migrate a VM
Move-VM -VM (Get-VM "app01") -Destination (Get-VMHost "esx-wld01-02.lab.local")
```

## Failure Scenarios

| Situation | Symptom | Cause |
|---|---|---|
| VM won't power on: insufficient resources | Error on power-on | Reservation can't be met in the pool (fixed reservation or ancestors full) or HA admission control |
| Host stuck "entering maintenance mode" | Task waits | DRS manual/partial, required rules, local storage/ISO attached, or HA failover reserve |
| DRS does nothing | No recommendations | DRS manual mode, threshold conservative, vCLS unhealthy, vMotion network broken |
| VM always slow, host idle | High CPU ready not the issue | A **limit** is set |
| Team's pool starves | Low per-VM entitlement | Pool shares not scaled to VM count |
| Failover blocked | VMs not restarted | Required VM-Host rule restricts placement |

## Troubleshooting

1. Cluster **Summary**: DRS score, and **Monitor → vSphere DRS** (recommendations, faults, history).
2. Check **vCLS** health in the cluster.
3. Check **vMotion**: each host has a vMotion VMkernel adapter on the same network; test with a manual vMotion.
4. For power-on failures, read the fault: resource pool admission or HA admission control.
5. Look for **limits** on slow VMs and in their resource pools.
6. Review **VM/Host rules**, especially *must* rules.

## Real-World Scenario

During a VCF cluster upgrade, vSphere Lifecycle Manager cannot put `esx-wld01-04` in maintenance mode. The DRS faults show a *must run on* rule binding a licensed database VM to hosts 03 and 04, and host 03 is already in maintenance. The admin changes the rule to *should run on* for the duration of the upgrade window (with the application owner's approval), the VM moves, remediation continues, and the rule is restored afterwards.

## Lab

::lab[lab-vcenter-cluster-ha-drs]

You enable DRS, create resource pools and an anti-affinity rule, and watch DRS evacuate a host for maintenance.

## Exam Focus

:::exam
- Automation levels: **Manual, Partially automated (automatic placement only), Fully automated**.
- Shares matter **only under contention**; reservations are guaranteed; limits cap even when idle.
- Share presets: Low/Normal/High = 500/1000/2000 per vCPU and 5/10/20 per MB.
- Expandable reservation borrows from parents.
- **Required** VM-Host rules are never violated by DRS, HA or DPM; **preferential** rules can be.
- DRS needs vCenter, vMotion and (in 9.0) healthy vCLS.
:::

## Common Exam Traps

:::trap
- Using resource pools to organize VMs (folders do that).
- Assuming *High* shares on a pool guarantees each VM more than a *Normal* pool — it depends on the number of VMs.
- Expecting partially automated DRS to balance load automatically — it only places automatically.
- Setting a reservation "to be safe": it can block power-on and HA admission.
- Thinking DRS keeps working while vCenter is down.
:::

## Knowledge Check

::quiz

## Summary

- DRS places, balances and evacuates VMs; it is a vCenter service that needs vMotion and vCLS.
- Reservations guarantee, limits cap, shares prioritize under contention.
- Resource pools form a tree under the hidden root pool; expandable reservations borrow upward.
- Affinity rules: VM-VM and VM-Host; *must* rules are never broken, even for HA.
- In VCF, DRS is what lets lifecycle remediation move VMs off hosts without downtime.

## Next Topic

Next: [VM Lifecycle, Templates and Content Libraries](lesson:vm-lifecycle-templates) — deploying, cloning, migrating and templating the workloads that run on these clusters.
