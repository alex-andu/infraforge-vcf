---
id: vcf-operations-logs-network-ops
title: Logs, Network Operations, VCF Health and Storage Operations
phase: p10-operations
module: m10-ops-extended
version: vcf9
minutes: 45
difficulty: intermediate
summary: Use cases and architecture of VCF Operations for logs and VCF Operations for networks, how to monitor log events and networks from the VCF Operations console, and how VCF Health, Diagnostics and Storage Operations watch the platform and vSAN.
topics: [vcf-ops-logs, network-ops, health-diagnostics]
objectives: ["4.3"]
keyTerms: [vcf-operations-logs, vcf-ops-for-networks, vcf-health, diagnostics-findings, storage-operations, vcf-operations-collector]
labs: [lab-vcf-ops-logs-network]
incidents: [inc-vcf-ops-collection]
components: [vcf-operations, vcf-operations-logs, vcf-operations-networks, vsan, nsx-manager]
related: [vcf-operations-architecture, dashboards-alerts-policies, compliance-drift-app-monitoring]
sources:
  - title: "VCF 9.0 Architectural Options - VCF Operations Models (logs and networks models)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html
  - title: "VCF 9.0 - Configuring and Analyzing Logs"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/log-analysis.html
  - title: "VCF 9.0 - Centralized Log Collection Architecture"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/log-analysis/centralized-log-collection-architecture.html
  - title: "VCF 9.0 - Network Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/network-operationss.html
  - title: "VCF 9.0 - About VCF Operations for networks"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/network-operationss/getting-started.html
  - title: "VCF 9.0 - Using VCF Operations Diagnostics"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics.html
  - title: "VCF 9.0 - Monitor Your Environment and Prevent Issues with VCF Health"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics/monitor-your-environment-and-prevent-issues-with-vcf-health.html
  - title: "VCF 9.0 - Monitoring Storage Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/monitoring-storage-operations(1).html
  - title: "VCF 9.0 - Configuring Alerts and Using Actions (log-based alerts)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-alerts-and-actions.html
---

## Why This Matters

Metrics tell you *that* something is wrong. Logs tell you *why*, and network visibility tells you *where in the path*.
VCF 9 brings all three into one console. The exam has five items in this lesson: identify the use case for VCF Network
Operations and VCF Operations (Logs), monitor log events, monitor networks, monitor VCF components with VCF Health and
Diagnostics, and monitor vSAN with Storage Operations. The scenarios are usually "which tool would you use to..." so
the key skill is knowing what each tool sees.

## Learning Objectives

- Identify the use cases of [[vcf-operations-logs]] and [[vcf-ops-for-networks]] (VCF Network Operations).
- Describe their deployment models (Simple vs High Availability) and that both are Day-2 deployments from VCF Operations.
- Monitor log events: search, extracted fields, log-based alerts.
- Monitor networks from the Network Operations page (NSX health, flows, traffic, VPCs).
- Use [[vcf-health]], [[diagnostics-findings]] and Log Assist to monitor VCF components.
- Monitor vSAN with [[storage-operations|Storage Operations]] (health score, performance diagnostics).

## Concept

| Need | Tool | Example question it answers |
|---|---|---|
| Central log collection, search, log alerts | **VCF Operations for logs** | "Which host logged the APD event at 02:13?" |
| Network visibility, flow analytics, micro-segmentation planning, path troubleshooting | **VCF Operations for networks** (VCF Network Operations) | "Which VMs talk to the database on port 3306, and through which firewall rules?" |
| Platform health across the VCF stack | **VCF Health** | "Are certificates, NTP/DNS, vCenter and vMotion healthy across the fleet?" |
| Known issues and support | **Diagnostics Findings**, **Log Assist** | "Does my environment match a known issue? Bundle logs for a support case." |
| vSAN and other storage | **Storage Operations** | "Which vSAN cluster has a falling health score or rising latency?" |

TechDocs describes VCF Operations for logs as providing "a centralized log management framework to collect, analyze,
and visualize logs from across your VMware Cloud Foundation platform", and VCF Operations for networks as providing
"network visibility and analytics to minimize risk during application migration, optimize network performance, manage
and scale your network".

## Architecture

::diagram[d10-logs-network-dataflow]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/7b16f92e-5c69-42bb-9e3e-655115c265a3.original.svg" caption="VCF Operations for Logs Models (Broadcom TechDocs, VCF 9.0 Architectural Options)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4f520596-3ae5-4cba-9310-d7727e95a574.original.svg" caption="VCF Operations for Networks Models (Broadcom TechDocs, VCF 9.0 Architectural Options)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations.html"}

## Components

### VCF Operations for logs models

