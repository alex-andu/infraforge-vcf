---
id: nsx-vpcs-and-vcf-networking
title: NSX VPCs, Transit Gateways and VCF 9 Network Connectivity
phase: p05-nsx
module: m05-nsx-routing
version: vcf9
minutes: 50
difficulty: advanced
summary: How VMware Cloud Foundation (VCF) 9 exposes networking through external connections, transit gateways, virtual private clouds (VPCs), subnets and centralized or distributed connectivity.
topics: [nsx-vpc, nsx-edge, nsx-routing]
objectives: ["2.4", "4.1"]
keyTerms: [nsx-vpc, transit-gateway, external-connection, nsx-project, tier-0, edge-cluster, nat]
labs: [lab-nsx-tier0-bgp-edge, lab-nsx-segments-tier1]
incidents: [inc-nsx-edge-north-south]
components: [nsx-manager, nsx-edge-cluster, vcenter, workload-domain, supervisor, vcf-automation]
related: [nsx-edge-nodes-clusters, nsx-tier0-tier1-routing, nsx-security-dfw-gateway-firewall]
sources:
  - title: "NSX REST API 9.0 – Patch Transit Gateway (orgs/projects path)"
    url: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/9.0.0/method_PatchTransitGateway.html
  - title: "VCF 9.0 – Virtual Private Cloud in NSX"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/virtual-private-cloud-in-nsx.html
  - title: "VCF 9.0 – Transit Gateways"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/virtual-private-cloud-in-nsx/transit-gateways.html
  - title: "VCF 9.0 – External Connections"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/virtual-private-cloud-in-nsx/external-connections.html
  - title: "VCF 9.0 – Managing Network Connectivity in vCenter"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/managing-network-connectivity-in-vcenter.html
  - title: "VCF 9.0 – Configure Centralized Network Connectivity with Edge Clusters"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/managing-network-connectivity-in-vcenter/managing-centralized-network-connectivity-with-edge-clusters.html
  - title: "VCF 9.0 – Configure Distributed Network Connectivity"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/managing-network-connectivity-in-vcenter/managing-distributed-network-connectivity.html
  - title: "VCF 9.0 Design – VCF Edge Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-edge.html
  - title: "VCF 9.0 – Create a New Workload Domain Using VCF Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/deploy-a-vi-workload-domain-using-the-sddc-manager-ui.html
  - title: "VCF blog – VPC Centralized Network Connectivity with Guided Edge Deployment"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/25/vpc-centralized-network-connectivity-with-guided-edge-deployment/
  - title: "VCF blog – VPC Distributed Network Connectivity (No NSX Edge VMs)"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/25/vpc-distributed-network-connectivity-no-nsx-edge-vms/
  - title: "VMware Cloud Foundation 9.0 Administrator exam guide (2V0-17.25)"
    url: https://docs.broadcom.com/doc/vmware-cloud-foundation-administrator-exam-guide
  - title: "William Lam – MS-A2 VCF 9.0 Lab: Configuring NSX VPC"
    url: https://williamlam.com/2025/07/ms-a2-vcf-9-0-lab-configuring-nsx-virtual-private-cloud-vpc.html
  - title: "Broadcom KB 435782 – Supervisor deployment fails due to missing NSX Edge Cluster"
    url: https://knowledge.broadcom.com/external/article/435782/supervisor-deployment-fails-in-vcf-90-du.html
---

## Why This Matters

VCF 9 changes how people **consume** NSX. Instead of a network team hand-building Tier-1s and segments for every
request, a vCenter administrator (or a VCF Automation tenant) creates a **VPC** and picks subnets, and the platform
wires it to the physical network through a **transit gateway**. Exam objective 4.1 has two items aimed straight at
this: "describe the deployment of and configure a VMware Cloud Foundation (VCF) Network Gateway" and "describe the
deployment of VMware Cloud Foundation (VCF) Networking". Objective 2.4 asks you to differentiate the components. This
lesson is the bridge between classic NSX (previous lessons) and the VCF 9 model.

## Learning Objectives

