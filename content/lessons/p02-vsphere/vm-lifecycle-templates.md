---
id: vm-lifecycle-templates
title: VM Lifecycle, Templates, Content Libraries and Migration
phase: p02-vsphere
module: m02-clusters-vms
version: vcf9
minutes: 45
difficulty: intermediate
summary: Deploying and configuring VMs in vCenter — new VMs, clones, templates, guest customization, OVF/OVA, content libraries (local, published, subscribed), snapshots, vMotion/Storage vMotion and EVC — and where these building blocks reappear in VCF Automation and Supervisor.
topics: [vm-management, virtual-hardware, vsphere-cluster]
objectives: ["2.2", "4.4"]
keyTerms: [vm-template, content-library, guest-customization, ovf, vmotion, storage-vmotion, evc, snapshot, vmware-tools]
labs: [lab-vm-templates-content-library]
incidents: []
components: [vcenter, esx-host]
related: [drs-resource-management, vcenter-architecture-inventory, vcf-automation-tenancy-regions, cpu-memory-virtualization]
sources:
  - title: "vSphere 9.0 – vSphere Virtual Machine Administration (guide index)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-virtual-machine-administration.html
  - title: "vSphere 9.0 – Deploying Virtual Machines"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-virtual-machine-administration/deploying-virtual-machines.html
  - title: "vSphere 9.0 – Using Content Libraries"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-virtual-machine-administration/using-content-libraries.html
  - title: "vSphere 9.0 – vSphere Virtual Machines Migration"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-and-host-management/migrating-virtual-machines.html
  - title: "vSphere 9.0 – Host Configuration for vSphere vMotion"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-and-host-management/migrating-virtual-machines/migration-with-vmotion/host-configuration-for-vmotion.html
  - title: "vSphere 9.0 – CPU Compatibility and vSphere Enhanced vMotion Compatibility"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-and-host-management/migrating-virtual-machines/cpu-compatibility-and-evc.html
  - title: "vSphere 9.0 – Managed Inventory Objects (templates, vApps)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-and-host-management/vsphere-concepts-and-features/vsphere-managed-inventory-objects.html
---

## Why This Matters

Everything VCF builds exists to run virtual machines. Even in a fleet driven by VCF Automation, the VM operations underneath are vCenter operations: clone from a template, customize the guest, place on a cluster, migrate with vMotion. VCF Automation's provider content library (objective 4.4) is a vCenter **content library**; Supervisor's VM Service consumes VM images from content libraries; lifecycle remediation depends on vMotion. Objective 2.2 says it directly: *deploy and configure virtual machines* and *manage a virtual machine through vCenter*.

## Learning Objectives

- Choose the right deployment method: new VM, clone, template, instant clone, OVF/OVA, content library.
- Build a template with a guest customization specification and deploy from it.
- Explain local, published and subscribed content libraries, and VM templates versus OVF templates in a library.
- Pick the right migration type (cold, vMotion, Storage vMotion, compute + storage, cross-vCenter) and meet its requirements.
- Use EVC to keep vMotion working across CPU generations.

## Concept

### Ways to create VMs (vSphere 9.0)

| Method | Use when | Result |
|---|---|---|
| New virtual machine | No suitable source exists | Empty VM; install the OS yourself |
| Clone a VM | One-off copy of an existing VM | Independent copy (optionally customized) |
| Clone/convert to [[vm-template]] | Standard build to deploy many times | Template object; cannot be powered on |
| Deploy from template | Standard provisioning | New VM + optional [[guest-customization]] |
| Instant clone | Many powered-on VMs from a running parent's state | Fast, shares parent memory/disk state |
| Deploy [[ovf|OVF/OVA]] | Vendor appliances (vCenter, NSX, etc. are OVAs) | VM or vApp from a portable package |
| [[content-library|Content library]] item | Share templates/ISOs across clusters and vCenters | VM from a library OVF template or VM template |

A **template** is "a primary copy of a virtual machine that can be used to create and provision new virtual machines". *Convert to template* turns the VM itself into a template; *clone to template* keeps the VM and creates a template copy.

### Building blocks of a VM

- **VM hardware version (compatibility)**: which virtual hardware features and which ESX versions can run the VM. Upgrade only when you need new features and all hosts that may run the VM support it.
- **VMware Tools** ([[vmware-tools]]): drivers and the guest agent; needed for clean shutdown, guest customization, heartbeats for HA VM Monitoring, and IP reporting. Linux distributions ship `open-vm-tools`.
- **Files**: `.vmx` (configuration), `.vmdk` (disk descriptor + data), `.nvram`, logs, snapshot delta files, all in the VM folder on a datastore.

## Architecture

::diagram[d02-vm-provisioning-content-library]

## Components

