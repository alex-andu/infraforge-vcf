---
id: vcf-identity-sso-rbac
title: VCF Identity - Single Sign-On, the Identity Broker and RBAC
phase: p12-security
module: m12-identity
version: vcf9
minutes: 45
difficulty: intermediate
summary: How VCF Single Sign-On uses the VCF Identity Broker to connect a corporate identity provider to vCenter, NSX, VCF Operations and VCF Automation, how to choose between embedded and appliance models, and how roles are still assigned per component.
topics: [identity-sso, rbac]
objectives: ["4.2"]
keyTerms: [vcf-single-sign-on, vcf-identity-broker, identity-provider, scim, rbac]
labs: [lab-explore-vcf-fleet]
incidents: [inc-certificate-trust]
components: [vcf-identity-broker, vcf-operations, vcf-operations-fleet-management, vcenter, nsx-manager, vcf-automation, sddc-manager]
related: [certificate-management, password-management, lifecycle-concepts]
sources:
  - title: "VCF 9.0 TechDocs - VCF Single Sign-On Models (Architectural Options)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
  - title: "VCF 9.0 TechDocs - VCF Single Sign-On overview"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is.html
  - title: "VCF 9.0 TechDocs - Deployment modes of the VCF Identity Broker"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is/deployment-models-for-sso.html
  - title: "VCF 9.0 TechDocs - Identity providers and protocols supported for VCF SSO"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is/protocols-suported-for--sso.html
  - title: "VCF 9.0 TechDocs - Points to consider and prerequisites for VCF SSO"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is/points-to-consider-while-setting-up-vmware-cloud-foundation-sso.html
  - title: "VMware blog - Streamline administrative access with VCF Single Sign-On"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/19/streamline-administrative-access-with-vcf-single-sign-on/
  - title: "William Lam - VCF 9.0 Single Sign-On (SSO) with Keycloak IdP"
    url: https://williamlam.com/2025/06/vcf-9-0-single-sign-on-sso-with-keycloak-idp.html
  - title: "Broadcom KB 441948 - Identity broker is unhealthy during SSO configuration in VCF Operations 9.x"
    url: https://knowledge.broadcom.com/external/article/441948/identity-broker-is-unhealthy-reported-d.html
---

## Why This Matters

A VCF fleet has many consoles: vCenter, NSX Manager, VCF Operations, VCF Automation, VCF Operations for logs and
networks. Without a shared identity layer, each has its own local users, and administrators juggle a dozen passwords
(and leave a dozen stale accounts when they change jobs). VCF 9.0 introduces **VCF Single Sign-On**: one login from
your corporate identity provider, with MFA, across the fleet. Exam objective 4.2 asks you to "configure Identity
Management and Role-based Access Control (RBAC) in VMware Cloud Foundation". That means knowing the broker models,
what each model costs and protects against, which components participate, and the key fact that **authentication is
central but authorisation (roles) is still per component**.

## Learning Objectives

- Describe the three pillars of VCF authentication: identity provider, VCF Identity Broker, VCF Single Sign-On.
- Compare the **embedded** and **appliance** Identity Broker models and choose one for a scenario.
- List the supported identity providers, protocols (SAML 2.0, OIDC) and provisioning methods (SCIM, JIT, AD/LDAP).
- Name the components that participate in VCF SSO and those that do not (SDDC Manager UI, ESX).
- Explain how roles are assigned after SSO is configured, and the prerequisites (no Enhanced Linked Mode).

## Concept

### Three pillars

TechDocs describes VCF authentication as three pieces:

1. **[[identity-provider]] (IdP)**: your corporate source of identities (Okta, Microsoft Entra ID, ADFS, Ping, any
   SAML 2.0 IdP, or a directory such as Active Directory/LDAP or OpenLDAP). Passwords and MFA live here.
2. **[[vcf-identity-broker]]**: the VCF service that federates with the IdP and issues tokens to VCF components. It
   was previously known as VMware Identity Broker (vIDB).
3. **[[vcf-single-sign-on]]**: the resulting experience: log in once, reach every participating component.

### Who participates

| Uses VCF SSO | Does not use VCF SSO |
|---|---|
| vCenter, NSX, VCF Operations, VCF Automation, VCF Operations for logs, VCF Operations for networks, VCF Operations orchestrator, VCF Operations HCX | **SDDC Manager UI** (local accounts such as @vsphere.local users; its API accepts VCF SSO users), **ESX** hosts |

### Broker models

| | **Embedded** | **Appliance** |
|---|---|---|
| Runs | Inside the **management domain vCenter** of a VCF instance | Separate **three-node** cluster deployed by VCF Operations fleet management in the management domain |
| Availability | vSphere HA only; a single point of failure if that vCenter is down | Survives a single node failure |
| Scale | One VCF instance | Up to **five VCF instances** per broker |
| Footprint | No extra appliance | 3 nodes, 8 vCPU and 16 GB RAM each, at least 700 GB storage for the cluster |
| Change later | Moving from embedded to appliance requires a **reset of VCF SSO** | - |

### SSO scope models

