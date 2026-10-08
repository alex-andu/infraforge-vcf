---
id: vcf-operations-hcx
title: VCF Operations HCX — Workload Mobility Across Sites
phase: p10-operations
module: m10-ops-extended
version: vcf9
minutes: 55
difficulty: intermediate
summary: Plan, deploy and reason about VCF Operations HCX site pairing, profiles, service meshes, network extension and the migration methods used to move vSphere and non-vSphere workloads.
topics: [hcx-workload-mobility, vm-management, network-ops]
objectives: ["2.1", "2.2", "4.3"]
keyTerms: [vcf-operations-hcx, hcx-site-pair, hcx-service-mesh, hcx-network-profile, hcx-compute-profile, hcx-interconnect, hcx-network-extension, replication-assisted-vmotion, mobility-group]
labs: [lab-vcf-operations-hcx]
incidents: []
components: [vcf-operations-hcx, vcenter, nsx-manager]
related: [vm-lifecycle-templates, vcf-operations-logs-network-ops, vcf9-architecture-overview, nsx-segments-overlay]
sources:
  - title: "VCF 9.0 - Workload Mobility"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility.html
  - title: "VCF 9.0 - VCF Operations HCX Installations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/getting-started-with-vmware-hcx-vcf-9-0/introduction-to-hcx-site-manager-deployments/hcx-connector-and-hcx-cloud-sites.html
  - title: "VCF 9.0 - HCX System Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/vmware-hcx-user-guide-vcf-9-0/vmware-hcx-components.html
  - title: "VCF 9.0 - Installation Summary Steps"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/getting-started-with-vmware-hcx-vcf-9-0/appendix-i-hcx-installation-sequence.html
  - title: "VCF 9.0 - Create a Network Profile"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/vmware-hcx-user-guide-vcf-9-0/configuring-and-managing-the-hcx-interconnect/configuring-the-hcx-service-mesh/create-a-network-profile.html
  - title: "VCF 9.0 - Create a Compute Profile"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/vmware-hcx-user-guide-vcf-9-0/configuring-and-managing-the-hcx-interconnect/configuring-the-hcx-service-mesh/create-a-compute-profile.html
  - title: "VCF 9.0 - Add a Site Pair"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/vmware-hcx-user-guide-vcf-9-0/creating-and-managing-site-pairs/add-a-site-pair.html
  - title: "VCF 9.0 - Migration Types"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/vmware-hcx-user-guide-vcf-9-0/migrating-virtual-machines-with-vmware-hcx/vmware-hcx-migration-types.html
  - title: "VCF 9.0 - Extending Networks"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/vmware-hcx-user-guide-vcf-9-0/extending-networks-with-vmware-hcx.html
---

## Why This Matters

Moving an application between sites is not just copying virtual disks. The destination needs compute, storage and
network placement; the two control planes must trust each other; migration traffic needs a reliable encrypted path;
and applications that cannot change IP addresses may need their Layer 2 network extended temporarily. VCF Operations
HCX packages these concerns into a repeatable mobility service.

HCX appears in the official candidate profile even though it is not a separate numbered exam item. A VCF
administrator should recognize its architecture, choose a migration method from downtime and scale requirements, and
troubleshoot the boundary between control-plane pairing, data-plane tunnels and workload networks.

## Learning Objectives

- Explain the difference between an HCX Manager, Site Pair, Network Profile, Compute Profile and Service Mesh.
- Map HCX-IX, HCX-NET-EXT and Sentinel appliances to their jobs.
- Choose Bulk, vMotion, Cold, RAV, Direct or OS Assisted Migration for a scenario.
- Explain when Network Extension is needed and why it is not a permanent routing design.
- Follow a safe source/destination installation order and collect evidence at every gate.

## Concept

**VCF Operations HCX** is the workload-mobility capability for moving and rebalancing applications within or across
VCF private clouds and other supported vSphere environments. It can migrate groups of VMs, preserve network identity,
and connect sites without redesigning every application before the move.

