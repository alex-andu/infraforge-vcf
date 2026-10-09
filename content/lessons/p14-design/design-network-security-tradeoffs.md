---
id: design-network-security-tradeoffs
title: Network and Security Design Trade-offs
phase: p14-design
module: m14-design
version: vcf9
minutes: 40
difficulty: expert
summary: How to choose workload separation (cluster, workload domain, instance), network consumption models (VPC, NSX segments, VLAN), shared vs dedicated NSX, switch separation and identity scope in VCF 9, and how to argue each trade-off between isolation, simplicity, cost and performance.
topics: [design-tradeoffs, vcf-network-design, nsx-security, workload-domains]
objectives: ["2.4", "4.1"]
keyTerms: [fault-domain, vds, vlan, dfw, blast-radius, workload-domain]
labs: [lab-vcf-planning-workbook, lab-nsx-dfw-microsegmentation]
incidents: []
components: [workload-domain, management-domain, nsx-manager, nsx-edge-cluster, vds, vcf-identity-broker]
related: [design-availability-failure-domains, design-sizing-scalability, vcf-network-design]
sources:
  - title: "VCF 9.0 – Networking Models (consumption, workload networking, cross-domain)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/network-backing-models.html
  - title: "VCF 9.0 – Workload Domain Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/design-guide-vmware-cloud-foundation-architecture-models.html
  - title: "VCF 9.0 – Distributed Switch Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/cluster-network-deployment-models.html
  - title: "VCF 9.0 – VCF Single Sign-On Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
  - title: "VCF 9.0 – NSX Edge Cluster Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/nsx-edge-cluster-models.html
  - title: "VCF 9.0 Design Library – Physical Data Center Network Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/physical-datacenter-design-9-x.html
---

## Why This Matters

Security requirements arrive in many forms — "PCI workloads must be isolated", "the dev team must not see production",
"each business unit manages its own networks" — and VCF (VMware Cloud Foundation) offers many ways to satisfy them: a separate cluster, a
separate workload domain, a separate NSX instance, separate physical NICs and fabrics, separate identity, or
software segmentation with the NSX distributed firewall. Each option costs something different. The exam (and every
design review) asks you to choose the **least costly option that actually meets the requirement**, and to explain why.

## Learning Objectives

- Compare isolation levels in VCF 9: port group/segment, NSX microsegmentation, cluster, workload domain, VCF instance.
- Choose among network consumption models (VCF Automation All Apps, VPC, NSX segments, VLAN (Virtual Local Area Network)) and workload networking models.
- Decide between shared and dedicated NSX Managers and edge clusters.
- Use distributed switch models and physical fabric separation for traffic isolation, and justify the cost.
- Weigh identity scope (SSO (Single Sign-On)) and management-plane access as part of security design.

## Concept

### The isolation ladder

| Level | What is separated | Effort/cost | Typical requirement |
|---|---|---|---|
| Segment / VPC + DFW rules ([[dfw\|microsegmentation]]) | East-west traffic between workloads | Low (software) | Zero-trust between app tiers |
| Dedicated cluster in a workload domain | Compute (and vSAN datastore) | Medium | Licensing boundaries, hardware profiles, noisy neighbours |
| Dedicated workload domain | vCenter + SSO domain, lifecycle, optionally NSX | Higher | Separate admins, separate lifecycle, compliance scope |
| Dedicated NSX Manager per domain | Network management/control plane | Higher (more management VMs) | Network admin separation, blast radius |
| Separate physical NICs/fabric (switch models) | Physical traffic paths, even air-gapped | Highest hardware cost | Storage or workload fabric separation mandated |
| Separate VCF instance | Entire management domain | Highest | Different site/region, regulatory isolation |

Pick the lowest rung that meets the requirement; climbing costs hosts, NICs, ports, licences and operations.

### Network consumption models (how users get networks)

| Model | Strength | Limitation (per VCF 9 docs) |
|---|---|---|
| VCF Automation All Apps orgs | Prescriptive VPC-based self-service; Supervisor/VKS support | Admins should not interact with NSX directly except for troubleshooting |
| Virtual Private Cloud (VPC) | Simple, self-service, embedded IPAM, multi-tenancy | Not consumable via NSX Global Manager |
| NSX segment network virtualization | Full NSX feature set, Federation | Needs NSX expertise; no VCF Automation support; no embedded IPAM |
| VLAN | Familiar, simple | "Lacks network virtualization benefits"; tightly coupled to physical network |

## Architecture

::diagram[d14-workload-separation]

The diagram shows one VCF instance with a management domain and two workload domains: a general-purpose domain
sharing the management NSX instance, and a regulated domain with its own NSX Manager and edge cluster. Inside each
domain, VPCs and DFW rules separate applications.

