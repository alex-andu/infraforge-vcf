---
id: vcf-installer-workflow
title: The VCF Installer Workflow
phase: p07-deployment
module: m07-deploy
version: vcf9
minutes: 45
difficulty: intermediate
summary: What the VCF Installer appliance is, where to deploy it, how it gets binaries, every page of the deployment wizard, the JSON spec option, what gets built in which order and what you still deploy afterwards.
topics: [vcf-installer, deployment-models, management-domain, vcf-fleet]
objectives: ["4.1"]
keyTerms: [vcf-installer, deployment-specification, depot, vcf-download-tool, planning-and-preparation-workbook, sddc-manager]
labs: [lab-deploy-vcf-management-domain]
incidents: []
components: [vcf-installer, sddc-manager, vcenter, nsx-manager, vsan, vds, vcf-operations, vcf-operations-fleet-management, vcf-automation, management-domain]
related: [deployment-planning-prereqs, deployment-validation-failures, import-existing-vcenter, management-domain, vcf-deployment-models]
sources:
  - title: "VCF 9.0 – What is the VMware Cloud Foundation Installer?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/what-is-the-vcf-installer-.html
  - title: "VCF 9.0 – Start a New VCF Fleet or a New VCF Instance Deployment by Using the VCF Installer Deployment Wizard"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/deploying-a-new-vmware-cloud-foundation-or-vmware-vsphere-foundation-private-cloud-/deploy-a-new-vcf-fleet-or-a-new-vcf-instance.html
  - title: "VCF 9.0 – Completing the Deployment of Your Platform"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/deploying-a-new-vmware-cloud-foundation-or-vmware-vsphere-foundation-private-cloud-/manual-deployment-of-components-to-complete-your-vcf-platform.html
  - title: "VCF 9.0 – Paths to Building 9.0.x Environments"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/overview-of-deploy--converge--and-upgrade.html
  - title: "VCF Installer API 9.0 – Validate SDDC Spec"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/v1/sddcs/validations/post
  - title: "VCF Installer API 9.0 – Deploy SDDC"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/v1/sddcs/post
  - title: "VCF Installer API 9.0 – Tokens"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/tokens/
  - title: "VCF Blog – VCF 9.0 Deployment Pathways"
    url: https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/
  - title: "William Lam – Using HTTP with VCF 9.0 Installer for Offline Depot"
    url: https://williamlam.com/2025/06/using-http-with-vcf-9-0-installer-for-offline-depot.html
  - title: "Broadcom KB 443322 – VCF Download Tool token vs activation code parameter"
    url: https://knowledge.broadcom.com/external/article/443322/vcf-download-tool-fails-with-download-to.html
---

## Why This Matters

The VCF Installer is the front door of every new VCF 9.0 environment. It downloads the software, asks you for every design decision, validates the environment and then orchestrates the build of the management domain plus the fleet-level management stack. Knowing its wizard page by page — and what it does *not* deploy — is directly testable under objective 4.1 ("describe the deployment of a VCF-based private cloud" and "identify the additional components required to complete the deployment").

## Learning Objectives

- Describe what the VCF Installer is, how it is packaged and what happens when it is deployed on a management host.
- Explain how binaries get into the installer (online depot, offline depot, VCF Download Tool).
- Walk through the deployment wizard pages in order and name the key choices on each.
- Decide when a JSON specification is required instead of the UI.
- List the components that must be deployed after the installer finishes.

## Concept

The [[vcf-installer]] is, in TechDocs' words, "a dedicated virtual machine that helps you plan, configure, and deploy all the required VMware Cloud Foundation and VMware vSphere Foundation components". Key facts:

| Fact | Detail |
|---|---|
| Packaging | Ships in the same OVA as SDDC Manager: `VCF-SDDC-Manager-Appliance-9.x.x.ova`. |
| Dual personality | Deployed **inside** the management infrastructure (on a host that becomes part of the management domain), the appliance switches to **SDDC Manager mode** and loses its installer capabilities. Deployed **outside**, one installer can deploy multiple VCF platforms. |
| Login | `https://<installer_FQDN>` as `admin@local`. |
| Binaries | Not included. Download from an online depot or an offline depot. |
| Releases | Supports major, minor and maintenance releases; **not express patches** — apply those after deployment. |
| Scope | New VCF fleet, new VCF instance in an existing fleet, vSphere Foundation, and convergence of existing vSphere infrastructure. |

