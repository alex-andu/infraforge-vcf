---
id: vcf-operations-architecture
title: VCF Operations Architecture, Cluster Nodes and Deployment Options
phase: p10-operations
module: m10-ops-core
version: vcf9
minutes: 40
difficulty: intermediate
summary: What VCF Operations is in VCF 9, the node types of its analytics cluster, collectors, the fleet management appliance, the Simple / High Availability / Continuous Availability models, and how to size and verify it.
topics: [vcf-ops-architecture, fleet-management]
objectives: ["4.3"]
keyTerms: [ops-primary-node, ops-replica-node, ops-data-node, vcf-operations-collector, collector-group, adapter-instance, vcf-operations-logs, vcf-ops-for-networks]
labs: [lab-vcf-ops-dashboards-alerts]
incidents: [inc-vcf-ops-collection]
components: [vcf-operations, vcf-operations-fleet-management, vcf-operations-logs, vcf-operations-networks, sddc-manager]
related: [metrics-properties-views-reports, dashboards-alerts-policies, vcf-operations-logs-network-ops]
sources:
  - title: "VCF 9.0 Architectural Options - VCF Operations Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html
  - title: "VCF 9.0 Architectural Options (overview)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts.html
  - title: "Broadcom KB 397782 - VCF Operations 9.0 Sizing Guidelines"
    url: https://knowledge.broadcom.com/external/article/397782/
  - title: "VCF 9.0 Infrastructure Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations.html
  - title: "Broadcom KB 438361 - vCenter Servers not listed in VCF Operations Configuration Drift source list"
    url: https://knowledge.broadcom.com/external/article/438361/vcenter-servers-not-listed-in-vcf-operat.html
---

## Why This Matters

In VCF (VMware Cloud Foundation) 9, VCF Operations is no longer an optional add-on that you bolt on after the platform is running. It is the
**central console of the fleet**: monitoring, dashboards, alerting, log analysis, reporting, licensing, and the fleet
management capabilities (lifecycle, certificates, passwords, fleet extension) all surface there. If VCF Operations is
unhealthy, you are blind to your environment *and* you lose a large part of your day-2 management tooling.

The exam asks you to "describe the cluster components and deployment options of VCF Operations" in scenarios such as:
"the customer needs monitoring to survive a single node failure", "the customer runs two availability zones", or "the
lab must use the smallest footprint". To answer, you need to know the node roles, which appliances always come along,
and the trade-offs of each model.

## Learning Objectives

- Describe the role of the primary, replica and data nodes of the VCF Operations analytics cluster.
- Explain what a VCF Operations collector (cloud proxy) does and why adapters should run on collectors.
- Compare the Simple, High Availability and Continuous Availability VCF Operations models.
- Identify the additional appliances deployed with VCF Operations (fleet management appliance, collector).
- Use the sizing guidance (node sizes, objects and metrics per node) to pick a deployment size.
- Verify the health of the cluster and its data collection.

## Concept

VCF Operations is a **monitoring and analytics platform plus the management console of the VCF fleet**. Conceptually
it has three layers:

| Layer | What it does | Where it runs |
|---|---|---|
| Collection | [[adapter-instance|Adapter instances]] connect to vCenter, NSX, vSAN and other sources and pull data | [[vcf-operations-collector|VCF Operations collectors]] (cloud proxy appliances) |
| Analytics and storage | Stores metrics and properties, calculates thresholds, symptoms, alerts, capacity, compliance | The analytics cluster: [[ops-primary-node|primary]], [[ops-replica-node|replica]] and [[ops-data-node|data]] nodes |
| Presentation and control | UI, dashboards, reports, API (Application Programming Interface), fleet management pages | Served by the analytics cluster; fleet tasks executed by the fleet management appliance |

Two optional Day-2 components extend it: [[vcf-operations-logs]] (central log management) and
[[vcf-ops-for-networks]] (network visibility and flow analytics). Both are deployed later from VCF Operations and
integrate into its console. They are covered in [VCF Operations for logs and Network Operations](lesson:vcf-operations-logs-network-ops).

