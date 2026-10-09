---
id: lifecycle-upgrade-workflow
title: The VCF 9.0 Upgrade Workflow - Sequencing, Prechecks and the Planner
phase: p09-lifecycle
module: m09-lcm
version: vcf9
minutes: 45
difficulty: advanced
summary: The exact order in which VCF 9.0 components are updated, why that order exists, how prechecks and resource locks protect the platform, and how the VCF Operations upgrade planner (including flexible BOM) turns a target version into a runbook.
topics: [lcm-workflow, lcm-concepts]
objectives: ["4.2"]
keyTerms: [precheck, flexible-bom, resource-lock, bom, bundle]
labs: [lab-lifecycle-upgrade-planning]
incidents: [inc-lcm-precheck-failure]
components: [vcf-operations, vcf-operations-fleet-management, sddc-manager, nsx-manager, vcenter, esx-host, vsan]
related: [lifecycle-concepts, vlcm-images-host-remediation, lifecycle-failures-recovery]
sources:
  - title: "VCF 9.0 TechDocs - Lifecycle Management in VMware Cloud Foundation (update order)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 TechDocs - Lifecycle Management of VCF Core Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-of-vcf-core-components.html
  - title: "VCF 9.0 TechDocs - Upgrade VCF core components (flexible BOM)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-of-vcf-core-components/flexible-bom-upgrade-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 TechDocs - Resource locks during upgrade or patching"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-of-vcf-core-components/upgrade-or-patch-in-progress-interoperability-in-vcf.html
  - title: "VCF 9.0 TechDocs - Upgrade or update the VCF management components in a VCF fleet"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/using-the-depot-configuration-tab/upgrade-or-update-the-vcf-management-components-in-a-vcf-fleet.html
  - title: "VCF 9.0 TechDocs - Upgrading VMware Cloud Foundation 5.x Workload Domains to 9.0"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/upgrade-workload-domains-to-vcf-5-2.html
  - title: "Broadcom KB 390634 - Update Sequence for VCF 9.0 and Compatible VMware Products"
    url: https://knowledge.broadcom.com/external/article/390634/update-sequence-for-vcf-90-and-compatibl.html
  - title: "Broadcom KB 427385 - vCenter RDU post-upgrade task fails to delete original VCSA VM"
    url: https://knowledge.broadcom.com/external/article/427385/sddc-manager-vcenter-rdu-postupgrade-tas.html
---

## Why This Matters

Knowing *what* gets upgraded is half the job. The other half is *in which order*, *with which safety checks* and
*what else is blocked while it runs*. Get the order wrong and a component lands on a version that its peers cannot
talk to. Skip prechecks and you discover a disconnected host halfway through a vCenter upgrade. Forget resource locks
and your colleague's host commissioning fails mysteriously during your maintenance window.

The exam loves ordering questions ("put these steps in sequence") and "what should you do first" scenarios. This
lesson gives you the sequence, the reason behind each position, and the planner workflow in VCF (VMware Cloud Foundation) Operations.

## Learning Objectives

- Put the VCF 9.0 maintenance update order in sequence for management and core components, and justify each position.
- Describe what a precheck validates and how to treat errors versus warnings.
- Walk through the VCF Operations planner: Precheck, Plan Upgrade, Customize Upgrade (flexible BOM), Validate
  Selection, review sequence, Update Now or Schedule Update.
- Explain SYSTEM, DOMAIN and CLUSTER resource locks and predict which day-N operations they block.
- Explain how SDDC (Software-Defined Data Center) Manager upgrades vCenter with a new appliance and a switchover.

## Concept

### The order, and the reason for it

TechDocs gives the order for a maintenance update (for example 9.0.0.0 to 9.0.1.0):