## Components

| Decision | Option A | Option B | Trade-off |
|---|---|---|---|
| NSX for a workload domain | Share an NSX instance with other workload domains | Dedicated NSX Manager cluster | Sharing saves resources ("maximizes resource efficiency"); dedicated reduces blast radius and separates admins |
| Edge cluster | Shared across domains on the same NSX | Dedicated per tenant/domain | Shared is efficient; dedicated isolates north-south capacity and failure |
| Edge form factor | Virtual appliance (VCF-managed lifecycle, passwords) | Bare metal (100G interfaces, better small-packet performance) | Bare metal = manual lifecycle and passwords |
| Switch model | Single VDS (vSphere Distributed Switch) | Storage / workload / both separated | Separation = more NICs (4–6+), ports, complexity |
| Identity | Fleet-wide SSO | Per-instance SSO; dedicated identity provider per workload domain | Wider = simpler, larger blast radius |
| Workload networking | VPC Full Services (A/S Tier-0, NAT (Network Address Translation), VPN) | VPC Scalable (A/A stateless Tier-0) | Services vs north-south throughput |

## How It Works

Turning a security requirement into a design:

1. **Classify the requirement:** traffic isolation, administrative isolation, lifecycle isolation, data/storage
   isolation, or compliance scope reduction.
2. **Map to the lowest sufficient rung:** traffic → DFW/VPC; admin → workload domain (+ dedicated NSX if network
   admins must be separate); lifecycle → workload domain; storage path → storage separation switch model;
   regulatory full separation → separate instance.
3. **Check side effects:** management domain capacity (extra vCenter/NSX), NIC and port counts, edge capacity,
   operational skills.
4. **Check consumption model fit:** will tenants consume via VCF Automation (VPC-based), via vCenter/NSX, or VLANs?
5. **Record the decision** with justification and implication, as the VCF design library does for its own
   recommendations.

## Deep Dive

### Software segmentation vs physical separation

The NSX distributed firewall enforces policy in the hypervisor at every vNIC, so two VMs on the same host and the
same segment can still be prevented from talking. For most "isolate application A from B" requirements this is
sufficient and costs no hardware. Physical separation (dedicated NICs and fabric via storage/workload separation
switch models) is justified when the requirement is about the **path** (for example an air-gapped storage fabric) or
about guaranteed bandwidth, not merely about who can talk to whom.

### Shared NSX across workload domains

The Networking Models page lists a **shared NSX instance** cross-domain model with "full support of VPC consumption
models", fully distributed forwarding and a shared control plane, at the cost of a management plane whose recovery
affects all sharing domains and a requirement for end-to-end MTU of workload MTU + 200 bytes. **NSX Federation**
instead uses separate local managers with Global Managers, offering independent control-plane availability per
domain and support for any MTU via TCP MSS adjustment, but some features are not available from the Global Manager
and VPCs cannot be consumed via Global Manager.

### Workload networking models and throughput

| Model | Tier-0 | Services | Fit |
|---|---|---|---|
| VPC with Full Services | Active/Standby | NAT, gateway firewall, VPN | VCF Automation/VKS tenants; north-south limited to one edge per tenant |
| VPC Scalable | Active/Active stateless | Partial | High throughput; no default auto-SNAT/VPN; no VCF Automation/VKS |
| VPC Getting Started | Distributed transit gateway, no edges | No centralized services | Small/simple; 1:1 external IPs |
| NSX Segment Scalable | Active/Active stateless | Federation, L2 extension | NSX-skilled teams, cross-instance mobility |

### Management plane security

- Keep management networks (ESX management, VM management) separate from workload VLANs, and restrict who can route
  to them.
- Use the Ports and Protocols site (ports.broadcom.com) to build firewall rules between management components instead
  of "any-any".
- Consider identity scope: one fleet-wide Identity Broker is a single point of failure for authentication across the
  fleet; per-instance scope contains the blast radius.
- Enable LLDP/CDP on switch ports only if security policy allows it (VCF-NET-RCMD-SWT-003 notes this conflict).

### Requirement-to-construct cheat sheet

| Requirement wording | Smallest construct that satisfies it | Why not less | Why not more |
|---|---|---|---|
| "App tiers must only talk on approved ports" | DFW rules (VPC or segments) | VLAN ACLs do not scale or follow VMs | A new domain adds cost without adding traffic control |
| "Each team self-serves its networks" | VPCs (optionally via VCF Automation) | VLANs need a network ticket per change | Dedicated NSX is unnecessary for self-service |
| "Separate administrators and change windows" | Separate [[workload-domain]] | DFW does not separate vCenter admins | A separate instance duplicates the management domain |
| "Network control plane failure must not affect production" | Dedicated NSX Manager for the production domain | Shared NSX = shared management plane | Separate instance only if management domain sharing is also forbidden |
| "Storage traffic must never share links with VM traffic" | Storage separation switch model | DFW does not change physical paths | Full storage+workload separation only if workloads also need their own fabric |
| "Regulator requires a completely independent environment" | Separate VCF instance (still in the fleet, or separate fleet if required) | A domain shares the management domain | — |

