---
id: import-existing-vcenter
title: Importing and Converging an Existing vCenter
phase: p07-deployment
module: m07-deploy
version: vcf9
minutes: 40
difficulty: advanced
summary: The two brownfield paths into VCF 9.0 — converging an existing vCenter into a new management domain with the VCF Installer, and importing an existing vCenter as a workload domain from VCF Operations — with their prerequisites, NSX handling and post-import limitations.
topics: [vcenter-import, vcf-installer, workload-domains, management-domain]
objectives: ["4.2", "4.1"]
keyTerms: [vcenter-convergence, vcenter-import, vcf-installer, ssl-thumbprint]
labs: [lab-commission-hosts-create-wld]
incidents: []
components: [vcf-installer, vcenter, nsx-manager, sddc-manager, vcf-operations, workload-domain, management-domain, vds]
related: [vcf-installer-workflow, host-commissioning-wld-creation, cluster-host-expansion, workload-domains-architecture, vlcm-images-host-remediation]
sources:
  - title: "VCF 9.0 – Import an Existing vCenter to Create a Workload Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/import-an-existing-vcenter-to-create-a-workload-domain.html
  - title: "VCF 9.0 – Converging Existing Virtual Infrastructure to a VCF or vSphere Foundation Platform"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/converging-your-existing-vsphere-infrastructure-to-a-vcf-or-vvf-platform-.html
  - title: "VCF 9.0 – Paths to Building 9.0.x Environments"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/overview-of-deploy--converge--and-upgrade.html
  - title: "VCF Blog – Converging VMware vSphere to VCF 9.0: the top 10 questions answered"
    url: https://blogs.vmware.com/cloud-foundation/2026/04/16/converging-vmware-vsphere-to-vmware-cloud-foundation-9-0-the-top-10-questions-answered/
  - title: "VCF Blog – VCF 9.0 Deployment Pathways"
    url: https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/
  - title: "Broadcom KB 441529 – Importing an Existing vCenter to Create a Workload Domain"
    url: https://knowledge.broadcom.com/external/article/441529
  - title: "William Lam – What host lifecycle operations are available after importing vCenter into a VCF 9.x fleet"
    url: https://williamlam.com/2026/06/what-host-lifecycle-operations-are-available-after-importing-vcenter-into-vcf-9-x-fleet.html
---

## Why This Matters

Most organisations adopting VCF 9 already run vSphere. Rebuilding everything is expensive, so VCF 9.0 offers two brownfield paths: **converge** an existing vCenter to become the management domain of a new VCF instance, or **import** an existing vCenter as a new workload domain of an instance that already exists. Objective 4.2 asks you to "identify the tasks and processes required to complete the import of an existing vCenter". The exam rewards knowing the prerequisites (what blocks an import) and the limitations afterwards.

## Learning Objectives

- Distinguish **convergence** (new management domain) from **import** (new workload domain).
- List the import prerequisites: versions, vLCM images, fully automated DRS, VDS, static VMkernel IPs, no ELM, FQDN hosts, SSH on vCenter.
- Walk through the import wizard in VCF Operations, including thumbprints, prechecks and NSX options.
- Explain what happens to NSX and the DFW during import.
- State the operational limitations of imported clusters.

## Concept

| | Convergence ("convert") | Import |
|---|---|---|
| Starting point | No VCF yet — standalone vCenter + hosts (+ optionally Aria) | An existing VCF 9 instance |
| Result | The vCenter and **all its clusters** become the **management domain** of a new VCF instance (new fleet or new instance in a fleet) | The vCenter becomes a **VI workload domain** of the existing instance |
| Tool | **VCF Installer** (select the existing vCenter on the *Existing Components* page) | **VCF Operations** → Inventory → VCF instance → *Add Workload Domain* → *Import a vCenter* |
| Strictness | Stricter prerequisites | More flexible |

The VCF blog summarises it: converting creates a management domain from an existing vCenter when you lack a VCF fleet; importing adds an existing vCenter as a VI workload domain into an established fleet. Both require minimal VM downtime — the work is deploying missing components (SDDC Manager, NSX, VCF Operations) around running workloads.

[[vcenter-convergence]] and [[vcenter-import]] are both "brownfield" paths; neither re-installs ESX or moves VMs.

:::legacy VCF 5.x / Legacy Context
VCF 5.2 introduced a separate command-line **VCF Import Tool** to convert a vCenter into a management domain or import it as a workload domain, run against SDDC Manager. In VCF 9.0 convergence is a VCF Installer workflow and import is a VCF Operations (UI or API) workflow — no separate tool.
:::

## Architecture

::diagram[d07-import-vs-converge]

