---
id: deployment-planning-prereqs
title: Deployment Planning and Prerequisites
phase: p07-deployment
module: m07-deploy
version: vcf9
minutes: 40
difficulty: intermediate
summary: How to plan a VCF 9.0 deployment with the Planning and Preparation Workbook, and which host, network, DNS, NTP, certificate and binary prerequisites must be true before the VCF Installer will validate.
topics: [deployment-planning, vcf-installer, dns, ntp, mtu, deployment-models]
objectives: ["4.1"]
keyTerms: [planning-and-preparation-workbook, vcf-installer, depot, vcf-download-tool, network-pool, ssl-thumbprint, principal-storage]
labs: [lab-vcf-planning-workbook, lab-network-readiness]
incidents: [inc-dns-reverse-lookup, inc-ntp-time-skew]
components: [vcf-installer, sddc-manager, esx-host, dns-service, ntp-service, physical-network, management-domain]
related: [vcf-installer-workflow, deployment-validation-failures, management-domain, vcf-deployment-models, dns-ntp-dependencies]
sources:
  - title: "VCF 9.0 – Planning and Preparation (Planning and Preparation Workbook)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/planning-and-preparation.html
  - title: "VCF 9.0 – Preparing to Deploy a New VCF or vSphere Foundation Platform"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/deploying-a-new-vmware-cloud-foundation-or-vmware-vsphere-foundation-private-cloud-/preparing-your-environment.html
  - title: "VCF 9.0 – Deploying a New VCF or vSphere Foundation Platform"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/deploying-a-new-vmware-cloud-foundation-or-vmware-vsphere-foundation-private-cloud-.html
  - title: "VCF 9.0 – Commission ESX Hosts (host prerequisites)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/commission-hosts.html
  - title: "VCF 9.0 – Storage Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/storage-models.html
  - title: "VCF 9.0 – Components Nodes in VCF and vSphere Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF Blog – VCF 9.0 Deployment Pathways"
    url: https://blogs.vmware.com/cloud-foundation/2025/07/03/vcf-9-0-deployment-pathways/
  - title: "Broadcom KB 307780 – Change the hostname of an ESXi host via DCUI or CLI"
    url: https://knowledge.broadcom.com/external/article/307780/
  - title: "Broadcom KB 411694 – Regenerating self-signed certificates on standalone ESXi hosts"
    url: https://knowledge.broadcom.com/external/article/411694/
---

## Why This Matters

A VCF (VMware Cloud Foundation) deployment is an automated workflow that builds a vCenter, an NSX Manager cluster, principal storage, SDDC (Software-Defined Data Center) Manager and the VCF Operations stack *on top of* infrastructure that you prepare by hand. The automation is strict: it validates DNS (Domain Name System), NTP (Network Time Protocol), IP ranges, passwords, host configuration and certificates before it starts, and it stops if any of them are wrong. Almost every failed deployment traces back to a planning gap — a missing reverse DNS record, a VLAN (Virtual Local Area Network) that is not trunked, a host whose certificate still carries the name `localhost`.

The exam (objective 4.1) expects you to know *what has to be ready before you press Deploy*, which tool you use to plan, and which inputs are fixed forever once deployed (for example, the principal storage type). In the lab, good planning is the difference between a deployment that finishes in a few hours and a week of retries.

## Learning Objectives

- Explain what the VCF 9.0 **Planning and Preparation Workbook** is and how it relates to the VCF Installer.
- List the ESX host prerequisites (FQDN (Fully Qualified Domain Name) hostname, DNS, NTP, regenerated certificate, clean disks, NIC speed, supported ESX build).
- Plan the networks, VLANs, IP ranges, MTU and DNS records a management domain needs.
- Choose between the **simple** and **high availability** deployment models and between vSAN, NFS v3 and VMFS on FC as principal storage.
- Describe how deployment binaries reach the VCF Installer (online depot or offline depot).

## Concept

Planning a VCF 9.0 deployment answers four questions before any appliance exists:

1. **What will I build?** A new VCF fleet, or a new VCF instance in an existing fleet; simple or high availability (HA (High Availability)) model; which principal storage; which switch profile.
2. **Where will it live?** Hosts, VLANs, subnets, gateways, MTU, IP ranges, FQDNs.
3. **What does it depend on?** DNS (forward and reverse), NTP, routing to the gateway, optionally an external certificate authority and a proxy or offline depot.
4. **Where do the bits come from?** The VCF Installer does not ship with the component binaries; you connect it to an online depot or an offline depot and download them first.

Broadcom's answer to "how do I gather all of this?" is the [[planning-and-preparation-workbook]] — a Microsoft Excel file that TechDocs describes as helping you "gather the inputs that are required for deploying a VCF fleet", including workload domains, VCF Identity Broker, vSphere Supervisor and VCF Automation. It also serves to understand prerequisites, size the environment and act as a living specification of your design.

