---
id: vcenter-architecture-inventory
title: vCenter Architecture, Services and Inventory
phase: p02-vsphere
module: m02-hosts-vcenter
version: vcf9
minutes: 40
difficulty: foundation
summary: The vCenter 9 appliance, the services it runs (SSO, VMCA, licensing, lifecycle), how it organizes the inventory (data centers, clusters, folders, resource pools), and how VCF gives every workload domain its own vCenter and SSO domain.
topics: [vcenter, vsphere-cluster, identity-sso]
objectives: ["2.2"]
keyTerms: [vsphere-client, sso-domain, enhanced-linked-mode, vami, vcls, resource-pool, vm-folder]
labs: [lab-vcenter-cluster-ha-drs]
incidents: []
components: [vcenter, esx-host, management-domain, workload-domain, sddc-manager, vcf-identity-broker]
related: [esx-architecture-host-management, vsphere-permissions, vsphere-ha-deep-dive, workload-domains-architecture, management-domain]
sources:
  - title: "vSphere 9.0 – vCenter Components and Services"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup/vcenter-server-components-and-support-tools.html
  - title: "vSphere 9.0 – What is the vCenter Appliance"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup/overview-of-the-vcsa.html
  - title: "vSphere 9.0 – Understanding vSphere Domains and Domain Names"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup/understanding-domains-domain-names-and-sites.html
  - title: "vSphere 9.0 – vCenter Enhanced Linked Mode"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup/creating-vcenter-server-linked-mode-groups.html
  - title: "vSphere 9.0 – Managed Inventory Objects in vSphere"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vcenter-and-host-management/vsphere-concepts-and-features/vsphere-managed-inventory-objects.html
  - title: "vSphere 9.0 Security – Hierarchical Inheritance of Permissions (inventory hierarchy figure)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/understanding-authorization-in-vsphere/hierarchical-inheritance-of-permissions.html
  - title: "VCF 9.0 Design – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "vSphere 9.0 – vSphere Cluster Services (vCLS)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-resource-management/vsphere-cluster-services-vcls.html
---

## Why This Matters

vCenter is the management brain of every VCF domain. The management domain's vCenter manages the management cluster; each VI workload domain gets **its own vCenter**, and — per the VCF 9.0 design guide — every one of those vCenter appliances runs inside the **management domain**. DRS, vMotion, cluster configuration, templates, permissions, storage policies and vSphere Lifecycle Manager all live in vCenter. VCF components (SDDC Manager, NSX Manager, VCF Operations, VCF Automation) integrate with vCenter rather than with hosts directly.

Objective 2.2 expects you to *deploy and configure vCenter*, *configure a vSphere cluster* and *manage VMs through vCenter*. You need to know what is inside the appliance, how the inventory is built, and what keeps working when vCenter is down.

## Learning Objectives

- List the main services in the vCenter 9 appliance and what each does.
- Explain what a vCenter Single Sign-On domain is and how VCF 9 uses one per workload domain.
- Build an inventory: data center, clusters, hosts, folders, resource pools, datastores and networks.
- Predict what keeps working and what stops when vCenter is unavailable.
- Verify vCenter health from the management interface and the appliance shell.

## Concept

vCenter is "a service that acts as a central administrator for ESX hosts connected in a network" and is deployed "as a preconfigured virtual machine optimized for running vCenter and associated services" (vSphere 9.0 docs). In vSphere 9.0 the appliance runs **Photon OS 5.0** with an embedded **PostgreSQL** database. There is no Windows vCenter and no external database option.

The appliance exposes three interfaces:

| Interface | URL / access | Used for |
|---|---|---|
| [[vsphere-client]] | `https://<vcenter-fqdn>/ui` | Day-to-day management of inventory, clusters, VMs, permissions |
| vCenter Management Interface ([[vami]]) | `https://<vcenter-fqdn>:5480` | Appliance health, services, backup, networking, time, updates of the appliance |
| Appliance shell / Bash (SSH, console) | SSH to the appliance | Service control and deep troubleshooting |

## Architecture

::diagram[d02-vcenter-services-inventory]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4d229944-9a22-4b9e-ba1b-8a558a80c6a3.original.svg" caption="Workload Domain Models in VMware Cloud Foundation" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html"}