::figure{src="https://blogs.vmware.com/cloud-foundation/wp-content/uploads/sites/75/2025/07/Image-2.jpg?w=1024" caption="Convergence and import paths, figure from the 'VCF 9.0 Deployment Pathways' blog post." source="https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/"}

During an import, three systems cooperate:

- **VCF Operations** hosts the wizard and the task view (Fleet Management → Tasks).
- **SDDC Manager** of the instance performs the actual import: inventory sync, prechecks, NSX deployment, registration.
- The **brownfield vCenter** (needs SSH enabled) and its hosts are discovered, validated and brought under SDDC Manager's management.

## Components

| Requirement area | Import a vCenter as a workload domain (TechDocs 9.0) |
|---|---|
| Versions | VCF instance 9.0+; vCenter 8.0 U1+; ESX 8.0 U1+; existing NSX (3-node) 4.2+ |
| vCenter | SSH enabled; vCenter VM runs on a cluster it manages or on the management domain default cluster; Enhanced Linked Mode is not supported (VCF 9 drops ELM; TechDocs lists a narrow case involving vCenters with existing NSX registrations — read the current page before planning around it) |
| Hosts | All ESX hosts added to vCenter by **FQDN**, not short name or IP |
| Clusters | **All** clusters imported together; fully automated DRS; vSphere Lifecycle Manager **images** (not baselines); no vSphere Configuration Profiles |
| Network | VDS 8.0+; statically assigned VMkernel IPs (NSX host TEPs may use DHCP); dedicated vMotion network; forward and reverse DNS for all FQDNs |
| Storage | Shared datastore writable by all hosts in each cluster; vSAN (incl. stretched, ESA/OSA), NFS v3, NFS 4.1, VMFS, iSCSI; **vVols not supported** |
| Not supported | Dell VxRail-managed clusters, Cisco virtual switches, manual/partial DRS, multiple NSX Managers per vCenter |

Convergence has similar rules plus: minimum 3 hosts for simple deployments with vSAN or 2 with external storage, minimum 4 for HA deployments; ELM must be broken first; no VCHA; no NSX bare-metal edges; no custom vCenter client ports. NSX convergence is not supported in 9.0.0 (a new NSX is deployed) and is supported for non-ELM NSX from 9.0.1.

## How It Works

Import procedure (TechDocs 9.0, VCF Operations UI):

1. VCF Operations → **Inventory** → **Detailed View** → **VCF Instances** → select the instance → **Add Workload Domain** → **Import a vCenter**.
2. Enter a unique **workload domain name**.
3. Enter the vCenter FQDN and credentials (or select a known vCenter).
4. Optionally connect an **existing NSX Manager** (VIP FQDN and admin/root/audit passwords).
5. **Confirm certificate thumbprints** of vCenter (and NSX).
6. **Prechecks** run automatically — resolve every failure (DRS mode, baselines, standalone hosts, short host names…).
7. If no NSX is connected, configure a **new NSX Manager**: Standard (single node, vCenter 9.0+ only) or High Availability (three nodes); appliance size Medium/Large/Extra Large; FQDNs for the nodes and cluster VIP; passwords; overlay option (can use the ESX management VMkernel).
8. Run **final validation**.
9. Review and **Finish**; monitor in **Fleet Management → Tasks**.

After the import:

- NSX is activated on all distributed port groups and the **Distributed Firewall is enabled with default allow-all rules** (so existing traffic keeps flowing).
- The vCenter appears as a workload domain; SDDC Manager can now lifecycle-manage it (forward-only upgrades: the target must be released after your current version).

## Deep Dive

### Why these prerequisites exist

| Prerequisite | Reason |
|---|---|
| vLCM images, not baselines | VCF 9 lifecycle is image-based only; the blog is explicit that VCF 9 does not support vLCM baselines. |
| Fully automated DRS | SDDC Manager workflows (remediation, host removal) rely on automatic evacuation via maintenance mode. |
| Static VMkernel IPs | SDDC Manager tracks and validates addresses; DHCP-assigned management/vMotion/vSAN addresses can change. |
| Host FQDNs | Certificates, DNS validation and inventory are FQDN-based. |
| No ELM | VCF 9 does not support Enhanced Linked Mode; VCF Operations and VCF SSO take over its functions. |
| Whole vCenter, all clusters | A workload domain maps 1:1 to a vCenter; partial import would leave orphaned clusters. |

### Post-import limitations (important for day 2)

- **Hosts in imported clusters** are added and removed through the **vSphere Client**, not via VCF commissioned-host workflows. William Lam's summary: "VCF commissioned hosts cannot be added to an imported cluster" because those hosts were not provisioned by SDDC Manager. You can still create *new* clusters in the imported domain from commissioned hosts.
- **ESX host password management** through VCF password management is unavailable for imported hosts (workaround in KB 388859).
- **Forward-only upgrades** apply.
- For **NSX Federation**, only the Local Manager is imported.