:::vcf9 Changed in VCF 9
In VCF 5.x you filled in a *Deployment Parameters Workbook* and uploaded it (or its JSON) to Cloud Builder. The VCF 9.0 [[vcf-installer]] is UI-driven and, as the VCF blog puts it, "no longer requires the use of the Deployment Parameters Workbook". The **Planning and Preparation Workbook** still exists — it is your planning and prerequisite checklist, not an upload format. The installer can instead export and import a **JSON specification**.
:::

### Simple vs high availability

The deployment model decides how many appliances the installer builds for the components that support clustering. Per the VCF 9.0 deployment pathways blog:

| Model | Appliance count (minimum) | Notes |
|---|---|---|
| Simple | 7 | one each of vCenter, SDDC Manager, NSX Manager, VCF Operations, fleet management appliance, VCF Operations collector, VCF Automation |
| High availability | 13 | three-node NSX Manager, VCF Operations and VCF Automation clusters; recommended for production |

The wizard text says "High Availability (Three-node)" is recommended for production, and the selected model applies **only to appliances the installer deploys new** — it does not change existing appliances you connect to.

### Host counts and principal storage

| Fact | Value (VCF 9.0 TechDocs, Storage Models) |
|---|---|
| Management domain default cluster minimum | 3 hosts (simple) or 4 hosts (highly available) |
| Principal storage for the management domain default cluster | vSAN ESA, vSAN OSA, NFS v3, VMFS on Fibre Channel |
| Not allowed as principal storage of the default management cluster | vSAN storage cluster, vSAN compute cluster |
| Supplemental only | NFS v4.1, iSCSI, NVMe/TCP, NVMe/FC, NVMe/RDMA |

:::note
The VCF 9.0 launch blog states "4 hosts for management cluster" for a new deployment. TechDocs Storage Models distinguishes 3 (simple) from 4 (HA). Use the Planning and Preparation Workbook for your exact release and model; the installer validates the count.
:::

The principal storage type is chosen in the wizard and **cannot be changed after creation**. That one decision drives host hardware (vSAN-certified disks vs FC HBAs vs NFS networking) — so it belongs in planning, not on deployment day.

## Architecture

::diagram[d07-deployment-sequence]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/c99bb603-c1e2-495b-96ca-47c4d55c33ee.original.png" caption="Example VCF nodes configuration (VCF 9.0, Components Nodes in VCF and vSphere Foundation)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html"}

The planning surface has three layers:

| Layer | What you plan | Who owns it in real life |
|---|---|---|
| Physical / external | ToR VLANs and trunks, MTU, gateways, DNS zones, NTP sources, optional CA (Certificate Authority), optional proxy/offline depot | Network, DNS and PKI teams |
| Host | ESX build, hostname = FQDN, management VMkernel IP, root password, certificate, disks, NICs | Virtualization team |
| VCF | instance name, management domain name, deployment model, appliance FQDNs/IPs, IP ranges for vMotion/vSAN, switch profile, principal storage | VCF architect |

## Components

| Component | Role in planning |
|---|---|
| Planning and Preparation Workbook | Excel file: prerequisite checklist, sizing, the values for every wizard field. Download from TechDocs (`vcf-9.0-planning-and-preparation-workbook.xlsx`). |
| [[vcf-installer]] appliance | Deployed from `VCF-SDDC-Manager-Appliance-9.x.x.ova`; downloads binaries and runs the deployment. Needs to reach the ESX management network, DNS and NTP. |
| [[depot]] | Online depot (Broadcom, needs a download token) or an offline depot you host. |
| [[vcf-download-tool]] | CLI (Command-Line Interface) used to populate an offline depot when the installer has no internet access. |
| DNS service | Forward **and** reverse records for every host and appliance. |
| NTP service | One time source for hosts and appliances. |
| ESX hosts | Imaged with a supported ESX 9.0 build, prepared per the checklist. |

## How It Works

The planning-to-deployment flow, as TechDocs organises it (preparation → deployment → post-deployment):

1. **Download the workbook** and work through its Prerequisite Checklist.
2. **Decide the scope**: new fleet vs new instance in an existing fleet; simple vs HA; whether you will connect to an existing VCF Operations or VCF Automation or deploy them now (VCF Automation can be deferred to a day-N operation).
3. **Allocate names and IPs**: FQDNs for vCenter, NSX Manager nodes and VIP, SDDC Manager, VCF Operations nodes, fleet management appliance, collector, VCF Automation; IP ranges for vMotion and vSAN (at least one address per host); management VLAN.
4. **Create DNS records** — A and PTR for every FQDN — and confirm NTP reachability.
5. **Image and prepare the ESX hosts** (next section).
6. **Deploy the VCF Installer appliance** on a network that can reach the ESX management network, DNS and NTP.
7. **Connect the installer to a depot** and download the binaries for the target version.
8. **Run the deployment wizard**, review, download the JSON spec for your records, validate, deploy.
9. **Post-deployment**: license in VCF Operations, then deploy the components the installer does not (VCF Operations for logs, VCF Operations for networks, VCF Operations orchestrator; optional three-node VCF Identity Broker).

