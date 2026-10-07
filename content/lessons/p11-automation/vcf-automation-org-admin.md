---
id: vcf-automation-org-admin
title: "VCF Automation Organization Administration: Projects, Networks, Content, Extensibility and Governance"
phase: p11-automation
module: m11-vcfa
version: vcf9
minutes: 45
difficulty: advanced
summary: Everything the organization administrator does in an All Apps organization - users and roles, projects and namespaces, VPC networking, content libraries and blueprints, extensibility with Orchestrator and event subscriptions, and approval, lease, day-2 and IaaS resource policies.
topics: [vcfa-org-admin]
objectives: ["4.4"]
keyTerms: [vcfa-project, vcfa-namespace, namespace-class, vcfa-connectivity-profile, vcfa-ip-quota, nsx-vpc, transit-gateway, event-subscription, vcfa-governance-policy, region-quota, all-apps-organization]
labs: [lab-vcfa-organization-setup]
components: [vcf-automation, supervisor]
related: [vcf-automation-tenancy-regions, vcf-automation-architecture, vcf-apis-powercli]
sources:
  - title: "VCF 9.0 - Organization Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management.html
  - title: "VCF 9.0 - Managing Projects in VCF Automation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/managing-projects-in-vcfa.html
  - title: "VCF 9.0 - Managing Networking in VCF Automation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/adding-and-managing-virtual-private-clouds.html
  - title: "VCF 9.0 - Create a Connectivity Profile in VCF Automation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/adding-and-managing-virtual-private-clouds/create-a-connectivity-profile.html
  - title: "VCF 9.0 - Create a Virtual Private Cloud in VCF Automation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/adding-and-managing-virtual-private-clouds/add-a-vpc.html
  - title: "VCF 9.0 - Managing IP Address Blocks and IP Quotas"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/adding-and-managing-virtual-private-clouds/ip-management.html
  - title: "VCF 9.0 - Creating Policies for All Apps Organizations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/creating-policies-for-all-apps-orgs.html
  - title: "VCF 9.0 - Event Subscriptions in VCF Automation for All Apps"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/organization-management/event-subcriptions-in-vcf-automation-for-all-apps.html
  - title: "VCF 9.0 - Managing Organizations (provider view)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/provider-management/managing-organizations.html
---

## Why This Matters

Five exam items describe the organization administrator's job: complete tasks as an **organizational administrator**,
configure **organizational networks**, create and manage **content**, use **extensibility** to automate business
processes, and create and manage **organizational governance policies**. In practice the org admin turns the quota the
provider gave them into something teams can safely consume: who can deploy, where, with which images, how big, for how
long, and what happens automatically around each request.

## Learning Objectives

- Manage users, groups and roles in an organization (including external identity providers).
- Create projects, namespace classes and namespaces within the region quota.
- Configure organization networking with connectivity profiles, three address scopes, VPCs, namespaces and IP quotas.
- Curate content: organization content libraries, blueprints and the catalog.
- Automate business processes with Orchestrator workflows, event subscriptions and custom resources.
- Create approval, day-2 action, lease and IaaS resource policies, and scope them to the org or to projects.

## Concept

| Area | Org admin objects | TechDocs anchor |
|---|---|---|
| Identity | IdPs (LDAP, SAML, OIDC), users, groups, roles | "Roles assigned to users and groups are an essential part to identity and access management" |
| Structure | [[vcfa-project|Projects]], [[vcfa-namespace|namespaces]], [[namespace-class|namespace classes]] | Project = "logical grouping of users and the infrastructure that they are assigned" |
| Networking | Connectivity profiles, VPCs, three address scopes, transit gateway, IP quotas | Organization networking pages |
| Content | Content libraries (VM images, templates), blueprints, catalog | "Create and publish blueprints for infrastructure-as-code deployments" |
| Extensibility | Orchestrator workflows in the catalog, [[event-subscription|event subscriptions]], custom resources | Subscriptions run workflows "when a triggering event occurs" |
| Governance | [[vcfa-governance-policy|Policies]]: approval, day 2 action, lease, IaaS resource | "guardrails around provisioning requests" |

## Architecture

::diagram[d11-org-request-flow]

## Components

### Projects and namespaces