From the VCF 9.0 design guide:

- The **management domain** is the first domain of a VCF instance and "contains the following management appliances for all workload domains: vCenter, NSX Manager, SDDC Manager".
- A **VI workload domain** "has a dedicated vCenter and vCenter Single Sign-On domain".
- "VCF Instances that are upgraded from an earlier version may have shared vCenter Single Sign-On domains."

So in a fresh VCF 9 instance with one workload domain you have at least two vCenter appliances, both running as VMs on the management cluster: one managing the management cluster, one managing the workload domain's clusters.

## Components

The vSphere 9.0 docs group the appliance services as follows:

| Service | Group | What it does |
|---|---|---|
| vCenter Single Sign-On | Authentication | Token-based authentication for vSphere components; owns the SSO domain (default `vsphere.local`) |
| Lookup Service | Authentication | Registry of service endpoints that components use to find each other |
| VMware Certificate Authority (VMCA) | Authentication | Issues certificates; by default signs every ESX host certificate |
| vSphere License Service | Authentication | Common license inventory for vCenter systems in the SSO domain |
| vCenter (vpxd) | vCenter services | The core management service: inventory, tasks, DRS, HA configuration |
| vSphere Client | vCenter services | The HTML5 UI |
| vSphere Auto Deploy, ESX Dump Collector | vCenter services | Network boot provisioning; collects host core dumps |
| vSphere Lifecycle Manager extension, vCenter Lifecycle Manager | vCenter services | Image-based host lifecycle; vCenter's own lifecycle |
| PostgreSQL | Database | "Persistent storage for maintaining the status of each virtual machine, host, and user" |

Services are supervised by a service manager on the appliance and can be listed with `service-control`.

### Inventory objects

| Object | Purpose (vSphere 9.0 docs) | Notes |
|---|---|---|
| Data center | "An aggregation of all the different types of objects" | Contains four hierarchies: VMs and templates, hosts and clusters, networks, datastores |
| Cluster | "A collection of ESX hosts … intended to work together as a unit" | Where HA, DRS, vSAN and vLCM images are configured |
| Host | "The physical computer on which ESX is installed" | The only inventory object that **cannot be renamed** |
| [[resource-pool]] | "Compartmentalize the CPU and memory resources of a host or cluster" | Covered in [DRS](lesson:drs-resource-management) |
| Folder | Groups objects **of the same type** | Main tool for permissions and organization ([[vm-folder]]) |
| Datastore / datastore cluster | Storage for VM files | Covered in the storage phase |
| Network | Port groups, distributed switches | Covered in the networking phase |
| Template, VM, vApp | Workloads | Covered in [VM lifecycle](lesson:vm-lifecycle-templates) |

Object names can be up to 214 bytes (UTF-8).

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vsphere/vsphere/9-0/_jcr_content/assetversioncopies/c4cbafbc-40a5-461c-b425-4c63b24a4e29.original.png" caption="vSphere Inventory Hierarchy" source="https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/understanding-authorization-in-vsphere/hierarchical-inheritance-of-permissions.html"}

## How It Works

