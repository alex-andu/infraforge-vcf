---
id: lifecycle-concepts
title: Lifecycle Concepts - Releases, Binaries, Depots and the BOM
phase: p09-lifecycle
module: m09-lcm
version: vcf9
minutes: 40
difficulty: intermediate
summary: What "lifecycle management" means in VCF 9.0, which engine owns which component, how binaries reach the fleet through online and offline depots, and how release types and the BOM constrain what you can upgrade to.
topics: [lcm-concepts, fleet-management]
objectives: ["4.2"]
keyTerms: [bom, bundle, depot, download-token, vcf-download-tool, flexible-bom]
labs: [lab-lifecycle-upgrade-planning]
incidents: [inc-lcm-precheck-failure]
components: [vcf-operations, vcf-operations-fleet-management, sddc-manager, vcenter, nsx-manager, esx-host]
related: [lifecycle-upgrade-workflow, vlcm-images-host-remediation, lifecycle-failures-recovery]
sources:
  - title: "VCF 9.0 TechDocs - Lifecycle Management in VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 TechDocs - Binary Management for VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/binary-management-for-vmware-cloud-foundation.html
  - title: "VCF 9.0 TechDocs - Binary Management for VCF Core Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/binary-management-for-vmware-cloud-foundation/binary-management-for-vcf-core-components.html
  - title: "VCF 9.0 TechDocs - Using the VCF Download Tool"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/binary-management-for-vmware-cloud-foundation/what-is-the-vcf-download-tool-.html
  - title: "VCF 9.0 TechDocs - Lifecycle Management of VCF Management Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/using-the-depot-configuration-tab.html
  - title: "Broadcom KB 390634 - Update Sequence for VCF 9.0 and Compatible VMware Products"
    url: https://knowledge.broadcom.com/external/article/390634/update-sequence-for-vcf-90-and-compatibl.html
  - title: "William Lam - VCF Software Depot structure deep dive for install and upgrade"
    url: https://williamlam.com/2025/10/vcf-software-depot-structure-deep-dive-for-install-upgrade.html
---

## Why This Matters

A VCF private cloud is not one product: it is SDDC Manager, vCenter, ESX, vSAN, NSX, VCF Operations, VCF Automation
and several more appliances that were engineered and tested **as a set**. "Lifecycle management" (LCM) is the
discipline of moving that whole set from one validated combination of versions to the next without breaking it.

If you patch components one by one with their native tools, you will eventually land on a combination nobody tested:
an NSX version that the installed vCenter cannot talk to, or an ESX build that the SDDC Manager inventory does not
know. VCF prevents that by owning the upgrade path. Your job as an administrator is to understand *which engine* owns
*which component*, *where the binaries come from*, and *what order* the engines must run in. Exam objective 4.2
("Given a scenario, manage the lifecycle of VMware Cloud Foundation") is built on exactly these concepts, and every
later lesson in this phase assumes them.

## Learning Objectives

- Distinguish VCF **management components** from VCF **core components** and name the engine that upgrades each group.
- Explain the four VCF release types (major, minor, maintenance, patch) and why order matters for some but not others.
- Describe the three ways binaries reach VCF: online depot, offline depot and no depot (manual upload).
- Explain what the [[bom]] is and what the [[flexible-bom]] option in VCF 9.0 changes.
- Locate lifecycle functions in the VCF Operations console and explain what remains in SDDC Manager.

## Concept

### What gets lifecycle-managed

VCF 9.0 splits the stack into two families. The split matters because each family has its **own binary store and
its own upgrade engine**.

| Family | Components | Binaries stored on | Upgraded by |
|---|---|---|---|
| **VCF management components** (fleet level) | VCF Operations, VCF Operations fleet management, VCF Automation, VCF Operations for logs, VCF Operations for networks, VCF Identity Broker | VCF Operations fleet management appliance | Fleet management |
| **VCF core components** (per VCF instance) | SDDC Manager, vCenter, NSX Manager, ESX (plus vSAN, which ships with ESX/vCenter) | SDDC Manager of that instance | SDDC Manager (ESX through vSphere Lifecycle Manager) |

Both families are driven from one place: the **VCF Operations console, Fleet Management > Lifecycle**, which has a
**VCF Management** view for the first family and a **VCF Instances** view for the second.