## Deep Dive

### ESX host preparation checklist

These come from the VCF 9.0 host commissioning prerequisites, which the installer also checks during bring-up:

| Requirement | Why it is enforced |
|---|---|
| Supported ESX version installed (see release notes / BOM) | The installer and SDDC Manager only manage builds in the bill of materials. |
| Host name is the FQDN; forward and reverse DNS records exist | SDDC Manager and vCenter address hosts by FQDN; reverse lookup is used in validation and certificates. |
| Self-signed certificate **regenerated** after the FQDN was set | The default certificate is generated at install time with the original name; a CN/SAN that does not match the FQDN fails certificate/thumbprint validation. |
| Management IP on a VMkernel adapter on the standard switch; gateway in the management subnet | The installer migrates this to a vSphere Distributed Switch during deployment. |
| All physical NICs at least 10 Gbps; correct number of NICs for the chosen switch profile | VCF validates NIC speed by default. |
| All disk partitions on HDD/SSD deleted; hardware health OK | vSAN claims empty devices only. |
| For vSAN: vSAN-certified hardware; for FC: VMFS datastore mounted before use | Principal storage must be usable when the cluster is created. |
| Same root password on all hosts (UI) | The UI asks for one common ESX password; different passwords require a JSON spec deployment. |
| VCF does not support stateless ESX hosts | Hosts must be installed to local boot media. |

The two host commands you will use most (both verified in Broadcom KBs):

```shell
# Set the hostname as an FQDN (KB 307780)
esxcli system hostname set --fqdn=esx01.lab.local
esxcli system hostname get

# Regenerate the self-signed certificate so it matches the new name (KB 411694)
/sbin/generate-certificates
/etc/init.d/hostd restart && /etc/init.d/vpxa restart
```

:::warning
Order matters: set the FQDN first, then regenerate the certificate. Regenerating first leaves you with a fresh certificate for the *old* name.
:::

### Network planning

| Network | Planned values | Gotchas |
|---|---|---|
| ESX management | VLAN, subnet, gateway, host IPs (static) | The installer can reuse it for VM management or you specify a separate VM management network. |
| vMotion | VLAN, subnet, gateway, **IP inclusion range** | Range must hold at least one IP per host; avoid network/broadcast addresses. |
| vSAN | VLAN, subnet, gateway, IP inclusion range | Needs consistent MTU end to end (jumbo frames are common). |
| NSX host overlay (TEP (Tunnel Endpoint)) | VLAN, static IP pool or DHCP | MTU at least 1600 for Geneve; 9000 is common. |
| NFS (if NFS principal storage) | NFS server IPv4, share path, optional VMkernel binding | Export must allow all host IPs. |

These vMotion and vSAN ranges become the **default network pool** of the management domain — the [[network-pool]] that later host commissioning draws from.

### Switch profiles

The wizard offers: **Default** (one switch for all traffic), **Storage Traffic Separation** (two switches), **NSX Traffic Separation** (two switches), **Storage and NSX Separation** (three switches) and **Custom**. Count NICs accordingly: separation profiles need more physical uplinks. Management, vMotion, vSAN and NSX overlay can be configured only once per cluster. Link Aggregation Group uplinks require a JSON-spec deployment.

### Passwords

The wizard can auto-generate passwords (20 characters, at least one special character, one number and one uppercase letter) or accept yours. Do not use `%` in the vCenter password. Plan where you will store them: after deployment the installer offers a **Review Passwords** button, and they are also retrievable through the SDDC Manager and VCF Operations APIs.

### Binaries

The VCF Installer "does not include software binaries". Options:

- **Online depot**: connect with your Broadcom download token and download directly.
- **Offline depot**: when the installer has no internet, populate a local depot with the [[vcf-download-tool]] and point the installer at it. One offline depot can serve multiple VCF instances, so binaries are downloaded once.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

A planning sheet for a minimal lab management domain (adapt to your own [Home Lab IP plan](lesson:network-fundamentals-for-vcf)):