HCX uses explicit site roles:

| Role | Meaning |
|---|---|
| Source | Holds the workloads to migrate. It initiates site-pair requests, network extensions and migrations. NSX is not required unless the chosen source network extension needs it. |
| Destination | Receives pairing, extensions and migrations. A private-cloud destination requires supported vSphere and NSX. |
| Bidirectional pair | Each site also creates the reverse pair, allowing either side to initiate operations. Direction is still explicit for each operation. |

The same HCX OVA is used at both sites. The role comes from registration, pairing and the direction of the operation,
not from a different source-versus-destination appliance image.

## Architecture

::diagram[d10-hcx-service-mesh]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/2c05df6e-6b5a-4638-91e9-e62b81340039.original.png" caption="Official Compute Profile concept figure (Broadcom TechDocs, VCF 9.0). A Compute Profile selects services, service/deployment clusters and the Network Profiles used when the Service Mesh deploys its appliances." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-mobility/getting-started-with-vmware-hcx-vcf-9-0/hcx-deployment-considerations/compute-profile-considerations-and-concepts.html"}

The **control plane** is manager-to-manager: registration, authentication, role mapping, Site Pair and orchestration.
The **data plane** is service-appliance-to-service-appliance: migration, replication and network-extension traffic.
This separation explains why a Site Pair can be Connected while migration still fails—the control plane works, but a
profile, service appliance or tunnel is wrong.

## Components

| Component | Where | Function |
|---|---|---|
| HCX Manager appliance | Management zone at each site, near vCenter | UI/API, local vCenter/NSX registration, role mapping, pairing and service-appliance lifecycle |
| Site Pair | Between managers | Management, authentication and orchestration relationship; private vSphere pairing uses the remote HCX URL and authorized remote identity |
| Network Profile | Per site/network | Abstracts a port group or NSX segment plus IP pool, prefix, gateway, DNS and MTU for management, uplink, vMotion, replication or OSAM guest traffic |
| Compute Profile | Per site | Selects services, service clusters, deployment resources/datastore and the Network Profiles used by those services |
| Service Mesh | Between one source and one destination Compute Profile | Deploys and connects the data-plane appliances and enables selected services |
| HCX-IX | Both sites | Interconnect for replication and vMotion migration, strong encryption and traffic engineering; source is initiator, destination is receiver |
| HCX-NET-EXT | Paired appliances | Bridges selected Layer 2 workload networks across sites, preserving VM IP and MAC addresses |
| Sentinel appliances | Source/destination depending on OSAM mode | Move non-vSphere workloads by agents and replication: SGW, SDR or single-site SRG |

## How It Works

The dependency order matters:

1. Prepare both sites: supported versions, destination NSX, DNS/NTP, management and uplink reachability, IP pools,
   compute/storage capacity, certificates and required ports.
2. Deploy and initialize the **destination HCX Manager** first. On `https://<DEST_HCX>:9443`, set location/system name,
   register vCenter and NSX, restart services and define Role Mapping.
3. In `https://<DEST_HCX>:443`, create destination **Network Profiles** and a **Compute Profile**.
4. Deploy and initialize the **source HCX Manager**, registering source vCenter, SSO and optional NSX, then define Role
   Mapping.
5. From the source console go to **Infrastructure > Site Pairs > New Site Pair**, enter the destination HCX URL and
   approved identity, and require status **Connected**.
6. Create the source Network and Compute Profiles. Profile creation only saves intent; it does not deploy service
   appliances.
7. Create a **Service Mesh**, selecting source and destination Compute Profiles. HCX deploys source initiators and
   destination receivers, then establishes the tunnels.
8. Validate appliance health, tunnel state and data-plane diagnostics before extending a network or moving a VM.
9. Extend only the test workload network that must preserve Layer 2 identity. Then choose and execute the migration
   method, validate the application, and document rollback.

## Deep Dive