| # | Component | Why here |
|---|---|---|
| 1 | **VCF Operations fleet management appliance** | It is the engine that upgrades the other management components; it must understand the new versions first. |
| 2 | **VCF Operations** | Hosts the console and the fleet-wide view; upgraded right after its engine. |
| 3 | **Remaining management components**: VCF Operations for logs, VCF Automation, VCF Identity Broker, VCF Operations for networks | Any preferred order (check release notes for exceptions). |
| 4 | **SDDC Manager** (per instance) | The engine for core components; a new SDDC Manager knows how to upgrade the new NSX/vCenter/ESX. |
| 5 | **NSX** | Network virtualisation managers and edges come before vCenter in the core sequence. |
| 6 | **vCenter** | Must be at least the version of the hosts it manages, so it precedes ESX. |
| 7 | **ESX hosts** | Remediated by vLCM (vSphere Lifecycle Manager) against the cluster image. |
| 8 | **vSAN** | On-disk format and vSAN services last, after every host runs the new build. |

Steps 4-8 run for the **management domain first**, then for **each workload domain** in the same order. There is one
SDDC Manager per instance, so in workload domains you start at NSX.

:::general
The two big principles behind every VCF sequence: **the manager before the managed** (fleet management before what it
upgrades, SDDC Manager before what it orchestrates, vCenter before ESX), and **management before workload**
(management domain before workload domains). If you remember those two rules you can reconstruct most orders.
:::

### Prechecks

A [[precheck]] is a read-only validation that SDDC Manager (or fleet management) runs against a domain before an
upgrade. Typical checks cover component health and connectivity, stored credentials, host connection state,
disk space, certificate validity and the compatibility of the selected versions; the exact list of checks varies by
release, so read the precheck report itself rather than memorising a list. It does not change anything. Results are **errors** (blocking) and **warnings** (non-blocking, but read them).

TechDocs lists a completed precheck as a prerequisite for the core component upgrade. Treat it as mandatory: run it
days before the window, fix everything, and run it again right before you start.

## Architecture

::diagram[d09-upgrade-sequence]

The sequence diagram is the "what". The workflow diagram below is the "how" for each domain:

::diagram[d09-lifecycle-workflow]

## Components

| Actor | Responsibility in the workflow |
|---|---|
| **VCF Operations** (Fleet Management > Lifecycle) | Planner UI, precheck trigger, schedule, task monitoring, update history |
| **Fleet management** | Patches itself first, then plans and applies upgrades of the management components |
| **SDDC Manager** | Runs core prechecks, computes the sequence, acquires resource locks, calls NSX/vCenter/vLCM upgrade APIs |
| **NSX Manager** | Upgrades its manager cluster and edges; host components update with the ESX phase |
| **vCenter** | Upgraded via a new appliance and switchover; then its vLCM remediates hosts |
| **vSphere Lifecycle Manager** | Applies the cluster image to hosts (next lesson) |

## How It Works

### Management components (VCF Management tab)

1. Connect a depot and download binaries for fleet management and the target management components.
2. **Patch/upgrade VCF Operations fleet management** first. TechDocs: fleet management "must be upgraded or patched
   before you can upgrade or patch the remaining VCF management components."
3. **Plan the upgrade** for the management components and upgrade VCF Operations.
4. Upgrade (or patch) the remaining management components individually.

### Core components (VCF Instances tab), per domain

1. Download the core binaries to SDDC Manager (VCF Instances > Binary Management).
2. Go to **Fleet Management > Lifecycle > VCF Instances > (select domain) > Updates**.
3. Click **Precheck** and resolve every issue.
4. In **Available Updates**, click **Plan Upgrade** and choose the target VCF version.
5. Optionally click **Customize Upgrade** to use flexible BOM: choose a target version per core component in the
   *Target Version* column, then **Validate Selection** and **Confirm**.
6. Review the update sequence VCF generated and click **Done**.
7. Click **Update Now** or **Schedule Update** for each component until all are updated.
8. Verify, then repeat for the next domain.

### Patching instead of upgrading

The **patch planner** lets you patch an individual core component (for example apply a vCenter patch) without moving
the whole domain to a new BOM. SDDC Manager itself can also be updated or patched on its own. Patches are not
synchronised across components and may be applied in any order.