Building a minimal vSphere inventory in vCenter (what the VCF Installer automates for the management domain, and what you do by hand in this phase's lab):

1. **Deploy the appliance.** The installer's stage 1 deploys the OVA to a target ESX host; stage 2 configures time, SSH and the SSO domain (new or join existing).
2. **Log in** as `administrator@<sso-domain>` to the vSphere Client.
3. **Create a data center** — the top-level container for hosts, VMs, networks and datastores.
4. **Create a cluster** in the data center. Leave HA and DRS off until hosts are in (the vSphere 9.0 HA procedure recommends this order).
5. **Add hosts** to the cluster by FQDN (vCenter installs vpxa on each).
6. **Configure the cluster:** networking (VDS), storage, vMotion VMkernel adapters, then turn on DRS and HA.
7. **Create folders** for VMs and templates, then assign permissions on folders (next lesson).

In VCF, steps 1–6 are done by the **VCF Installer** for the management domain and by the **workload domain workflow** for each VI workload domain: it deploys the domain's vCenter on the management cluster, creates the data center and cluster, adds commissioned hosts, builds the VDS and VMkernel adapters, and enables HA and DRS.

### What still works when vCenter is down

| Function | Without vCenter |
|---|---|
| Running VMs | Keep running (they live on ESX) |
| vSphere HA restarts | **Continue** — HA agents on the hosts act on their own; vCenter is only needed to *configure* HA |
| DRS load balancing and initial placement | **Stops** — DRS is a vCenter service |
| vMotion, cloning, deploying from templates | Unavailable |
| VDS data plane | Keeps forwarding; you cannot change the configuration |
| VCF workflows (SDDC Manager, lifecycle) touching that domain | Fail until vCenter is back |
| Login with SSO accounts to that vCenter | Unavailable |

This is why the management domain protects vCenter with vSphere HA, and why VCF's backup configuration for vCenter (file-based backup from the management interface) matters.

## Deep Dive

### SSO domains, Enhanced Linked Mode and VCF 9

A **vCenter Single Sign-On domain** ([[sso-domain]]) is the local authentication space a vCenter belongs to; it defaults to `vsphere.local` and you should not reuse a name that is already used by Active Directory or another LDAP directory.

[[enhanced-linked-mode]] (ELM) joins multiple vCenter systems in one SSO domain so that one login shows all inventories; vSphere 9.0 allows up to **15** vCenter appliances in one ELM group.

:::vcf9 Changed in VCF 9
- vSphere 9.0 docs state that **ELM is deprecated as of vCenter 9.0** and will be removed in a future release; VCF Operations grouping of vCenter instances is the recommended alternative.
- VCF 9 gives each VI workload domain a **dedicated vCenter and SSO domain**. Single sign-on across components is provided by **VCF Single Sign-On** through the **VCF Identity Broker**, which can run embedded in vCenter or as a three-node appliance cluster (see [Identity and SSO](lesson:vcf-identity-sso-rbac)).
:::

:::legacy VCF 5.x / Legacy Context
In VCF 4.x/5.x, workload domain vCenters normally joined the management domain's SSO domain in Enhanced Linked Mode (isolated SSO domains were an option from 5.0). That is why upgraded VCF instances may still share an SSO domain.
:::

### vSphere Cluster Services (vCLS)

[[vcls]] keeps cluster services (DRS depends on it) available independently of vCenter. In vSphere 9.0 it is **Embedded vCLS** (introduced in 8.0 U3), based on vSphere Pod technology, with **up to two** vCLS VMs per cluster instead of the three Photon OS VMs of the older external model. vCenter 9.0 **deprecates vCLS**, and it will be removed in a future release. Do not delete or rename vCLS VMs; use retreat mode if a datastore must be evacuated.

### Sizing and placement

The installer offers deployment sizes (tiny to x-large) and storage sizes based on the number of hosts and VMs to manage. Check the size table in the vCenter installation guide for your exact version; in VCF the size is set by the deployment parameters for the domain.

## Configuration

Common vCenter configuration tasks and where they live:

| Task | Where |
|---|---|
| Appliance time (NTP), DNS, hostname | Management interface (port 5480) → Time / Networking |
| File-based backup schedule | Management interface → Backup |
| Service status, restart | Management interface → Services, or `service-control` |
| Identity sources, SSO users and groups | vSphere Client → Administration → Single Sign On |
| Roles, permissions, global permissions | vSphere Client → Administration → Access Control |
| Licensing | VCF 9 licensing is managed through VCF Operations (see licensing lesson) |
| Advanced settings | vSphere Client → vCenter → Configure → Advanced Settings |
| Tags and custom attributes | vSphere Client → Tags & Custom Attributes |

In VCF, do **not** change the vCenter FQDN, IP, SSO domain or certificates outside the VCF workflows — SDDC Manager stores and validates them.

## CLI / API

From the appliance shell (SSH, then `shell` to reach Bash):

```shell
# Status of every service
service-control --status --all

# Start / stop a single service, for example the vSphere Client
service-control --stop vsphere-ui
service-control --start vsphere-ui
```

PowerCLI against vCenter:

```powershell
Connect-VIServer -Server vcenter-wld01.lab.local
Get-Datacenter
Get-Cluster | Select-Object Name, HAEnabled, DrsEnabled, DrsAutomationLevel
Get-VMHost | Select-Object Name, ConnectionState, PowerState, Version
```

Automation via the vSphere Automation REST API and VCF APIs is covered in [APIs and PowerCLI](lesson:vcf-apis-powercli).

## Failure Scenarios

| Failure | Symptom | Impact |
|---|---|---|
| vCenter VM down | vSphere Client unreachable | No DRS, vMotion, provisioning; HA restarts still happen; VCF workflows for that domain fail |
| vpxd service crashed | Client loads but inventory errors | Same as above until restarted |
| Database partition full | Services fail to start | Check `/storage` partitions in the management interface |
| DNS broken for vCenter FQDN | Logins and host connections fail; VCF validations fail | Fix DNS first |
| Certificate expired (machine SSL) | Browser and component trust errors | Replace via VCF certificate workflow |
| vCLS unhealthy | DRS stops functioning in that cluster | Check vCLS status in the cluster |

## Troubleshooting

1. **Is it the appliance or the UI?** Try the management interface on 5480. If it loads, the VM is up and the issue is a service.
2. **Service status:** `service-control --status --all`; look for stopped services that should be running.
3. **Storage:** check disk usage in the management interface; full log or database partitions stop services.
4. **DNS and time:** `nslookup` the vCenter FQDN and its IP; check NTP. Both are hard VCF dependencies.
5. **Hosts:** if only hosts are disconnected, go back to the ESX lesson (vpxa, network).
6. **VCF view:** check whether SDDC Manager reports the domain's vCenter as healthy and whether a workflow is holding a lock on it.

## Real-World Scenario

A team running VCF 9 with two VI workload domains finds that logging into `vcenter-wld02` does not show `vcenter-wld01`'s inventory, unlike their old VCF 5 environment. Nothing is broken: VCF 9 workload domains get **dedicated SSO domains**, and ELM is deprecated. Their single login experience comes from VCF Single Sign-On through the Identity Broker, and the unified view comes from VCF Operations. Their runbooks are updated to log in to the domain vCenter that owns the cluster they manage.

## Lab

::lab[lab-vcenter-cluster-ha-drs]

You deploy a vCenter appliance on a nested ESX host, create a data center and a cluster, and add three nested hosts — the same objects VCF builds automatically.

## Exam Focus

:::exam
- One **vCenter per workload domain**, and all of them run in the **management domain**.
- VCF 9 workload domains get a **dedicated SSO domain**; ELM is **deprecated** in vCenter 9.0.
- Services: SSO, Lookup Service, VMCA, License Service, vpxd, vSphere Client, vLCM, PostgreSQL — all inside the appliance on Photon OS.
- HA restarts VMs **without** vCenter; DRS does **not** work without vCenter.
- Inventory: data center → clusters → hosts → VMs; folders hold one object type; hosts cannot be renamed.
:::

## Common Exam Traps

:::trap
- Thinking the workload domain vCenter runs inside the workload domain — it runs on the management domain cluster.
- Choosing "vCenter HA" or "ELM" as the VCF 9 answer to cross-domain single sign-on — the VCF 9 answer is VCF SSO / Identity Broker.
- Believing a vCenter outage stops HA failover.
- Confusing the vSphere Client (`/ui`) with the management interface (port 5480).
:::

## Knowledge Check

::quiz

## Summary

- vCenter 9 is a Photon OS 5.0 appliance with embedded PostgreSQL and services for SSO, certificates, licensing, inventory, UI and lifecycle.
- Every VCF workload domain has its own vCenter (running in the management domain) and, in VCF 9, its own SSO domain.
- The inventory is data center → clusters/hosts, VMs/templates, networks, datastores, plus folders and resource pools.
- vCenter down: VMs run and HA restarts continue; DRS, vMotion, provisioning and VCF workflows stop.
- vCLS is embedded (up to two VMs) and deprecated in 9.0; ELM is deprecated in 9.0.

## Next Topic

Next: [vSphere Permissions](lesson:vsphere-permissions) — roles, privileges, inheritance and global permissions in vCenter.