| Component | Where | Purpose |
|---|---|---|
| Templates (inventory) | vCenter VMs & Templates view | Source for deploy-from-template |
| VM customization specifications | vCenter **Policies and Profiles** | Hostname, IP, domain join, time zone applied at deploy |
| Content library | vCenter; content on a datastore | Holds OVF templates, VM templates, ISOs, other files |
| Content Library service | vCenter appliance | Sync between published and subscribed libraries over HTTPS |
| vMotion network | VMkernel adapters on hosts | Live migration data path |
| EVC | Cluster (or per-VM) setting | Masks CPU features for migration compatibility |

## How It Works

### Content libraries

| Library | What it is | Can add items? |
|---|---|---|
| Local | Content in one vCenter | Yes |
| Published | A local library with publishing enabled (optional password) | Yes |
| Subscribed | Follows a published library by its subscription URL | **No** — "subscribers cannot upload or import items" |

A subscribed library can download content **immediately** or **only when needed** (metadata first, files on first use), which saves datastore space at the subscriber.

Item types: **OVF templates**, **VM templates** (since vSphere 7.0 U1), ISO images and other files. VM templates in a library can be **checked out**, edited and **checked in**, giving you versioning. Distributing VM templates across vCenter instances requires the instances to be connected (ELM or Hybrid Linked Mode) — otherwise publish **OVF templates** for cross-vCenter distribution. An **OVF security policy** (7.0 U3+) can enforce strict validation of OVF items.

### Deploy-from-template flow

1. Admin builds a golden VM (OS, patches, VMware Tools), cleans it, shuts it down.
2. Converts or clones it to a template, or imports it into a content library.
3. Creates a **VM customization specification** (Windows: Sysprep-based; Linux: hostname, network, time zone).
4. User selects **New VM from template**: name/folder → compute resource → storage/policy → clone options (customize OS, hardware, power on).
5. vCenter clones the disks to the target datastore, registers the VM, and on first boot the guest customization runs through VMware Tools.
6. VM boots with its new identity on the selected network.

### Migration types (vSphere 9.0)

| Type | VM state | Moves | Needs |
|---|---|---|---|
| Cold migration | Powered off or suspended | Host and/or datastore | Nothing shared |
| [[vmotion|vMotion]] (compute only) | Powered on | Host | vMotion VMkernel network, storage visible to both hosts, CPU compatibility |
| [[storage-vmotion|Storage vMotion]] (storage only) | Powered on | Datastore | Host access to both datastores |
| Compute + storage | Powered on | Host and datastore together | vMotion network; no shared storage required |
| Cross vCenter | Powered on/off | Between vCenters (Advanced Cross vCenter vMotion across SSO domains) | Network reachability, compatibility |

vMotion host requirements (vSphere 9.0): each host licensed; at least one vMotion VMkernel adapter; **≥ 250 Mbps dedicated bandwidth per concurrent vMotion**; from 7.0 U2 a single vMotion vmk can saturate 25/40/100 GbE; to route vMotion across subnets use the **vMotion TCP/IP stack**.

## Deep Dive

### EVC

[[evc]] (Enhanced vMotion Compatibility) makes hosts with different CPU generations **from the same vendor** migration-compatible by presenting a common CPU feature baseline. Example from the docs: Cascade Lake, Ice Lake and Sapphire Rapids hosts can all appear as Cascade Lake.

- Set at the **cluster** (Configure → VMware EVC) or **per VM** (deactivated by default; travels with the VM across clusters and vCenters).
- Raising a cluster EVC mode affects VMs only after they power-cycle; lowering it requires powering off VMs that use the higher features.
- EVC does not mix Intel and AMD.

:::vcf9 Changed in VCF 9
vSphere 9.0 adds **custom EVC modes**, built from the CPU features common to the hosts you select, alongside the predefined modes. For VCF clusters, choose the EVC mode when you create the cluster if you expect to add newer hardware later — changing it afterwards needs VM power cycles.
:::

### Snapshots

A snapshot preserves VM state (disks, optionally memory) at a point in time by redirecting writes to delta disks. Snapshots are **not backups** — they live on the same datastore and depend on the base disk — and long chains hurt performance and consume space. Use them for short rollback windows (patching, upgrades) and delete them afterwards. VCF lifecycle prechecks and backup products both care about lingering snapshots on management VMs.

### Where VCF reuses this

- **VCF Automation** consumes vCenter content libraries as the source of catalog images; provider content libraries are configured in VCF Automation (see [VCF Automation tenancy](lesson:vcf-automation-tenancy-regions)).
- **Supervisor VM Service** deploys VMs from images in content libraries associated with a namespace.
- **VCF appliances** themselves (vCenter, NSX, VCF Operations) are deployed from OVA/OVF packages by VCF workflows.
- **Lifecycle remediation** needs vMotion to evacuate hosts.

## Configuration

