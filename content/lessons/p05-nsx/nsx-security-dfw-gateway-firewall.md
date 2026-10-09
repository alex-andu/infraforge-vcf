---
id: nsx-security-dfw-gateway-firewall
title: Distributed Firewall, Gateway Firewall and NAT
phase: p05-nsx
module: m05-nsx-security
version: vcf9
minutes: 40
difficulty: intermediate
summary: How the VMware NSX Distributed Firewall (DFW) enforces east-west policy at workload interfaces, while gateway firewall and network address translation protect centralized north-south paths.
topics: [nsx-security, nsx-routing]
objectives: ["2.4"]
keyTerms: [dfw, gateway-firewall, nat, vdefend, sr, nsx-vpc]
labs: [lab-nsx-dfw-microsegmentation]
incidents: []
components: [nsx-manager, nsx-edge-cluster, esx-host]
related: [nsx-segments-overlay, nsx-tier0-tier1-routing, nsx-vpcs-and-vcf-networking]
sources:
  - title: "VCF 9.0 – vDefend Firewall with Advanced Threat Prevention (NSX admin guide)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/security.html
  - title: "vDefend Firewall 9.0 – Distributed Firewall"
    url: https://techdocs.broadcom.com/us/en/vmware-security-load-balancing/vdefend/vdefend-firewall/9-0/vdefend-distributed-firewall.html
  - title: "vDefend Firewall 9.0 – Gateway Firewall"
    url: https://techdocs.broadcom.com/us/en/vmware-security-load-balancing/vdefend/vdefend-firewall/9-0/vdefend-gateway-firewall.html
  - title: "VCF 9.0 – Network Address Translation (NAT)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/network-address-translation.html
  - title: "VCF 9.0 – Virtual Private Cloud in NSX (VPC security profile)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/virtual-private-cloud-in-nsx.html
  - title: "Broadcom KB 430651 – Unable to add or edit firewall rules (vDefend add-on license)"
    url: https://knowledge.broadcom.com/external/article/430651/unable-to-add-or-edit-firewall-rules-in.html
  - title: "NSX CLI Guide 9.0.2 – ESX host commands (get firewall …)"
    url: https://developer.broadcom.com/xapis/nsx-cli-guide/9.0.2/host_esx.html
---

## Why This Matters

Perimeter firewalls protect the door; they do nothing once an attacker is inside. NSX's distributed firewall puts a
stateful firewall **on every VM's vNIC**, so you can stop lateral movement between two VMs on the same segment —
something a physical firewall cannot even see. The gateway firewall protects the zone boundaries (north-south). The
exam ("configure virtual networking services") expects you to pick the right one for a scenario, understand rule
order and Applied-To, and know which NAT types work in which HA mode.

## Learning Objectives

- Explain where the [[dfw]] and the [[gateway-firewall]] enforce and which traffic each sees.
- Build DFW policy with categories, groups, rule order and Applied-To.
- Describe gateway firewall placement on Tier-0/Tier-1 SRs and its dependency on Edges.
- Choose the right [[nat]] type (SNAT, DNAT, reflexive, no-NAT, NAT64) for a gateway HA mode, and know VPC NAT options.
- Know the [[vdefend]] licensing implications in VCF 9 and how to verify rules on a host.

## Concept

| | Distributed firewall (DFW) | Gateway firewall (GFW) |
|---|---|---|
| Where it enforces | Kernel of every ESX host, **at each vNIC** ("a firewall is instantiated on each virtual NIC") | On **Edge nodes**, in the SR of a Tier-0, Tier-0 VRF or Tier-1 gateway |
| Traffic it sees | All traffic in/out of a VM — east-west and north-south from the VM's point of view | Traffic crossing that gateway's uplinks (north-south / between zones) |
| Layers | L2–L7 | L3–L7 |
| Typical use | Micro-segmentation, app tiers, lateral-movement control, zero trust | Perimeter of a tenant/zone, internet edge, NAT boundary |
| Needs Edges | No | Yes (needs an SR) |
| Scale | Scales with hosts | Scales with Edge size and count |