### Domain limits

The VCF blog notes a maximum of 24 VI workload domains per VCF instance; beyond that you deploy another instance. Verify current limits on configmax.broadcom.com.

## Configuration

Pre-import hardening of a brownfield vCenter (example: `vc-legacy.lab.local` with two clusters):

1. Break ELM if present; remove VCHA.
2. Convert each cluster from baselines to a vLCM **image**.
3. Set DRS to **fully automated** on every cluster.
4. Migrate any standard-switch VMkernel/port groups to a **VDS 8.0+**; make VMkernel IPs static; ensure a dedicated vMotion VMkernel.
5. Re-add any host that was added by IP with its FQDN; create A and PTR records.
6. Remove or move standalone hosts (KB 439602 describes import failing because of standalone hosts in the inventory).
7. Enable SSH on the vCenter appliance.
8. Run the import wizard; fix precheck findings; finish.

## CLI / API

Import is also available through the VCF Operations API (TechDocs: "Create a Workload Domain by Using the VCF Operations API"), but for the exam focus on the UI flow. Useful verification commands on the brownfield side:

```shell
# On each host: confirm the FQDN
esxcli system hostname get

# Confirm DNS for vCenter and hosts
nslookup vc-legacy.lab.local
nslookup 10.0.20.21
```

## Failure Scenarios

| Precheck / failure | Cause | Fix |
|---|---|---|
| Cluster uses baselines | Legacy VUM-style management | Convert cluster to vLCM image |
| DRS not fully automated | Partial/manual DRS | Set fully automated |
| Host added by IP | Host inventory not FQDN-based | Remove and re-add by FQDN |
| "Cluster does not have DVS shared by all the hosts" (KB 408239) | Mixed switches | Put all hosts on the same VDS |
| vCenter in ELM | Linked vCenters | Break ELM first |
| "Failed to resolve vCenter IP" (KB 438715) | DNS | Fix forward/reverse records |
| vVols datastore present as only shared storage | Unsupported storage | Provide supported shared storage |

## Troubleshooting

Use the prechecks as a to-do list: they are designed to fail fast. Read the failing check, fix it on the brownfield vCenter, re-run. If the wizard itself misbehaves (blank wizard, KB 435669) or VCF Operations collection fails for the imported vCenter (KB 443680, KB 438541), the problem is on the VCF Operations side (adapters, cloud proxy), not the vCenter.

## Real-World Scenario

A retailer runs VCF 9.0 for new workloads and has a 6-year-old vCenter 8.0 U2 with three clusters. Two clusters already use vLCM images; the third still uses baselines and partially automated DRS. The import precheck fails on the third cluster. Because import is all-or-nothing per vCenter, the team converts the third cluster to an image, sets DRS to fully automated, re-runs prechecks, and imports. They deploy a new three-node NSX Manager during the import; DFW starts with allow-all, and the security team writes rules later. Afterwards, operations learns that hosts for the *existing* clusters are still added in the vSphere Client, while a brand-new cluster in that domain uses commissioned hosts.

## Lab

Importing requires a second vCenter with its own hosts — expensive for a single Proxmox server. The workload-domain lab includes an optional import exercise if you have spare RAM.

::lab[lab-commission-hosts-create-wld]

## Exam Focus

:::exam
- Convergence → new **management domain** via the **VCF Installer**; Import → new **workload domain** via **VCF Operations**.
- Import prerequisites: vCenter/ESX 8.0 U1+, vLCM images, fully automated DRS, VDS 8.0+, static VMkernel IPs, FQDN hosts, SSH on vCenter, no ELM, no vVols, all clusters at once.
- NSX: reuse an existing one or deploy a new one; DFW activated with allow-all.
- After import: add hosts to imported clusters in the vSphere Client; ESX password management limited.
:::

## Common Exam Traps

:::trap
- "Import selected clusters only" — the whole vCenter is imported.
- "Import a vCenter with baselines; VCF converts them" — you convert to images first.
- "Use the VCF Installer to import a vCenter into an existing instance" — the installer converges into a *new* management domain; import is in VCF Operations.
- "Import keeps ELM" — ELM is unsupported in VCF 9.
:::

## Knowledge Check

::quiz

## Summary

Convergence turns a standalone vCenter into the management domain of a new VCF instance through the VCF Installer; import turns a vCenter into a workload domain of an existing instance through VCF Operations. Both demand modern, consistent vSphere: images, fully automated DRS, VDS, static IPs, FQDNs, no ELM. After import, NSX is active with an allow-all DFW, and imported clusters keep vSphere-Client-based host management.

## Next Topic

Next phase: [Host Commissioning and Workload Domain Creation](lesson:host-commissioning-wld-creation).