| Object | Definition | Key rule |
|---|---|---|
| Project | Logical grouping of users and assigned infrastructure; represents a real team | Every org has a **default project**; "only project members can access deployments and resources available to a project" |
| Namespace | "an envelope of resources where applications can be deployed" - VMs, VKS clusters, volumes with CPU/memory/storage limits | Total namespace limits **cannot exceed the organization quota**; limits can draw on several vSphere zones |
| Namespace class | Template defining resource limits, VM classes, storage classes and content libraries | Maintained by org admins; makes namespaces consistent |

Use **multiple projects** when strict team isolation is required; use **multiple namespaces in a project** for
application-level resource boundaries.

### Governance policies

| Policy | Category | Effect |
|---|---|---|
| **Approval** | Catalog requests | Requests wait for designated approvers in the **Inbox** |
| **Day 2 Action** | Catalog requests | Restricts which user groups can run which actions on deployed resources |
| **Lease** | Catalog requests | Maximum lifetime; expired resources are destroyed and reclaimed |
| **IaaS Resource** | IaaS services | Granular control over VM and Kubernetes cluster requests; policy-as-code with **CEL** (Common Expression Language) |

Scope: the whole **organization** or specific **projects**, refined with deployment criteria on project names,
namespace names or namespace classes. Multiple policies are merged by evaluation and ranking. Three views: **Policy
Definition**, **Policy Assignments** (effective application) and **Policy Enforcement** (audit history).

### Extensibility

| Mechanism | Use |
|---|---|
| Orchestrator workflows published to the catalog | Expose a business process (e.g. "request firewall change") as a self-service item |
| Event subscriptions | Run a workflow when an event occurs (e.g. after provisioning: register in CMDB) |
| Custom resources | Add your own resource types to blueprints, backed by workflows |

Event subscription behaviour: **non-blocking** subscriptions run asynchronously in no guaranteed order; **blocking**
subscriptions run synchronously in priority order (**0 is highest**), the next subscription sees the updated payload,
and a **recovery runnable** can run if the workflow fails. Subscriptions are project-specific.

## How It Works

Org admin onboarding of a new team:

1. **Identity**: add the external IdP (if not done) and import the team's group; assign roles.
2. **Project**: create project `payments`, add the group as members.
3. **Namespace class**: create `small-app` (limits, VM classes `best-effort-small/medium`, storage class, content library).
4. **Namespace**: create `payments-dev` from the class inside the project, within the org quota.
5. **Network**: create a VPC for the project with a private subnet for app tiers and a public subnet for the load
   balancer. Select the region and a connectivity profile; public addresses come from provider-managed external blocks
   and private TGW space gives direct reachability to other VPCs in the organization.
6. **Content**: upload the team's hardened image to an org content library; publish a blueprint "3-tier app" to the
   catalog for the project.
7. **Extensibility**: subscribe a CMDB-registration workflow to the post-provisioning event (blocking, priority 10).
8. **Governance**: lease policy 30 days for `payments-dev`, approval policy for anything requesting more than the
   small class, day-2 policy forbidding "delete" for non-admins.
9. **Test** as a team member: request the blueprint, approve it from the Inbox, verify the CMDB entry and the lease.

## Deep Dive

### Blocking vs non-blocking - choose carefully

Use **blocking** when later steps depend on the result (for example an IPAM workflow that returns the IP to use).
Use **non-blocking** for notifications or logging that must not slow provisioning. A failing blocking subscription
can fail the request; add a recovery runnable.

### Policy-as-code with CEL

IaaS resource policies use CEL expressions to express constraints beyond the built-in templates, for example "VM
class must be one of X for namespaces in class dev". Because several policies can apply, always check **Policy
Assignments** to see the effective result and **Policy Enforcement** to audit what happened.

### Content layering

| Layer | Who manages | Tenant can edit? |
|---|---|---|
| Provider content library | Provider | No (read-only) |
| Organization content library | Org admin | Yes (within the org) |
| Blueprints / catalog items | Org admin (or delegated) | Yes |


### Worked exam-style scenarios