DFW rules are organised into **categories** processed in order: **Ethernet → Emergency → Infrastructure →
Environment → Application**. Within the policy table, rules are evaluated **top-down, first match wins**. The
default rule at the bottom is **allow** unless you change it (an allow-list "zero trust" design ends with a
deny/drop default once your allow rules are in place).

:::vcf9 Changed in VCF 9
- The firewall is branded **VMware vDefend Firewall** and documented in its own vDefend 9.0 guide.
- Firewall capabilities are an **add-on license** (vDefend). Broadcom KB 430651 describes users unable to add or edit firewall rules until the 25-character vDefend key is applied in NSX Manager (System > Licenses); the add-on requires a base VCF/vSphere subscription to be present first.
- VPCs have a **VPC security profile**: stateless gateway firewall is included; **stateful requires vDefend**.
- vDefend can be applied **per VPC** for tenant-isolated lateral security, and DFW can protect VDS port groups ("distributed firewall for vSphere Distributed Switch").
:::

## Architecture

::diagram[d05-dfw-vs-gateway-firewall]

Step through the diagram: a web VM talking to an app VM on another host is checked by the DFW at the web vNIC
(egress) and at the app vNIC (ingress), never by the Edge. A client from the internet reaching the web VM passes the
gateway firewall on the Tier-0 SR (and NAT, if configured) **and** the DFW at the web vNIC.

## Components

| Component | Role |
|---|---|
| Group | Dynamic or static set of members: VMs by tag/name/OS, segments, IP sets, segment ports. Membership is recomputed as VMs change |
| Policy (section) | Ordered container of rules within a category |
| Rule | Source, destination, services, context profile (L7 App ID / FQDN), action (Allow, Drop, Reject, Jump to application), Applied-To |
| **Applied-To** | Where a rule is programmed. "DFW" = every vNIC; a group = only those members' vNICs — reduces rule sprawl on hosts |
| Exclusion list | Members not subject to DFW |
| Gateway firewall policy | Rules attached to a gateway (Tier-0/Tier-1) and optionally its interfaces |
| NAT rule | Translation on a Tier-0/Tier-1 SR (or VPC / transit gateway) |


### Component responsibilities and limits

**Distributed Firewall (DFW).** DFW enforces policy at the workload vNIC on each prepared ESX host. It scales east-west control without a central hairpin and follows dynamic group membership. It cannot inspect traffic on unprepared hosts or replace gateway policy for traffic that must traverse an Edge.

**Gateway firewall.** Gateway firewall rules run on Tier-0 or Tier-1 service routers at Edges. They protect centralized north-south or service paths. They do not automatically see same-segment or distributed east-west traffic.

**Group.** A group defines sources and destinations from tags, names, addresses or other membership criteria. Dynamic groups reduce manual address lists, but inaccurate tags or broad criteria create equally dynamic policy mistakes.

**Applied To.** Applied To controls where a rule is realized and evaluated. Narrow scope can improve efficiency; an incorrect scope can leave intended traffic unenforced.

**Network address translation (NAT).** NAT changes source or destination addressing at the gateway path. It does not grant firewall permission, create routing reachability or replace DNS design.

## How It Works

### DFW rule lifecycle

1. You publish a policy in NSX Manager (or vCenter for VPC-scoped security).
2. The management plane resolves groups to IPs/vNICs; the CCP pushes rules to hosts — but only the rules whose **Applied-To** covers vNICs on that host.
3. On each host, the rules are programmed per vNIC filter.
4. A packet leaving VM-A hits VM-A's vNIC filter (egress). If allowed, a connection-tracking entry is created (stateful).
5. On arrival at VM-B's host, VM-B's vNIC filter evaluates it (ingress).
6. Return traffic matches the connection entry.