:::vcf9 Changed in VCF 9
In VCF 5.x you planned and ran upgrades in the **SDDC Manager UI** and upgraded the Aria Suite through Aria Suite
Lifecycle. In VCF 9.0 the day-N lifecycle UI moved into **VCF Operations**. SDDC Manager still exists and still does
the heavy lifting for core components (it stores their binaries, runs prechecks, takes resource locks and calls the
vCenter/NSX/ESX upgrade APIs), but you no longer drive it from its own UI for lifecycle. Aria Suite Lifecycle's role is
taken over by the VCF Operations fleet management appliance.
:::

### Release types

TechDocs defines four release types. Recognising them tells you how much planning an update needs.

| Type | What it contains | Synchronised across components? |
|---|---|---|
| **Major** | Significant platform evolution, possible breaking changes (for example 5.x to 9.0) | Yes, fully |
| **Minor** | New features within a major version (for example 9.0 to 9.1) | Yes, non-disruptive |
| **Maintenance** | Cumulative stability, bug and security fixes (for example 9.0.0.0 to 9.0.1.0) | Allows component selection flexibility |
| **Patch** | Time-sensitive security/critical fixes between releases | Not synchronised; per component |

Two rules follow from the official guidance:

1. **Order matters for major, minor and maintenance updates; patches can be applied in any order** (KB 390634).
2. **Upgrades are forward-only.** VCF validates that a target version was released *after* your current version.
   You cannot "upgrade" to an older build that happens to have a higher number in another train.

### The Bill of Materials (BOM)

The [[bom]] is the list of exact component versions that make up one VCF release (SDDC Manager x, vCenter y, NSX z,
ESX w ...). It is the tested combination. Historically VCF forced every domain to move to the next BOM as a block.
VCF 9.0 adds the [[flexible-bom]] option in the upgrade planner (**Customize Upgrade**): you can choose any
*supported* target version per core component, validate the selection, and let VCF compute the order. The guard rail
is the word *supported*: VCF validates the combination against its compatibility data.

## Architecture

::diagram[d09-lcm-control-planes]

Read the diagram top to bottom:

- **Depots** are where binaries come from. A depot is a structured repository of binaries plus metadata (release
  manifests, product catalog, compatibility data, vSAN HCL data). See [[depot]].
- **Two downloaders** pull from the depot: the fleet management appliance (management component binaries) and the
  SDDC Manager of each VCF instance (core component binaries, including ESX components).
- **Two engines** apply the binaries: fleet management for management components, SDDC Manager for core components.
- **One console**: VCF Operations shows both, plus update history, prechecks and planners.

## Components

| Component | Lifecycle role | Where it runs | What breaks if it is down |
|---|---|---|---|
| **VCF Operations** | Console for all lifecycle work (Fleet Management > Lifecycle) | Management domain | You cannot plan or start upgrades from the UI |
| **VCF Operations fleet management** | Binary store and upgrade engine for management components; must be updated first | Appliance in the management domain | Management component upgrades/patches, SSO appliance deployment |
| **SDDC Manager** | Binary store, precheck engine, resource lock manager and orchestrator for core components of one instance | Appliance in the management domain of each instance | All core component lifecycle for that instance |
| **vCenter + vSphere Lifecycle Manager** | Applies the cluster image to ESX hosts | Each domain's vCenter | Host remediation for that domain |
| **Online depot** | Broadcom-hosted source of binaries (download token required in 9.0) | Internet | Downloads, unless an offline depot is used |
| **Offline depot** | Your HTTPS web server holding a copy of the depot | Your network | Downloads for air-gapped sites |
| **[[vcf-download-tool]]** | CLI that downloads binaries and metadata to build an offline depot or to side-load | A machine with internet access | Nothing at runtime; only preparation |

## How It Works

Binary flow for one maintenance update, end to end:

1. **Get entitlement.** In the Broadcom Support Portal, generate a [[download-token]] (VCF 9.0). The token proves
   your entitlement to download.
2. **Choose a depot method** for each downloader (fleet management and each SDDC Manager):
   - **Online depot**: the appliance reaches Broadcom directly or through a proxy and authenticates with the token.
   - **Offline depot**: the appliance cannot reach the internet but can reach an internal web server that you
     populate with the VCF Download Tool from a machine that can.
   - **No depot**: neither is possible; you download binaries with the VCF Download Tool and upload them to the
     appliance.