| Scenario | Correct tool |
|---|---|
| "Requests for large VMs must be approved by the team lead." | Approval policy scoped to the project, criteria on VM class/namespace class, approvers = team lead group. |
| "Test deployments must disappear automatically after two weeks." | Lease policy (14 days) on the test namespaces. |
| "Developers must not be able to delete production deployments." | Day 2 action policy restricting the delete action. |
| "Only best-effort VM classes are allowed in dev namespaces, written as code." | IaaS resource policy with a CEL expression. |
| "After provisioning, call IPAM and wait for the IP before continuing." | Blocking event subscription (high priority) running an Orchestrator workflow, with a recovery runnable. |
| "Post a chat message for every new deployment without slowing provisioning." | Non-blocking event subscription. |
| "Expose a 'request firewall change' process to users." | Publish an Orchestrator workflow to the catalog. |
| "Two teams must never see each other's deployments." | Separate projects. |
| "One team needs separate resource envelopes for dev and test." | Two namespaces in the same project (possibly from different namespace classes). |
| "The org admin needs more total CPU in the region." | Ask the provider to raise the region quota - the org admin cannot exceed it. |

### Organization networking in more detail

Organization networking is built on NSX [[nsx-vpc|VPCs]] and a [[transit-gateway]]. The provider first assigns the
organization a region, regional networking through a provider gateway and external address capacity. The organization
administrator then works in **Manage & Govern > Networking** and controls four layers:

| Layer | What the org admin controls | Scope |
|---|---|---|
| IP management | Private TGW IPv4 blocks and [[vcfa-ip-quota|IP quotas]]; provider external blocks are visible but provider-managed | Organization / region |
| [[vcfa-connectivity-profile|Connectivity profile]] | Region, up to five external IPv4 blocks and up to five private TGW IPv4 blocks | Reusable by VPCs |
| VPC | Region, connectivity profile, private VPC CIDRs and applicable IP quotas | One isolated network domain |
| Namespace association | One VPC can serve several namespaces, or a namespace can receive a dedicated VPC | Workload boundary |

The three address scopes solve different problems:

| Address scope | Who supplies it | Reachability and use |
|---|---|---|
| **Private VPC CIDR** | VPC administrator | Local to one VPC; may overlap another VPC; requires NAT to reach outside that VPC |
| **Private TGW IPv4 block** | Organization administrator | Advertised inside the organization and its transit gateway; provides direct reachability between VPCs in that organization |
| **External IPv4 block** | Provider administrator | Allocated from provider IP space; supports external connectivity and outbound SNAT for private workloads |

Choose the sharing boundary deliberately. Use one VPC for several namespaces when they may share a network security
boundary. Create a VPC per namespace or project when network separation matters. A project boundary controls who sees
deployments; a VPC boundary controls the network domain. They solve different isolation requirements.

::diagram[d11-vcfa-org-networking]

### Exact organization-networking workflow

1. Review the regions assigned to the organization on **Regions**.
2. If east-west organization address space is required, open **Manage & Govern > Networking > IP Management > IP
   Address Blocks**, select **New Private - TGW IP Block**, enter the CIDR and region, and select **Create**.
3. If consumption must be capped, open **IP Management > IP Quotas**, select **New IP Quota**, then choose the region,
   scope (**External** or **Private - Transit Gateway**), address blocks, counts of individual IPs and CIDRs, maximum
   subnet size and the VPCs that receive the quota.
4. Open **Manage & Govern > Networking > Virtual Private Clouds > Connectivity Profiles**, select **New Connectivity
   Profile**, enter a name, select the region and select the required external and private TGW IPv4 blocks. A profile
   accepts up to five blocks of each type. Select **Create**.
5. Under **Virtual Private Clouds**, select **New VPC**. Enter the name, select an allocated region and its connectivity
   profile, specify private VPC IPv4 CIDRs, apply the relevant IP quotas and select **Create**.
6. Associate the VPC with one or more namespaces according to the required isolation model, then deploy a small test
   workload and verify same-VPC, cross-VPC and north-south reachability separately.

:::warning
Editing a connectivity profile changes the northbound connectivity configuration of every VPC that uses it. Inventory
the attached VPCs and plan a validation window before changing its blocks.
:::

## Configuration

| Setting | Value |
|---|---|
| Approval policy | Scope project `payments`; criteria: namespace class not `small-app`; approvers: `payments-leads` group |
| Lease policy | Scope namespaces matching `*-dev`; max lease 30 days |
| Day 2 action policy | Deny `Delete` for role project user; allow for project admin |
| IaaS resource policy | CEL constraint limiting VM classes in `*-dev` namespaces |
| Event subscription | Topic: post-provisioning event; workflow: Register in CMDB; blocking, priority 10, recovery workflow: notify ops |
| Connectivity profile | Region `region-lab`; external block supplied by provider; private TGW block reserved for the organization |
| VPC | Region + connectivity profile + non-overlapping local CIDR for operational clarity; apply an IP quota where required |

