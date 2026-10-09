---
id: vcf-automation-tenancy-regions
title: "VCF Automation Provider Tasks: Regions, Organizations, Provider Networking and Content"
phase: p11-automation
module: m11-vcfa
version: vcf9
minutes: 45
difficulty: advanced
summary: How the provider administrator builds regions from Supervisors, configures provider networking (IP spaces, provider gateways, edge clusters), creates and isolates organizations with region quotas and regional networking, publishes provider content libraries, and what Supervisor-based services tenants consume.
topics: [vcfa-tenancy, supervisor]
objectives: ["4.4"]
keyTerms: [vcfa-region, vcfa-organization, all-apps-organization, vm-apps-organization, provider-gateway, ip-space, region-quota, provider-content-library]
labs: [lab-vcfa-organization-setup]
components: [vcf-automation, supervisor, nsx-manager, nsx-edge-cluster, vcenter]
related: [vcf-automation-architecture, vcf-automation-org-admin]
sources:
  - title: "VCF 9.0 - Provider Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management.html
  - title: "VCF 9.0 - Regions in VCF Automation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/provider-virtual-datacenters.html
  - title: "VCF 9.0 - Create a Region"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/provider-virtual-datacenters/create-a-provider-virtual-datacenter.html
  - title: "VCF 9.0 - Managing Organizations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-organizations.html
  - title: "VCF 9.0 - Create an Organization for All Applications"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-organizations/create-an-organization.html
  - title: "VCF 9.0 - Managing Networking Resources"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-networking-resources.html
  - title: "VCF 9.0 - Add an IP Space"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-networking-resources/managing-ip-spaces/add-a-public-ip-space.html
  - title: "VCF 9.0 - Add a Provider Gateway"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-networking-resources/managing-provider-gateways/add-a-provider-gateway.html
  - title: "VCF 9.0 - View and Sync Edge Clusters"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-networking-resources/view-and-sync-edge-clusters-in-vcf-automation.html
  - title: "VCF 9.0 - Create a Provider Content Library"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/create-a-content-library.html
  - title: "VCF 9.0 - Organization Management (projects, namespaces)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/managing-projects-in-vcfa.html
  - title: "William Lam - VCF 9.0 lab: configuring VCF Automation"
    url: https://williamlam.com/2025/08/ms-a2-vcf-9-0-lab-configuring-vcf-automation.html
---

## Why This Matters

The exam has five provider-side items: configure a **Region**, configure **multi-organizational tenancy**, configure
**Provider Networking**, configure a **provider content library**, and describe the deployment of **Supervisor-based
services**. These are the "plumbing" a provider must build before any tenant can deploy anything. Most failed tenant
deployments trace back to a provider step: a region with mismatched storage classes, an org without regional
networking, or an IP space without a route on the physical network.

## Learning Objectives

- Explain what a region is and the homogeneity rules for the Supervisors in it.
- Configure provider networking: IP spaces, provider gateways on Tier-0/VRF, edge cluster sync.
- Create organizations (All Apps, VM Apps), assign region quotas and regional networking, and name the first user.
- Explain tenant isolation and what organization deactivation does.
- Publish a provider content library and explain why it is read-only to tenants.
- Describe the Supervisor-based services (VM Service, VKS) consumed through namespaces.

## Concept

The provider builds a three-level model. Everything above the organization line is the provider's; everything below
belongs to the tenant.

| Level | Object | Owner |
|---|---|---|
| Infrastructure | vCenter, NSX, Supervisors, edge clusters | VI admin / provider |
| Provider | [[vcfa-region|Regions]], [[ip-space|IP spaces]], [[provider-gateway|provider gateways]], [[provider-content-library|provider content libraries]] | Provider admin |
| Tenant boundary | [[vcfa-organization|Organization]] with [[region-quota]] and regional networking | Created by provider, run by org admin |
| Tenant | Projects, namespaces, VPCs, catalog, policies | Org admin |

TechDocs definitions to know by heart:

- Region: "a region combines the compute, memory, and networking resources from the underlying infrastructure."
- Organization: "a top-level entity used to group and manage resources, users, policies, IaaS services, and catalog
  entities, while maintaining a secure boundary from other organizations."
- Region quota: "defines the compute and storage quota that an organization gets against a given region. Region quotas
  are applicable only to organizations for all applications."