### Gateway firewall on north-south

1. Traffic from the physical network arrives at the Tier-0 SR uplink on an Edge.
2. The gateway firewall evaluates its policy (and NAT is applied on the uplink as configured).
3. If allowed, routing continues to the Tier-1 and segment, then the DFW at the destination vNIC applies.

### NAT types (Tier-0 / Tier-1)

| Type | Does | HA support (per docs) |
|---|---|---|
| **SNAT** | Rewrites source of outbound packets (many private → one public) | Active/Standby (or stateful active-active) |
| **DNAT** | Rewrites destination of inbound packets (publish a service) | Active/Standby (or stateful active-active) |
| **Reflexive** (stateless) | Rewrites destination inbound and source outbound, 1:1 | Tier-0 Active/Active or Active/Standby, and Tier-1 |
| **No SNAT / No DNAT** | Exclude a range from translation | With SNAT/DNAT |
| **NAT64** | IPv6 clients to IPv4 servers | See docs |

NAT runs **on the uplinks of the Tier-0/Tier-1 SR**, so NAT always implies Edges. In VPCs: **External IP** (1:1, works
in both centralized and distributed connectivity) and **default outbound NAT** / SNAT/DNAT (centralized only).

## Deep Dive

### Designing micro-segmentation

1. **Tag** workloads (e.g. `app:shop`, `tier:web`, `env:prod`).
2. Create groups from tags (`grp-shop-web` = tag tier:web AND app:shop).
3. **Environment** category: block prod ↔ dev.
4. **Application** category: per-app policy with Applied-To = the app's groups: allow LB → web 443, web → app 8443, app → db 5432, then *deny any within the app*.
5. Infrastructure category: allow DNS, NTP, AD, backup to everything (shared services).
6. Monitor with **Traceflow** and firewall statistics; then tighten the default rule.

### Why Applied-To matters

Without Applied-To, every rule is pushed to every vNIC in the environment — wasteful and harder to troubleshoot. With
Applied-To = the app group, hosts that don't run the app never receive those rules.

### Gateway firewall and HA mode

Stateful gateway firewall needs connection state on one SR, which is why stateful services are tied to
active/standby (or the stateful active-active mode). In the VCF 9 distributed connectivity model there is **no**
north-south firewall at all — another reason to choose centralized when perimeter policy is required.

### Infrastructure VMs and the DFW

Be careful applying a default drop to everything: management and infrastructure VMs (vCenter, NSX Managers, Edges,
DNS, AD) must be excluded or explicitly allowed. NSX keeps its own appliances out of DFW enforcement through the
exclusion list; check the list in your environment before tightening the default rule.

:::legacy VCF 5.x / Legacy Context
In NSX-T 3.x the firewall was simply "NSX Distributed Firewall" and licensing came with NSX editions (Advanced,
Enterprise Plus). In VCF 9, firewalling is the vDefend add-on and its documentation moved to the vDefend guide.
:::

## Configuration

| Security decision | Management surface | Evidence |
|---|---|---|
| East-west or north-south enforcement? | DFW versus gateway firewall policy | Packet path and enforcement point documented |
| Which identities form the policy boundary? | Groups, tags and inventory criteria | Deterministic membership and owner |
| Where is the rule realized? | Applied-To and realization status | Intended hosts/interfaces only and successful realization |
| How are precedence and defaults handled? | Categories, sequence and default rules | Effective order and explicit final behavior |
| Is NAT required? | Tier-0/Tier-1/VPC NAT policy | Original/translated tuple, routing and separate firewall allowance |
| Did the rule produce the intended result? | Logs, trace and flow evidence | Allowed and denied test cases without unrelated exposure |

The separate practical guide owns rule creation and validation. Policy design starts from application flows and keeps routing, NAT and firewall decisions separate.

## CLI / API

On an ESX host (nsxcli):

```shell
esx-01> get firewall status
esx-01> get firewall vifs
esx-01> get firewall <vif-uuid> ruleset rules
```