Exact event topic names are listed in TechDocs ("Event Topics Provided with VCF Automation"); use the names shown in
your version.

## CLI / API

Org-level objects (projects, namespaces, policies, catalog) are exposed through the VCF Automation APIs and can be
managed with Terraform. Supervisor namespaces created by VCF Automation can also be inspected from vCenter (Workload
Management) and with `kubectl` against the Supervisor by users who have access, which is useful to confirm that the
limits VCF Automation set are applied. The API patterns are in [VCF APIs and PowerCLI](lesson:vcf-apis-powercli).

## Failure Scenarios

| Symptom | Cause |
|---|---|
| Request stuck "pending approval" | Approval policy applies; approver group has no members or nobody checked the Inbox |
| Deployment deleted unexpectedly | Lease expired |
| User cannot delete own VM | Day 2 action policy denies it |
| Provisioning fails at the end | Blocking subscription workflow failed (no recovery runnable) |
| Namespace creation refused | Requested limits exceed the organization's region quota |
| User sees no catalog items | User not a member of the project the items are shared with |
| New VPC cannot be created in the intended region | No connectivity profile exists for that region, or the region is not allocated to the organization |
| Cross-VPC traffic has no direct route | The VPCs do not use private TGW address space through the organization's transit gateway |
| Several VPCs lose northbound connectivity after one edit | A shared connectivity profile was changed; every attached VPC inherited the new northbound configuration |
| VPC creation or allocation exceeds policy | The selected external/private block has no suitable IP quota or the quota is exhausted |

## Troubleshooting

1. Request problems: check the request's history, then **Policy Enforcement** for which policy acted.
2. Extensibility: check the workflow run in Orchestrator and the subscription's blocking/priority settings.
3. Capacity: compare namespace limits with the org quota; ask the provider for more quota.
4. Visibility: check project membership and roles.
5. Networking: confirm region allocation, connectivity profile, selected address blocks, IP quota and namespace-to-VPC
   association before tracing the provider gateway or NSX data path.

## Real-World Scenario

A software company's test environments kept growing until the quota ran out. The org admin adds a **lease policy** of
14 days on all `*-test` namespaces, an **approval policy** for requests above the medium VM class, and an event
subscription that posts every new deployment to the team chat (non-blocking). A second, **blocking** subscription calls
the IPAM workflow before the VM is customized. Within a month the quota usage drops by a third and every deployment has
an owner and an IP record.

## Lab

::lab[lab-vcfa-organization-setup]

## Exam Focus

- Org admin tasks: identity and roles, projects, namespaces/namespace classes, networks (VPCs), content, catalog,
  extensibility, policies.
- Organization network chain: provider regional networking -> organization connectivity profile -> VPC -> namespace.
- Private VPC CIDR is local and needs NAT outside the VPC; private TGW space gives organization-internal cross-VPC
  reachability; external blocks are provider-managed.
- A connectivity profile is region-specific and reusable; editing it affects northbound connectivity for every VPC
  that uses it.
- Project = users + infrastructure; namespace = resource envelope; namespace class = template.
- Policies: **approval, day 2 action, lease** (catalog) and **IaaS resource** (CEL); scope org or project.
- Event subscriptions: **blocking** (sync, priority 0 highest, recovery runnable) vs **non-blocking** (async).
- Extensibility runs **VCF Operations Orchestrator** workflows.

## Common Exam Traps

:::trap
A lease policy does not "power off" at expiry - expired deployments are **destroyed and reclaimed**.
:::

:::trap
Priority 0 is the **highest** priority for blocking subscriptions.
:::

:::trap
Day 2 action policies restrict *actions on existing resources*; approval policies gate *requests*.
:::

:::trap
A project and a VPC are both isolation tools, but they isolate different things: project membership controls resource
visibility, while the VPC defines the network domain.
:::

## Knowledge Check

::quiz

## Summary

The organization administrator shapes the provider's quota into safe self-service: projects and namespaces define who
gets what; connectivity profiles, VPCs, three address scopes and IP quotas define how workloads communicate; content
libraries, blueprints and the catalog define what can be deployed; Orchestrator workflows and event subscriptions
automate business processes; and approval, day-2 action, lease and IaaS resource policies govern every request.

## Next Topic

Finish the phase with [VCF APIs and PowerCLI](lesson:vcf-apis-powercli).