:::vcf9 Changed in VCF 9
The product formerly called VMware Aria Operations is **VCF Operations**; Aria Operations for Logs is **VCF Operations
for logs**; Aria Operations for Networks is **VCF Operations for networks** (the exam guide calls the capability "VCF
Network Operations"). VCF Operations is deployed by the **VCF Installer** together with vCenter, NSX and SDDC (Software-Defined Data Center) Manager
when you build the first VCF instance, and it now carries the fleet management functions (lifecycle, certificates,
passwords) that Aria Suite Lifecycle used to provide.
:::

:::legacy VCF 5.x / Legacy Context
In VCF 5.x, Aria Operations was deployed after bring-up through Aria Suite Lifecycle and was optional. The data
collectors were called *remote collectors* and later *cloud proxies*. The 9.0 design documentation names the
appliance the "VCF Operations collector", while parts of the UI and many KB articles still say "Cloud Proxy". Treat
the two names as the same thing on the exam.
:::

## Architecture

::diagram[d10-ops-cluster-architecture]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/2dfa92b8-e462-4e4d-92a1-67ddbb5934f4.original.svg" caption="VCF Operations Models (Broadcom TechDocs, VCF 9.0 Architectural Options)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html"}

Where things run:

- All VCF Operations appliances run as VMs in the **management domain** of the first VCF instance (the domain built
  by the VCF Installer).
- Collectors can be placed close to the data sources, for example one collector per VCF instance or per site, and
  grouped into [[collector-group|collector groups]] so an adapter can move to a surviving collector.
- The fleet management appliance is separate from the analytics cluster. It is not a "node" of the cluster.

## Components

| Component | Role | Notes |
|---|---|---|
| Primary node | First analytics node; coordinates the cluster and serves the UI/API | The only analytics node in the Simple model |
| Replica node | Standby copy of the primary; takes over if the primary fails | Exists only when HA (High Availability) is enabled (High Availability model) |
| Data node | Additional analytics and storage capacity | Used to scale out; in HA the data is also redundant |
| VCF Operations collector (cloud proxy) | Runs adapter instances, polls sources, forwards data | Deployed in every model; HA model: expand to a collector group manually |
| Collector group | Set of collectors that share adapter instances | Provides collector-level failover |
| VCF Operations fleet management appliance | Lifecycle, certificates, passwords for management components | Deployed in every model |
| SDDC Manager | Per-instance management; integrated with VCF Operations | Listed as an "additional appliance" in each model table |
| External load balancer | Single VIP/FQDN (Fully Qualified Domain Name) in front of the cluster | Optional (HA and CA (Certificate Authority) models); needs extra IP/FQDN and SAN entries |

### Deployment models (from the 9.0 Architectural Options page)

| Model | Analytics nodes | Benefits | Implications |
|---|---|---|---|
| **Simple** | 1 node | Smallest footprint; can later be scaled out to HA | Slower recovery; relies on vSphere HA restart; monitoring/alerting and fleet management can be interrupted |
| **High Availability** | 3-node cluster: primary, replica, data | Data redundancy; rapid recovery from one node failure | Collector must be expanded to a collector group manually; with an external LB you need an extra IP/FQDN and every node FQDN plus LB FQDN in the certificate SAN |
| **Continuous Availability** | Node pairs across two availability zones: primary + primary replica, data + data | No service interruption from a single availability zone failure | Manual operations after installation; needs a separate VCF instance in the other AZ; max **10 ms** latency between zones |

## How It Works

1. **Deployment.** The VCF Installer deploys VCF Operations (Simple or HA), the fleet management appliance and a
   collector into the management domain while it builds the first VCF instance.
2. **Integration.** VCF Operations registers the VCF instance(s): vCenter, NSX, vSAN and SDDC Manager integrations are
   created as adapter instances, each assigned to a collector or collector group (Administration > Integrations).
3. **Collection.** Every collection cycle the adapter on the collector authenticates to its source with stored
   credentials over TLS, discovers objects and collects [[metric|metrics]] and [[property|properties]].
4. **Forwarding.** The collector forwards data to the analytics cluster, where it is distributed across nodes.
5. **Analytics.** The cluster evaluates thresholds, symptoms and alert definitions (driven by policies), computes
   capacity and compliance, and updates badges.
6. **Presentation.** Users see dashboards, views, reports and alerts; fleet management tasks are executed by the
   fleet management appliance.

## Deep Dive

### Sizing

Broadcom KB 397782 gives the 9.0 sizing guidelines. Node sizes:

| Size | vCPU | Default memory | Max objects (single node) | Max metrics (single node) |
|---|---|---|---|---|
| Extra Small | 2 | 8 GB | 700 | 140,000 |
| Small | 4 | 16 GB | 10,000 | 1,600,000 |
| Medium | 8 | 32 GB | 30,000 | 5,000,000 |
| Large | 16 | 48 GB | 44,000 | 8,000,000 |
| Extra Large | 24 | 128 GB | 100,000 | 20,000,000 |

Multi-node limits per KB 397782: Small up to 2 nodes, Medium up to 8, Large up to 16, Extra Large up to 12 nodes.
The key rule: **"If you have >1 node, then all nodes must be scaled equally. No mixing of nodes with different
sizes."** Collector sizing is separate; use the sizing KB for your exact version.

:::exam
Remember the shape, not every number: Simple = 1 node; HA = primary + replica + data; CA = node pairs across two
AZs (10 ms max latency). Fleet management appliance and collector come with every model. All nodes same size.
:::

### Scale-up vs scale-out

- **Scale-up**: increase the node size (more vCPU/RAM). All models support it.
- **Scale-out**: add data nodes. The Simple model can be scaled out into a highly available cluster later.

### Why adapters belong on collectors

Analytics nodes have a default collector group, but running adapters there consumes analytics resources and some
features depend on collectors. Broadcom KB 438361 shows a concrete example: Configuration Drift cannot discover vCenter
instances when the vCenter adapters remain on the *Default Collector Group* (analytics nodes); the fix is to assign
them to a Cloud Proxy or Cloud Proxy group under **Administration > Integrations**.

### Availability reasoning

| Failure | Simple | High Availability | Continuous Availability |
|---|---|---|---|
| One analytics node lost | Outage until vSphere HA restarts it | Replica takes over quickly | Pair partner continues |
| Whole AZ lost | Outage | Outage if all nodes were in that AZ | Survives |
| Collector lost | That collector's adapters stop | Survives if a collector group exists | Survives (collectors in both zones) |

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Key configuration tasks after deployment:

1. **Check integrations**: Administration > Integrations, confirm each vCenter, NSX and SDDC Manager integration shows
   collecting and is assigned to the intended collector or collector group.
2. **Create a collector group** for HA: deploy a second collector, create the group, move adapters into it.
3. **Certificates**: if using an external load balancer, issue a certificate whose SAN contains every node FQDN and
   the LB FQDN.
4. **Sizing check**: compare the object and metric counts in the cluster's self-monitoring with KB 397782 limits.
5. **Time and DNS (Domain Name System)**: every node and collector needs working forward/reverse DNS and NTP (Network Time Protocol); analytics and certificate
   validation depend on it.

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Most VCF Operations administration is in the UI. The REST API (the "suite API") is useful for checking adapters and
collection status from scripts.

```shell
# 1. Acquire a token (Broadcom KB 447072 shows this call)
curl -sk -X POST https://ops01.lab.local/suite-api/api/auth/token/acquire \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"username":"admin","password":"VMware123!VMware123!","authSource":"local"}'
# Response contains "token": "<value>"

# 2. Use the token (KB 447072 shows the vRealizeOpsToken prefix)
curl -sk https://ops01.lab.local/suite-api/api/deployment/licenses \
  -H 'Accept: application/json' -H 'Authorization: vRealizeOpsToken <value>'
```

Line by line: `authSource` names the identity source (`local` for the built-in admin); the returned `token` goes in
the `Authorization` header of every later call. API work is covered in depth in
[VCF APIs and PowerCLI](lesson:vcf-apis-powercli).

## Failure Scenarios

| Failure | Impact | Detection |
|---|---|---|
| Primary node down (Simple) | No UI, no alerts, no fleet management pages until vSphere HA restarts the VM | VM down in vCenter; UI unreachable |
| Replica down (HA) | Cluster keeps running, but no protection against a second failure | Cluster status in Administration shows node offline |
| Collector down | All adapters on it stop collecting; objects go stale while others look fine | Integration status "not collecting"; object metrics flat-lined |
| Adapter credential expired | Only that integration stops | Integration shows authentication error |
| Source certificate replaced | Adapter refuses the new untrusted certificate | Integration shows certificate error; validate connection asks to accept |
| Time skew between nodes | Analytics and certificate checks misbehave | Node clocks differ; NTP alarms |

## Troubleshooting

1. **Scope first**: is the problem everything (cluster/UI), one collector's objects, or one integration?
2. **Cluster**: check node status in the administration pages; confirm all nodes online and the same size.
3. **Collectors**: confirm each collector is online and which adapters it runs.
4. **Integrations**: Administration > Integrations, edit the adapter, **Validate Connection** to test credentials
   and certificate trust in one step.
5. **Dependencies**: DNS forward/reverse, NTP, firewall paths from collector to source (HTTPS 443).
6. Practise the whole method in the incident below.

::incident[inc-vcf-ops-collection]

## Real-World Scenario

A regional bank runs one VCF instance in one data center and plans a second instance in a nearby site. The CIO wants
"monitoring that survives losing a server". The architect chooses the **High Availability** model (primary, replica,
data node), places an external load balancer in front so dashboards keep the same URL, and builds a **collector group**
with two collectors per instance. Continuous Availability was rejected: it needs two availability zones with at most
10 ms latency and manual post-install operations, which the bank does not need for a single-site deployment. The
certificate request includes every node FQDN plus the LB FQDN in the SAN.

In the learner's home lab, by contrast, resources are scarce: the **Simple** model with a small node is the right
choice, accepting that vSphere HA restart is the only protection.


## Exam Focus

- Node types: **primary, replica, data**; plus **collector** (cloud proxy) and the **fleet management appliance**.
- Models: **Simple** (1 node), **High Availability** (3 nodes), **Continuous Availability** (pairs across 2 AZs, 10 ms).
- External LB is **optional** and needs an extra IP/FQDN and SAN entries.
- **All nodes must be the same size.** Scale-up = bigger nodes; scale-out = more data nodes.
- Use case of the extensions: logs = centralized log management; networks = network visibility and flow analytics.

## Common Exam Traps

:::trap
"Add a replica node to increase capacity" - wrong: the replica gives availability, **data nodes** give capacity.
:::

:::trap
"The collector is a node of the analytics cluster" - wrong: collectors are separate appliances that run adapters and
forward data; they do not store the analytics data.
:::

:::trap
"Continuous Availability protects against a host failure inside one AZ" - it does, but it is designed for an
**availability zone** failure and requires a second AZ with at most 10 ms latency. For single-site node protection
the High Availability model is the right answer.
:::

## Knowledge Check

::quiz

## Summary

VCF Operations is the fleet's console. Its analytics cluster is made of a primary node, an optional replica (HA) and
optional data nodes (capacity), all the same size. Collectors (cloud proxies) run the adapters that poll vCenter,
NSX and vSAN; the fleet management appliance runs lifecycle, certificate and password tasks. Choose Simple for small
footprints, High Availability for node-failure protection and Continuous Availability for two-AZ designs.

## Next Topic

Next you will look at what the cluster actually stores: [metrics, properties, views and reports](lesson:metrics-properties-views-reports).
