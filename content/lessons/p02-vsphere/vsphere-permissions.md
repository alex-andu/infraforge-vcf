---
id: vsphere-permissions
title: vSphere Permissions, Roles and Inheritance
phase: p02-vsphere
module: m02-hosts-vcenter
version: vcf9
minutes: 35
difficulty: intermediate
summary: How vCenter authorizes users — privileges, roles, permissions, propagation, user-versus-group precedence and global permissions — and where vCenter permissions sit inside VCF 9 identity and RBAC.
topics: [vsphere-permissions, rbac, identity-sso, vcenter]
objectives: ["2.2", "4.2"]
keyTerms: [privilege, role, permission, global-permission, sso-domain, vm-folder]
labs: [lab-vcenter-cluster-ha-drs]
incidents: []
components: [vcenter, vcf-identity-broker]
related: [vcenter-architecture-inventory, vcf-identity-sso-rbac, vm-lifecycle-templates]
sources:
  - title: "vSphere 9.0 Security – vSphere Permissions and User Management Tasks"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks.html
  - title: "vSphere 9.0 Security – Understanding Authorization in vSphere"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/understanding-authorization-in-vsphere.html
  - title: "vSphere 9.0 Security – Hierarchical Inheritance of Permissions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/understanding-authorization-in-vsphere/hierarchical-inheritance-of-permissions.html
  - title: "vSphere 9.0 Security – How Do Multiple Permission Settings Work"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/multiple-permission-settings.html
  - title: "vSphere 9.0 Security – Using vCenter Global Permissions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/global-permissions.html
  - title: "vSphere 9.0 Security – Using vCenter Roles to Assign Privileges"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/using-roles-to-assign-privileges.html
  - title: "vSphere 9.0 Security – Best Practices for vCenter Roles and Permissions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/best-practices-for-roles-and-permissions.html
  - title: "VCF 9.0 Design – VCF Single Sign-On Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
---

## Why This Matters

In a VCF fleet, many teams touch vCenter: platform engineers, application owners deploying VMs, backup software, monitoring, VCF Automation. Each needs exactly the rights its job requires. vCenter permissions are where that is enforced for vSphere objects. Get the model wrong and either people cannot do their jobs, or an application team can delete the management domain's NSX Managers.

Exam objective 4.2 asks you to *configure Identity Management and RBAC in VCF*; objective 2.2 asks you to *manage VMs through vCenter*. Both rest on the vCenter authorization model in this lesson. The VCF-wide layer (Identity Broker, VCF SSO, VCF Operations roles) builds on it and is covered in [Identity and SSO](lesson:vcf-identity-sso-rbac).

## Learning Objectives

- Define privilege, role and permission, and name the three system roles.
- Apply permission inheritance rules: propagation, child override, user-over-group precedence, and union of group permissions.
- Decide when to use a global permission instead of a vCenter permission.
- Design a least-privilege folder and role structure for an application team.
- Troubleshoot "user can log in but cannot see/do X" problems.

## Concept

vSphere separates two questions:

- **Authentication** — *who are you?* — handled by vCenter Single Sign-On against its identity sources (the local SSO domain such as `vsphere.local`, Active Directory/LDAP, or — in VCF 9 — the VCF Identity Broker federating an external identity provider).
- **Authorization** — *what may you do on this object?* — handled by vCenter permissions.

The authorization building blocks (vSphere 9.0 docs):

| Term | Definition |
|---|---|
| [[privilege]] | A fine-grained action, e.g. *Virtual machine → Interaction → Power on* |
| [[role]] | "A set of privileges"; reusable across objects |
| [[permission]] | **Principal (user or group) + role + object**, with a *propagate* flag |

There are four places authorization comes from:

1. **vCenter permissions** on inventory objects.
2. [[global-permission|Global permissions]] on a root object spanning solutions (including tags and content libraries).
3. **Group membership in SSO groups** (for example, the built-in administrators group).
4. **ESX local host permissions**, only for standalone hosts not managed by vCenter.

### System roles

| Role | Meaning |
|---|---|
| Administrator | All privileges. Assigned to `administrator@vsphere.local` by default |
| Read-only | View object state and details; no actions |
| No access | Cannot see or change the object. Default for new users; used to *carve out* parts of the tree |

System roles "are permanent": you cannot delete them or edit their privileges. Sample roles (for example *Virtual Machine User*) can be **cloned** and modified — clone first, because a modified custom role cannot be reset to its original settings.

## Architecture

