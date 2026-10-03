---
id: nsx-architecture
title: NSX Architecture – Management, Control and Data Planes
phase: p05-nsx
module: m05-nsx-fabric
version: vcf9
minutes: 35
difficulty: foundation
summary: What NSX is inside VCF 9, how the NSX Manager cluster hosts the management and central control planes, how hosts and edges form the data plane, and what keeps working when managers fail.
topics: [nsx-architecture]
objectives: ["2.4", "4.1"]
keyTerms: [nsx, nsx-manager, ccp, lcp, transport-node, edge-node, tep, geneve]
labs: [lab-nsx-segments-tier1]
incidents: [inc-nsx-edge-north-south]
components: [nsx-manager, nsx-edge-cluster, vcenter, esx-host, vds]
related: [nsx-transport-nodes-teps, nsx-segments-overlay, nsx-vpcs-and-vcf-networking]
sources:
  - title: "VCF 9.0 Design – NSX Management and Control Plane Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-networking-management-and-control-plane.html
  - title: "VCF 9.0 – Advanced Network Management with NSX (Administration Guide)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide.html
  - title: "VCF 9.0 – NSX Manager (Policy mode only)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/advanced-network-management/administration-guide/nsx-manager.html
  - title: "NSX 4.1 Installation Guide – Key Concepts (definitions of planes, CCP, LCP)"
    url: https://docs.vmware.com/en/VMware-NSX/4.1/installation/GUID-A1BBC650-CCE3-4AC3-A774-92B195183492.html
  - title: "NSX 4.2 Installation Guide – NSX Manager"
    url: https://docs.vmware.com/en/VMware-NSX/4.2/installation/GUID-A65FE3DD-C4F1-47EC-B952-DEDF1A3DD0CF.html
  - title: "VCF 9.0 – Create a New Workload Domain Using VCF Operations (NSX instance choices)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/deploy-a-vi-workload-domain-using-the-sddc-manager-ui.html
  - title: "NSX CLI Guide 9.0.2"
    url: https://developer.broadcom.com/xapis/nsx-cli-guide/9.0.2/
---

## Why This Matters

Every VCF 9 workload domain has NSX. Even if you never create a single overlay network, NSX is installed on the
hosts, it owns the networking objects that vCenter shows you for VPCs, and it is a lifecycle item that VCF upgrades
and certificate/password workflows touch. On the exam, objective 2.4 starts with "differentiate between VCF
networking components" — and the very first thing to differentiate is **who decides** (management plane), **who
calculates and distributes** (control plane) and **who actually forwards packets** (data plane). If you mix these up
you will get failure-scenario questions wrong ("the NSX Manager cluster is down — do VMs lose connectivity?").

In real life this split is what lets you sleep at night: the managers are *not* in the data path. A crashed NSX
Manager VM is an outage of the UI/API and of change, not (immediately) an outage of your applications.

## Learning Objectives

- Explain what [[nsx]] provides in VCF 9 and how it relates to vCenter, ESX hosts and the VDS.
- Describe the management plane, central control plane ([[ccp]]), local control plane ([[lcp]]) and data plane, and where each runs.
- Describe the NSX Manager deployment models in VCF 9 (single node vs three-node cluster, VIP, external load balancer).
- Predict the impact of losing one, two or all three NSX Manager nodes.
- Know how NSX instances map to workload domains (new vs shared NSX Manager instance).

## Concept

**NSX** is VMware's network virtualization and security platform (formerly "NSX-T Data Center"). It builds
networks in software on top of any IP fabric: Layer-2 [[segment|segments]], distributed and centralized routers
(Tier-0/Tier-1 gateways, VPCs), NAT, DHCP, load balancing, and firewalling. Broadcom often markets this as *VCF
Networking*; the TechDocs still call the product NSX.

NSX is built from three logical planes, a classic SDN design:

| Plane | Job | Where it runs | Analogy |
|---|---|---|---|
| **Management plane (MP)** | Single API/UI entry point, stores the desired configuration, validates it, handles queries and operational tasks | NSX Manager nodes | The architect's drawings |
| **Control plane (CP)** | Computes runtime state from the configuration, learns topology from the data plane (which VM MAC/IP is behind which TEP), pushes forwarding tables | **CCP** on NSX Manager nodes, **LCP** on every transport node | The dispatcher who tells each driver the route |
| **Data plane (DP)** | Forwards, encapsulates, routes and filters packets using the tables the control plane pushed; reports topology and statistics | Transport nodes: ESX hosts and NSX Edge nodes | The trucks on the road |

The NSX documentation's own definitions: the management plane "provides single API entry point to the system,
persists user configuration, handles user queries, and performs operational tasks"; the control plane "computes
runtime state based on configuration from the management plane" and "pushes stateless configuration to forwarding
engines"; the data plane "performs stateless forwarding or transformation of packets based on tables populated by
the control plane".

:::vcf9 Changed in VCF 9
NSX Manager in VCF 9.0 works **only in Policy mode**. The old "Manager mode" UI and Manager API objects from NSX 4.x
and earlier are deprecated for configuration; automation should use the Policy API (`/policy/api/v1/...`). VCF 9
also introduces VPCs and a simplified network-connectivity workflow inside vCenter (Networks > Network
Connectivity), so day-to-day consumption increasingly happens in vCenter while NSX Manager remains the source of
truth.
:::

## Architecture

::diagram[d05-nsx-planes]

The diagram shows the three planes stacked. The **NSX Manager cluster** (three appliances behind a virtual IP)
hosts both the management plane and the central control plane. vCenter is registered with NSX Manager as a
**compute manager**, which is how NSX discovers clusters and hosts and installs its kernel modules on them. Each ESX
host and each Edge node becomes a **transport node** running the LCP agent and the data-plane modules. Overlay
traffic between transport nodes travels in [[geneve]] tunnels between their [[tep|TEPs]].

### Where NSX sits in a VCF instance

| Item | VCF 9 behaviour |
|---|---|
| Management domain | VCF Installer deploys an NSX Manager instance for the management domain during bring-up. |
| VI workload domain | When you create a workload domain (VCF Operations → Inventory → Detailed View → VCF Instances → Add Workload Domain) you **create a new NSX Manager instance** or **join an existing one** used by another workload domain. |
| Deployment size | "Standard" = single-node NSX Manager; "High-Availability" (recommended) = three-node cluster. |
| Edges | Not deployed automatically for VI workload domains; you add them later (for example from vCenter Networks > Network Connectivity) — see [Edge nodes and clusters](lesson:nsx-edge-nodes-clusters). |

## Components

| Component | What it is | Runs on | Managed by | Depends on |
|---|---|---|---|---|
| [[nsx-manager]] appliance | VM with the policy/management services, the CCP, the UI and the REST API, and the distributed datastore holding config | Management domain cluster (VM) | VCF (lifecycle, passwords, certificates) and NSX admins | DNS, NTP, vCenter as compute manager, storage of the management cluster |
| Cluster VIP | One virtual IP owned by one manager node at a time; UI/API traffic goes to that node | NSX Manager nodes | NSX | Managers on the same L2 subnet |
| CCP | Central control plane; computes and distributes runtime state (MAC/TEP tables, routes, firewall rules) | NSX Manager nodes | NSX | Management plane |
| LCP | Local control plane agent; receives state from the CCP and programs the local data plane | Every transport node | NSX | Connection to the CCP |
| Data plane | Kernel modules on ESX (switching, distributed routing, distributed firewall) and the DPDK fast path on Edges | ESX hosts, Edge nodes | NSX | Host networking (VDS), TEP network |
| Compute manager | vCenter registered in NSX | vCenter | VCF | vCenter availability for host discovery and NSX installation |

### NSX Manager deployment models (VCF 9 design)

| Model | Nodes | Pros | Cons |
|---|---|---|---|
| Simple | 1 node + VIP (for future scale-out), protected by vSphere HA with high restart priority | Smallest footprint | Slower recovery after failure; management plane disruption during upgrades; limited scale |
| High Availability | 3-node cluster, VIP, anti-affinity across ESX hosts, vSphere HA | Fast recovery from a single node failure; no control-plane impact during upgrades | VIP sends all API calls to one node |
| HA with external load balancer | 3 nodes behind an external load balancer | Spreads API load for high-churn automation | Needs a load balancer |