### Network Profile versus Compute Profile versus Service Mesh

| Object | Question it answers | Does it deploy appliances? |
|---|---|---:|
| Network Profile | Which port group/segment and L3/IP-pool settings will a service interface use? | No |
| Compute Profile | Which services, clusters, datastore and Network Profiles should this site use? | No |
| Service Mesh | Which source/destination profiles should be instantiated and connected? | **Yes** |

Creating or editing a Compute Profile does not update a running Service Mesh until **Re-Sync**. A cluster excluded
from all source service resources cannot supply VMs for HCX migration. A deployment cluster can be separate from a
service cluster, but its HCX-IX must reach the service cluster management/replication and vMotion VMkernel networks;
for Network Extension it also needs access to the workload-network broadcast domains.

### Migration method decision table

| Method | Workload state and downtime | Scale/scheduling | Best fit |
|---|---|---|---|
| Bulk Migration | VM runs at source during replication; cutover interruption is similar to a reboot | Parallel and schedulable | Migration waves with an accepted reboot window |
| HCX vMotion | Live VM state transfer with no service interruption | Designed for one VM at a time | A small number of critical vSphere VMs needing zero downtime |
| Cold Migration | Source VM is powered off; NFC transfer | Simple offline move | Workloads that can remain down or are already off |
| Replication Assisted vMotion (RAV) | Replication plus final vMotion state transfer; zero downtime | Parallel, resilient and schedulable | Many live VMs where Bulk scale and vMotion continuity are both required |
| OS Assisted Migration (OSAM) | Agent-assisted bulk migration of non-vSphere guests | Parallel | KVM/Hyper-V/physical or other supported non-vSphere sources into vSphere |
| Assisted vMotion (Direct) | HCX orchestrates native cross-vCenter vMotion | Depends on native path/compatibility | Sites that can use direct cross-vCenter vMotion without HCX-IX data-path services |

### Network Extension is a migration aid

Network Extension creates a destination Layer 2 network and bridges it to the source so a VM can retain its address
during and after migration. That reduces application change during a wave, but it extends the source failure and
broadcast domain. Plan the final routed destination and remove the extension when the migration dependency ends.

## Configuration

### Network Profile fields

Open **Interconnect > Network Profiles > Create Network Profile**. Select vCenter, then a distributed/standard port
group, NSX logical switch or supported external network. Set the name, appliance IP range(s), prefix, gateway, DNS and
MTU. Suggested traffic types—Management, HCX Uplink, vMotion, vSphere Replication and Sentinel Guest—guide later
selection but do not enforce use.

Separate profiles per function are the documented best practice. vMotion and replication interfaces use the gateway
from the Management Network Profile for off-subnet access unless static routes are added in advanced Compute Profile
settings. Uplink data is encrypted by default; marking an underlying uplink secure is only a prerequisite for an
explicit design decision to deactivate encryption.

### Compute Profile fields

Open **Interconnect > Compute Profiles > Create Compute Profile**. Name it; select services; choose service clusters,
deployment cluster/resource pool, datastore and optional folder; set CPU/memory reservation (100% is the documented
best practice); map Management, Uplink, vMotion, optional Replication/Intrasite Control/OSAM Guest profiles; select
network containers eligible for extension; review connection rules; resolve validation errors; and select **Finish**.

## CLI / API

This package teaches the supported UI because the exact HCX API surface and automation tooling can change with the
installed build. Use browser-exported connection rules and the product API only after checking the API reference for
that build. For a first deployment, the most valuable automation artifact is a sanitized input/evidence worksheet:
site URLs, versions, registered managers, profile names, networks, IP pools, MTU, selected services and validation
results—never passwords, client secrets or raw certificates.

## Failure Scenarios