| Model | Nodes | Notes |
|---|---|---|
| Simple | 1 node | Smallest footprint; relies on vSphere HA; **a VIP IP/FQDN is still required at deployment**; options: cluster VIP, FIPS compliance mode |
| High Availability | Primary node + worker node 1 + worker node 2 | Integrated load balancer with cluster VIP; data redundancy; options include retention notification threshold and additional disk |

Both are **Day-2** deployments performed from VCF Operations (fleet management).

Log collection architecture (TechDocs "Centralized Log Collection Architecture"):

- **VCF Operations** provides centralized management of log collection for all VCF components.
- **VCF Operations for logs** stores the log collection configuration and the logs.
- An **agent pre-installed in VCF components** gives centralized configuration and lifecycle.
- A **unified cloud proxy** handles collection across data centers / network boundaries: VCF Operations requests
  credentials from VCF Operations for logs, passes them encrypted with the FQDN to the cloud proxy, and the log
  forwarder then connects to VCF Operations for logs.

### VCF Operations for networks models

| Model | Nodes | Notes |
|---|---|---|
| Simple | 1 platform node + 1 collector node | Supports 10,000 VMs/objects; platform node must be **Extra Large**; **100% CPU and RAM reservation** required; relies on vSphere HA |
| High Availability (named so in TechDocs) | 3-node platform cluster + 1 collector | **The cluster does not provide high availability - it is for performance and scale only**; higher reservations |

The **platform** node does analytics, search and UI; the **collector** node gathers data from data sources (vCenter,
NSX and others) and flow information.

### VCF Health, Diagnostics and Storage Operations

| Feature | What it covers |
|---|---|
| VCF Health | Two starting points: **Component View** (summary of all objects) and **VCF View** (drill down from management domain to ESX host). Health areas: Certificates, NTP and DNS, vCenter, VM Operations, vSphere vMotion, VM Snapshots |
| Diagnostics Findings | Collects properties and logs from VCF components to detect known issues and show fixes |
| Log Assist | Generates log bundles and attaches property-based findings to support cases |
| Storage Operations | Infrastructure Operations > Storage Operations: centralized page for vSAN and non-vSAN; vSAN Cluster Health Score; IOPS/latency/throughput; storage alerts; datastore usage; vSAN performance diagnostics |

## How It Works

Monitoring log events:

1. Deploy VCF Operations for logs (Day 2) and let VCF Operations configure log forwarding for the VCF components.
2. Open the log analysis pages in VCF Operations (TechDocs "Configuring and Analyzing Logs": getting started, the
   Analyze page, field management).
3. Search with keywords and time range; refine with **extracted fields** (dynamic field extraction from messages).
4. Save the query; turn it into a **log-based alert** (log symptoms are new in 9.0) so a pattern raises an alert
   like any metric symptom.
5. From a metric alert, pivot to the object's logs for the same time window.

Monitoring networks:

1. Deploy VCF Operations for networks (Day 2), add data sources (vCenter, NSX).
2. Open **Infrastructure Operations > Network Operations**: inventory of NSX instances, transport nodes and edge
   clusters, network alerts overview, NSX Manager / transport node / edge health, **Business Applications with Flows**,
   **Traffic Summary** (last 24 hours) and VPC information.
3. Launch into VCF Operations for networks for deep work: flow analytics, network maps and intents,
   micro-segmentation planning and **recommended firewall rules**.

Monitoring vSAN:

1. **Infrastructure Operations > Storage Operations** - filter by storage type.
2. Check the **vSAN Cluster Health Score** and hover a cluster pin for IOPS, latency and throughput.
3. In the vSAN Cluster Performance widget, **Run New Diagnostics** in mode **Troubleshooting** (production clusters
   with workload) or **Benchmarking and Optimizing** (new clusters before go-live); reports cover seven days and include
   remediation steps.

## Deep Dive

### Why logs are a separate product

Logs are high-volume text, not numeric time series. VCF Operations for logs indexes them, extracts fields and keeps
retention independent of the metric database. The integration in 9.0 means you do not leave the VCF Operations console
to search them, and you can alert on log patterns.

:::vcf9 Changed in VCF 9
- Log analysis is integrated into the VCF Operations console; logs from Aria Operations for Logs 8.x can be migrated
  (TechDocs mentions up to 90 days of log data).
- Log-based symptoms/alerts are new in VCF Operations 9.0.
- Log collection from VCF components uses a pre-installed agent with central configuration.
- In 9.1 the product line renames some of these components (for example KBs refer to "Log Management 9.1"); this
  course targets 9.0 naming.
:::

### Why the networks "HA" model is not HA