- Describe the VCF 9 VPC model: [[external-connection]], [[transit-gateway]], [[nsx-vpc|VPC]], subnets and profiles.
- Distinguish public, private and private-transit-gateway subnets and the IP blocks they draw from.
- Compare **centralized** and **distributed** connectivity: components, services, requirements, use cases.
- Explain what the exam phrase "VCF Network Gateway" maps to in the product, and walk through its deployment in vCenter.
- Describe how networking is deployed across a VCF 9 instance (bring-up, workload domains, day-N connectivity).

## Concept

### The consumption stack

From outside in:

| Layer | What it is | Who owns it |
|---|---|---|
| **External connection** | Defines how a transit gateway reaches networks outside NSX and which services are available: **centralized** (through a Tier-0/VRF on Edges) or **distributed** (directly to VLANs on ESX hosts) | Provider / enterprise admin |
| **Transit gateway (TGW)** | Interconnects the VPCs of a project and connects them to external connections. **One per project**, created automatically with the project | Provider / project admin |
| **VPC** | "Logically isolated networking subnets routed together by a VPC gateway" — an on-demand tenant network | Project admin / vCenter admin (default project) |
| **Subnets** | L3 networks in a VPC (segments underneath) | VPC consumers |

**Projects** are NSX's tenancy construct. Every NSX has a **Default project** with a pre-configured transit gateway,
connectivity profile and service profile; its VPCs use the default overlay transport zone, must connect to the default
transit gateway, and are what vCenter shows and lets you consume. User-defined projects add explicit resource sharing
and Edge assignment (used for multi-tenancy, e.g. by VCF Automation organizations).

### Subnet types

| Subnet type | Addresses from | Reachable from |
|---|---|---|
| **Public** | VPC **External IP blocks** (advertised to the physical network) | Anywhere routed — enterprise-wide |
| **Private (VPC)** | The VPC's private CIDR / VPC IP blocks | Only inside that VPC (addresses can be reused in other VPCs) |
| **Private – Transit Gateway** | **Private TGW IP blocks** (project scope) | Other VPCs on the same transit gateway, not outside |

A VM on a private subnet can still be reached from outside with an **External IP** (1:1 NAT), and VPCs can have a
**default outbound NAT** (SNAT) in centralized mode.

### Profiles

| Profile | Sets |
|---|---|
| VPC connectivity profile | Which transit gateway, which IP blocks are available, whether default outbound NAT is on |
| VPC service profile | DHCP / DHCP relay and subnet profiles |
| VPC security profile | Turns on the gateway firewall for VPCs — stateless is included; **stateful requires vDefend licensing** |

## Architecture

::diagram[d05-vpc-model]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/fc45ccbe-04e4-4bb8-bad7-7b29730ee2dc.cq5dam.web.1280.1280.jpeg" caption="Simplified VPC model (VCF 9.0 documentation, Virtual Private Cloud in NSX)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/virtual-private-cloud-in-nsx.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/b72afc21-bd08-46b2-a6a3-e93dfdb1e301.cq5dam.web.1280.1280.jpeg" caption="VPCs in the Default project (VCF 9.0 documentation)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/virtual-private-cloud-in-nsx.html"}

Now compare the two ways a transit gateway can reach the physical network:

::diagram[d05-vpc-centralized-vs-distributed]

::figure{src="https://blogs.vmware.com/cloud-foundation/wp-content/uploads/sites/75/2025/06/image_114a8b.png" caption="Distributed connectivity set-up (VCF blog: VPC Distributed Network Connectivity – No NSX Edge VMs)" source="https://blogs.vmware.com/cloud-foundation/2025/06/25/vpc-distributed-network-connectivity-no-nsx-edge-vms/"}

## Components

### Centralized vs distributed connectivity

| | **Centralized connectivity** | **Distributed connectivity** |
|---|---|---|
| Transit gateway connects to | A **Tier-0 gateway** (SRs on NSX Edge VMs) | A dedicated **VLAN** on the ESX hosts' uplinks |
| Edges needed | Yes — edge cluster (2–10 nodes) | **No** |
| Dynamic routing with fabric | BGP (or static) on the Tier-0 | None — the physical router on the VLAN is the gateway |
| Services | Stateful: SNAT/DNAT, default outbound NAT, External IPs, DHCP, E/W and N/S gateway firewall, L4 LB, Avi plugin | Stateless: External IPs (1:1 NAT), distributed DHCP, distributed routing, on-demand networking |
| Not available | — | SNAT/DNAT (other than 1:1), N/S firewall, DHCP relay, other stateful services |
| Physical requirement | Uplink VLANs and BGP peers on ToRs; Edge TEP VLAN | **Same VLAN on every host** where VPC workloads run; external IP blocks inside that VLAN's subnet |
| Required for | **vSphere Supervisor and VCF Automation All Apps** (Centralized **Active/Standby**) | Simple VM networking without Edges |
| TGW connections | Exactly **one** centralized connection | **One or more** distributed connections (not mixed with centralized) |

