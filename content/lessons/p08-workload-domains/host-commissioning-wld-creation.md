---
id: host-commissioning-wld-creation
title: Host Commissioning and Workload Domain Creation
phase: p08-workload-domains
module: m08-wld
version: vcf9
minutes: 45
difficulty: intermediate
summary: How hosts enter the VCF inventory in 9.0 (network pools, commissioning prerequisites, thumbprints, validation, storage-type tagging) and how a VI workload domain is created from VCF Operations — vCenter, NSX, storage, switches and optional Supervisor.
topics: [host-commissioning, workload-domains, wld-storage, deployment-validation]
objectives: ["4.1"]
keyTerms: [host-commissioning, network-pool, unassigned-host, host-decommissioning, ssl-thumbprint, workload-domain, principal-storage]
labs: [lab-commission-hosts-create-wld]
incidents: [inc-host-commissioning]
components: [sddc-manager, vcf-operations, vcenter, nsx-manager, esx-host, workload-domain, vds, supervisor]
related: [workload-domains-architecture, workload-domain-storage, cluster-host-expansion, supervisor-in-workload-domain, deployment-validation-failures]
sources:
  - title: "VCF 9.0 – Managing ESX Hosts in VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management.html
  - title: "VCF 9.0 – Commission ESX Hosts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/commission-hosts.html
  - title: "VCF 9.0 – Network Pool Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/about-network-pools.html
  - title: "VCF 9.0 – Create a Network Pool"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/about-network-pools/create-a-network-pool.html
  - title: "VCF 9.0 – Decommission ESX Hosts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/decommission-hosts.html
  - title: "VCF 9.0 – Create a New Workload Domain Using VCF Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/deploy-a-vi-workload-domain-using-the-sddc-manager-ui.html
  - title: "SDDC Manager API 9.0 – Hosts"
    url: https://developer.broadcom.com/xapis/sddc-manager-api/9.0/hosts/
  - title: "SDDC Manager API 9.0 – Network Pools"
    url: https://developer.broadcom.com/xapis/sddc-manager-api/9.0/network-pools/
  - title: "William Lam – Enhancement in VCF 9.0.1 to bypass vSAN ESA HCL and 10GbE NIC check for host commission"
    url: https://williamlam.com/2025/09/enhancement-in-vcf-9-0-1-to-bypass-vsan-esa-hcl-host-commission-10gbe-nic-check.html
---

## Why This Matters

A workload domain can only be built from hosts that VCF (VMware Cloud Foundation) already knows: hosts that have been **commissioned** into the inventory and are **unassigned**. Commissioning is where VCF checks that a host is fit for purpose — DNS (Domain Name System), certificate, NICs, disks, storage type — and records which kind of cluster it can join. Then the workload domain wizard turns those hosts into a vCenter, an NSX environment, principal storage and distributed switches in one workflow. Objective 4.1 ("describe the deployment of a Workload Domain") is tested with exactly these steps and their prerequisites.

## Learning Objectives

- Explain what a **network pool** is and why one must exist before commissioning.
- List host commissioning prerequisites and the commissioning steps (including thumbprints and validation).
- Explain how the **storage type** chosen at commissioning restricts which clusters a host can join.
- Locate commissioning (vSphere Client) and workload domain creation (VCF Operations) in VCF 9.0.
- Walk through the workload domain wizard and name what it deploys.

## Concept

```text
ESX installed and prepared → network pool exists → commission (validate) → UNASSIGNED host
   → create workload domain (or cluster, or expand) → ASSIGNED host
   → remove from cluster → UNASSIGNED → decommission → re-image → commission again
```