### Performance as a design dimension

Isolation decisions also change performance characteristics. A shared Active/Standby Tier-0 concentrates
north-south traffic of all tenants on one edge node at a time; Active/Active stateless Tier-0 spreads it but loses
some stateful services. Separate storage NICs remove contention between [[vmotion]] bursts and vSAN, which can matter
more than any security argument for latency-sensitive databases. Always state whether a separation decision is driven
by security, performance or operations — reviewers will challenge decisions that claim one but only deliver another.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Example design decision records:

```yaml
- decision: DD-SEC-01
  requirement: "PCI cardholder workloads isolated from general workloads; separate admin team"
  choice: "Dedicated workload domain 'wld-pci' with dedicated NSX Manager cluster and edge cluster"
  rejected: ["DFW-only separation (admin isolation not met)", "Separate VCF instance (cost, no regulatory need)"]
  implications: ["+1 vCenter and +3 NSX Manager nodes in management domain", "Separate edge capacity"]
- decision: DD-NET-02
  requirement: "Storage traffic must not share physical links with workload traffic"
  choice: "Storage separation distributed switch model, 4 x 25 GbE per host"
  implications: ["Two VDS per cluster", "Double switch ports", "More complex configuration"]
```

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

There is no design CLI. You validate implemented separation with tools from other phases: NSX DFW rule hit counts
and traceflow (NSX phase), `esxcli network vswitch dvs vmware list` to confirm which NICs serve which VDS, and VCF
Operations network views for flows.

## Failure Scenarios

| Over/under-design | Result |
|---|---|
| VLAN-only design for a multi-tenant cloud | Every new tenant needs physical network changes; no self-service |
| DFW-only separation when admin isolation was required | Compliance audit failure: same vCenter/NSX admins see both |
| Dedicated NSX for every domain "just in case" | Management domain bloat, more upgrades, more certificates/passwords |
| Shared edge cluster for all tenants | One tenant's traffic peak or edge failure affects all |
| Storage+workload separation with only 4 NICs available | Model needs 6 NICs for redundancy — design not implementable |

## Troubleshooting

Design-level problems show up as operational pain: constant firewall exception requests (segmentation too coarse or
rules too broad), slow tenant onboarding (VLAN model), capacity alarms in the management domain (too many dedicated
components), or north-south bottlenecks (Active/Standby Tier-0 where Active/Active was needed). Trace each back to
the decision record and revisit the trade-off.

## Real-World Scenario

A bank wants development, test and production separated. Requirements: production has its own change window and
admin team; dev/test may share; all apps need tier-to-tier firewalling. Design: production workload domain with
dedicated NSX Manager (admin and lifecycle isolation); one shared dev/test workload domain using VPCs per team; DFW
microsegmentation everywhere; single VDS model on both (no physical separation requirement). The rejected
"separate VCF instance for production" would have doubled the management stack without meeting any additional
stated requirement.


## Exam Focus

:::exam
- Know which construct gives which isolation: DFW (traffic), cluster (compute), workload domain (vCenter/SSO,
  lifecycle), dedicated NSX (network management plane), switch models (physical paths), instance (everything).
- Know consumption models: VCF Automation All Apps, VPC, NSX segments, VLAN — and their limitations.
- Shared vs dedicated NSX and edges: efficiency vs blast radius.
- More separation = more NICs, more management VMs, more complexity.
:::

## Common Exam Traps

:::trap
- Choosing a separate VCF instance or workload domain when the requirement only asks to block traffic between apps
  (DFW is enough).
- Forgetting that a dedicated NSX Manager for a workload domain runs in the management domain and consumes its
  capacity.
- Assuming VLAN-backed networks give "the same" features as VPCs.
- Forgetting the NIC count implications of separation switch models.
:::

## Knowledge Check

::quiz

## Summary

- Climb the isolation ladder only as far as the requirement demands.
- Software segmentation (DFW, VPC) solves most traffic isolation needs; workload domains solve admin/lifecycle
  isolation; switch models solve physical path isolation.
- Shared NSX/edges/SSO are efficient but widen the blast radius.
- Record every trade-off with justification and implication.

## Next Topic

Continue to the certification phase: [exam strategy for 2V0-17.25](lesson:exam-strategy-2v0-17-25).