| Item | Example |
|---|---|
| VCF instance name | `lab-inst01` |
| Management domain name | `lab-m01` |
| Model | Simple |
| Hosts | `esx01..esx04.lab.local` |
| Mgmt VLAN / subnet | VLAN 10, 10.0.10.0/24, gw .1 |
| vMotion VLAN / range | VLAN 11, 10.0.11.11–10.0.11.20 |
| vSAN VLAN / range | VLAN 12, 10.0.12.11–10.0.12.20, MTU 9000 |
| Host TEP VLAN | VLAN 13, static pool |
| Appliances | `vc01`, `nsx01a` + VIP `nsx01`, `sddcm01`, `ops01`, `fleet01`, `opscol01`, (`auto01` deferred) |
| DNS / NTP | 10.0.10.2 / 10.0.10.2 |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Pre-flight checks from any Linux jump host or the installer appliance shell:

```shell
# Forward and reverse lookup for every host and appliance
nslookup esx01.lab.local
nslookup 10.0.10.11

# Jumbo frames across the vSAN VLAN from an ESX host (8972 = 9000 minus IP/ICMP headers, -d = don't fragment)
vmkping -I vmk2 -d -s 8972 10.0.12.12

# Confirm the hostname the host reports
esxcli system hostname get
```

The VCF Installer exposes a REST API (`/v1/tokens`, `/v1/sddcs/validations`, `/v1/sddcs`) used in [VCF Installer Workflow](lesson:vcf-installer-workflow#cli-api).

## Failure Scenarios

| Planning gap | Where it surfaces | Impact |
|---|---|---|
| PTR record missing for a host | Installer validation (DNS check) | Validation error; deployment cannot start. |
| Host certificate still for `localhost` | Thumbprint/certificate validation | Host rejected until certificate regenerated. |
| IP range smaller than host count | Network validation | Error on vMotion/vSAN range. |
| MTU 1500 on a ToR port in the vSAN VLAN | vSAN/vMotion connectivity checks, or later vSAN partition | Validation failure or degraded vSAN after deployment. |
| Wrong principal storage chosen | Never fails — it just cannot be changed | Rebuild to change it. |
| Installer cannot reach the depot | Binary download | Nothing can be deployed. |

## Troubleshooting

Work from the outside in: **DNS → NTP → routing/gateway → MTU → host state → certificates → passwords**. Every one of these is testable before the installer exists: `nslookup` both directions, compare host time to the NTP source, `vmkping` with don't-fragment between hosts on each VLAN, check `esxcli system hostname get`, and view the host certificate subject in the Host Client. Fixing them in the planning phase is cheaper than reading validation errors later — see [Deployment Validation and Common Failures](lesson:deployment-validation-failures).

## Real-World Scenario

A team plans a 4-host HA management domain on vSAN ESA. The network team delivers VLANs 10–13 but configures MTU 9000 only on the leaf ports, not on the inter-switch link. DNS has A records but the reverse zone for the vMotion subnet is missing (harmless) and the reverse zone for the management subnet is missing (fatal). The VCF architect catches both in a workbook review because the checklist demands "forward and reverse lookup for all FQDNs" and "end-to-end MTU". The deployment validates first time. The lesson: the workbook is a contract between teams, not paperwork.


## Exam Focus

:::exam
- The **VCF Installer** replaces Cloud Builder; the **Planning and Preparation Workbook** is the planning tool; the installer can export/import a **JSON spec**.
- Binaries are **not** in the installer OVA: online depot (download token) or offline depot (VCF Download Tool).
- Host prerequisites: FQDN hostname, forward + reverse DNS, regenerated self-signed certificate, clean disks, 10 Gbps NICs, supported ESX build.
- Principal storage for a new management domain: vSAN (ESA/OSA), NFS v3, VMFS on FC — and it cannot be changed later.
- Simple (7 appliances) vs HA (13 appliances, three-node NSX/VCF Operations/VCF Automation).
:::

## Common Exam Traps

:::trap
- "Upload the Deployment Parameters Workbook to the VCF Installer" — that is the VCF 5.x Cloud Builder process. In 9.0 you use the wizard or a JSON spec.
- "iSCSI or NFS 4.1 as principal storage for the management domain" — both are supplemental only.
- "Regenerate the certificate, then change the hostname" — wrong order.
- "The installer includes all binaries" — it does not.
:::

## Knowledge Check

::quiz

## Summary

Planning a VCF 9.0 deployment means deciding scope (new fleet or instance, simple or HA, principal storage, switch profile), allocating names and IP ranges, creating forward and reverse DNS, providing NTP, preparing hosts (FQDN, regenerated certificate, clean disks, 10 Gbps NICs) and getting binaries into the installer from an online or offline depot. The Planning and Preparation Workbook is the checklist and specification; the installer validates every item before it deploys.

## Next Topic

Next: [The VCF Installer Workflow](lesson:vcf-installer-workflow) — deploying the installer, connecting the depot, walking the wizard and watching the deployment.