The blog line to remember: in centralized mode "the Transit Gateway forwards traffic to a Tier-0 gateway … instantiated
(centralized) on NSX Edge VMs" so "all traffic in or out goes through those Edge VMs"; in distributed mode the transit
gateway "maps directly onto a shared VLAN across ESX hosts" and "every ESX host must attach to the same VLAN".


### Component responsibilities and limits

**External connection.** An external connection binds VCF networking to physical uplinks and upstream routing. It establishes provider reachability; it does not define tenant isolation or application subnets.

**Transit gateway.** A transit gateway provides shared routing between VPCs and external/provider connectivity according to the selected model. It is a provider construct and does not replace organization-level policy or address planning.

**VPC.** A virtual private cloud (VPC) gives an organization a delegated network boundary with address space, subnets and policy. It supports self-service within provider guardrails. It cannot exceed the address, routing, quota or service constraints granted by the provider.

**Subnet type.** Routed, isolated and external subnet choices determine reachability and gateway behavior. The label is an intent choice; actual connectivity still depends on realized NSX routes, services and policy.

**VCF Network Gateway.** The exam term represents the VCF consumption boundary that connects VPC networking with provider transit/external connectivity. It should not be confused with one legacy Tier-0 or Tier-1 object in every scenario.

## How It Works

### What "VCF Network Gateway" means {#vcf-network-gateway}

The exam guide (objective 4.1) uses the phrase **"VMware Cloud Foundation (VCF) Network Gateway"**. That exact
phrase is **not** a product object name in the VCF 9.0 TechDocs. What the documentation *does* describe is the vCenter
**Network Connectivity** workflow in which you pick a **Gateway Type** — "Centralized Gateway" (create an edge
cluster with a centralized gateway: NSX Edges + a Tier-0) or "Distributed Gateway" (a lightweight distributed
transit-gateway connection with no Edges) — and then configure the **Gateway** (Gateway Name, High Availability Mode,
Gateway Routing Type BGP/Static, Local Autonomous System, gateway uplinks). Read the exam phrase as: *the gateway that
connects VCF's virtual networks to the physical network, deployed and configured through this workflow*. Don't
confuse it with **VCF Edge** (see Deep Dive).

### Deploying a centralized gateway (vSphere Client)

1. vSphere Client → the workload domain's vCenter → **Networks > Network Connectivity** → **Configure Network Connectivity**.
2. Gateway type: **Centralized Connectivity** → review the networking prerequisites.
3. Edge cluster: name, Tunnel Endpoint MTU, **Edge Form Factor**, passwords; add ≥ 2 Edge nodes (FQDN, cluster, datastore, management IP, uplink mapping, TEP VLAN and IP allocation); clone the second.
4. **Workload Domain Connectivity**: Gateway Name, HA mode (Active/Standby or Active/Active), routing type BGP or Static, local ASN, per-Edge uplinks (VLAN, IP, BGP peer, MTU, password). With Active/Standby only two Edges may have gateway uplinks.
5. **VPC External Connectivity**: External IP Blocks (for public subnets / External IPs — advertised) and Private – Transit Gateway IP Blocks (not advertised).
6. Review → Deploy. NSX deploys the Edges, creates the edge cluster and the Tier-0, and binds the default project's transit gateway to it.

### Deploying a distributed gateway