| Term | Meaning |
|---|---|
| [[network-pool]] | A collection of subnets within one L2 domain with IP ranges per network type. Automatically assigns static IPs to **vMotion**, **vSAN**, **vSAN Storage Client**, **NFS** and **iSCSI** VMkernel ports when a host is placed into a cluster. |
| [[host-commissioning]] | Adding a prepared ESX host to the VCF global inventory after validation. |
| [[unassigned-host]] | A commissioned host not yet in any domain (API (Application Programming Interface) status `UNASSIGNED_USEABLE`; `UNASSIGNED_UNUSEABLE` if it has a problem). |
| [[host-decommissioning]] | Removing an unassigned host from the inventory. |

The default network pool is created during the management domain deployment and **cannot be deleted**. For workload domains you usually create a new pool per L2 domain/rack or per workload domain.

:::vcf9 Changed in VCF 9
In VCF 5.x, network pools, commissioning and workload domain creation all lived in the **SDDC (Software-Defined Data Center) Manager UI**. In VCF 9.0 TechDocs documents:
- **Network pools and host commissioning** in the **vSphere Client**: *Global Inventory Lists → Hosts → Network Pools* and *→ Unassigned Hosts → Commission Hosts* (you need access to the management domain vCenter, or VCF SSO (Single Sign-On) with vCenter linking). The SDDC Manager UI is still listed as an alternative.
- **Workload domain creation** in **VCF Operations**: *Inventory → Detailed View → VCF Instances → (instance) → Add Workload Domain → Create New*, with progress in *Fleet Management → Tasks*.
SDDC Manager still executes the workflows behind the scenes, and its API (`/v1/hosts`, `/v1/network-pools`, `/v1/domains`) still exists.
:::

## Architecture

::diagram[d08-host-commissioning-flow]

::diagram[d08-wld-creation-flow]

Where things run once the workload domain exists:

| Object | Runs on |
|---|---|
| Workload domain vCenter | **Management domain** cluster |
| Workload domain NSX Manager(s) | **Management domain** cluster (or shared with another workload domain) |
| ESX hosts, VDS (vSphere Distributed Switch), vSAN/NFS/FC datastore | The workload domain cluster |
| NSX Edge cluster (if created later) | Usually the workload domain cluster |

This is why management domain capacity limits how many workload domains you can create.

## Components

### Commissioning prerequisites (TechDocs 9.0)

| Category | Requirement |
|---|---|
| Hardware/storage | vSAN hosts vSAN-compliant and on the HCL; NFS/vVols hosts on the HCL; FC hosts with supported HBAs and the VMFS datastore **mounted before commissioning** |
| Network | All physical NICs at least **10 Gbps**; correct number of NICs; management IP on a VMkernel on the **standard switch**; gateway in management subnet |
| DNS | Forward **and** reverse records; **hostname = FQDN (Fully Qualified Domain Name)** |
| Certificate | Self-signed certificate **regenerated based on the FQDN** (or external CA (Certificate Authority) certs if the instance used external CA for hosts) |
| Disks | All partitions on HDD/SSD deleted; hardware health OK |
| Software | Supported ESX version and drivers/firmware |
| Pool | A network pool that supports the host's storage type exists |

### Storage types at commissioning

| Choice in UI | JSON/API value | Host can only join |
|---|---|---|
| vSAN HCI with ESA | `VSAN_ESA` | vSAN ESA clusters |
| vSAN HCI (OSA) | `VSAN` | vSAN OSA clusters |
| vSAN Storage (storage cluster / vSAN Max) | `VSAN_MAX` | vSAN storage clusters |
| vSAN Compute Cluster | `VSAN_REMOTE` | vSAN compute clusters |
| NFS | `NFS` | NFS clusters |
| VMFS on FC | `VMFS_FC` | VMFS on FC clusters |
| vVols (FC/iSCSI/NFS) | `VVOL` | vVols clusters |

## How It Works

### Commission hosts (vSphere Client)