There are also NSX Global Manager models for NSX Federation (three-node cluster, optionally with a standby cluster
that requires manual failover). Federation is outside the scope of this exam objective but you should recognise the
name.

## How It Works

What happens when you create a segment and attach a VM:

1. You create the segment in the vSphere Client or NSX Manager UI/API. The **management plane** validates it and
   stores it in the managers' replicated database.
2. The **CCP** turns the intent into runtime state: which transport nodes need the segment, which VNI (virtual network
   identifier) it uses, which hosts already have VMs on it.
3. Each **LCP** on a relevant transport node receives the state and programs the kernel modules; the segment appears
   as an NSX distributed port group on the VDS.
4. You connect the VM's vNIC. The host's data plane learns the VM's MAC/IP and **reports it up** to the CCP.
5. The CCP distributes "MAC X / IP Y lives behind TEP Z" to the other hosts that carry this segment.
6. When the VM talks to a VM on another host, the source host's data plane encapsulates the frame in Geneve and sends
   it from its TEP to the destination TEP — no manager involved in that packet.

## Deep Dive

### The NSX Manager cluster as a distributed system

The three managers replicate configuration between themselves and need a **majority** to accept changes. Losing one
node leaves two of three — the cluster stays writable. Losing two leaves one node that cannot form a majority; the
UI/API becomes read-only or unavailable and you cannot make changes. Control-plane work is shared between the
nodes, so when a node fails, the transport nodes it served reconnect to the surviving nodes.

### Why the data plane survives a management outage

Forwarding tables and firewall rules are **already programmed** on hosts and Edges. If all managers are unavailable:

- Existing VM-to-VM and north-south traffic continues; BGP sessions on Edges stay up (they run on the Edge, not the manager).
- You cannot create, change or delete NSX objects.
- Anything that needs *new* control-plane state is at risk: a VM powered on or moved by vMotion to a host that has not
  learned its location, new segments, new firewall rules. Learned entries can also age out over time, which makes
  forwarding less efficient.

:::general
"Management is not in the data path" is a design principle you will see across VCF: vCenter down does not stop VMs,
SDDC Manager down does not stop vCenter, NSX Manager down does not stop packets. The exam loves to test this.
:::

### Transport nodes and the LCP

A **transport node** is any node prepared to participate in NSX networking: an ESX host (kernel modules installed by
NSX via the compute manager) or an Edge node. On each one, the LCP agent keeps a session with the CCP. If a host
loses that connection it keeps forwarding with its last known state but stops receiving updates — a common hidden
cause of "new VM on host-07 can't reach anything".

:::legacy VCF 5.x / Legacy Context
NSX-T 3.x/4.x offered both "Policy" and "Manager" modes in the UI. VCF 9.0 configuration is Policy-only. Older
blogs that tell you to switch the UI to Manager mode do not apply. In VCF 5.x, SDDC Manager deployed NSX for each
workload domain; in VCF 9 the workload-domain workflow is launched from VCF Operations.
:::

## Configuration

Things you configure (or verify) at the architecture level:

| Setting | Where | Note |
|---|---|---|
| NSX Manager instance and size | VCF Installer (management domain), VCF Operations workload domain wizard | Pick High-Availability for production |
| Compute manager | NSX Manager → System → Fabric → Compute Managers | vCenter registered; VCF does this for you |
| Global fabric MTU | NSX Manager → System → Global Fabric Settings | Default Tunnel Endpoint MTU 1700 |
| Licensing | NSX Manager → System → Licenses | Core VCF licensing syncs; vDefend add-on keys may need manual entry |
| Backup | NSX Manager → System → Backup & Restore | Schedule SFTP backups (VCF can configure this) |

## CLI / API

Log in to an NSX Manager node by SSH as `admin` — you land in **nsxcli**, the NSX command-line shell.

```shell
nsx-mgr-01> get cluster status
```

Shows each service group (for example DATASTORE, CLUSTER_BOOT_MANAGER, CONTROLLER, MANAGER, POLICY, HTTPS) and
whether its members are UP and the group STABLE. On a transport node:

```shell
[root@esx-01:~] nsxcli
esx-01> get controllers
```

lists the CCP nodes the host is connected to. API equivalent for cluster health:

```http
GET https://nsx-vip.lab.local/api/v1/cluster/status
```

## Failure Scenarios

| Failure | What breaks | What keeps working |
|---|---|---|
| 1 of 3 managers down | Nothing user-visible beyond possible VIP move; reduced resilience | All config and forwarding |
| 2 of 3 managers down | No configuration changes; UI/API degraded | Existing forwarding, DFW rules already pushed, BGP on Edges |
| All managers down | No UI/API; new VMs or vMotion may lack forwarding state | Existing traffic flows |
| Host loses CCP connection | That host gets no updates | Its existing flows |
| vCenter (compute manager) down | NSX cannot prepare new hosts or see inventory changes | Existing transport nodes keep forwarding |
| Single-node NSX Manager VM crashes | Management outage until vSphere HA restarts it | Data plane |

## Troubleshooting

1. **Is it management or data?** If the UI is slow/broken but packets flow, look at managers. If packets fail, look at transport nodes and TEPs.
2. **Check cluster health:** `get cluster status` on a manager or `GET /api/v1/cluster/status`. All groups should be STABLE.
3. **Check DNS/NTP/certificates:** manager nodes need forward and reverse DNS and synced time; certificate problems show as transport nodes disconnected from the manager.
4. **Check transport-node connectivity:** in NSX Manager, System → Fabric → Hosts shows each host's status and the manager/controller connectivity; on the host, `get controllers`.
5. **Check the VIP:** if the VIP doesn't answer but individual node IPs do, the VIP owner may be failing over.

## Real-World Scenario

A team patches the management-domain ESX hosts and accidentally places two NSX Manager VMs on the same host
because the anti-affinity rule was deleted. The host is rebooted. For several minutes the NSX UI is unavailable
and a scheduled automation job that creates segments fails. **No production traffic is affected.** The fix: restore
the anti-affinity (DRS) rule so the three managers sit on three different hosts, then confirm `get cluster status`
reports all groups STABLE. Lesson: the managers are a quorum system — two on one host means one host failure costs
you the majority.

## Lab

You will see the planes in action when you create your first segment and check its realization on the hosts.

::lab[lab-nsx-segments-tier1]

## Exam Focus

:::exam
- Know which plane runs where: MP + CCP on NSX Manager; LCP + data plane on transport nodes (ESX hosts and Edges).
- Know the NSX Manager models: single node (Standard), three-node HA cluster with VIP, three-node with external load balancer.
- "Manager cluster down" → no changes, but existing traffic keeps flowing.
- VCF 9.0 NSX = Policy mode; VPCs and vCenter Network Connectivity are new consumption paths.
- New workload domain → new NSX Manager instance or join an existing one.
:::

## Common Exam Traps

:::trap
- **"NSX Manager forwards traffic between segments."** No — routing between segments is done by the distributed router on the hosts (data plane).
- **"The VIP load-balances API calls across the three managers."** No — the built-in VIP is owned by one node; you need an external load balancer to spread API calls.
- **"vCenter is the NSX control plane."** No — vCenter is a compute manager (inventory and host preparation). The CCP lives in the NSX Manager nodes.
- **"Edges are part of the management plane."** No — Edges are transport nodes (data plane) that run centralized services.
:::

## Knowledge Check

::quiz

## Summary

- NSX = management plane + control plane + data plane. Managers decide and compute; transport nodes forward.
- The NSX Manager appliance hosts the MP and the CCP; a three-node cluster with a VIP is the HA design.
- The LCP on each ESX host and Edge programs the local data plane from CCP state.
- Manager outages stop change, not traffic — but new state (new VMs, vMotion, new rules) suffers.
- In VCF 9.0, NSX is Policy-mode only and is consumed increasingly through vCenter and VPCs.

## Next Topic

Next you will see how hosts and Edges become transport nodes, what a TEP is and why MTU matters:
[Transport Nodes and TEPs](lesson:nsx-transport-nodes-teps).
