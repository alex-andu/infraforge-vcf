---
id: license-management
title: License Management in VCF 9.0
phase: p12-security
module: m12-trust
version: vcf9
minutes: 35
difficulty: intermediate
summary: The VCF 9 subscription licensing model - license files instead of keys, registration of VCF Operations with the VCF Business Services console, connected and disconnected modes, assigning licenses to vCenter, usage reporting and what happens on expiry.
topics: [licensing]
objectives: ["4.2"]
keyTerms: [license-file, vcf-business-services-console]
labs: [lab-explore-vcf-fleet]
incidents: []
components: [vcf-operations, vcenter, esx-host, nsx-manager]
related: [vcf-identity-sso-rbac, password-management, lifecycle-concepts]
sources:
  - title: "VCF 9.0 TechDocs - Licensing"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/licensing.html
  - title: "VCF 9.0 TechDocs - Licensing overview"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/licensing/licensing-overview.html
  - title: "VCF 9.0 TechDocs - Register VCF Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/licensing/register-vcf-operations.html
  - title: "VCF 9.0 TechDocs - Assign licenses to a vCenter instance"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/licensing/assign-a-licenses-to-a-vcenter-instance.html
  - title: "Broadcom KB 437242 - Getting started with VCF or VVF V9 licensing"
    url: https://knowledge.broadcom.com/external/article/437242/getting-started-with-vmware-cloud-founda.html
---

## Why This Matters

Licensing used to be the boring part: paste a 25-character key into vCenter, done. In VCF (VMware Cloud Foundation) 9.0 it is a workflow with
its own console, a registration step, and a **usage reporting obligation**. If you get it wrong, the consequences are
operational, not just contractual: after expiry and its grace period, management operations are prevented, ESX hosts
disconnect and you cannot create workloads. The exam asks you to "configure license management within VMware Cloud
Foundation", so you must know where licenses live, how they flow and what the time limits are.

## Learning Objectives

- Explain why VCF 9 uses [[license-file|license files]] instead of license keys, and what a default license is.
- Register VCF Operations with the [[vcf-business-services-console]] in connected or disconnected mode.
- Assign primary and add-on licenses to vCenter instances and explain automatic licensing of ESX and NSX.
- State the evaluation, reporting (180 days) and expiry (90 days) timelines and their consequences.

## Concept

### From keys to files

| | VCF 5.x / vSphere 8 | VCF 9.0 |
|---|---|---|
| Unit of license | 25-character key per product | **Subscription-based license file** |
| Where managed | vCenter licensing, SDDC (Software-Defined Data Center) Manager license inventory | **VCF Operations** + **VCF Business Services console** (vcf.broadcom.com) |
| What you license | vCenter, ESX, vSAN, NSX separately | **vCenter instances only**; components behind them are licensed automatically |
| Reporting | None | Usage report at least every **180 days** |

When you buy a subscription, the VCF Business Services console creates a **default license**: a pool of capacity from
all active subscriptions of the same product in the same Site ID. With your first subscription you also receive
version 8.x license keys for older environments.

### Primary and add-on licenses

| Type | Examples | Capacity unit |
|---|---|---|
| **Primary** | VMware Cloud Foundation, VMware vSphere Foundation | **Cores** |
| **Add-on** | vSAN add-on capacity, VMware Private AI Foundation with NVIDIA | vSAN in **TiB**; Private AI in cores |

Primary licenses are assigned first; add-ons after.

### Connected vs disconnected

| | Connected (recommended) | Disconnected |
|---|---|---|
| Registration | Activation code pasted into VCF Operations; license file downloaded automatically | Registration file (JWS) downloaded from VCF Operations, uploaded to the console; license file imported manually |
| Usage reporting | Automatic | Manual: export usage file, upload, import updated license |
| Internet | VCF Operations reaches Broadcom | Dark site |

You can switch modes at any time.

## Architecture

::diagram[d12-licensing-flow]

The single most important architectural fact: **licenses are assigned only to vCenter instances**. ESX hosts, NSX,
VCF Automation and other components attached to a licensed vCenter are licensed automatically.