3. **Sync metadata.** The appliance reads the release manifests and compatibility data from the depot so it knows
   which upgrades are available from your current versions.
4. **Download binaries** in **Fleet Management > Lifecycle > Binary Management**: choose the binary type
   (install, upgrade or patch), the VCF version and the component.
5. **Plan and run** the update in the documented order (next lesson): fleet management, VCF Operations, other
   management components, then per instance SDDC Manager, NSX, vCenter, ESX, vSAN.

## Deep Dive

### Depot structure

William Lam's analysis of the 9.0 depot shows a single root (for example `/depot`) with:

| Path | Contents | Authentication on an offline depot web server |
|---|---|---|
| `PROD/` | Component binaries and metadata (`COMP/` holds per-component folders) | May use HTTP basic authentication |
| `umds-patch-store/` | ESX updates, produced by Update Manager Download Service (UMDS) via the VCF Download Tool | Must stay unauthenticated |

A full download needs significant space (Lam measured roughly 96 GB for a complete set). The depot must be served
over **HTTPS**, so the appliances that consume it must trust the web server's certificate. If you use a private CA,
import its root into the consuming appliance before connecting. A missing trust is the most common reason an offline
depot "does not connect".

### Why two binary stores?

Management components are fleet-wide and few (one VCF Operations, one VCF Automation ...), so one engine for the whole
fleet makes sense. Core components are per instance (one SDDC Manager per instance, many vCenters and many hosts), so
each instance's SDDC Manager owns its own core binaries and its own locks. This is why, in a two-instance fleet, you
download core binaries **twice** (once per SDDC Manager) but management binaries **once**.

### The BOM and interoperability

The BOM guarantees compatibility *inside* VCF. It says nothing about things outside it: your backup product, a
third-party storage plugin, server firmware, or a replication tool. KB 390634 lists a wider sequence for compatible
products (for example backup and replication products before core components). Always check the VMware
interoperability matrix and vendor support before the plan, not after.

:::details The full VCF 9.0 sequence including compatible products (KB 390634)
The KB lists, in order: VCF Download Tool, (Aria Suite Lifecycle patch when coming from 5.x), VCF Operations with
fleet management, VCF Automation and VCF Operations for networks (parallel), VCF Operations for logs, VADP-based
backup, vSphere Replication, Site Recovery Manager, Avi, SDDC Manager, HCX, NSX, vCenter, VCF Identity Broker and
Supervisor, vSAN witness host, ESX (with NSX finalize), VMware Tools, virtual hardware, vSAN on-disk format/VMFS,
vSAN file service. It also states that patches can be applied in any order and that the order only matters for
major/minor releases. Several entries (Aria Suite Lifecycle, "new installation" of Identity Broker and VCF Operations
for logs) relate to upgrading **from VCF 5.x**; check the KB for the exact path you are on.
:::

### What did not move

Not everything lives in VCF Operations. SDDC Manager still offers APIs for lifecycle, and some actions (for example
scheduled password rotation, covered in phase 12) remain in SDDC Manager. Expect a mixed picture during 9.0.x and
check the docs for your exact build.

## Configuration

Configuration for lifecycle is mostly **depot configuration**:

| Setting | Where | Notes |
|---|---|---|
| Depot for management binaries | VCF Operations > Fleet Management > Lifecycle > VCF Management > Binary Management | TechDocs lists online depot (download token), a self-managed web server, or a local server for air-gapped sites |
| Online/offline depot (core binaries) | VCF Operations > Fleet Management > Lifecycle > VCF Instances > Binary Management | One per SDDC Manager |
| ESX components | Binary Management > ESX components (served from `umds-patch-store` on an offline depot) | Separate from the PROD tree |
| Offline depot trust | Import the web server CA into the consuming appliance | HTTPS only |

:::tip
For a home lab with internet access, the online depot is simplest. Build an offline depot only if you want to
practise air-gapped operations, and keep it on a separate VM (not on an appliance).
:::

:::warning
In VCF 9.1 the "download token" is replaced by an "activation code" for binary downloads in VCF Installer (Broadcom
KB 443647). This lesson describes 9.0. Check the docs for your version.
:::

## CLI / API

The VCF Download Tool is the CLI you will actually use. Examples from William Lam's 9.0 depot walkthrough (verify
options with `--help` on your build):

