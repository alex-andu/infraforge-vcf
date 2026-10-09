---
id: vcf-operations-fleet-management
title: Fleet Management in VCF Operations (and What SDDC Manager Still Does)
phase: p06-vcf-architecture
module: m06-management
version: vcf9
minutes: 45
difficulty: advanced
summary: The fleet management capabilities of VCF Operations, the role of the fleet management appliance, and the division of labour with SDDC Manager in VCF 9.0.
topics: [fleet-management, sddc-manager, lcm-concepts, identity-sso, certificates, passwords]
objectives: ["4.2"]
keyTerms: [vcf-operations, fleet-management, sddc-manager, management-components, core-components, vcf-identity-broker, vcf-single-sign-on, bom]
labs: [lab-explore-vcf-fleet, lab-password-rotation, lab-certificate-replacement]
incidents: [inc-lcm-precheck-failure]
components: [vcf-operations, vcf-operations-fleet-management, sddc-manager, vcf-operations-collector, vcf-identity-broker, vcf-automation, vcf-operations-logs, vcf-operations-networks]
related: [vcf9-architecture-overview, component-communication, lifecycle-concepts, certificate-management, password-management, license-management, vcf-identity-sso-rbac]
sources:
  - title: "VCF 9.0 – Fleet Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management.html
  - title: "VCF 9.0 – Lifecycle Management in VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 – Lifecycle Management of VCF Core Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-of-vcf-core-components.html
  - title: "VCF 9.0 – Binary Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/binary-management-for-vmware-cloud-foundation.html
  - title: "VCF 9.0 – VCF Management Appliances and Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF 9.0 – VCF Operations Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/vcf-operations-design.html
  - title: "VCF 9.0 – Configuring VCF Single Sign-On"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is.html
  - title: "VCF 9.0 Release Notes – Product Support Notes"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/release-notes/vmware-cloud-foundation-90-release-notes/platform-product-support-notes.html
  - title: "Broadcom KB 408116 – Unable to manage certificates or passwords under the VCF Instances tab in VCF Operations 9.0"
    url: https://knowledge.broadcom.com/external/article/408116/unable-to-manage-certificates-or-passwor.html
  - title: "Broadcom KB 431771 – Configuring component log forwarding to a VCF Operations for Logs 9.0.x cluster"
    url: https://knowledge.broadcom.com/external/article/431771/configuring-component-log-forwarding-to.html
---

## Why This Matters