:::legacy VCF 5.x / Legacy Context
VCF 5.x used the **Cloud Builder** appliance and a process called **bring-up**: you filled in the Deployment Parameters Workbook (Excel), Cloud Builder converted it to JSON, validated it and built the management domain (vCenter, vSAN, NSX, SDDC Manager). Aria Suite products were deployed afterwards through Aria Suite Lifecycle. Converting existing vSphere into VCF used a separate VCF Import Tool. In 9.0 one appliance does all of this: download, deploy, operations/automation, and convergence.
:::

## Architecture

::diagram[d07-vcf-installer-workflow]

::figure{src="https://blogs.vmware.com/cloud-foundation/wp-content/uploads/sites/75/2025/07/Image-11.jpg?w=1024" caption="VCF Installer figure from the 'VCF 9.0 Deployment Pathways' blog post (section on the VCF Installer appliance)." source="https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/"}

Where the installer sits:

- It needs IP reachability to the **ESX management network** of all hosts, the planned **appliance network**, **DNS** and **NTP**, and to the **depot** (internet or offline depot web server).
- It talks to the ESX hosts (HTTPS/SSH for discovery and thumbprints), then to the vCenter and NSX Manager it deploys, and finally to VCF Operations.
- If you place it on one of the management hosts, the same VM later *becomes* SDDC Manager of the new instance (the SDDC Manager wizard page is then pre-populated).

## Components

| What the installer deploys (VCF, new fleet) | Simple | HA |
|---|---|---|
| vCenter (management domain) | 1 | 1 |
| NSX Manager | 1 | 3 |
| SDDC Manager | 1 | 1 |
| VCF Operations | 1 | 3 |
| VCF Operations fleet management appliance | 1 | 1 |
| VCF Operations collector | 1 | 1 |
| VCF Automation (optional; can be deferred) | 1 | 3 (four IPs: three nodes plus one for upgrades) |

Deployed **after** the installer finishes (TechDocs "Completing the Deployment of Your Platform"): VCF Operations orchestrator, VCF Operations for logs, VCF Operations for networks (VCF only) and, optionally, a three-node VCF Identity Broker (otherwise the identity broker function is embedded in vCenter).

| Post-installer component | VCF Simple | VCF HA | vSphere Foundation | Deployment meaning |
|---|---:|---:|---:|---|
| Operations for networks | 1 appliance + 1 collector | 1 appliance + 2 collectors | Not included | Deployed with automation from VCF Operations |
| Operations for logs | 1 primary | 1 primary + 2 workers | 1 primary + 2 workers | VCF uses Operations automation; vSphere Foundation deploys it manually |
| Operations orchestrator | 1 primary | 1 primary + 2 secondary nodes | 1 primary + 2 secondary nodes | Appliance deployment remains a manual completion task for both platforms |
| VCF Identity Broker | Embedded vCenter function by default | Optional dedicated three-node deployment | Embedded function | Choose dedicated nodes only when organizational requirements justify them |

“Installer succeeded” therefore proves the automated core stack completed; it does not prove the entire platform is
complete. Read the platform and model columns before choosing appliances or node counts. VCF Operations for networks
is a VCF-only completion component, while logs and orchestrator also complete a vSphere Foundation platform.

## How It Works

### Phase 1 – Prepare