1. *Global Inventory Lists → Hosts → Unassigned Hosts → **Commission Hosts***.
2. Review the **checklist**, *Select All*, *Proceed*.
3. Add hosts: one by one (FQDN — must match DNS exactly including case — storage type, network pool, root credentials) **or** bulk via a downloaded **JSON template**.
4. **Confirm fingerprints**: verify each host's fingerprint and toggle *Confirm All Finger Prints*. VCF temporarily activates SSH on the host to retrieve the host key, then deactivates it.
5. **Validate All** — each host shows *Valid* or *Invalid*; fix and re-validate, or remove invalid hosts.
6. Choose *Skip failed hosts during commissioning* (on by default) and **Commission**. Watch Tasks.
7. Hosts appear in **Unassigned Hosts**.

### Create a workload domain (VCF Operations)

| Page | Key inputs |
|---|---|
| Prerequisites | Confirm checklist |
| General | Domain name (3–20 chars), **Enable vSphere Supervisor** (on by default), SSO domain, passwords |
| vCenter | FQDN, root password |
| Cluster | Cluster name, vSphere Zone name (if Supervisor) |
| Cluster image | vLCM (vSphere Lifecycle Manager) image (hosts with different vendor add-ons are remediated) |
| NSX Manager | **Standard** (1 node) or **High Availability** (3 nodes, recommended), or reuse an existing NSX Manager; FQDNs; admin/audit passwords; **Centralized** connectivity (needs an Edge cluster + active-standby Tier-0, configured after creation; required for Supervisor) or **Distributed** connectivity (VLAN (Virtual Local Area Network), gateway CIDR, external IP block, private transit gateway block) |
| Storage | vSAN (ESA/OSA), NFS, VMFS on FC, vVols (deprecated) |
| Hosts | Unassigned hosts commissioned with the **same storage type** |
| Distributed switch | Default / storage separation / NSX separation / both / custom |
| Supervisor | Supervisor name, service CIDR, control plane IPs (≥5), workload DNS/NTP (Network Time Protocol)… (see [Supervisor](lesson:supervisor-in-workload-domain)) |
| Review | Finish → *Fleet Management → Tasks* |

What gets built: a vCenter (on the management domain), the cluster on the chosen principal storage, VDS(es), NSX Manager (new or shared) with hosts prepared, and optionally a Supervisor with a single control plane VM.

## Deep Dive

### Network pool rules

| Rule | Consequence |
|---|---|
| VLAN 1–4094, MTU 1500–9000 | Match the physical switch config |
| Subnet cannot be changed after creation | Plan subnet size up front |
| IP ranges cannot be edited — but you can **add** ranges | Grow pools by adding ranges |
| Subnets cannot overlap another pool | One pool per subnet |
| Gateway cannot be inside the IP range | Exclude it |
| Pool cannot be deleted while hosts use it | Decommission hosts first |
| IPs are consumed when a host is **assigned** to a domain/cluster | Size = hosts that will be in clusters using this pool |

### Fingerprints and certificates

The fingerprint you confirm is the host's identity. If a host is re-imaged, its fingerprint changes; if its certificate still names `localhost`, validation fails because the certificate does not match the FQDN. Regenerate with `/sbin/generate-certificates` after setting the FQDN.

### Network validation detail

TechDocs warns that validation creates multiple VMkernels to test the **vMotion** network; if **MAC address filtering** is enabled on the physical infrastructure, the vMotion connectivity validation can fail even though the VLAN is correct.

### Decommission and reuse

- A host must not be assigned to any domain to be decommissioned (*Unassigned Hosts → Decommission Selected Hosts*).
- If it was previously in a domain it must be **re-imaged** before commissioning again. To reuse a host in another domain: remove from cluster → decommission → re-image → commission.

### Licensing

In VCF 9 licensing is applied centrally in VCF Operations; new domains consume the instance's licensed capacity. See [License Management](lesson:license-management).

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Example network pool for a workload domain on NFS:

| Field | Value |
|---|---|
| Name | `wld01-np01` |
| Network types | vMotion, NFS |
| vMotion | VLAN 21, 10.0.21.0/24, gw 10.0.21.1, MTU 9000, range .11–.30 |
| NFS | VLAN 22, 10.0.22.0/24, gw 10.0.22.1, MTU 9000, range .11–.30 |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

