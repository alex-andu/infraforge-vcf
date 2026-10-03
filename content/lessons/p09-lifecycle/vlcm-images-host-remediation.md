---
id: vlcm-images-host-remediation
title: vLCM Images and Host Remediation in VCF 9.0
phase: p09-lifecycle
module: m09-lcm
version: vcf9
minutes: 40
difficulty: intermediate
summary: How vSphere Lifecycle Manager images define the desired state of ESX hosts, how VCF imports and uses them, and what happens step by step when a cluster is remediated.
topics: [vlcm, lcm-workflow]
objectives: ["4.2"]
keyTerms: [vlcm-image, hardware-support-manager, remediation, precheck]
labs: [lab-lifecycle-upgrade-planning]
incidents: [inc-lcm-precheck-failure]
components: [vcenter, esx-host, sddc-manager, vsan, vcf-operations]
related: [lifecycle-upgrade-workflow, lifecycle-failures-recovery, lifecycle-concepts]
sources:
  - title: "VCF 9.0 TechDocs - vSphere Lifecycle Manager Images in VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-of-vcf-core-components/managing-vsphere-lifecycle-manager-images-for-vmware-cloud-foundation.html
  - title: "VMware blog - vSphere in VCF 9.0: What's New"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/23/vsphere-in-vcf-9-0-whats-new/
  - title: "Broadcom KB 419331 - vCenter 9.0 does not support ISO file import in Lifecycle Manager"
    url: https://knowledge.broadcom.com/external/article/419331/vcenter-90-does-not-support-iso-file-imp.html
  - title: "Broadcom KB 442222 - Unable to compute the checksum for image specification (import in VCF Operations)"
    url: https://knowledge.broadcom.com/external/article/442222
  - title: "Broadcom KB 447058 - vLCM parallel remediation limitations in a vSAN cluster"
    url: https://knowledge.broadcom.com/external/article/447058/vsphere-lifecycle-manager-vlcm-parallel.html
  - title: "Broadcom KB 446635 - Managing parallel remediation for ESXi hosts in vLCM"
    url: https://knowledge.broadcom.com/external/article/446635/managing-parallel-remediation-for-esxi-h.html
---

## Why This Matters

ESX hosts are the most numerous and most hardware-dependent part of VCF. A cluster of sixteen hosts can drift in
sixteen different ways: a driver installed by hand, a NIC firmware a generation behind, a vendor agent missing. vSphere
Lifecycle Manager (vLCM) fixes this with a single declarative **image** per cluster: "every host in this cluster must
look exactly like this". VCF builds on that: you cannot create a workload domain, add a cluster or upgrade ESX in VCF
9.0 without a vLCM image. If you understand images and remediation, the ESX step of every upgrade becomes predictable.

## Learning Objectives

- List the four building blocks of a [[vlcm-image]] and say which are optional.
- Explain why baselines are not available in vSphere 9 and what that means for VCF.
- Describe how an image is created in the vSphere Client and imported into a VCF instance through VCF Operations.
- Walk through compliance check, remediation pre-check and remediation, including maintenance mode behaviour.
- Explain the multi-image cluster (additional image definitions) and [[hardware-support-manager]] roles.

## Concept

### Desired state instead of patch lists

Older vSphere used **baselines** (VUM): lists of patches to apply. Two hosts with the same baselines could still differ.
An **image** is declarative: it describes the *entire* software (and optionally firmware) stack a host must run.
vLCM compares each host with the image and makes the host match.

:::vcf9 Changed in VCF 9
"Baseline-managed (VUM based) clusters and standalone hosts are not supported in vSphere 9." New clusters and hosts
use image-based lifecycle automatically, and VCF 9.0's image management notes that baselines are not supported.
vCenter 9.0 also removed **Import ISO** from vLCM: you import **offline bundles** (ZIP) into the depot and **JSON image
files** into the image library, a cluster or a standalone host.
:::

:::legacy VCF 5.x / Legacy Context
VCF 4.x and 5.x supported both baseline-based (vLCM baselines) and image-based workload domains, and you could convert
between them. In VCF 9.0 everything is image-based, so a 5.x domain still on baselines must be converted before it can
follow the 9.0 path. Check the 5.x-to-9.0 upgrade documentation for the conversion step.
:::

### Image building blocks

| Element | Required? | Contents | Who provides it |
|---|---|---|---|
| **ESX base image** | Yes | The ESX version and build | Broadcom |
| **Vendor add-on** | No | OEM drivers, agents and tools for a server family | Server vendor |
| **Firmware and drivers add-on** | No | BIOS, NIC, storage controller firmware | Server vendor through a hardware support manager |
| **Components** | No | Individual packages that add to or override the above (for example a newer NIC driver) | Broadcom or vendors |