1. Same entry point → Gateway type **Distributed Connectivity** → prerequisites.
2. Enter **VLAN ID** (dedicated, present on all hosts with VPCs), **Gateway CIDR** (the physical router's address on that VLAN), **VPC External IPv4 Blocks** (inside the VLAN subnet), **Private – TGW IPv4 Blocks**.
3. Validate → Done. No Edges are deployed.

### Consuming VPCs in vCenter

Once connectivity exists, vCenter admins create VPCs in the Default project, add public/private subnets (with DHCP if
desired), attach VMs, and use **Assign External IP** to publish a private VM.

## Deep Dive

### How networking is deployed across a VCF 9 instance

| Stage | Networking work | Tool |
|---|---|---|
| Bring-up (management domain) | VDS, VMkernel networks (management, vMotion, vSAN), NSX Manager deployment, host preparation with host TEPs (static pool or DHCP on the host overlay VLAN) | VCF Installer |
| New VI workload domain | New NSX Manager instance (Standard = 1 node, High-Availability = 3 nodes) or join an existing one; host TEP VLAN + IP pool/DHCP | VCF Operations → Inventory → Detailed View → VCF Instances → Add Workload Domain |
| External connectivity (day-N) | Centralized (edge cluster + Tier-0) or distributed (VLAN) connectivity; extra VLAN connections | vCenter → Networks > Network Connectivity |
| Consumption | VPCs and subnets (Default project) | vCenter |
| Tenancy | Organizations, regions, provider networking (Tier-0/VRF, IP spaces) | VCF Automation (later phase) |
| Advanced | BGP tuning, VRFs, EVPN, firewall policy | NSX Manager |

The workload-domain documentation states the key dependency: if you will enable vSphere Supervisor, "you must deploy
an NSX Edge cluster with an active-standby tier-0 gateway to complete Supervisor activation, unless you are using an
existing NSX Manager instance with a compatible NSX Edge cluster."

### VCF Edge is not an NSX Edge

The VCF 9 design guide's **VCF Edge models** page is about **edge sites**: "VCF Edge earlier called Remote Clusters
is an optimized configuration of VMware Cloud Foundation tailored for edge use cases" (retail, banking, utilities…),
with requirements such as a minimum of 10 sites, at least 8 CPU cores per host, at most 256 cores per site, and a
dedicated vCenter. It has nothing to do with NSX Edge nodes. Same word, different thing — a perfect exam distractor.

### Centralized TGW and the Tier-0

In centralized mode the transit gateway uses the Tier-0's SRs for north-south. Everything you learned about Tier-0
BGP, route advertisement and Edge HA still applies: the **VPC External IP blocks** are what the Tier-0 advertises
to the ToRs. If a public subnet is unreachable from outside, check the Tier-0's BGP advertisement of the external
block first.

### Distributed TGW behaviour

With distributed connectivity, the hosts themselves connect the transit gateway to the external VLAN — VMs in public
subnets appear directly reachable in that VLAN's address space. Private subnets do not get default internet access
(no SNAT); you use External IPs (1:1 NAT) to publish specific VMs.

:::vcf9 Changed in VCF 9
VPCs existed in NSX 4.1/4.2 but VCF 9.0 makes them the primary consumption model: transit gateways, external
connections, the Default project visible in vCenter, and guided Edge deployment from the vSphere Client. VPCs
attached **directly** to a Tier-0 in user-defined projects (the older style) "won't benefit from multiple
enhancements" and cannot be managed from vCenter or VCF Automation.
:::

:::legacy VCF 5.x / Legacy Context
VCF 5.x: edge clusters from SDDC Manager, Tier-0/Tier-1 and segments built in NSX Manager, and VCF Automation
(then Aria Automation) consuming NSX objects through cloud accounts. Nothing in vCenter let a VI admin self-serve
routed networks.
:::

## Configuration

| Design decision | Management surface | Evidence |
|---|---|---|
| Centralized or distributed connectivity? | VCF networking design | Scale, failure domain and traffic-path rationale |
| How does the instance reach external networks? | External connection | Uplinks, address plan and routing adjacency |
| Which shared connectivity is delegated? | Transit/network gateway | Connected scope and provider policy |
| What may each organization create? | VPC quotas, address space and permissions | Non-overlapping allocation and enforced limits |
| Which subnet type fits the workload? | VPC subnet configuration | Intended isolation/routing and realized connectivity |
| Is consumption healthy end to end? | VCF, vCenter and NSX views | Object realization, routes, policy and workload tests |

The separate practical guide owns exact VCF 9.0.2 creation workflows. Theory emphasizes ownership: providers build external and transit foundations; organization users consume delegated VPC constructs.

## CLI / API

VPCs are Policy objects under projects:

```http
GET https://nsx-vip.lab.local/policy/api/v1/orgs/default/projects
GET https://nsx-vip.lab.local/policy/api/v1/orgs/default/projects/default/vpcs
GET https://nsx-vip.lab.local/policy/api/v1/orgs/default/projects/default/transit-gateways
```

On the Edges of a centralized gateway, the same commands as for Tier-0 apply (`get logical-routers`, `vrf`, `get bgp
neighbor summary`, `get route`).

## Failure Scenarios

| Symptom | Cause |
|---|---|
| Supervisor enablement fails: "No valid edge cluster for VDS" | No edge cluster / no Active/Standby Tier-0 (centralized) |
| Public subnet unreachable from corporate network (centralized) | External IP block not advertised by the Tier-0 BGP, or ToR filtering |
| VMs in public subnet unreachable (distributed) | External VLAN missing on some hosts' trunks; external block not inside the VLAN subnet; wrong gateway CIDR |
| Private-subnet VM cannot reach internet (distributed) | Expected — no SNAT; use External IP or centralized mode |
| Need SNAT/DNAT or N/S firewall but chose distributed | Not supported; requires centralized |
| Workflow won't continue | Prerequisites: TNP not attached, DNS records for Edges missing, compute manager not registered |

## Troubleshooting

1. Which connectivity type is configured? vCenter → Networks > Network Connectivity.
2. Centralized: Edge cluster health, Tier-0 BGP (`get bgp neighbor summary`), advertised routes include the external block.
3. Distributed: VLAN present on every host uplink, physical router owns the gateway CIDR, external block within the subnet.
4. VPC: subnet type correct for the intended reachability (public vs private vs private-TGW)?
5. Security: VPC gateway firewall or DFW rules blocking?

## Real-World Scenario

A team wants self-service networks in vCenter for dev VMs and plans to enable Supervisor next quarter. They choose
**distributed connectivity** because it needs no Edges. Two months later Supervisor activation fails. Supervisor needs
**centralized active/standby** — they must deploy an edge cluster and Tier-0 (centralized connectivity). Had they
started with centralized A/S (Medium Edges), both use cases would be covered. Design lesson: choose connectivity
from the most demanding consumer.

## Exam Focus

:::exam
- Model: external connection → transit gateway (one per project) → VPCs → subnets (public / private / private-TGW).
- Centralized = Edges + Tier-0, stateful services, BGP; **required (A/S) for Supervisor and VCF Automation All Apps**.
- Distributed = no Edges, same VLAN on all hosts, stateless (1:1 External IP, distributed DHCP), no SNAT/DNAT, no N/S firewall.
- Deployed from **vCenter → Networks > Network Connectivity → Configure Network Connectivity**.
- Default project is what vCenter consumes; VPC security profile stateful firewall needs vDefend.
- "VCF Edge" (remote sites) ≠ NSX Edge.
:::

## Common Exam Traps

:::trap
- **"Distributed connectivity gives VPCs SNAT to the internet."** No — only External IPs (1:1 NAT).
- **"A project can have several transit gateways."** No — one per project.
- **"A transit gateway can mix one centralized and several distributed connections."** No — one centralized OR multiple distributed.
- **"Private subnets are advertised to the physical network."** No — public subnets (External IP blocks) are.
- **"VCF Edge models describe NSX Edge sizing."** No — they describe remote/edge sites.
:::

## Knowledge Check

::quiz

## Summary

- VCF 9 consumption: external connection → transit gateway → VPC → subnets, with connectivity/service/security profiles.
- Centralized connectivity uses Edges and a Tier-0 (full services, BGP); distributed uses a host VLAN (light, stateless).
- The exam's "VCF Network Gateway" = the gateway created by the vCenter Network Connectivity workflow.
- Networking is deployed in stages: Installer (mgmt NSX + host TEPs), workload domain (NSX instance), vCenter connectivity, then VPC consumption.

## Next Topic

Connectivity done — now protect it: [Distributed Firewall, Gateway Firewall and NAT](lesson:nsx-security-dfw-gateway-firewall).