| Symptom | Likely layer | Reasoning |
|---|---|---|
| Site Pair is not Connected | Control plane | HCX URL, TCP 443, certificate trust, identity or Role Mapping |
| Service Mesh deployment fails validation | Intent/deployment | Missing IPs, datastore capacity, network reachability, unsupported resource or firewall rule |
| Site Pair works but tunnel is down | Data plane | UDP 4500/NAT/firewall/uplink MTU or HCX-IX health |
| VM is not selectable | Scope | Its cluster is excluded from the source Compute Profile or compatibility requirements fail |
| Migration works but VM loses connectivity | Workload network | Destination mapping, gateway/routing or Network Extension state is wrong |
| Compute Profile edit has no effect | Lifecycle | Running Service Mesh has not been Re-Synced |

## Troubleshooting

1. Start with **Infrastructure > Site Pairs** and prove the control relationship is Connected.
2. Open **Interconnect > Service Mesh** and distinguish deployment state from tunnel state.
3. Check HCX Manager and data-plane appliance health at both sites; identify source initiator and destination receiver.
4. Compare Network Profile IP pools, gateway, DNS and MTU with actual port-group/segment configuration.
5. Review exported connection rules and test the relevant path: manager TCP 443, then service-appliance UDP 4500 and
   site-specific management/vMotion/replication reachability.
6. Confirm the VM's cluster and network are included in the source Compute Profile and destination mapping is valid.
7. Use HCX data-plane diagnostics before changing firewalls or profiles. Re-Sync after an approved profile correction.
8. Retry with one disposable test VM, then validate application, network and rollback evidence before scaling a wave.

## Real-World Scenario

A company consolidates an older vSphere site into a new VCF private cloud. The destination HCX Manager registers the
new vCenter and NSX. The source manager registers the older vCenter without requiring source NSX. The team pairs the
sites, creates management/uplink/vMotion/replication profiles, and builds a Service Mesh. Stateless test VMs move by
Bulk Migration during a reboot window. A critical database tier uses RAV because the team needs wave scheduling and
zero downtime. One legacy application retains its IP through Network Extension during the wave, then the team moves
its gateway to the destination and removes the extension after acceptance.

## Lab

::lab[lab-vcf-operations-hcx]

The guide is fully prepared but deliberately unvalidated. Alex's inventory does not list HCX, a second vCenter/VCF
site, destination NSX capacity or the required IP pools. Those become discovered inputs when the second site is built.

## Exam Focus

:::exam
- Source initiates operations; private-cloud destination requires supported vSphere and NSX.
- **Site Pair = management/authentication/orchestration**; **Service Mesh = deployed data plane**.
- Network Profile supplies network/L3/IP-pool data; Compute Profile selects services/resources; Service Mesh deploys.
- HCX-IX handles migration/interconnect; HCX-NET-EXT preserves Layer 2 identity.
- Bulk = parallel/scheduled with reboot-like cutover; vMotion = one live VM; RAV = parallel/scheduled plus zero downtime;
  OSAM = non-vSphere; Cold = powered off; Direct = native cross-vCenter vMotion orchestrated by HCX.
:::

## Common Exam Traps

:::trap
Creating a Compute Profile does **not** deploy HCX-IX or Network Extension appliances. Creating the Service Mesh does.
:::

:::trap
A Connected Site Pair does not prove the migration data path. It proves manager connectivity; verify Service Mesh
appliances and tunnels separately.
:::

:::trap
Network Extension preserves IP/MAC identity but should not become the permanent substitute for destination routing.
:::

## Knowledge Check

::quiz

## Summary

VCF Operations HCX separates intent and execution. HCX Managers register each site and form a Site Pair. Network
Profiles describe interface networks and IP pools; Compute Profiles select services and resources; the Service Mesh
deploys and connects HCX-IX, HCX-NET-EXT and optional Sentinel appliances. Choose migration type from source platform,
scale, scheduling and downtime, and validate control plane, data plane and workload network as separate gates.

## Next Topic

Continue with [VCF Automation Architecture](lesson:vcf-automation-architecture), or use the prepared HCX guide after a
second supported site and capacity are available.