::diagram[d02-permission-inheritance]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vsphere/vsphere/9-0/_jcr_content/assetversioncopies/7312b56d-834c-4f3b-9630-8b6a3c4a1391.original.png" caption="vSphere Permissions" source="https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/understanding-authorization-in-vsphere.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vsphere/vsphere/9-0/_jcr_content/assetversioncopies/7d1246f7-687f-4dcd-93f4-170ea77272f1.original.png" caption="Global Permissions and Local Permissions" source="https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/vsphere-security/vsphere-permissions-and-user-management-tasks/understanding-authorization-in-vsphere.html"}

## Components

| Component | Where | Role in authorization |
|---|---|---|
| vCenter SSO | vCenter appliance | Authenticates; issues tokens; holds local users/groups and identity sources |
| VCF Identity Broker | Embedded in vCenter or 3-node appliance | Federates the external IdP for VCF SSO (all fleet components except SDDC Manager, per VCF 9.0 design guide) |
| vpxd authorization manager | vCenter | Evaluates permissions on each request |
| Roles and privileges | vCenter database | Definitions shared by every permission |
| Inventory tree | vCenter | Where permissions are attached and inherited |
| Global root | Above all vCenters in the SSO domain | Where global permissions live |

## How It Works

How vCenter decides whether *user U* may *power on VM V*:

1. U authenticates through SSO; vCenter receives U's identity **and group memberships**.
2. vCenter looks for permissions on V itself. Because VMs have **two parent chains** — the VM folder chain *and* the host/cluster/resource-pool chain — it also collects propagated permissions from both.
3. A permission defined **directly on an object overrides** any permission propagated from its parents.
4. If there is a permission for **U as a user** at the deciding level, it **takes precedence over all group permissions** for U on that object.
5. If there is no user permission but U belongs to several groups with permissions, U gets the **union** of those groups' privileges.
6. If the resulting role contains *Power on*, the task runs; otherwise it is denied (and the UI usually hides or greys out the action).

Rules to memorize (vSphere 9.0 docs):

- One object can have many permissions, but **only one permission per user or group**.
- A child inherits a parent's permission **only if propagate is set**.
- You cannot put permissions directly on the hidden root VM, host, network and storage folders of a data center.
- Some objects take their permissions from the vCenter root only (licenses, roles, sessions, statistics intervals, custom fields).
- vSphere Distributed Switches cannot hold permissions directly; distributed port groups can.

## Deep Dive

### Worked examples

**Union of groups.** On folder *App-Prod*, group *AppOps* has *VM Power User* (propagate) and group *Backup* has *Read-only* (propagate). Alice is in both. On a VM in that folder Alice gets the **union**: everything VM Power User allows.

**Child override.** The same folder grants *AppOps* the *VM Power User* role. On VM *db01* inside it, an admin adds *AppOps → Read-only*. On *db01*, AppOps members are **read-only** — the explicit child permission wins.

**User beats group.** On the folder, group *AppOps* has *Administrator*; user Alice (a member) has *Read-only* directly. Alice is **read-only** there: a user permission takes precedence over group permissions.

**No Access carve-out.** On the data center, *AppOps* gets *Read-only* (propagate). On the management folder holding vCLS and infrastructure VMs, *AppOps* gets *No access*. They see production VMs, not infrastructure.

### Global permissions

A global permission is assigned at a root object that spans solutions in the SSO domain; it reaches every vCenter's inventory and **global objects such as tags and content libraries**. The trap from the vSphere 9.0 docs: if you assign a global permission **without Propagate**, the principal does **not** get access to inventory objects — only to some global functionality such as creating roles.

Use global permissions for content library administrators and tag administrators; use vCenter permissions for everything that should be scoped to a domain, cluster or folder.

:::vcf9 Changed in VCF 9
Because each VCF 9 VI workload domain has its own vCenter **and** SSO domain, a global permission in one workload domain's SSO domain does not reach another workload domain. Cross-domain access is designed through VCF SSO (Identity Broker with your enterprise IdP) plus **group-based permissions in each vCenter**. VCF Operations and VCF Automation have their own role models on top.
:::

### Best practices (vSphere 9.0)

- Assign roles to **groups**, not individual users.
- Grant permissions only on the objects where they are needed, and only the privileges needed.
- Make sure restrictive roles on groups do not accidentally lock out administrators.
- Use **folders** to make permission assignment easy.
- Consider enabling **propagation** so new objects inherit.
- Use **No access** to mask specific parts of the hierarchy, remembering VMs have two parent chains.

### Privilege Recorder

vSphere 9.0 includes a *Privilege Recorder* that records the privileges a user exercises, helping you build a least-privilege custom role from real activity rather than guesswork.

## Configuration

Assign a permission in the vSphere Client:

1. Select the object (for example the *App-Prod* VM folder) → **Permissions** tab → **Add**.
2. Choose the identity source domain and the user or **group**.
3. Choose the **role**.
4. Tick **Propagate to children** if child objects should inherit.
5. Save; verify by logging in as a test member of the group.