### Multi-image clusters

vSphere 9 lets a cluster carry **up to four additional image definitions** on top of the base, each optionally with its
own hardware support manager. Hosts are matched to an image definition automatically (from System BIOS information) or
manually. This supports clusters with mixed hardware generations or vendors, while the ESX base version stays the same
for the whole cluster (the base image is not customised per definition).

## Architecture

::diagram[d09-vlcm-image-composition]

Where each piece lives:

- The **image definition** lives in vCenter (per cluster). vLCM is a vCenter service.
- The **vLCM depot** in vCenter holds the components the image refers to (synchronised from an online source or
  imported offline bundles).
- **VCF** keeps its own copy of images per instance: you **import** an image into the VCF instance so SDDC Manager can
  use it when creating a workload domain, adding a cluster, or upgrading ESX.
- **ESX component data** (the ESX content in the SDDC Manager depot) is downloaded or synchronised per VCF instance;
  on an offline depot it lives under `umds-patch-store`.

## Components

| Component | Role |
|---|---|
| **vLCM (vCenter)** | Stores cluster images, computes compliance, runs pre-checks, remediates hosts |
| **SDDC Manager** | Stores imported images for the instance and asks vCenter/vLCM to apply them during domain, cluster and upgrade workflows |
| **VCF Operations** | UI for image import: Fleet Management > Lifecycle > VCF Instance > SDDC Manager > Image Management > Import Image |
| **Hardware support manager (HSM)** | Vendor plugin that lets vLCM read and apply firmware |
| **ESX host** | Target of remediation; enters maintenance mode, installs, reboots (unless live patch applies) |
| **DRS / vSAN** | Evacuate VMs and data so a host can enter maintenance mode |

## How It Works

### Creating and importing an image for VCF

1. In the **vSphere Client**, make the components available in the vLCM depot (online sync or **Import Updates** with
   an offline bundle).
2. Create the image (for example on a cluster or in the image library), choose the ESX base, vendor add-on, firmware
   add-on and components. Validate and save.
3. In **VCF Operations**, go to Fleet Management > Lifecycle > VCF Instance > SDDC Manager > **Image Management** and
   **Import Image**, select the image from vCenter. Monitor in Fleet Management > Tasks.
4. Use the imported image when creating a domain, adding a cluster, or upgrading ESX in a domain.

KB 442222 is a good illustration of order: trying to import in VCF Operations before the image exists in vCenter
Lifecycle Manager fails with "Unable to compute the checksum for image specification".

### Remediating a cluster

1. **Check compliance.** vLCM compares each host with the image. States: compliant, non-compliant, incompatible,
   unknown.
2. **Remediation pre-check.** vLCM checks that remediation can succeed: hardware compatibility, maintenance mode
   feasibility (DRS, vSAN health and capacity), host state.
3. **Stage (optional).** Payloads are copied to hosts in advance to shorten the window.
4. **Remediate host by host.** For each non-compliant host: enter maintenance mode (DRS migrates VMs; vSAN moves or
   ensures accessibility of data per the chosen mode), apply the image, reboot if needed, exit maintenance mode.
5. **Re-check compliance** for the cluster.

In VCF the ESX step of an upgrade drives exactly this flow through SDDC Manager, with the CLUSTER resource lock held.

## Deep Dive

### Live patching

vSphere 9 extends live patching to vmkernel, user-space, the VMX and NSX components, so some patches apply **without
maintenance mode or reboot**. Whether a given patch is live-patchable is stated in its release notes. Plan for full
maintenance mode anyway; treat live patch as a bonus.

### Parallel versus sequential remediation

vLCM can remediate several hosts in parallel, but there are limits:

- Parallel remediation acts on hosts that are **already in maintenance mode** when the cluster remediation starts
  (KB 446635). It does not put them in maintenance mode for you.
- **vSAN clusters are remediated sequentially**: one host in maintenance mode at a time, so vSAN can keep data
  available and resynchronise (KB 447058).
- vSphere 9 also lets you remediate a **subset of hosts in a batch**, so a large cluster can be spread over several
  windows.

### Hardware support manager and firmware