The design guide also describes **scope**: one broker for the whole fleet, one broker for several instances
(cross-instance), or one broker per instance. Each is a single point of failure for authentication *at its scope*:
a fleet-wide broker is simplest to manage but has the largest blast radius.

## Architecture

::diagram[d12-sso-models]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/6477d8a0-36b7-4d36-976e-ee10b8ba605a.original.svg" caption="Embedded deployment mode of the VCF Identity Broker (TechDocs: Deployment modes of the VCF Identity Broker)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is/deployment-models-for-sso.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/688f6d25-0cd5-4399-9e2f-b095fdc4a37f.original.png" caption="Appliance deployment mode of the VCF Identity Broker (TechDocs: Deployment modes of the VCF Identity Broker)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is/deployment-models-for-sso.html"}

## Components

| Component | Identity role |
|---|---|
| **Identity provider** | Authenticates users, enforces MFA, optionally pushes users/groups with SCIM |
| **VCF Identity Broker** | Federates with the IdP (SAML 2.0 or OIDC) or syncs from AD/LDAP; issues tokens to components |
| **VCF Operations** | Configuration point for VCF SSO: Fleet Management > Identity & Access |
| **Fleet management** | Deploys and lifecycle-manages the appliance-mode broker |
| **vCenter** | Hosts the embedded broker; consumes SSO; still holds vSphere roles and permissions |
| **NSX, VCF Automation, VCF Operations, logs, networks** | Consume SSO; each holds its own roles |
| **SDDC Manager** | Not in VCF SSO for its UI; keep its local admin accounts safe |

## How It Works

### Login flow (simplified)

1. A user opens the vSphere Client (or NSX, VCF Operations ...).
2. The component redirects to the VCF Identity Broker.
3. The broker redirects to the corporate IdP (SAML 2.0 or OIDC) or validates against AD/LDAP.
4. The user authenticates (with MFA if the IdP enforces it).
5. The broker issues a token containing the user and group membership to the component.
6. The component maps the user's groups to **its own roles** and grants access.

### Configuration workflow (VCF Operations)

1. Prerequisites: management domain vCenter on 9.0 with VCF licensing; **Enhanced Linked Mode deactivated** on all
   participating vCenters; your account has the **All Objects** scope in VCF Operations; IdP reachable over HTTPS with
   a trusted certificate chain.
2. Go to **Fleet Management > Identity & Access > VCF Instances** and select the instance.
3. Choose the deployment mode: **embedded** (in the management vCenter) or **appliance** (fleet management deploys the
   three-node cluster).
4. Choose and configure the IdP: protocol (SAML 2.0 or OIDC, or AD/LDAP), endpoints/metadata, client secret,
   provisioning method (SCIM, JIT, JIT pre-provisioning, directory sync), domain and groups.
5. Verify with vCenter, then enable SSO for the other components (for example NSX Manager, VCF Operations,
   VCF Automation).
6. **Assign roles in each component** to the IdP groups (log in with a local admin account the first time).
7. Test with a non-admin user from each group; keep local break-glass accounts.

## Deep Dive

### Provisioning methods

| Method | How users/groups appear | Typical IdP |
|---|---|---|
| **[[scim]] 2.0** | IdP pushes users and groups to the broker | Okta, Entra ID |
| **JIT** | Groups created at first login from the SAML assertion | Any SAML IdP |
| **JIT pre-provisioning** | Groups created in advance so you can assign roles before anyone logs in | Any SAML/OIDC IdP |
| **AD/LDAP** | Users and groups synced at intervals; passwords never synced | Active Directory, OpenLDAP |

You can combine SAML 2.0 or OIDC for authentication with SCIM, JIT or AD/LDAP for provisioning.

### RBAC: authentication is central, authorisation is local

[[rbac]] in VCF means each component keeps its own role model:

| Component | Role model examples | Where assigned |
|---|---|---|
| vCenter | Roles (Administrator, Read-only, custom) + permissions on inventory objects (with propagation) | vSphere Client > Administration and object permissions |
| NSX | Built-in roles such as Enterprise Admin, Auditor, Network Admin | NSX Manager > User management |
| VCF Operations | Roles + **scopes** (which objects); Fleet Management permissions such as Passwords: Manage/View | VCF Operations administration |
| VCF Automation | Provider and organisation roles | VCF Automation |
| SDDC Manager | Its own roles for its local users | SDDC Manager |

Design tip: create **IdP groups per role** (for example `vcf-admins`, `vcf-net-admins`, `vcf-auditors`) and assign each
group the matching role in every component. Then joining or leaving a job is one group change in the IdP.

### What changes in vCenter

- Existing identity sources configured in participating vCenters are **overridden** by the VCF SSO configuration;
  users and groups are **not migrated**, so plan to re-provision and re-assign.
- You manage SSO **only from VCF Operations** afterwards.
- Do **not** turn on Enhanced Linked Mode after configuring VCF SSO in embedded mode.
- Logout is per component (single-component logout in that browser).
- PowerCLI automation keeps working when the broker is embedded in the management vCenter; other models require
  reconfiguration per the integration guide.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x, vCenter Single Sign-On (vsphere.local) with Enhanced Linked Mode across workload domain vCenters was the