## Components

| Component | Licensing role |
|---|---|
| **VCF Business Services console** (vcf.broadcom.com) | Subscriptions, default licenses, splitting allocations between VCF Operations instances, registration, usage uploads |
| **VCF Operations** | Registered asset; holds licenses; assigns them to vCenter; generates usage reports; License Management area |
| **vCenter** | License assignment target; must be integrated with VCF Operations |
| **ESX, NSX, others** | Licensed through their vCenter |

## How It Works

1. **Deploy or upgrade VCF Operations 9.** It runs in evaluation mode for up to **90 days**; register within that time.
2. **Register** VCF Operations in the VCF Business Services console. Purchased cores pool into one default license per
   product; with several VCF Operations instances you **split** the allocation (vertical-ellipsis menu in the console).
   The allocation is the upper limit of what the environment may use.
3. **Get the license file**: connected mode uses an activation code in VCF Operations; disconnected mode imports a file.
4. **Integrate vCenter instances** with VCF Operations (add the vCenter accounts). It can take up to four collection
   cycles before a vCenter appears on the Licenses page.
5. **Assign**: VCF Operations > **License Management > Licenses** > **Version 9+** tab > select vCenter instances >
   **Assign Primary License** > choose license > **Assign**. Then add-on licenses.
6. **Report usage** at least every 180 days (automatic when connected) and update the license to confirm the report
   was received.

Prerequisites for assignment: the **Manage Licenses** permission in VCF Operations, a registered VCF Operations,
licenses already added, the vCenter integrated, and in vSphere the LicenseService.Administrators membership and Global
Licenses privilege.

## Deep Dive

### Capacity and evaluation

You cannot assign a license to a vCenter if it needs more capacity than is available. If you add hosts that exceed
available capacity, those hosts run in **evaluation mode for 90 days** before they may be disconnected.

### Expiry timeline

1. Notifications appear before expiration.
2. After the license expires you have **90 days** to update it.
3. After that: management operations are prevented, **ESX hosts disconnect**, and workload creation is blocked.

### Reporting obligation

"License usage reports are required at least once every 180 days to maintain your licenses and you must update your
license to confirm that the license usage report was submitted." In connected mode this is automatic; in disconnected
mode put a recurring calendar task in place.

### Licensing across a fleet

Licensing follows the **VCF Operations instance**, not the SDDC Manager or the VCF instance. A typical fleet has one
VCF Operations, so one registration covers every vCenter it manages, across all VCF instances. Organisations that run
several VCF Operations instances (for example separate fleets for separate business units or sites) split the default
license in the VCF Business Services console so that each registered VCF Operations receives its own allocation. Plan
this split before registration: the allocation per VCF Operations is the ceiling for the cores its vCenters may
consume, and moving capacity later is a console operation followed by a license update in each VCF Operations.

### What licensing does not do

Licensing does not grant permissions, enable SSO (Single Sign-On) or change features per user. It enforces capacity (cores, TiB) and
entitlement (which products and add-ons you may run). If a feature is missing, check the license edition (VCF versus
VVF, add-ons) before you look at RBAC (Role-Based Access Control).

:::vcf9 Changed in VCF 9
NSX is no longer separately licensed in VCF 9: it is covered via the vCenter it is attached to. Licensing moved from
keys in vCenter/SDDC Manager to files managed by VCF Operations and the VCF Business Services console.
:::

:::legacy VCF 5.x / Legacy Context
In VCF 5.x you added keys for vCenter, ESX, vSAN and NSX to the SDDC Manager license inventory and assigned them when
creating domains, or later in vCenter/NSX. Those 8.x-era keys are still provided with your subscription for older
environments, but VCF 9 components use the file-based model.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

| Task | Where |
|---|---|
| Register / switch connected vs disconnected | VCF Operations License Management area, plus the VCF Business Services console |
| Split capacity between VCF Operations instances | VCF Business Services console |
| Assign primary/add-on license | VCF Operations > License Management > Licenses > Version 9+ |
| Update / remove licenses, deactivate/reactivate VCF Operations instances | VCF Operations License Management, with the console |
| View usage analytics | License usage analytics (see TechDocs) |