Without an HSM, firmware is not part of the image and remediation can only warn that firmware information is
unavailable. With an HSM (for example a vendor's management plugin registered in vCenter), firmware becomes part of
compliance, and remediation can update it in the same maintenance-mode cycle.

### Compliance states in practice

| State | Meaning | Typical action |
|---|---|---|
| Compliant | Host matches image | None |
| Non-compliant | Host differs (older build, extra/missing component) | Remediate |
| Incompatible | Image cannot be applied (hardware, conflicting component) | Fix image or hardware first |
| Unknown | Not yet checked | Run compliance check |

## Configuration

Image decisions you make per cluster:

| Decision | Recommendation |
|---|---|
| Base image | The ESX version from the target VCF BOM |
| Vendor add-on | Match your server vendor and the target ESX version (check vendor support) |
| Firmware add-on | Use only with a supported HSM; otherwise keep firmware out and update it separately |
| Extra components | Keep minimal; each override is something you must re-validate on every upgrade |
| Additional image definitions | Only for genuinely mixed hardware |

:::tip
In a nested home lab there is no real hardware vendor, so your image is just the ESX base (plus perhaps a component).
Do not add a vendor add-on for nested ESX: it brings drivers for hardware your VMs do not have.
:::

## CLI / API

On a host, these read-only commands show what vLCM sees (ESXCLI, run in an SSH session on ESX):

```shell
esxcli software baseimage get      # the base image version on the host
esxcli software vib list | head    # installed VIBs (components are made of VIBs)
```

At scale, use the vSphere Automation API (`/api/esx/settings/clusters/{cluster}/software` resources) or PowerCLI.
Check the API reference for your version before scripting.

## Failure Scenarios

| Scenario | Effect | Fix |
|---|---|---|
| Host cannot enter maintenance mode | Remediation stalls/fails on that host | DRS fully automated, capacity, vSAN data migration mode, VM affinity rules |
| Image incompatible with a host | Pre-check fails | Correct vendor add-on/components or update hardware |
| Image not present in vCenter when importing to VCF | Import error (checksum) | Create the image in vLCM first (KB 442222) |
| ESX components missing in VCF | Cannot plan ESX upgrade | Download/sync ESX component data; offline depot `umds-patch-store` reachable without auth |
| Disconnected host in the cluster | SDDC Manager prechecks fail | Reconnect or remove the host from the cluster |

## Troubleshooting

1. Read the **pre-check** results in the vSphere Client (cluster > Updates). They usually name the host and reason.
2. Check **DRS** mode and **vSAN health**; try entering the host into maintenance mode manually to see the real
   blocker.
3. Confirm the **image** in vCenter matches what VCF imported (same base, add-on, components).
4. Inspect the host's current state with `esxcli software baseimage get` and `esxcli software vib list`.
5. If remediation failed mid-way, fix the cause and remediate again; vLCM is idempotent for compliant hosts.

## Real-World Scenario

A retailer runs a VCF workload domain with two hardware generations of the same vendor. Before 9.0 they kept two
clusters just to keep images clean. With additional image definitions in vSphere 9 they merged them: one base ESX
version, two image definitions with different firmware add-ons, each with the vendor's HSM, hosts matched by BIOS
information. Their ESX step is now one cluster upgrade, sequential because it is vSAN, spread over two nights using
batch remediation.

## Lab

::lab[lab-lifecycle-upgrade-planning]

In the lab, inspect the image of your nested cluster in the vSphere Client and run a compliance check. On nested ESX
the image is only the base image; that is fine for practising the workflow.

## Exam Focus

:::exam
- Image = **base image (required)** + vendor add-on + firmware and drivers add-on (HSM) + components.
- **Baselines are not supported** in vSphere 9 / VCF 9.0.
- Images are created in the **vSphere Client** and **imported into VCF** through VCF Operations, then used for
  domain creation, adding clusters and upgrades.
- Remediation: compliance check, pre-check, maintenance mode, apply, reboot, exit. vSAN clusters remediate
  sequentially.
:::

## Common Exam Traps

:::trap
- "Create the image in VCF Operations from an ISO" - images are created in vLCM; ISO import was removed in vCenter 9.0.
- "Firmware is always part of the image" - only with a hardware support manager.
- "Parallel remediation will put hosts in maintenance mode for you" - it acts on hosts already in maintenance mode.
- "Each additional image definition can use a different ESX version" - the base ESX version is shared.
:::

## Knowledge Check

::quiz

## Summary

- vLCM images declare the desired state of every host in a cluster; baselines are gone in vSphere 9.
- Image = base + optional vendor add-on, firmware add-on (HSM) and components; up to four additional image
  definitions for mixed hardware.
- VCF imports images from vCenter and uses them for domains, clusters and upgrades.
- Remediation is compliance check, pre-check, then host-by-host maintenance mode cycles (sequential on vSAN).

## Next Topic

When something in this chain fails, go to [lifecycle failures and recovery](lesson:lifecycle-failures-recovery).