`get firewall vifs` lists the vNIC filters on the host; `ruleset rules` shows the rules actually programmed on one
vNIC — the definitive answer to "is this rule really on that VM?". Policy API:

```http
GET https://nsx-vip.lab.local/policy/api/v1/infra/domains/default/security-policies
GET https://nsx-vip.lab.local/policy/api/v1/infra/tier-1s/t1-lab/nat/USER/nat-rules
```

## Failure Scenarios

| Symptom | Cause |
|---|---|
| Rules can't be added/edited in VCF 9 | vDefend add-on license not applied (KB 430651) |
| App broke after a new rule | Rule order — a deny above the allow; or Applied-To too wide |
| Rule doesn't hit | Group membership wrong (tag missing), Applied-To excludes the VM, VM in exclusion list |
| DNAT doesn't work on an A/A Tier-0 | SNAT/DNAT need A/S (or stateful A/A); use reflexive NAT or change design |
| Gateway firewall rules have no effect on east-west | Expected — GFW sees only traffic through the gateway SR |
| NAT on a Tier-1 without edge cluster | Not possible — NAT needs an SR |

## Troubleshooting

1. **Traceflow** from source VM to destination: shows the DFW rule ID that allowed/dropped the packet at each vNIC.
2. On the host: `get firewall vifs` and `get firewall <vif> ruleset rules` to confirm programming.
3. Check group membership in NSX Manager (Inventory → Groups → members).
4. For north-south, check gateway firewall stats on the gateway and NAT rule hit counts.
5. Check licensing (System > Licenses) when the UI refuses edits.

## Real-World Scenario

After enabling a "drop any any" default rule in the lab, vCenter loses contact with some hosts and backups fail. The
default rule hit infrastructure VMs that weren't in an allow policy. Roll back to allow, build an **Infrastructure**
policy (DNS, NTP, AD, backup, vCenter↔ESX), verify with Traceflow and DFW statistics, then reapply drop scoped with
Applied-To to application groups only.

## Exam Focus

:::exam
- DFW: kernel, per vNIC, east-west (and VM-level north-south), L2–L7, no Edges. Categories Ethernet → Emergency → Infrastructure → Environment → Application; top-down first match.
- Gateway firewall: Edge SR of Tier-0/Tier-1, L3–L7, north-south/zone boundaries.
- Applied-To limits where rules are programmed.
- NAT: SNAT/DNAT on A/S (or stateful A/A); reflexive (stateless) for A/A Tier-0; NAT always needs an SR.
- VPC: External IP (1:1) in both modes; SNAT/default outbound NAT and N/S firewall only with centralized connectivity.
- vDefend add-on license gates firewall rule creation in VCF 9.
:::

## Common Exam Traps

:::trap
- **"Use the gateway firewall to isolate two VMs on the same segment."** It never sees that traffic — use the DFW.
- **"The DFW runs on the Edges."** No — on each host at the vNIC.
- **"Applied-To decides which traffic matches."** No — source/destination/service decide matching; Applied-To decides where the rule is enforced.
- **"SNAT works on an active/active Tier-0 like on active/standby."** Not in classic A/A — use reflexive NAT.
- **"Distributed VPC connectivity provides a north-south firewall."** No.
:::

## Knowledge Check

::quiz

## Summary

- DFW = per-vNIC stateful firewall in every host kernel; gateway firewall = SR on Edges for zone boundaries.
- Categories and top-down first-match order; groups and Applied-To keep policy targeted.
- NAT lives on SR uplinks; SNAT/DNAT need A/S (or stateful A/A); reflexive is stateless.
- In VCF 9 firewalling is vDefend-licensed; VPC security profiles bring per-VPC gateway firewalling.

## Next Topic

You have finished the NSX phase. Continue to VCF architecture, starting with
[VCF 9 Architecture Overview](lesson:vcf9-architecture-overview).