### Licensing checklist for a new VCF 9 deployment

1. Note the deployment date: the 90-day evaluation clock for VCF Operations starts there (or at upgrade).
2. Decide connected or disconnected mode with your security team before go-live.
3. In the VCF Business Services console, confirm the default license shows the cores (and vSAN TiB) you purchased
   for the right Site ID; split it if you will register more than one VCF Operations.
4. Register VCF Operations and import the license file.
5. Confirm every vCenter is integrated and visible on the Licenses page (allow up to four collection cycles).
6. Assign the primary license to each vCenter, then add-on licenses.
7. Confirm hosts show as licensed (not in evaluation) in each cluster.
8. For disconnected mode, create a recurring task well inside 180 days for usage reporting.

:::tip
For your home lab, licensing depends on what entitlement you have (for example a VMUG Advantage / VCP-VCF entitlement,
documented by William Lam). The evaluation window gives you up to 90 days to practise before registration.
:::

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

License management is designed as a UI and console workflow. VCF Operations has APIs, but for the exam and for your
lab, the UI paths above are what matter. Check the VCF Operations API reference for your version if you automate it.

## Failure Scenarios

| Scenario | Impact | Fix |
|---|---|---|
| Not registered within 90 days of deployment | Evaluation ends | Register VCF Operations |
| Usage not reported for 180 days (disconnected) | License not maintained; leads to expiry | Export/upload usage, import updated license |
| License expired and 90 days passed | Management operations blocked, hosts disconnect, no new workloads | Update license immediately |
| Hosts exceed allocated cores | New hosts in 90-day evaluation | Increase allocation or reduce usage |
| vCenter not visible on Licenses page | Cannot assign | Integrate vCenter; wait up to 4 collection cycles |
| Assignment fails | Permissions | Manage Licenses + LicenseService.Administrators + Global Licenses |

## Troubleshooting

1. Is VCF Operations **registered**, and in which mode?
2. Is the vCenter **integrated** and collected (adapter running)?
3. Is there **capacity** in the license for the cores required?
4. Do you have the **permissions** in VCF Operations and vSphere?
5. When was **usage last reported**?

## Real-World Scenario

A defence contractor runs VCF in a dark site. They registered VCF Operations in disconnected mode: downloaded the JWS
registration file, carried it to an internet-connected workstation, uploaded it to vcf.broadcom.com, and imported the
license file. They assigned the VCF primary license to both vCenters and a vSAN add-on to the workload vCenter. Every
quarter, well inside the 180-day limit, an operator exports the usage file, uploads it and imports the updated license.
Nobody touches ESX or NSX licensing: both inherit from vCenter.


## Exam Focus

:::exam
- License **files**, not keys; managed in **VCF Operations** with the **VCF Business Services console**.
- Assign to **vCenter instances only**; ESX, NSX and others are licensed automatically.
- Primary (cores) then add-on (e.g. vSAN TiB).
- Timelines: **90-day evaluation**, usage report every **180 days**, **90 days** after expiry before hosts disconnect.
- Connected (activation code, automatic reporting) vs disconnected (files).
:::

## Common Exam Traps

:::trap
- "Enter the license key in each ESX host" - assign to vCenter in VCF Operations.
- "License NSX separately" - not in VCF 9.
- "Disconnected mode needs no reporting" - it needs manual reporting every 180 days.
- "Assign licenses in SDDC Manager" - VCF Operations is the place in 9.0.
:::

## Knowledge Check

::quiz

## Summary

- VCF 9 uses subscription license files from the VCF Business Services console, managed in VCF Operations.
- Register (connected or disconnected), assign primary then add-on licenses to vCenter instances.
- 90-day evaluation, 180-day usage reporting, 90 days after expiry before hard impact.

## Next Topic

Phase 12 is complete. Continue with phase 13, where certificate, password and licensing problems show up as symptoms
in [the troubleshooting methodology](lesson:troubleshooting-methodology).