## Deep Dive

### Resource locks

While SDDC Manager upgrades vCenter, NSX or ESX, it acquires a [[resource-lock]] so that conflicting day-N operations
cannot run at the same time in that instance or domain.

| Lock | Scope | Effect |
|---|---|---|
| **SYSTEM** | Whole VCF instance | Blocks all day-N operations |
| **DOMAIN** | One management or workload domain | Blocks operations in that domain |
| **CLUSTER** | One cluster | Other clusters in the domain can still be worked on |

TechDocs lists operations blocked in all upgrade scenarios: SDDC Manager upgrades or patches, backup and restore,
certificate rotation for management components, and concurrent upgrades of the same component type. Management domain
upgrades are the most restrictive. Workload domain upgrades allow certain cross-domain operations when domains do not
share NSX. Host add/remove/commission/decommission is blocked for the same domain and cluster but allowed elsewhere.

:::tip
Practical consequence: schedule certificate replacement, password rotation and backups **outside** the upgrade
window, and tell your colleagues not to commission hosts into the cluster being remediated.
:::

### How vCenter is upgraded

SDDC Manager upgrades vCenter with a **reduced downtime** approach: it deploys a new vCenter VM (with temporary
settings), migrates data from the old appliance, switches over, powers off the original VM, and in a post-upgrade
step deletes it and renames the new VM to the original inventory name (KB 427385 describes this cleanup and what to do
when it fails). Downtime is limited to the switchover. The vSphere 9 vCenter itself also supports Reduced Downtime
Update with manual, automatic or scheduled switchover.

### Flexible BOM: when and why

Use **Customize Upgrade** when you must hold one component back (for example a third-party integration certified only
on a specific vCenter build) or move one component ahead for a security fix. VCF still validates the selection and
generates the order. Do not use it to create long-lived odd combinations: you increase the number of version pairs
you must check in the interoperability matrix.

:::legacy VCF 5.x / Legacy Context
Upgrading **from VCF 5.x to 9.0** is its own documented path: all workload domains must be on VCF 5.0 or later
(older domains go to 5.0 first), the tasks run from VCF Operations (or the SDDC Manager UI, which is being
deprecated), and after success you remove VM snapshots taken before the upgrade and back up the newly installed
components. KB 390634 adds the 5.x-specific steps (for example patching Aria Suite Lifecycle and newly installing VCF
Identity Broker and VCF Operations for logs). Check the "Upgrading VMware Cloud Foundation 5.x Workload Domains to 9.0"
section for your exact path.
:::

### Multiple instances and shared NSX

Each instance upgrades its own core components with its own SDDC Manager. Management components are upgraded once for
the fleet. When workload domains share an NSX instance, NSX is upgraded once for all of them, and the locks reflect
that sharing.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

| Planner action | Where | Notes |
|---|---|---|
| Precheck | Domain > Updates > Precheck | Fix all errors; re-run before the window |
| Plan Upgrade | Domain > Updates > Available Updates | Select target VCF version |
| Customize Upgrade | In the plan | Flexible BOM: per-component target, Validate Selection, Confirm |
| Update Now / Schedule Update | Per component in the sequence | Scheduling lets you align with maintenance windows |
| Binary Management | Fleet Management > Lifecycle (VCF Management or VCF Instances) | Upgrade, patch or install binaries per version and component |

Checklist before **Update Now**:

1. Recent successful backups of SDDC Manager, vCenter and NSX (configured file-based backups).
2. Precheck green (or warnings understood and accepted).
3. No other workflows running; no failed workflows left unresolved.
4. DRS (Distributed Resource Scheduler) fully automated and enough capacity to evacuate one host at a time (vSAN data migration policy considered).
5. Interoperability verified for anything outside the BOM (backup, plugins, firmware).
6. Change window agreed; stakeholders know which operations are locked.

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Everything in the planner is backed by the SDDC Manager public API (for example update and precheck resources) and
by the VCF Operations API. You will practise API access in [VCF APIs and PowerCLI](lesson:vcf-apis-powercli). During
an upgrade, the most useful CLI work is read-only log reading on SDDC Manager:

```shell
# on SDDC Manager, as vcf then su to root
tail -f /var/log/vmware/vcf/lcm/lcm-debug.log
```

## Failure Scenarios

| Scenario | What you see | Root cause pattern |
|---|---|---|
| Precheck error "host not responding" | Upgrade blocked | A host in the cluster is disconnected; vCenter cannot report its version |
| Upgrade of management component blocked | Planner refuses | Fleet management not yet on the target version |
| Host commissioning fails during window | Task rejected | DOMAIN/CLUSTER resource lock held by the upgrade |
| vCenter upgrade stuck after switchover | Old VM still present, new VM has temporary name | Post-upgrade cleanup failed (for example host not responding) |
| ESX remediation stalls | Host cannot enter maintenance mode | DRS not automated, VM pinned to host, or vSAN cannot evacuate |

## Troubleshooting

- Re-run the **precheck** after every fix; it is cheap and read-only.
- For a blocked task, check whether another workflow holds a **lock** (task list in VCF Operations).
- For core component failures, read `/var/log/vmware/vcf/lcm/lcm-debug.log` on SDDC Manager and search the exact
  stage name and error in the Broadcom KB.
- For management component failures, read the fleet management log (`/var/log/vrlcm/vmware_vrlcm.log`).
- Details and recovery patterns follow in [lifecycle failures and recovery](lesson:lifecycle-failures-recovery).

## Real-World Scenario

A bank has a management domain and three workload domains, two of which share an NSX instance. Their 9.0.0 to 9.0.1
runbook: week 1 upgrade fleet management, VCF Operations, then VCF Automation, Identity Broker, logs and networks.
Week 2 management domain: precheck on Monday (one warning about a host with an expiring certificate, fixed),
SDDC Manager, NSX, vCenter Tuesday night, ESX Wednesday and Thursday, vSAN Friday. Weeks 3-4 workload domains, the two
sharing NSX planned together. Certificate renewals and the quarterly password rotation were moved to week 5 because of
resource locks.


## Exam Focus

:::exam
- Memorise the order: **fleet management > VCF Operations > other management components > SDDC Manager > NSX >
  vCenter > ESX > vSAN**, management domain before workload domains.
- Precheck is a prerequisite; errors block, warnings inform.
- Planner path: Fleet Management > Lifecycle > VCF Instances > domain > Updates > Precheck / Plan Upgrade /
  Customize Upgrade.
- Resource locks: SYSTEM, DOMAIN, CLUSTER; backups, certificate rotation and SDDC Manager upgrades are blocked during
  core upgrades.
:::

## Common Exam Traps

:::trap
- vCenter before NSX? No: in VCF the core order is SDDC Manager, **NSX**, **vCenter**, ESX.
- "Upgrade VCF Operations first" - fleet management comes before VCF Operations.
- "Workload domains first to reduce risk to management" - management domain first.
- "Patches must follow the same strict order" - patches can be applied in any order.
- "Flexible BOM skips validation" - it does not; selections are validated.
:::

## Knowledge Check

::quiz

## Summary

- Order: fleet management, VCF Operations, other management components, then per instance SDDC Manager, NSX,
  vCenter, ESX, vSAN, management domain first.
- Precheck before planning; fix errors; re-run before the window.
- Planner: Plan Upgrade, optional Customize Upgrade (flexible BOM), Validate Selection, review order, Update Now or
  Schedule Update.
- Resource locks (SYSTEM, DOMAIN, CLUSTER) block conflicting day-N operations during core upgrades.
- vCenter is upgraded with a new appliance and switchover.

## Next Topic

Next, look inside the ESX step: [vLCM images and host remediation](lesson:vlcm-images-host-remediation).