A favourite exam trap: the three-node VCF Operations for networks platform cluster gives **performance and scale**,
not availability. If the requirement is "more VMs and flows", scale out; if the requirement is "survive node loss",
rely on vSphere HA and backups.

### VCF Health vs alerts

Alerts are object-level and policy-driven. VCF Health is a curated, stack-wide view of known-critical dependencies
(certificates, NTP/DNS, vCenter, vMotion, VM operations, snapshots). Start with VCF Health when the question is "is the
platform healthy?"; start with alerts when the question is "what is wrong with this object?".

## Configuration

| Task | Key settings |
|---|---|
| Deploy logs (HA) | Primary + 2 workers, cluster VIP IP and FQDN in DNS, size per expected ingestion |
| Deploy networks (Simple) | Extra Large platform + collector, reserve 100% CPU/RAM, data sources vCenter + NSX |
| Log alert | Query (e.g. `vmkernel` + "All Paths Down"), threshold, criticality, notification |
| Storage diagnostics | Mode Troubleshooting for prod, Benchmarking and Optimizing for new clusters |

## CLI / API

Most of this lesson is UI-driven. Useful command-line checks on an ESX host when logs seem missing (verified ESX
commands, covered by other phases):

```shell
esxcli system syslog config get     # shows the configured remote log hosts
esxcli system syslog reload         # reloads syslog after a change
```

VCF Operations for logs and for networks each have REST APIs (Broadcom developer portal) for automated queries.

## Failure Scenarios

| Failure | Impact |
|---|---|
| Logs Simple node down | No ingestion or search until vSphere HA restarts it |
| Logs VIP not in DNS | Deployment validation fails or sources cannot resolve the target |
| Networks platform under-reserved | Performance problems; reservation is a requirement |
| Networks collector down | Flows and inventory stop updating; platform shows stale data |
| Cloud proxy for log forwarding down | Remote site logs stop arriving |

## Troubleshooting

1. Logs missing from one component: check that component's forwarding configuration (from VCF Operations) and the
   path to the cluster VIP; check the agent or syslog configuration on the source.
2. Logs missing from everyone: check the logs cluster nodes and the VIP.
3. Network Operations empty: check that VCF Operations for networks is deployed and its data sources are healthy.
4. Storage Operations shows no vSAN data: check the vCenter/vSAN integration in Administration > Integrations.
5. Use VCF Health first for platform-wide symptoms (certificates, NTP/DNS).

::incident[inc-vcf-ops-collection]

## Real-World Scenario

An application team reports intermittent timeouts between web and database VMs. The operator opens the alert on the
database VM (metrics look fine), checks **Network Operations**: the Traffic Summary shows a spike in dropped flows; in
VCF Operations for networks the VM-to-VM path shows a recently added DFW rule. Logs for the NSX edge in the same
window, searched from the VCF Operations log pages, confirm rejected packets. Fix the rule, then create a log-based
alert for future DFW rejects on that application. Meanwhile **Storage Operations** confirms vSAN latency was normal, so
storage is excluded.

## Lab

::lab[lab-vcf-ops-logs-network]

## Exam Focus

- Use case: **logs** = centralized collection/search/analysis of logs; **networks** = network visibility, flow
  analytics, micro-segmentation planning, troubleshooting paths.
- Both are **Day-2** deployments from VCF Operations.
- Logs: Simple (1 node, VIP still required) vs HA (primary + 2 workers, integrated LB).
- Networks: Simple = platform + collector, platform **Extra Large**, **100% reservation**, 10,000 VMs; 3-node
  platform = **performance, not HA**.
- VCF Health: Component View / VCF View; certificates, NTP/DNS, vCenter, VM operations, vMotion, snapshots.
- Storage Operations: vSAN Cluster Health Score, performance diagnostics modes.

## Common Exam Traps

:::trap
"Deploy a three-node VCF Operations for networks cluster for high availability" is wrong; it is for scale.
:::

:::trap
Picking VCF Operations for logs to "see which VMs talk to each other on which ports" - that is flow analytics in VCF
Operations for networks.
:::

:::trap
Storage Operations is not vSAN-only: it covers vSAN and non-vSAN storage, with extra vSAN health and diagnostics.
:::

## Knowledge Check

::quiz

## Summary

VCF Operations for logs centralizes log collection and analysis, including log-based alerts; VCF Operations for
networks provides flow analytics, network maps and micro-segmentation planning; both are Day-2 deployments surfaced in
the VCF Operations console. VCF Health and Diagnostics watch the VCF stack's critical dependencies and known issues, and
Storage Operations tracks vSAN health scores and performance with built-in diagnostics.

## Next Topic

Next: [compliance, configuration drift and application monitoring](lesson:compliance-drift-app-monitoring).