1. Prepare the ESX hosts (see [Planning and Prerequisites](lesson:deployment-planning-prereqs#esx-host-preparation-checklist)).
2. Deploy the installer OVA; give it an FQDN, IP, DNS, NTP and passwords.
3. Log in as `admin@local`, configure the **depot** (online with download token, or offline) and **download the binaries** for the target VCF version.

### Phase 2 – Deployment wizard (order from TechDocs)

| # | Page | Key choices |
|---|---|---|
| 1 | Deployment type | **A new VCF fleet** or **A VCF instance in an existing VCF fleet** |
| 2 | Existing components | Connect to an existing VCF Operations or deploy new; *do not* select an existing vCenter here (that is convergence). |
| 3 | General information | VCF instance name, management domain name, deployment model (Simple / High Availability), auto-generate or manual passwords, CEIP, optional custom networking for VCF Operations/Automation |
| 4 | VCF Operations | New or existing; fleet management appliance and collector details |
| 5 | VCF Automation | Deploy new, connect existing, or *"I want to connect a VCF Automation instance later"* |
| 6 | vCenter | FQDN, size, passwords (no `%`) |
| 7 | NSX Manager | Node(s) and VIP FQDN |
| 8 | Storage | vSAN ESA/OSA, VMFS on FC (pre-created and mounted) or NFS v3 (share path, server IP) — **cannot be changed later** |
| 9 | ESX hosts | Host FQDNs, one common root password, confirm thumbprints |
| 10 | Networks | ESX management (reuse for VM management or specify), vSAN and vMotion IP ranges |
| 11 | Distributed switch | Default / Storage separation / NSX separation / Storage and NSX separation / Custom |
| 12 | SDDC Manager | FQDN, passwords (pre-filled if installer is on a management host) |
| 13 | Review | Option to **download the JSON specification** |
| 14 | Validate | Warnings can be acknowledged; errors must be fixed (edit in wizard or upload a corrected JSON) |
| 15 | Deploy | Monitor in the Tasks panel; retry after fixing a failed task |

### Phase 3 – What gets built, in dependency order

::diagram[d07-deployment-sequence]

TechDocs does not publish a numbered task list, and the Tasks panel names (and some sub-task interleaving) differ between releases. What does not change is the dependency logic — something must exist before the next layer can use it: compute and storage, then networking, then the management components, then the fleet services. Read this as a dependency order, not as an exact task log:

1. Hosts validated and configured (DNS, NTP, networking).
2. vCenter deployed and the default cluster formed on principal storage.
3. vSphere Distributed Switch(es) and VMkernel adapters (vMotion, vSAN) created; management migrated off the standard switch.
4. NSX Manager deployed, registered with vCenter, hosts prepared as transport nodes.
5. SDDC Manager deployed (or the installer converts itself when it sits on a management host).
6. VCF Operations, fleet management appliance and collector deployed and connected.
7. VCF Automation deployed (unless deferred).

### Phase 4 – After success

- **Download JSON** (passwords excluded) for your records.
- **Review Passwords**.
- **Open VCF Operations** to apply licenses and register with the VCF Business Services console.
- Deploy the remaining components (logs, networks, orchestrator, optional identity broker).

## Deep Dive

### UI vs JSON specification

The wizard can download the [[deployment-specification]] after review, and you can upload an edited JSON back. A JSON spec is **required** when:

- uplinks use **Link Aggregation Groups (LAG)**, or
- the ESX hosts have **different root passwords**.

The spec is also how you get repeatability (same lab rebuilt identically) and how API-driven deployments work. Top-level fields of the `SddcSpec` in the VCF Installer API 9.0 include `sddcId`, `vcfInstanceName`, `workflowType`, `version`, `hostSpecs`, `vcenterSpec`, `clusterSpec`, `datastoreSpec`, `dvsSpecs`, `nsxtSpec`, `networkSpecs`, `dnsSpec`, `ntpServers`, `sddcManagerSpec`, `managementPoolName`, `vcfOperationsSpec`, `vcfOperationsFleetManagementSpec`, `vcfOperationsCollectorSpec`, `vcfAutomationSpec`, `skipEsxThumbprintValidation` and `skipGatewayPingValidation`.

Note `managementPoolName`: the vMotion/vSAN ranges you enter become the management domain's default **network pool**.

### Depots

| Depot | How | Use when |
|---|---|---|
| Online | Installer → depot settings → enter your Broadcom download token → select the version → download | Installer has internet access (directly or via proxy) |
| Offline | Run the VCF Download Tool on a machine with internet, store bundles under a web server root, point the installer at that URL | Air-gapped or bandwidth-limited sites; several instances share one depot |

By default the installer requires **HTTPS** to the offline depot. In a lab William Lam documents an unsupported property (`lcm.depot.adapter.httpsEnabled=false` in the LCM application properties) to allow HTTP — revert it before switching back to an online depot.

### Deployment model scope

The model you choose (Simple or HA) applies only to the appliances the installer deploys. If you connect to an existing VCF Operations, its node count stays as is. Custom networking for VCF Operations/Automation is unavailable when you deploy an instance into an existing fleet or use an existing VCF Operations.

## Configuration

Minimal path for a lab (simple model, new fleet, VCF Automation deferred):

1. Deploy the installer OVA on one of the four prepared hosts (it will become SDDC Manager) or on a separate host if you want to reuse it.
2. Online depot → download VCF 9.0 binaries.
3. Wizard: *A new VCF fleet* → deploy new VCF Operations → Simple → "connect a VCF Automation instance later" → vCenter/NSX details → storage → hosts → networks → Default switch profile → SDDC Manager → Review → **Download JSON** → Validate → Deploy.

## CLI / API

The VCF Installer API (9.0) mirrors the wizard:

```http
POST https://installer.lab.local/v1/tokens            # create access/refresh token pair
POST https://installer.lab.local/v1/sddcs/validations # validate an SddcSpec (returns executionStatus/resultStatus)
GET  https://installer.lab.local/v1/sddcs/validations/{id}
POST https://installer.lab.local/v1/sddcs             # deploy; returns 202 + SddcTask
GET  https://installer.lab.local/v1/sddcs/{id}        # task status
```

```shell
curl -sk -X POST https://installer.lab.local/v1/sddcs/validations \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d @lab-m01-spec.json
```

Validation `executionStatus` values include `IN_PROGRESS`, `COMPLETED` and `FAILED`; `resultStatus` values include `SUCCEEDED`, `FAILED` and `WARNING`.

Offline depot population (VCF Download Tool):

```shell
./vcf-download-tool binaries download --vcf-version 9.0.0 --automated-install \
  --depot-download-token-file=/root/downloadtoken.txt --depot-store=/var/www/depot
```

Use `--depot-download-activation-code-file` instead when the file contains an activation code rather than a download token (KB 443322).

## Failure Scenarios

| Failure | Effect |
|---|---|
| Depot unreachable / token wrong | No binaries; wizard cannot proceed to deployment. |
| Validation error (DNS, NTP, IPs, passwords, host state) | Deploy button not available until fixed. |
| Task fails mid-deployment (e.g. NSX deployment) | Deployment stops at that task; fix the cause and **retry** from the Tasks panel. |
| Installer deployed on a management host, then you expect to reuse it as an installer | Not possible — it has become SDDC Manager. |
| Express patch expected at day 0 | Not supported by the installer — apply after deployment. |

## Troubleshooting

- Read the failed task's error first; it names the component.
- On the appliance, SDDC Manager–family logs live under `/var/log/vmware/vcf/`; the domain manager log (`/var/log/vmware/vcf/domainmanager/domainmanager.log`) shows deployment orchestration progress.
- Validate again after every fix — validation is cheap, a failed deploy is not.
- See [Deployment Validation and Common Failures](lesson:deployment-validation-failures) for the failure catalogue.

## Real-World Scenario

A company with two data centres deploys the VCF Installer on a small utility cluster *outside* both future management domains. It downloads 9.0 binaries once to an offline depot shared by both sites, deploys site A as **a new VCF fleet** (HA model, new VCF Operations, VCF Automation deferred until the existing Aria Automation 8.x is upgraded), then uses the *same* installer to deploy site B as **a VCF instance in the existing fleet**, connecting to site A's VCF Operations and only adding a new collector. Had they deployed the installer on a site A management host, it would have turned into site A's SDDC Manager and they would need a second installer for site B.

## Lab

::lab[lab-deploy-vcf-management-domain]

## Exam Focus

:::exam
- VCF Installer = SDDC Manager OVA; on a management host it becomes SDDC Manager.
- Login `admin@local`; binaries from online (download token) or offline depot.
- Deployment types: new fleet vs new instance in existing fleet.
- JSON spec required for LAG uplinks or different ESX passwords.
- Post-deployment manual components: VCF Operations for logs, VCF Operations for networks, orchestrator, optional three-node VCF Identity Broker.
:::

## Common Exam Traps

:::trap
- "Cloud Builder performs bring-up in VCF 9.0" — Cloud Builder is VCF 5.x.
- "The installer deploys VCF Operations for logs" — it is deployed afterwards.
- "Select the existing vCenter on the Existing Components page to deploy a new fleet" — that is the convergence workflow.
- "VCF Automation must be deployed during the initial deployment" — it can be deferred.
:::

## Knowledge Check

::quiz

## Summary

The VCF Installer downloads binaries from a depot, collects your design through a wizard (or JSON spec), validates the environment and deploys vCenter, principal storage, distributed switches, NSX, SDDC Manager, VCF Operations (with fleet management and collector) and optionally VCF Automation. After it finishes you license the platform in VCF Operations and deploy logs, networks, orchestrator and optionally a standalone identity broker.

## Next Topic

Next: [Deployment Validation and Common Failures](lesson:deployment-validation-failures).