```shell
# list the INSTALL binaries for a version
vcf-download-tool binaries list --depot-download-token-file=/root/token \
  --vcf-version=9.0.1 --type=INSTALL --sku=VCF

# download UPGRADE binaries for one component into an offline depot
vcf-download-tool binaries download --depot-download-token-file=/root/token \
  -d /depot --vcf-version=9.0.1 --type UPGRADE --component VCENTER
```

ESX content for the depot is fetched through the tool's UMDS commands (`vcf-download-tool umds ...`). On the
SDDC Manager side, the lifecycle engine logs to `/var/log/vmware/vcf/lcm/lcm-debug.log`. You will use that log
heavily in [lifecycle failures](lesson:lifecycle-failures-recovery).

## Failure Scenarios

| Scenario | Impact | Detection |
|---|---|---|
| Download token expired or wrong | No metadata sync, no available updates shown | Depot connection error in Binary Management |
| Offline depot certificate not trusted | Depot connection fails (TLS) | Error when connecting; succeeds after trusting the CA |
| `umds-patch-store` behind authentication | ESX components unavailable while other binaries work | ESX components missing from Binary Management |
| Partially downloaded bundle | Precheck or upgrade fails at binary validation | Download status not "Success"; checksum errors |
| Fleet management not upgraded first | Management component upgrades blocked | Planner refuses or prechecks fail |
| Target older than current release date | Upgrade not offered | Forward-only validation |

## Troubleshooting

1. **Is the depot reachable?** From the appliance, DNS-resolve and reach the depot FQDN on 443 (or the proxy).
2. **Is TLS trusted?** `openssl s_client -connect depot.lab.local:443 -showcerts` shows the chain the server sends;
   the issuing CA must be trusted by the appliance.
3. **Is the entitlement valid?** Regenerate the download token if in doubt.
4. **Is the metadata current?** Without current metadata the planner shows no updates; resync.
5. **Is the binary complete?** Delete a failed download (trash icon in Binary Management) and download again.

## Real-World Scenario

A manufacturing customer runs two VCF instances in two plants with no internet access in the plant networks. They
place a small Linux VM in a DMZ that can reach Broadcom, run the VCF Download Tool there to build `/depot`, and expose
it to both plants through an internal HTTPS web server signed by their corporate CA. Fleet management and both SDDC
Managers point to that offline depot. They learned two lessons: the `umds-patch-store` path must not require
authentication (their first ESX update showed no ESX components), and the corporate root CA had to be imported into
each appliance before the depot connected.

## Lab

::lab[lab-lifecycle-upgrade-planning]

The lab walks you through building an upgrade plan for your lab instance: inventory current versions, map them to
the target BOM, decide the depot method, and produce the ordered runbook. It works even before you have binaries.

## Exam Focus

:::exam
- Know the two families and their engines: **management components = fleet management**, **core components = SDDC
  Manager** (ESX via vLCM). Lifecycle is driven from **VCF Operations > Fleet Management > Lifecycle**.
- Know the depot options: **online** (direct or proxy, download token), **offline** (web server, VCF Download Tool),
  **no depot** (manual upload).
- Know the release types and that **patches can go in any order** while major/minor/maintenance follow the sequence.
- Know that upgrades are **forward-only**.
:::

## Common Exam Traps

:::trap
- "Use the SDDC Manager UI to plan the upgrade" - in 9.0 the lifecycle UI is in VCF Operations.
- "Fleet management stores ESX binaries" - core and ESX binaries belong to SDDC Manager.
- "An offline depot means no network at all" - offline means *no internet*; the appliance still reaches an internal
  web server. "No depot" is the manual-upload case.
- "Flexible BOM lets you pick any version" - only *supported* combinations, validated by VCF.
:::

## Knowledge Check

::quiz

## Summary

- VCF lifecycle covers two families: **management components** (fleet management engine) and **core components**
  (SDDC Manager engine, vLCM for ESX), both driven from VCF Operations.
- Binaries come from an **online depot**, an **offline depot** built with the **VCF Download Tool**, or manual upload.
- The **BOM** is the tested set of versions; **flexible BOM** allows per-component targets within supported
  combinations.
- Release types: major, minor, maintenance, patch. Order matters except for patches; upgrades are forward-only.

## Next Topic

Continue with [the upgrade workflow](lesson:lifecycle-upgrade-workflow): prechecks, the planner and the exact
sequence for management and core components.
