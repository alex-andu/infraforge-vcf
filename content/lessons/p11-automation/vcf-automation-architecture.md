---
id: vcf-automation-architecture
title: VCF Automation Use Cases, Components and Deployment Options
phase: p11-automation
module: m11-vcfa
version: vcf9
minutes: 35
difficulty: intermediate
summary: What VCF Automation is for, how it is built (Kubernetes-based appliances, provider and organization portals, Orchestrator), the Simple and High Availability models, and how it is deployed and lifecycled in VCF 9.
topics: [vcf-automation]
objectives: ["4.4"]
keyTerms: [vcfa-organization, all-apps-organization, vm-apps-organization, vcfa-region, event-subscription]
labs: [lab-vcfa-organization-setup]
components: [vcf-automation, vcf-operations-fleet-management, supervisor, nsx-manager, vcenter]
related: [vcf-automation-tenancy-regions, vcf-automation-org-admin, vcf-operations-architecture]
sources:
  - title: "VCF 9.0 Architectural Options - VCF Automation Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-automation-deployment-models.html
  - title: "VCF 9.0 Architectural Options - VCF Operations Models (what the VCF Installer deploys)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html
  - title: "SDDC Manager API 9.0 - VcfAutomationSpec"
    url: https://developer.broadcom.com/xapis/sddc-manager-api/9.0/data-structures/VcfAutomationSpec/
  - title: "VCF 9.0 - Provider Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management.html
  - title: "VCF 9.0 - Organization Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management.html
  - title: "VCF 9.0 - Managing Organizations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-organizations.html
  - title: "William Lam - VCF 9.0 lab: configuring VCF Automation"
    url: https://williamlam.com/2025/08/ms-a2-vcf-9-0-lab-configuring-vcf-automation.html
---

## Why This Matters

VCF (VMware Cloud Foundation) Automation is what turns VCF from "a well-managed virtual infrastructure" into a **private cloud**: self-service,
multi-tenant consumption of VMs, Kubernetes clusters and networks, with quotas and governance. TechDocs describes it as
"the central provisioning platform for your VCF fleet" that "enables consumption of Kubernetes and cloud
infrastructure resources as a service, while maintaining control, security, and compliance".

Two exam items are covered here: "identify the use case for VCF Automation" and "describe the components and
deployment options of VCF Automation". The following lessons cover regions, tenancy and organization administration.

## Learning Objectives

- Identify scenarios where VCF Automation is (and is not) the right tool.
- Describe the runtime architecture: Kubernetes-based services on dedicated appliances in the management domain.
- Compare the Simple and High Availability VCF Automation models, including node counts and IP requirements.
- Describe the two consumer personas (provider and organization) and the organization types.
- Explain how VCF Automation is deployed and lifecycled (VCF Installer, VCF Operations fleet management).

## Concept

### Use cases

| Scenario | VCF Automation? | Why |
|---|---|---|
| Lines of business need self-service VMs and Kubernetes with quotas and isolation | **Yes** | Multi-tenant organizations, region quotas, projects, namespaces |
| Developers want a catalog of approved blueprints with approvals and leases | **Yes** | Catalog, blueprints, approval/lease policies |
| Trigger an IPAM/CMDB/ticketing workflow whenever a VM is provisioned | **Yes** | Extensibility: event subscriptions + Orchestrator workflows |
| Provider wants to offer "VPC-style" networking to tenants | **Yes** | Provider gateways, IP spaces, organization VPCs |
| Monitor CPU contention of a cluster | No | VCF Operations |
| Patch ESX hosts / upgrade the fleet | No | Fleet management / SDDC (Software-Defined Data Center) Manager lifecycle |
| A single admin creating a handful of VMs with no governance | Usually no | vSphere Client is enough |

Use VCF Automation when the requirement is a **repeatable consumption service**, rather than a one-time infrastructure
task. Five signals make it the right control plane:

| Signal in the scenario | Capability selected in VCF Automation |
|---|---|
| Different business units must consume shared infrastructure without seeing each other's resources | Organizations, projects and role-scoped portals |
| Teams need to request VMs, VKS clusters, networks or volumes without direct administrator intervention | Self-service interfaces, catalog, namespaces and Supervisor services |
| Consumption must stay inside budgets or technical limits | Region quotas, namespace limits, IP quotas and IaaS policies |
| Only approved images and application patterns may be deployed | Provider/organization content libraries, blueprints and catalog items |
| Provisioning must call approval, IPAM, CMDB or ticketing processes | Governance policies, event subscriptions and VCF Operations Orchestrator |

The service boundary matters. VCF Automation decides **who may request what, from which approved content, under which
quota and workflow**. vCenter and Supervisor execute the workload, NSX carries its traffic, VCF Operations observes it,
and SDDC Manager or fleet management lifecycle the infrastructure and management products.

### Personas and portals

| Persona | Portal | Typical tasks |
|---|---|---|
| Provider administrator | Provider Management portal (organization **system**) | Regions, provider networking, organizations, region quotas, provider content libraries, identity providers |
| Organization administrator | Organization portal (`https://<vcfa-fqdn>/automation` in William Lam's lab) | Projects, namespaces, users/roles, networks, content, catalog, policies, extensibility |
| Organization user | Organization portal | Request catalog items, deploy into namespaces, day-2 actions |

### Organization types

| Type | Built on | Notes |
|---|---|---|
| [[all-apps-organization|Organization for All Apps]] | **vSphere Supervisor** | "the primary multi-tenancy model"; region quotas apply; VMs, VKS clusters, VPC networking |
| [[vm-apps-organization|Organization for VM Apps]] | vSphere clusters | "does not require a Supervisor, shared infrastructure, or tenancy isolation"; for VM-based apps |
| Provider Consumption Organization | - | Lets the provider admin consume their own infrastructure through the Organization Portal |

## Architecture

::diagram[d11-vcfa-architecture]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/a0980e9f-3b61-482c-bcee-3929a53105f4.original.png" caption="VCF Automation Models in VMware Cloud Foundation (Broadcom TechDocs, VCF 9.0 Architectural Options)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-automation-deployment-models.html"}

TechDocs: VCF Automation "runs on containerized services within a Kubernetes cluster deployed on dedicated virtual
appliances", and these nodes are visible in the vCenter inventory as individual VMs.

## Components

| Component | Function |
|---|---|
| VCF Automation appliance nodes | VMs in the management domain hosting the internal Kubernetes cluster (1 or 3 nodes) |
| Containerized services | Provider portal, organization portals, catalog, policy engine, provisioning, APIs |
| VCF Operations Orchestrator | Workflow engine used for extensibility (workflows published to the catalog, event subscriptions) |
| Identity integration | VCF SSO (Single Sign-On) / external IdPs; providers and orgs can import users and groups |
| VCF Operations fleet management | Deploys (Day 2) and lifecycles VCF Automation; manages its certificates and passwords |
| Consumed infrastructure | vCenter, NSX and Supervisors in workload domains (All Apps), vSphere clusters (VM Apps) |

### Deployment models

| Model | Nodes | Size | Benefits | Implications |
|---|---|---|---|---|
| **Simple** | 1 | Small | PoC, evaluation, small non-critical, dev/test | No application-level HA (High Availability); scaling to HA means resizing to Medium/Large, which forces the 3-node expansion |
| **High Availability** | 3 | Medium or Large | Production, mission-critical, enterprise, growth | Application-level availability; optional external load balancer; scale up/down |

### Deployment inputs (SDDC Manager API (Application Programming Interface) `VcfAutomationSpec`)

| Field | Meaning |
|---|---|
| `hostname` | FQDN (Fully Qualified Domain Name) users reach VCF Automation on (required) |
| `ipPool` | Node IP addresses: **2 for the standard (simple) model, 4 for High Availability** |
| `internalClusterCidr` | Internal Kubernetes CIDR: one of `198.18.0.0/15`, `240.0.0.0/15`, `250.0.0.0/15` |
| `nodePrefix` | Lower-case prefix for the node VM names |
| `adminUserPassword` | Admin password (auto-generated if blank) |
| `useExistingDeployment` + `sslThumbprint` | Import an existing deployment instead of deploying a new one |

:::warning
The internal cluster CIDR is used inside the appliance's Kubernetes cluster. Pick one that does not overlap with
networks the appliances must reach, otherwise routing to those networks breaks.
:::

## How It Works

1. **Plan**: choose Simple or HA; reserve the FQDN and the node IPs (2 or 4) on the management network; pick an
   internal cluster CIDR; DNS (Domain Name System) forward and reverse records.
2. **Deploy**: either during the initial VCF Installer deployment, or later from VCF Operations fleet management.
3. **First login**: the provider admin logs in to organization **system** with the admin account.
4. **Provider setup**: create regions, provider networking, organizations and quotas (next lesson).
5. **Tenant setup**: org admins create projects, namespaces, content and policies (lesson after).
6. **Lifecycle**: upgrades, certificates and passwords for VCF Automation are driven from VCF Operations fleet
   management.

## Deep Dive

### Why Kubernetes under the hood matters to an operator

- A node failure in the Simple model is an outage of the self-service portal until vSphere HA restarts the VM (running
  workloads keep running - they live on vCenter/Supervisor, not on VCF Automation).
- In HA, services are spread across three nodes; the extra IPs in `ipPool` serve the cluster.
- The internal CIDR exists because of the embedded Kubernetes networking.

### What VCF Automation is *not*

It is not in the data path of the workloads it deploys. VMs and VKS clusters run on Supervisors and vSphere clusters;
networking runs on NSX. If VCF Automation is down, existing workloads keep running; only self-service, catalog and
day-2 actions through VCF Automation stop.

:::vcf9 Changed in VCF 9
- Aria Automation and the vCloud Director-style multi-tenancy are combined into **VCF Automation**. The All Apps
  organization model (built on Supervisor, regions, VPCs) is new; VM Apps organizations keep a VM-centric experience.
- VCF Automation is part of the VCF deployment (VCF Installer) and its lifecycle is handled by VCF Operations fleet
  management instead of Aria Suite Lifecycle.
:::

:::legacy VCF 5.x / Legacy Context
In VCF 5.x, Aria Automation (cloud accounts, cloud zones, projects, cloud templates, Service Broker) was deployed via
Aria Suite Lifecycle, and multi-tenancy for service providers was VMware Cloud Director. Many concepts (projects,
blueprints/templates, approval and lease policies, Orchestrator extensibility) carry over, but the tenancy model in 9.0
is organization/region based.
:::


### Worked exam-style scenarios

| Scenario | Answer |
|---|---|
| "Evaluate VCF Automation in a small dev lab with minimal resources." | Simple model, one small node, two IPs in `ipPool`. |
| "Production self-service portal must survive the loss of one appliance node." | High Availability model: three medium or large nodes, four IPs, optional external load balancer. |
| "A team needs Kubernetes clusters and VMs from a self-service catalog with per-team quotas." | VCF Automation with an All Apps organization (Supervisor based), region quota, projects and namespaces. |
| "A business unit only deploys classic VMs on clusters without Supervisor." | A VM Apps organization. |
| "Every new VM must be registered in the CMDB automatically." | Extensibility: event subscription running an Orchestrator workflow. |
| "Upgrade VCF Automation to a new release." | VCF Operations fleet management lifecycle, not the VCF Automation UI. |
| "The VCF Automation appliance VM is down; are tenant VMs affected?" | No - workloads run on the Supervisor/vSphere; only self-service stops. |
| "An administrator needs to remediate ESX hosts against a desired image." | vSphere Lifecycle Manager / VCF lifecycle, not VCF Automation. |
| "A provider wants every organization to consume one controlled golden image without editing it." | Provider content library in VCF Automation. |

### Dependencies to check before deployment

| Dependency | Why |
|---|---|
| DNS (forward and reverse) for the FQDN | Users, certificates and fleet management use the name |
| Free node IPs on the management network | 2 (simple) or 4 (HA) |
| Non-overlapping internal cluster CIDR | Embedded Kubernetes networking |
| NTP (Network Time Protocol) | Tokens, certificates and cluster health depend on time |
| Supervisor-enabled workload domain (for All Apps) | Regions are built from Supervisors |
| NSX with Tier-0 and edge cluster | Provider gateways and VPC networking |

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Planning worksheet for the learner's lab (Simple model):

| Item | Example |
|---|---|
| FQDN | `auto01.lab.local` |
| Node IPs (`ipPool`) | 2 addresses on the management VLAN (Virtual Local Area Network) |
| Internal cluster CIDR | `198.18.0.0/15` (not used anywhere else in the lab) |
| Node prefix | `vcfa` |
| DNS | A + PTR for `auto01.lab.local` |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

The deployment is described by the `VcfAutomationSpec` structure in the SDDC Manager / installer API:

```json
{
  "hostname": "auto01.lab.local",
  "ipPool": ["10.0.10.60", "10.0.10.61"],
  "internalClusterCidr": "198.18.0.0/15",
  "nodePrefix": "vcfa",
  "adminUserPassword": "VMware123!VMware123!"
}
```

Line by line: `hostname` is the FQDN users will browse to; `ipPool` holds the node IPs (two for the simple model, four
for HA); `internalClusterCidr` must be one of the three allowed ranges; `nodePrefix` names the VMs;
`adminUserPassword` can be left blank to auto-generate. Tenant-level automation uses the VCF Automation APIs and
Terraform (see [VCF APIs and PowerCLI](lesson:vcf-apis-powercli)).

## Failure Scenarios

| Failure | Impact |
|---|---|
| Single node down (Simple) | No portals or catalog until vSphere HA restarts it; running workloads unaffected |
| One node down (HA) | Service continues on remaining nodes |
| Internal CIDR overlaps a real network | Appliances cannot reach that network (for example NSX or vCenter in that range) |
| DNS record missing | Deployment validation fails or users cannot reach the portal |
| Identity provider unreachable | Users from that IdP cannot log in |

## Troubleshooting

1. Check the node VMs in vCenter (powered on, resources).
2. Check DNS forward/reverse for the FQDN and node IPs.
3. Check the deployment/lifecycle task in VCF Operations fleet management for errors.
4. Check certificates (expired/untrusted) and identity provider reachability.

## Real-World Scenario

A university IT department serves five faculties. Each faculty wants its own self-service environment with a budget.
They deploy VCF Automation in the **HA** model (production use, four node IPs reserved), create one **All Apps**
organization per faculty in a region built from the workload-domain Supervisors, and give each a region quota. A legacy
team that only needs VMs and has no Supervisor-enabled cluster gets a **VM Apps** organization instead.


## Exam Focus

- Use case: self-service, multi-tenant consumption of VMs, Kubernetes and networking with governance.
- Select it when a scenario combines consumer delegation with isolation, quotas, approved content or workflow
  automation; select the infrastructure product directly for one-off administration, lifecycle or monitoring.
- Runs as **Kubernetes-based services on appliance VMs** in the management domain.
- **Simple** = 1 node (small), **HA** = 3 nodes (medium/large), optional external LB.
- IPs: **2 (simple) / 4 (HA)**; internal cluster CIDR from three allowed ranges.
- Org types: **All Apps** (Supervisor), **VM Apps** (no Supervisor), **Provider Consumption**.
- Deployed by **VCF Installer** or later via **VCF Operations fleet management**.

## Common Exam Traps

:::trap
VCF Automation being down does not stop running workloads; it stops self-service and day-2 operations through it.
:::

:::trap
An All Apps organization needs a **Supervisor**; choosing it for a cluster without Supervisor is wrong - use a VM Apps
organization or enable Supervisor first.
:::

:::trap
Scaling Simple to HA is not "add one node": it is a resize to Medium/Large that forces the three-node cluster.
:::

:::trap
VCF Automation is a provisioning and governance control plane. It does not replace vCenter for inventory operations,
VCF Operations for monitoring, NSX for the network data path or SDDC Manager/fleet management for lifecycle.
:::

## Knowledge Check

::quiz

## Summary

VCF Automation is the fleet's self-service and multi-tenant provisioning platform. It runs as containerized services on
one (Simple) or three (HA) appliance nodes in the management domain, is deployed by the VCF Installer or fleet
management, and serves provider administrators (system organization) and organizations of type All Apps (Supervisor
based), VM Apps or Provider Consumption.

## Next Topic

Next: [regions, organizations, provider networking and content](lesson:vcf-automation-tenancy-regions).