| Task | vSphere Client path |
|---|---|
| New VM | Right-click cluster/host/folder → **New Virtual Machine** |
| Clone / template | Right-click VM → **Clone** → *Clone to Virtual Machine* / *Clone to Template*; or **Template → Convert to Template** |
| Customization spec | **Policies and Profiles → VM Customization Specifications → New** |
| Content library | **Content Libraries → Create** (local; enable publishing) or subscribed (paste subscription URL) |
| Import to library | Library → **Actions → Import item** (URL or local file) |
| VM template to library | Right-click VM → **Clone → Clone as Template to Library** |
| Migrate | Right-click VM → **Migrate** → compute, storage or both |
| EVC | Cluster → **Configure → Configuration → VMware EVC** |

## CLI / API

```powershell
# Deploy from an inventory template with a customization spec
New-VM -Name "web03" -Template (Get-Template "tpl-ubuntu-2404") `
  -ResourcePool (Get-Cluster "wld01-cl01") -Datastore "nfs-ds01" `
  -OSCustomizationSpec (Get-OSCustomizationSpec "linux-lab")

# Deploy from a content library item
New-VM -Name "web04" -ContentLibraryItem (Get-ContentLibraryItem -Name "tpl-ubuntu-2404") `
  -ResourcePool (Get-Cluster "wld01-cl01")

# vMotion + Storage vMotion together
Move-VM -VM "web03" -Destination (Get-VMHost "esx02.lab.local") -Datastore "local-esx02"

# Snapshot before patching, then remove it
New-Snapshot -VM "web03" -Name "pre-patch"
Get-Snapshot -VM "web03" -Name "pre-patch" | Remove-Snapshot -Confirm:$false
```

## Failure Scenarios

| Symptom | Likely cause |
|---|---|
| vMotion compatibility error about CPU | Hosts of different CPU generations without EVC, or per-VM EVC higher than target |
| vMotion fails at 20% / times out | vMotion VMkernel adapters can't reach each other (VLAN, MTU, IP) |
| VM can't migrate: device attached | Local ISO or a device only present on the source host |
| Deployed VMs have duplicate hostnames/IPs | No customization spec, or VMware Tools missing in the template |
| Subscribed library shows items but deploy is slow | *Download when needed* — content is fetched on first use |
| Cannot add item to library | It is a **subscribed** library |
| Datastore filling up | Forgotten snapshots |

## Troubleshooting

1. Read the **compatibility check** in the Migrate wizard; it names the blocking device, CPU feature or network.
2. Test vMotion connectivity with `vmkping` from the vMotion VMkernel adapter (covered in the networking phase).
3. For customization failures, check that VMware Tools runs in the template and look at the guest's customization log.
4. For library sync problems, verify the subscription URL, credentials, and that the subscriber vCenter can reach the publisher over HTTPS.
5. For EVC errors, compare the cluster EVC mode with the VM's current EVC mode (VM **Summary**).

## Real-World Scenario

A company runs two VCF workload domains, each with its own vCenter and SSO domain. The platform team maintains golden images in a **published** library in `wld01`. `wld02` has a **subscribed** library set to *download when needed*, so only images actually used are copied. Because the vCenters are not linked, the team publishes **OVF templates** rather than VM templates for distribution. Each month they check out the Linux template in `wld01`, patch it, check it in, and the subscriber syncs automatically. VCF Automation catalog items point at the library, so new deployments pick up the patched image.

## Lab

::lab[lab-vm-templates-content-library]

## Exam Focus

:::exam
- Deployment methods and when to use each; template = cannot be powered on.
- Guest customization needs VMware Tools and a customization specification.
- Content libraries: local, published, **subscribed (read-only)**; OVF templates, VM templates, ISOs, files; check-out/check-in for VM templates.
- Migration types and requirements; compute + storage migration needs **no shared storage**.
- EVC is per-vendor; per-VM EVC exists; **custom EVC is new in 9.0**.
:::

## Common Exam Traps

:::trap
- Trying to add items to a subscribed library.
- Treating snapshots as backups.
- Expecting EVC to allow Intel ↔ AMD vMotion.
- Assuming vMotion always requires shared storage — combined compute + storage migration does not.
- Forgetting that VM templates distribute across vCenters only when they are linked; use OVF templates otherwise.
:::

## Knowledge Check

::quiz

## Summary

- Create VMs new, by clone, from templates, by instant clone, from OVF/OVA or from content libraries.
- Templates plus customization specs give consistent, unique VMs.
- Content libraries share content: publish locally, subscribe remotely; subscribers are read-only.
- Migrations: cold, vMotion, Storage vMotion, both together, and across vCenters; EVC keeps CPU compatibility.
- VCF Automation and Supervisor reuse content libraries; lifecycle reuses vMotion.

## Next Topic

Next phase: [Storage Fundamentals and Datastores](lesson:storage-fundamentals-datastores) — where all those VM files live.