shared identity, extended with AD/LDAP or ADFS/Okta/Entra federation per vCenter, and Aria products used VMware
Identity Manager (vIDM). VCF 9.0 replaces this with the VCF Identity Broker and removes the dependency on ELM.
:::

### Version alignment

The broker is a management component: it is lifecycle-managed by fleet management and must be kept on a patch level
compatible with fleet management. KB 441948 shows the symptom of a mismatch: "Identity broker is unhealthy" while
configuring SSO, fixed by patching the broker to match.

## Configuration

Decision table:

| Requirement | Choose |
|---|---|
| Single instance, minimal footprint, lab | Embedded |
| Several instances (up to five per broker), central identity | Appliance |
| Survive a host or vCenter failure without losing admin login | Appliance |
| Strong fault isolation between instances | One broker per instance |
| MFA | Enforce in the IdP (works with any model) |

:::tip
For your home lab: embedded mode, with an OIDC IdP such as Keycloak in a small VM (William Lam documents this). The IdP
endpoint must be HTTPS with a full certificate chain your management vCenter trusts.
:::

## CLI / API

The VCF Identity Broker has a REST API (documented on developer.broadcom.com as "VMware Identity Broker") and VCF
Operations exposes APIs for SSO configuration; William Lam has published automation examples for configuring VCF SSO
with an OIDC IdP. Most administrators configure SSO in the UI. For checks, test the IdP endpoint from your workstation:

```shell
# does the IdP present a complete, trusted chain?
openssl s_client -connect idp.lab.local:443 -servername idp.lab.local -showcerts
```

## Failure Scenarios

| Failure | Impact | Mitigation |
|---|---|---|
| Management vCenter down (embedded) | No SSO logins for that instance | vSphere HA; local break-glass accounts |
| One appliance node down | No impact (3-node cluster) | Repair node |
| IdP outage | No SSO logins anywhere it serves | Local accounts for emergency |
| IdP certificate not trusted | SSO configuration or login fails | Import the full chain; use a proper CA |
| Broker/fleet management version mismatch | "Identity broker is unhealthy" | Patch to aligned versions |
| ELM active on a participating vCenter | Configuration blocked | Deactivate ELM first |

## Troubleshooting

1. Can you still log in with a **local** account? That separates SSO problems from component problems.
2. Check the broker health in VCF Operations (Fleet Management > Identity & Access, and alerts).
3. Check **time** on the broker host, the IdP and the component; token validation is time-sensitive.
4. Check the **certificate chain** of the IdP endpoint.
5. Check group claims: the user may authenticate but get no role because the group name or claim attribute does not
   match.

## Real-World Scenario

A university runs two VCF instances and uses Entra ID with MFA. They deployed the appliance broker (three nodes) in
instance 1's management domain, connected both instances, and provisioned groups with SCIM. Roles: `vcf-platform-admins`
gets Administrator in vCenter, Enterprise Admin in NSX and Administrator in VCF Operations; `vcf-auditors` gets
read-only everywhere. When a host failure took down one broker node, logins continued. They keep the SDDC Manager local
admin and vsphere.local administrator credentials in a vault for emergencies.

## Lab

::lab[lab-explore-vcf-fleet]

When you explore your fleet, record where each component authenticates and which local accounts exist; that is the
input for your SSO design. (Configuring SSO needs a deployed VCF instance and an IdP VM.)

## Exam Focus

:::exam
- Embedded broker = in management vCenter, no extra appliance, single instance, SPOF; appliance = 3 nodes, up to 5
  instances, tolerates a node failure. Embedded to appliance needs an SSO reset.
- Configure in **VCF Operations > Fleet Management > Identity & Access**.
- SDDC Manager UI and ESX are **not** in VCF SSO.
- Protocols SAML 2.0 / OIDC; provisioning SCIM / JIT / AD-LDAP. Deactivate ELM first.
- Roles are assigned **in each component** to IdP groups.
:::

## Common Exam Traps

:::trap
- "Configuring VCF SSO gives users access automatically" - authentication only; roles must be assigned.
- "Use SSO to log into the SDDC Manager UI" - not supported; local accounts.
- "Enable Enhanced Linked Mode to share identity" - ELM must be deactivated for VCF SSO.
- "Embedded mode survives a management vCenter outage" - it does not.
- "Existing vCenter identity sources are migrated" - they are overridden; users and groups are re-provisioned.
:::

## Knowledge Check

::quiz

## Summary

- VCF SSO = IdP + VCF Identity Broker + single login across vCenter, NSX, VCF Operations, VCF Automation and more.
- Embedded broker (in management vCenter) versus appliance broker (3 nodes, up to 5 instances).
- SAML 2.0/OIDC or AD/LDAP; SCIM, JIT or directory provisioning.
- Roles remain per component; design IdP groups per role.
- Configure from VCF Operations, deactivate ELM first, keep local break-glass accounts.

## Next Topic

Identity depends on trust: continue with [certificate management](lesson:certificate-management).