Exam objective 4.2 starts with "Given a scenario, differentiate between the Fleet Management capabilities in VCF (VMware Cloud Foundation) Operations". In VCF 9 almost every Day-2 task — certificates, passwords, lifecycle, identity, licensing, configuration drift, backup — starts in VCF Operations. But underneath, two different engines do the work: the **VCF Operations fleet management appliance** (for fleet-level management components) and **SDDC (Software-Defined Data Center) Manager** (for each instance's core components). Knowing which engine handles which component tells you where binaries go, which log to read and which appliance must be healthy before an upgrade.

## Learning Objectives

- List the fleet management capabilities of VCF Operations.
- Distinguish **management components** (lifecycled via the fleet management appliance) from **core components** (lifecycled via SDDC Manager).
- Describe what SDDC Manager still does in 9.0 and what "SDDC Manager UI deprecated" means.
- Recall the upgrade order for management and core components in maintenance releases.
- Locate key fleet management areas in the VCF Operations UI.

## Concept

[[vcf-operations|VCF Operations]] (formerly Aria Operations) is "the central console for operating your VCF fleet". One of its functional areas is **Fleet Management**: "operational consistency and efficient resource management of the VCF infrastructure at scale". TechDocs lists what you manage there: "identity and access, certificates, passwords, tags, configuration profiles, and availability".

### Capabilities of Fleet Management

| Capability | What you do |
|---|---|
| Lifecycle | Download binaries, upgrade/patch/install management components and core components |
| Identity and access | Configure **VCF Single Sign-On** with the VCF Identity Broker and an external IdP |
| Certificates | View, replace, renew certificates of fleet and instance components |
| Passwords | View, rotate, update, remediate component accounts |
| Configuration | Configuration profiles and **configuration drift** for vCenter instances and vSphere clusters |
| Tags | Create tags and categories at scale |
| Availability | Backup and restore, shutdown/startup, disaster recovery (Live Site Recovery and vSphere Replication) |
| Security | FIPS configuration for VCF components |
| Scale | Scale management nodes up and out |
| Fleet structure | Add, remove or move VCF instances across fleets |
| Licensing (VCF Operations) | Assign licenses to vCenter instances; connected or disconnected reporting to the VCF Business Services console |

### Two engines behind one console

| | VCF Operations fleet management appliance | SDDC Manager (one per instance) |
|---|---|---|
| Manages | **Management components**: VCF Operations, VCF Automation, VCF Identity Broker, VCF Operations for logs, VCF Operations for networks | **Core components**: SDDC Manager, NSX, vCenter, ESX (and vSAN) |
| Binaries downloaded to | Fleet management appliance | SDDC Manager |
| Also does | Deploys new management components (logs, networks, Identity Broker appliance…) | Workload domain deployment, vCenter import, host commissioning, vSAN stretched cluster configuration, automated certificate replacement and password management for core components |
| Scope | Fleet | Its VCF instance |

The 9.0 component table says it explicitly: SDDC Manager "provides support for the following functionality **in VCF Operations**": lifecycle for ESX, vCenter and NSX; deployment of workload domains; import of vCenter instances as workload domains; configuration of vSAN stretched clusters; automated certificate replacement and password management. In other words, you click in VCF Operations; SDDC Manager executes.

## Architecture

::diagram[d06-fleet-management-split]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/783da9e4-0145-487e-a59b-09feb2f58df9.original.svg" caption="End-to-end configuration drift components assembled to support fleet management (VCF Operations detailed design)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/vcf-operations-design.html"}

## Components

| Component | Fleet management role |
|---|---|
| VCF Operations (analytics node / cluster) | Hosts the UI, the Fleet Management menus, licensing, inventory |
| VCF Operations fleet management appliance | Lifecycle + deployment engine for management components (formerly Aria Suite Lifecycle) |
| VCF Operations collector (per instance) | Collects data locally in each instance and feeds VCF Operations |
| SDDC Manager (per instance) | Orchestrator for core components; holds per-instance inventory and resource locks |
| VCF Identity Broker | Brokers IdP authentication for VCF SSO (Single Sign-On) (embedded in mgmt vCenter or 3-node appliance) |
| vSphere Lifecycle Manager (in each vCenter) | Applies ESX images to clusters when SDDC Manager drives host upgrades |

## How It Works

### Upgrading a maintenance release (for example 9.0.0.0 → 9.0.1.0) {#upgrade-order}

1. **Configure the depot** (online or offline) and **download binaries**: management-component binaries to the fleet management appliance (Fleet Management → Lifecycle → Binary Management), core-component binaries to SDDC Manager.
2. **Upgrade management components** in this order: (1) VCF Operations fleet management appliance, (2) VCF Operations, (3) the rest — VCF Operations for logs, VCF Automation, VCF Identity Broker, VCF Operations for networks — in your preferred order.
3. **Upgrade core components per domain**, management domain first, in this order: (1) SDDC Manager, (2) NSX, (3) vCenter, (4) ESX hosts, (5) vSAN.
4. Repeat step 3 for each workload domain (same order). While SDDC Manager runs an upgrade it holds **resource locks** that block conflicting Day-N operations.

Rule from TechDocs: management (fleet) components are updated **before** core components.

### Rotating a password

1. In VCF Operations go to **Fleet Management → Passwords**; choose the **VCF Management** tab (fleet components) or **VCF Instances** tab (core components).
2. For core components VCF Operations calls SDDC Manager of that instance, which changes the password on the component and updates its credential store.
3. Status returns to VCF Operations.

Certificates follow the same pattern under **Fleet Management → Certificates**.

## Deep Dive

### What "SDDC Manager UI deprecated" means

The 9.0 product support notes state: "SDDC Manager UI is now deprecated, to be removed in a future major release", and "SDDC Manager APIs for identity configuration are deprecated … VCF Operations now provides this functionality". The appliance and most of its API (Application Programming Interface) remain: VCF Operations depends on it for core-component work. Some KBs for 9.0.x still direct you to the SDDC Manager UI as a workaround (for example KB 408116: when the VCF Instances tab under Fleet Management → Passwords/Certificates is empty in 9.0, manage certificates and passwords via the SDDC Manager UI or API; fixed in 9.0.1). KB 442933 points to the SDDC Manager UI to add a host to a workload domain cluster.

### VCF SSO scope

VCF SSO gives one login to vCenter, NSX, VCF Operations, VCF Automation, VCF Operations for logs, for networks, orchestrator and HCX. TechDocs: it covers "all the VCF components except **SDDC Manager and ESX**".

### Logs for fleet components

Forwarding of fleet-component logs to VCF Operations for logs is set under **Fleet Management → Lifecycle → VCF Management → Settings → Logs** (KB 431771); suite-component log collection under Infrastructure Operations → Configurations → Log Collection.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x the **SDDC Manager UI** was the console for workload domains, lifecycle (bundles), certificates and passwords. Aria products were lifecycled separately by **Aria Suite Lifecycle** (deployed in "VCF-aware" mode), and identity for Aria went through **Workspace ONE Access**. In 9.0: Aria Suite Lifecycle → VCF Operations fleet management; WSA → removed, VCF Identity Broker; the SDDC Manager UI → deprecated, replaced by VCF Operations. The term "bundle" from 5.x maps to "binaries" downloaded from a depot in 9.0.
:::

:::vcf9 Changed in VCF 9
VCF Operations is **mandatory** in every fleet and is the single console for fleet management, monitoring and licensing.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

| Area (VCF Operations) | Verified location |
|---|---|
| Lifecycle of management components / settings | Fleet Management → Lifecycle → VCF Management |
| Binaries | Fleet Management → Lifecycle → Binary Management |
| Passwords | Fleet Management → Passwords (VCF Management / VCF Instances tabs) |
| Certificates | Fleet Management → Certificates (VCF Management / VCF Instances tabs) |
| VCF instance integration | Administration → Integrations → Accounts → VMware Cloud Foundation |

UI labels can move between 9.0.x maintenance releases — confirm against the docs of your release.

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

- VCF Operations exposes its own REST API (fleet management, lifecycle, licensing).
- SDDC Manager API (per instance) still serves core-component inventory: `GET /v1/domains`, `GET /v1/hosts`, `GET /v1/releases`.
- SDDC Manager log for domain operations: `/var/log/vmware/vcf/domainmanager/domainmanager.log`.

Hands-on API work comes in [APIs and PowerCLI](lesson:vcf-apis-powercli).

## Failure Scenarios

| Failure | Effect on fleet management |
|---|---|
| Fleet management appliance down | Cannot upgrade/deploy VCF Operations, Automation, logs, networks, Identity Broker; monitoring continues |
| SDDC Manager of instance B down | VCF Operations cannot lifecycle, rotate passwords or replace certificates of instance B core components or create domains there |
| Collector of instance B down | Stale/missing data for instance B in VCF Operations |
| VCF Operations down | No fleet management UI at all; instances keep running |
| Integration account broken | Instance or domains appear empty in VCF Operations |

## Troubleshooting

1. Identify the component type: management or core? That tells you which engine (fleet management appliance vs SDDC Manager) and which binaries location.
2. Check **resource locks** in SDDC Manager when a Day-N task refuses to start during an upgrade.
3. Empty tabs in Fleet Management → Passwords/Certificates → VCF Instances on 9.0.0 → KB 408116.
4. Domain validation "Failed to retrieve component binary" → download the core binaries (KB 439510).
5. Upgrade prechecks failing → see [Lifecycle Failures and Recovery](lesson:lifecycle-failures-recovery).

## Real-World Scenario

An admin must patch the fleet to 9.0.1.0 over a weekend. Plan: Friday — download management binaries to the fleet management appliance and core binaries to each SDDC Manager. Saturday — fleet management appliance → VCF Operations → VCF Automation/logs/Identity Broker. Sunday — management domain (SDDC Manager → NSX → vCenter → ESX → vSAN), then each workload domain. A domain-creation request from the dev team on Saturday fails because SDDC Manager holds resource locks — expected behaviour, not a bug.


## Exam Focus

:::exam
- Fleet management capabilities: lifecycle, identity (VCF SSO), certificates, passwords, configuration drift/profiles, tags, backup/restore, shutdown/startup, DR, FIPS, scaling, moving instances between fleets, licensing.
- Management components (VCF Ops, Automation, Identity Broker, logs, networks) → fleet management appliance. Core components (SDDC Manager, NSX, vCenter, ESX) → SDDC Manager.
- Order: management components first (fleet mgmt appliance → VCF Ops → others), then core (SDDC Manager → NSX → vCenter → ESX → vSAN).
- VCF SSO excludes SDDC Manager and ESX.
:::

## Common Exam Traps

:::trap
- "Use the SDDC Manager UI to upgrade VCF Operations" — no; VCF Operations fleet management lifecycles management components.
- "VCF Operations upgrades vCenter by itself" — it initiates; SDDC Manager orchestrates core component upgrades.
- "Upgrade ESX before vCenter" — wrong order; vCenter before ESX.
- "Fleet management appliance is upgraded last" — it is **first**.
:::

## Knowledge Check

::quiz

## Summary

- VCF Operations is the 9.0 console for fleet management: lifecycle, identity, certificates, passwords, drift, tags, availability, licensing.
- Two engines: the fleet management appliance (management components) and SDDC Manager per instance (core components).
- SDDC Manager UI is deprecated, but SDDC Manager remains essential.
- Management components are upgraded before core components, each in a defined order.

## Next Topic

Now trace the wires: [Component Communication](lesson:component-communication) — who talks to whom, on which protocol and why.