SDDC Manager API (9.0):

```http
GET    /v1/network-pools                      # list pools
POST   /v1/network-pools                      # create a pool
POST   /v1/network-pools/{id}/networks/{networkId}/ip-pools   # add an IP range
POST   /v1/hosts/validations                  # validate HostCommissionSpec[]
POST   /v1/hosts                              # commission
GET    /v1/hosts?status=UNASSIGNED_USEABLE    # usable unassigned hosts
DELETE /v1/hosts                              # decommission
```

```json
[
  {
    "fqdn": "esx11.lab.local",
    "username": "root",
    "password": "VMware1!VMware1!",
    "storageType": "NFS",
    "networkPoolName": "wld01-np01"
  }
]
```

## Failure Scenarios

| Symptom | Likely cause |
|---|---|
| Host *Invalid*: cannot resolve / reverse mismatch | DNS A/PTR missing or different case |
| Host *Invalid*: certificate/fingerprint | Certificate not regenerated after FQDN change, or host re-imaged |
| Host not offered for vSAN ESA domain | Commissioned as NFS or vSAN OSA |
| Pool not selectable | Pool lacks the network type for the chosen storage (e.g. no vSAN network) |
| vMotion validation fails | VLAN/MTU wrong, or MAC filtering |
| NIC speed failure | 1 GbE NICs |
| Host *UNASSIGNED_UNUSEABLE* | Host has a problem after commissioning — investigate before using |

## Troubleshooting

Start with the validation message per host, then check DNS from SDDC Manager, the host certificate subject, the host's NTP, and the pool definition. The same layer-by-layer method as in [Deployment Validation and Common Failures](lesson:deployment-validation-failures#troubleshooting) applies. Practise it on this incident:

::incident[inc-host-commissioning]

## Real-World Scenario

A hospital adds a VDI workload domain. Twelve new hosts are racked in a new rack with its own vMotion and vSAN VLANs. The engineer creates `vdi-np01` with vMotion and vSAN networks for that rack, bulk-commissions all twelve via the JSON template as `VSAN_ESA`, and confirms fingerprints against the values on each host's DCUI. Two hosts fail validation: one has a stale PTR record, one still has partitions from a previous OS. Because *skip failed hosts* is on, ten are commissioned; the other two follow after fixes. The workload domain is created with a three-node NSX Manager, vSAN ESA, and Supervisor disabled because VDI does not need it.


## Exam Focus

:::exam
- Network pool before commissioning; it auto-assigns static IPs to vMotion/vSAN/NFS/iSCSI/vSAN Storage Client VMkernels.
- Host prereqs: FQDN, forward + reverse DNS, regenerated cert, 10 Gbps NICs, clean disks, supported ESX.
- Storage type chosen at commissioning restricts the clusters a host can join.
- 9.0 UI locations: commissioning in vSphere Client Global Inventory Lists; workload domain creation in VCF Operations.
- WLD vCenter and NSX Managers run in the management domain.
:::

## Common Exam Traps

:::trap
- "Commission a host that is still in a cluster" — it must be removed and decommissioned first, then re-imaged.
- "Change the subnet of a network pool" — not possible; create a new pool.
- "NSX Edge is deployed automatically by the WLD wizard" — Centralized connectivity requires you to create the Edge cluster afterwards.
- "An NFS-commissioned host can be added to a vSAN cluster" — no.
:::

## Knowledge Check

::quiz

## Summary

Commissioning validates a prepared host and adds it to the inventory with a storage type and a network pool. Workload domain creation in VCF Operations consumes unassigned hosts of the right storage type and deploys a vCenter and NSX (in the management domain), a cluster with principal storage, distributed switches and optionally a Supervisor.

## Next Topic

Next: [Workload Domain Storage](lesson:workload-domain-storage).