Create a custom role: **Administration → Access Control → Roles**, select a sample role, **Clone**, rename, then add/remove privileges.

Add a global permission: **Administration → Access Control → Global Permissions → Add**, and remember the propagate checkbox.

:::tip
Before granting anything, add your identity source (AD/LDAP or the VCF Identity Broker) and create groups such as `vcf-wld01-app-operators`. Permissions that point at groups survive staff changes.
:::

## CLI / API

PowerCLI makes permissions repeatable and auditable:

```powershell
# Clone a sample role and inspect it
$src = Get-VIRole -Name "VirtualMachineUser"
New-VIRole -Name "App-VM-Operator" -Privilege (Get-VIPrivilege -Role $src)

# Grant a group the role on a folder with propagation
New-VIPermission -Entity (Get-Folder "App-Prod") -Principal "LAB\app-operators" `
  -Role "App-VM-Operator" -Propagate:$true

# Audit permissions on a folder
Get-VIPermission -Entity (Get-Folder "App-Prod") | Select-Object Principal, Role, Propagate, IsGroup
```

Check the exact sample-role names in your vCenter with `Get-VIRole` before cloning; display names in the UI and API names can differ.

## Failure Scenarios

| Misconfiguration | Effect |
|---|---|
| Global permission added without *Propagate* | User can log in but sees no inventory |
| Permission on folder without *Propagate* | User sees the folder but not VMs inside |
| User-level *Read-only* added "for testing" | Overrides every group role for that user on that object |
| *No access* applied to a group at data center level | Members lose access everywhere below unless explicitly granted lower down |
| Permissions only in one VCF 9 workload domain vCenter | Team cannot see the other domain — separate SSO domains |
| Identity source removed or broken | Users cannot authenticate; local `administrator@vsphere.local` still works |

## Troubleshooting

1. **Can the user authenticate?** If login fails, it is SSO/identity, not permissions.
2. **Which permissions apply?** On the target object, open **Permissions** and look at *Defined in* — it shows whether each permission is local or inherited and from where.
3. **Both VM chains:** for VMs, check the VM folder chain *and* the host/cluster/resource pool chain.
4. **User vs group:** search for a user-level entry; it beats all group entries.
5. **Propagation:** confirm the propagate flag on the parent permission.
6. **Role contents:** open the role and confirm the specific privilege exists (for example *Datastore → Allocate space* for deploying VMs).
7. **Scope:** in VCF 9, confirm you are in the vCenter that owns the object.

## Real-World Scenario

An application team in workload domain `wld01` must deploy VMs from templates into their folder and resource pool, but not touch hosts or networks. The platform engineer clones *Virtual Machine Power User* into *App-Deployer*, adds the deploy-from-template and datastore allocation privileges it lacks, and grants the AD group `app-deployers` this role on the *App* VM folder, the *App* resource pool and the target datastore, each with propagation. A *Read-only* permission on the distributed port group lets them pick a network. A test user from the group deploys a VM successfully, and *Host → Maintenance mode* is greyed out — least privilege confirmed.

## Lab

::lab[lab-vcenter-cluster-ha-drs]

In the cluster lab, create a folder and a group, clone a role and test inheritance with a second user.

## Exam Focus

:::exam
- Permission = principal + role + object (+ propagate).
- **Child permission overrides parent; user permission overrides group; multiple groups = union.**
- System roles: Administrator, Read-only, No access — cannot be edited or deleted.
- Global permissions span the SSO domain and cover tags and content libraries; without propagate, no inventory access.
- VMs inherit from **two** chains (folder and host/cluster/resource pool).
:::

## Common Exam Traps

:::trap
- Choosing "most restrictive wins" — vSphere does not use most-restrictive logic between groups; it uses the **union** of group permissions (unless a user or child permission overrides).
- Forgetting *Propagate* on a global permission.
- Assuming a global permission in one VCF 9 workload domain applies to another workload domain.
- Editing a system role — not possible; clone a sample role instead.
:::

## Knowledge Check

::quiz

## Summary

- Authentication is SSO; authorization is permissions.
- Privileges → roles → permissions on objects, inherited when propagate is set.
- Child overrides parent; user overrides group; groups combine as a union.
- Global permissions cover all inventories in the SSO domain plus tags and content libraries.
- In VCF 9 every workload domain vCenter has its own SSO domain, so design group-based permissions per domain and rely on VCF SSO for single sign-on.

## Next Topic

Next: [vSphere HA Deep Dive](lesson:vsphere-ha-deep-dive) — how a cluster detects failures and restarts VMs.