- Provider gateway: "leverages VCF (VMware Cloud Foundation) networking tier-0 or tier-0 VRF gateways, and associates them with IP addresses from
  IP spaces that can be advertised from those gateways."
- Provider content libraries "are read-only to the users of the organizations."

## Architecture

::diagram[d11-vcfa-tenancy]

## Components

### Region rules

| Rule | Consequence |
|---|---|
| Built from **one or more Supervisors**, from one or more vCenter instances | Capacity of several Supervisors can be pooled |
| All Supervisors must use the **same NSX instance** | Supervisors on different NSX instances cannot share a region |
| **Identical storage class names and configurations**, matching Kubernetes versions, consistent IaaS services | "VCF Automation does not support non-homogeneous region configurations" |
| Storage classes selected when the region is defined | These are what tenants can consume |
| Region **name** and **NSX Manager** cannot be changed after creation | Plan names up front |

### Provider networking

| Object | Purpose |
|---|---|
| IP space | Structured allocation of external (public) IP addresses to organizations |
| Provider gateway | Tier-0 or Tier-0 VRF gateway + IP spaces that can be advertised from it |
| Edge clusters | Listed and **synced** with NSX in the provider portal (Networking > Edge Clusters > Sync in William Lam's walkthrough) |
| Regional networking (per org) | Binds a region, a provider gateway and an edge cluster to an organization |

### Organization lifecycle

| Action | Effect |
|---|---|
| Create All Apps org | Name, first user (becomes org admin), region quota, regional networking |
| Create VM Apps org | VM-centric org without Supervisor |
| Edit metadata / first user | Provider portal |
| **Deactivate** | "prevents users from logging in to the organization and terminates the sessions of users currently logged in" |
| Delete | Remove after its resources are cleaned up |

## How It Works

Provider setup sequence (matches William Lam's VCF 9.0 lab walkthrough):

1. Log in to VCF Automation as `admin` in organization **system** (Provider Management portal).
2. **Create a region**: select the Supervisor(s) and the storage classes.
3. **Create an IP space** with an external IP block (for example `31.32.0.0/16` in Lam's lab) for VPC subnets that
   need external connectivity. If you do not use BGP (Border Gateway Protocol), add a **static route on the physical router** for that block.
4. **Create a provider gateway** on the Tier-0 (or VRF) gateway, associated with the IP space.
5. **Sync edge clusters** so VCF Automation sees the NSX edge cluster.
6. **Create the organization** (All Apps), set its **region quota** (CPU, memory, storage, VM classes) and its first user.
7. **Configure regional networking** for the org: logical network name, region, provider gateway, edge cluster.
8. Optionally create a **provider content library** and share it to organizations (read-only for them).
9. Hand over: the org admin logs in to the organization portal (`/automation` path in Lam's lab).

::diagram[d11-vcfa-provider-onboarding]

### Exact provider-portal workflow

**Region.** Open **Infrastructure > Regions > New**. Enter the name and description, select the NSX Manager shared by
all participating vCenter instances, select one or more Supervisors, select the storage classes offered in the region
and select **Submit**. VCF Automation lists the union of storage classes but does not prove that each storage or VM
class exists consistently on every vCenter. Expand the result to verify status, Supervisors, NSX Manager and CPU/memory
use; open the region to inspect Supervisors, Classes, Storage Classes, Zones and Reserved VM Classes.

**Provider networking.** Open **Infrastructure > Networking**:

1. On **IP Spaces**, select **New**, enter the name, select the region and define up to five IPv4 ranges and prefixes
   inside the internal scope. Optionally define `0.0.0.0/0` as external scope, then set default per-organization IP,
   CIDR and maximum-subnet-size quotas. Review and select **Create**.
2. In NSX, the backing Tier-0 must use **Active Standby** for VCF Automation 9.0. A Tier-0 VRF can be used when linked
   to that Tier-0. Back it with the approved Edge cluster.
3. On **Provider Gateways**, select **New**, name it, select the Tier-0's region, choose the Tier-0 or VRF, associate one
   or more IP spaces, review and select **Create**.
4. On **Edge Clusters**, verify the automatically discovered cluster and select **Sync** after NSX changes. Select the
   cluster and open **Node Health** to inspect each Edge node.

**All Apps organization.** Open **Infrastructure > Organizations > Create Organization**, choose **Organization for All
Apps**, name it and select **Create and Continue**. The name becomes the URL identifier and the wizard cannot be
cancelled after this checkpoint. Select a region and Supervisor; allocate zones with CPU/memory limits and reservations;
assign VM and storage classes; then create the single first user with a role that can administer the organization and
its identity provider. To remove an organization later, disable it before deletion.

## Deep Dive

### Multi-organizational tenancy and isolation

Each organization is an isolation boundary: its own users (possibly its own IdP), projects, content, policies and
networking (VPCs). "Each organization operates in a secure and isolated environment where users can access only
allocated services and resources." The provider controls *how much* (region quota), *what network exit* (regional
networking via a provider gateway) and *what shared content* (provider content libraries) each org gets.

### Region quota in practice

The region quota caps the sum of everything the org can create in that region. Inside the org, namespace limits cannot
exceed the organization's quota. If a tenant cannot create a namespace "although the cluster is empty", look at the
region quota first.

### Supervisor-based services

An All Apps organization consumes capacity through **Supervisor namespaces**. Inside a namespace users deploy:

| Service | What it provides |
|---|---|
| VM Service | VMs declared through the Supervisor (VM classes, content libraries) |
| vSphere Kubernetes Service (VKS) | Conformant Kubernetes clusters; VKS cluster management is available in the organization portal |
| Storage | Persistent volumes via storage classes (from vSphere storage policies) |
| Networking | VPCs (NSX) with private and public subnets |

Enabling the Supervisor itself is a VI-admin task in vCenter (see the Supervisor lessons and
`lab-enable-supervisor`); VCF Automation then consumes it through regions.

:::details What about VM Apps organizations?
VM Apps organizations do not need a Supervisor or region quota. They use vSphere clusters directly and a VM-centric
experience (cloud accounts are configured inside the org, as Broadcom KB articles about "cloud account on VCF Automation
for VM Apps org" show). TechDocs describes the model as "one organization using vSphere cluster capabilities"; creating
additional VM Apps organizations is described in Broadcom KB 419781 via the REST API (Application Programming Interface). Check the docs for your exact
version before relying on limits.
:::

### Provider content library

Provider content libraries hold golden images the provider wants every tenant to use. One VCF Automation library is an
abstraction over backing vCenter content libraries in the selected regions. When the provider creates it, VCF
Automation creates a backing library on suitable storage in every participating vCenter, randomly selects one backing
library as publisher and makes the others subscribers. The vCenter instances therefore need network connectivity for
content synchronization.

The provider selects one or more regions and one storage class per region. Storage class names must exist consistently
across the vCenter instances in the region; VCF Automation does not verify that every vCenter has the storage or VM
class. Content libraries cannot use storage clusters, only datastores governed by the selected storage policies.

Every organization with quota in a selected region receives the provider library automatically on a **read-only**
basis. Organization users can deploy its images but cannot change the library. Provider actions remain centralized:

1. In the **VCF Automation Provider Management Portal**, open **Infrastructure > Content Libraries**.
2. On the **Content Library** tab, select **New**, enter a name and optional description.
3. Optionally enable subscription to an external VCSP-compliant library and supply its URL and password.
4. Select one or more regions and a storage class for each region, review and select **Confirm**.
5. Use the row's vertical ellipsis to **Edit** scope/storage, **Refresh** changes made in backing vCenter libraries or
   **Delete** the provider library.

Changing the storage class triggers content migration. **Refresh** reconciles direct vCenter additions or deletions
with the VCF Automation abstraction; it is not the same as an ordinary subscriber synchronization schedule.

::diagram[d11-vcfa-content-lifecycle]

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

| Object | Example (lab) |
|---|---|
| Region | `region-lab` = Supervisor on `wld01` cluster, storage class `vsan-default` |
| IP space | `lab-external` 172.31.0.0/24 (static route on the lab router to the Tier-0 uplink) |
| Provider gateway | `pgw-lab` on Tier-0 `t0-lab` with IP space `lab-external` |
| Edge cluster | `ec-wld01` synced |
| Organization | `org-dev` (All Apps), first user `devadmin` |
| Region quota | CPU and memory limits sized for a few small VMs (e.g. 64 GB memory), storage limit on `vsan-default`, VM classes best-effort-small and best-effort-medium |
| Regional networking | `org-dev-net`: region-lab + pgw-lab + ec-wld01 |
| Provider content library | `golden-images` (Ubuntu, Photon OVA) shared read-only |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Provider configuration can be automated with the VCF Automation APIs and Terraform (TechDocs lists "Terraform
configurations in VCF Automation provider management"). Before scripting, explore the objects in the UI so you know the
names and IDs you need. On the NSX side you can confirm the Tier-0 the provider gateway will use:

```shell
curl -sk -u 'admin:<password>' https://nsx-wld01.lab.local/policy/api/v1/infra/tier-0s | jq '.results[].display_name'
```

Line by line: `-u` uses basic authentication; `/policy/api/v1/infra/tier-0s` lists Tier-0 gateways in the Policy API;
`jq` extracts their names.

## Failure Scenarios

| Symptom | Likely provider-side cause |
|---|---|
| Supervisor not offered when creating a region | It is on a different NSX instance than other selected Supervisors, or not healthy |
| Region creation fails | Storage class names or configurations differ between Supervisors |
| Tenant VPC public subnet unreachable from outside | IP space block not routed on the physical network (no BGP advertisement / static route) |
| Provider gateway creation offers no suitable Tier-0 | The NSX Tier-0 is not in the selected region or is not configured Active Standby as required by VCF Automation 9.0 |
| Org admin cannot create namespaces | No or insufficient region quota |
| Org has no networking | Regional networking not configured (provider gateway / edge cluster not bound) |
| Users locked out of an org | Organization deactivated |
| Provider library missing in one expected region | Region was not selected, its storage class is inconsistent, or backing vCenter synchronization failed |
| Content appears in a backing vCenter but not in VCF Automation | Run **Refresh** on the provider library to reconcile direct backing-library changes |

## Troubleshooting

1. Region problems: compare Supervisors' NSX instance, storage class names, Kubernetes versions.
2. Networking: verify provider gateway -> Tier-0 -> physical router routes for the IP space; edge cluster synced.
3. Quota: check the org's region quota vs requested namespace limits.
4. Content: confirm the provider library is shared to the org.
5. Provider library distribution: verify selected regions and storage classes, then confirm publisher/subscriber
   connectivity between participating vCenter instances.

## Real-World Scenario

A provider runs two workload domains with Supervisors, both attached to the same NSX instance, in one data center. It
creates a region `dc1` from both Supervisors (after renaming storage classes so they match), an IP space with a /24 of
public addresses advertised via BGP from the Tier-0, and a provider gateway. Three business units get All Apps
organizations with quotas sized to their budgets and a shared read-only "corporate images" library. When one business
unit is acquired by another company, the provider **deactivates** its organization, which logs out all its users
immediately while the data stays intact for the handover.


## Exam Focus

- Region = Supervisors sharing **one NSX instance** with **identical storage classes**; name/NSX immutable.
- Region creation path = **Infrastructure > Regions > New**; VCF Automation does not verify class consistency on every
  backing vCenter, so the provider must validate it.
- Provider networking = **IP spaces** + **provider gateways** (Tier-0/VRF) + **edge cluster sync**; per-org
  **regional networking**.
- In VCF Automation 9.0 the provider gateway uses an **Active Standby** Tier-0; IP spaces are IPv4 and can define
  default quotas with organization-specific overrides.
- Organizations: All Apps (region quota), VM Apps, Provider Consumption; first user = org admin; deactivation logs
  users out.
- Provider content library = **read-only** to orgs.
- Provider library = one VCF Automation abstraction backed by synchronized vCenter libraries across its selected
  regions; all organizations with quota there receive it automatically.
- Supervisor-based services: VM Service, VKS, storage classes, VPC networking in namespaces.

## Common Exam Traps

:::trap
Region quotas apply only to **All Apps** organizations.
:::

:::trap
Supervisors attached to different NSX instances cannot be in the same region, even in the same vCenter fleet.
:::

:::trap
Tenants cannot edit provider content libraries; they publish their own content in organization libraries.
:::

:::trap
A provider content library is shared according to selected **regions** and organization quota in those regions. The
provider does not manually grant edit rights to each organization.
:::

## Knowledge Check

::quiz

## Summary

The provider builds regions from homogeneous Supervisors on one NSX instance, exposes north-south networking through IP
spaces and provider gateways on Tier-0/VRF gateways with synced edge clusters, and creates organizations with region
quotas, regional networking and a first user. Provider content libraries are shared read-only. Tenants then consume
Supervisor-based services (VM Service, VKS, storage, VPCs) through namespaces.

## Next Topic

Next: [organization administration](lesson:vcf-automation-org-admin) - projects, namespaces, networks, content,
extensibility and governance.
