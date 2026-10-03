---
id: compliance-drift-app-monitoring
title: Security Compliance, Configuration Drift and Application Monitoring
phase: p10-operations
module: m10-ops-extended
version: vcf9
minutes: 40
difficulty: intermediate
summary: Measure security hardening and regulatory compliance with benchmarks, detect vCenter configuration drift against templates, and monitor operating systems and application services with Telegraf and service discovery.
topics: [compliance-drift]
objectives: ["4.3"]
keyTerms: [compliance-benchmark, configuration-drift, telegraf-agent, ops-policy, vcf-operations-collector, custom-group]
labs: [lab-vcf-ops-logs-network]
incidents: [inc-vcf-ops-collection]
components: [vcf-operations, vcenter]
related: [dashboards-alerts-policies, vcf-operations-logs-network-ops, vcf-operations-architecture]
sources:
  - title: "VCF 9.0 - Security and Compliance"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/security-and-compliance.html
  - title: "VCF 9.0 - Viewing and Configuring Compliance"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/security-and-compliance/viewing-and-configuring-compliance.html
  - title: "VCF 9.0 - Using the Policy Workspace (Compliance section)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-policies/using-the-monitoring-policy-workspace.html
  - title: "Broadcom KB 438361 - vCenter Servers not listed in VCF Operations Configuration Drift source list"
    url: https://knowledge.broadcom.com/external/article/438361/vcenter-servers-not-listed-in-vcf-operat.html
  - title: "VCF 9.0 - Workload Monitoring and Observability"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-monitoring-and-observability.html
  - title: "VCF 9.0 - Property Definitions (OS and application monitoring, service discovery)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/metric-property-and-alert-definitions/property-definitions-in-vrealize-operations-manager.html
---

## Why This Matters

Monitoring answers "is it working?". This lesson answers three different questions the exam asks about:

- **Is it configured securely?** - "monitor security hardening and compliance using VCF Operations".
- **Is it still configured the way we decided?** - "configure configuration drift in VCF Operations".
- **Is the application inside the VM healthy?** - "monitor application using VCF Operations".

All three are built on the same engine you already know (properties, symptoms, alerts, policies, collectors), which
is why they appear in the Operations objective rather than the security objective.

## Learning Objectives

- Explain compliance benchmarks (VMware SDDC/VCF standards, regulatory, custom) and how a policy activates them.
- Read compliance scores and violations and plan remediation.
- Describe configuration drift: configuration sources, templates and target vCenter instances, and its collector prerequisite.
- Compare product-managed Telegraf, open-source Telegraf and the service discovery adapter for application monitoring.
- Model a business application for monitoring.

## Concept

| Capability | Question | Built from | Where (VCF 9.0) |
|---|---|---|---|
| [[compliance-benchmark|Compliance]] | Does each object meet a security/regulatory standard? | Compliance alert definitions + property checks, activated in policy | **Security > Compliance** |
| Security operations / audit events | What is our consolidated security posture? Which security-relevant events occurred? | Security pages, audit events from vSphere, vSAN, NSX | Security section ("Monitoring Security Operations", "Audit Events") |
| [[configuration-drift|Configuration drift]] | Does each vCenter still match the desired configuration? | Configuration templates captured from a source vCenter | **Fleet Management > Configuration Drifts** |
| Application monitoring | Are the OS and services (databases, web servers...) healthy? | [[telegraf-agent|Telegraf]] agents, service discovery adapter, business applications | Workload monitoring pages |

TechDocs: "VCF Operations helps you visualize the compliance of the objects in your inventory by displaying compliance
benchmarks which are measured against a set of standard rules, regulatory best practices, or custom alert definitions."

## Architecture

::diagram[d10-compliance-drift-flow]

Everything still flows through collectors. Compliance evaluates collected **properties** (for example an ESX advanced
setting or service state) against rules. Drift needs the **vCenter adapters on a cloud proxy** (collector).
Application agents send data **to the cloud proxy**.

## Components

### Compliance benchmark types

| Type | What it checks | Notes |
|---|---|---|
| VMware SDDC / VCF benchmarks | Security configuration / hardening standards for vSphere, vSAN, NSX objects | The "security hardening" exam item |
| Regulatory benchmarks | Industry regulations (named per benchmark in the UI) | Check the benchmarks available for your version |
| Custom benchmarks | Your own rules built from alert definitions | For internal standards |

Configuring a benchmark activates its compliance alert definitions in the active policy; the policy's **Compliance**
section sets the compliance threshold. Results: a **compliance score** per object and a list of violated rules.

### Configuration drift

| Element | Meaning |
|---|---|
| Configuration source | A vCenter whose configuration is captured as the desired state |
| Configuration template | The captured desired state |
| Target | vCenter instances compared against the template; differences = drift |
| Home page tile | Configuration Drift tile summarising drift status |
| Prerequisite | vCenter adapters assigned to a Cloud Proxy (collector) or Cloud Proxy group, not the Default Collector Group (KB 438361) |

### Application monitoring

| Option | How it works |
|---|---|
| Product-managed Telegraf | Agent deployed and managed from VCF Operations; monitors physical servers and VMs "managed or unmanaged by the vCenter cloud account" |
| Open-source Telegraf | You run Telegraf yourself (vCenter VM, EC2, Azure VM) and configure it, via a helper script or specific configuration, to post metrics to the cloud proxy |
| Service discovery adapter | Discovers services and applications running in VMs and their relationships |
| Business applications | Group application, tiers/services and hosts into one object to monitor a business service |

## How It Works

Compliance:

1. Go to **Security > Compliance**.
2. Choose a benchmark card (for example the VCF / SDDC security configuration benchmark) and configure it for the
   policy that covers the objects in scope.
3. VCF Operations evaluates objects on each collection cycle; non-compliant settings raise compliance alerts.
4. Review the compliance score and violations; drill into the object and rule.
5. Remediate (change the setting manually, by host profile/configuration profile, or by script) and wait for the next
   collection to confirm.

Configuration drift:

1. Ensure each vCenter adapter runs on a cloud proxy (**Administration > Integrations** > edit adapter >
   Collector/Group > Validate Connection > Save).
2. **Fleet Management > Configuration Drifts**: create a template, selecting a vCenter as the **configuration source**.
3. Assign target vCenter instances to the template.
4. Review drift results (and the home page Configuration Drift tile); decide whether to fix the target or update the
   template.

Application monitoring:

1. Make sure a cloud proxy is reachable from the VMs.
2. Deploy product-managed Telegraf to selected VMs (or configure open-source Telegraf to post to the cloud proxy).
3. Activate monitoring of the discovered services (e.g. a database or web server).
4. Build a business application object grouping the tiers; add dashboards and alerts.

## Deep Dive

### Compliance is policy-driven

Because compliance rules are alert definitions, the same policy rules apply: a benchmark is only evaluated for objects
whose effective policy activates it. If the auditor's cluster has its own custom policy with a higher priority, you must
activate the benchmark *in that policy* too. This is the most common reason for "compliance shows nothing for cluster X".

### Drift vs compliance

| | Compliance | Configuration drift |
|---|---|---|
| Reference | External standard (hardening guide, regulation, custom rules) | Your own known-good vCenter |
| Scope | vSphere/vSAN/NSX objects (hosts, VMs, vCenter...) | vCenter configuration |
| Output | Score + violated rules | List of differences vs template |
| Location | Security > Compliance | Fleet Management > Configuration Drifts |

:::legacy VCF 5.x / Legacy Context
Aria Operations 8.18 already had a vCenter configuration drift capability; in VCF 9 it sits under Fleet Management in
VCF Operations, beside the other fleet-wide tasks.
:::

### Telegraf choices

Product-managed Telegraf trades flexibility for lifecycle: VCF Operations installs and manages it. Open-source Telegraf
works anywhere (including public cloud VMs) but you own installation, configuration and upgrades. In both cases data
arrives at the **cloud proxy**, so a missing or unreachable cloud proxy breaks application monitoring.


### Worked exam-style scenarios

| Scenario | Correct reasoning |
|---|---|
| "The security team must prove ESX hosts follow the VMware hardening guidance and track improvement monthly." | Configure the VMware SDDC/VCF security benchmark for the hosts' policy, read the compliance score under Security > Compliance, schedule a report. Not drift (there is no gold vCenter involved). |
| "Five vCenter instances must keep identical settings to the reference vCenter; differences must be reported." | Configuration drift: capture a template from the reference vCenter as configuration source, assign the other four as targets. |
| "Drift templates cannot be created because the vCenter list is empty." | Move the vCenter adapters from the Default Collector Group to a cloud proxy (KB 438361). |
| "The DBA wants service-level metrics for SQL Server running in VMs, managed centrally." | Product-managed Telegraf through the cloud proxy, plus a business application for the SQL tiers. |
| "An EC2 instance must report OS metrics into VCF Operations." | Open-source Telegraf configured to post to the cloud proxy (product-managed targets VMs/physical servers known to the vCenter cloud account or unmanaged ones; open source covers EC2/Azure endpoints). |
| "Compliance shows results for cluster A but nothing for cluster B." | Cluster B's objects use a different effective policy in which the benchmark is not configured. |

### Audit events and security operations

The Security area also has **Monitoring Security Operations** (a consolidated view of security posture across the
fleet for risk planning) and **Audit Events** (log events from vSphere, vSAN and NSX resources, filterable by time
range). Use audit events to answer "who changed it?" after compliance or drift shows "what changed". The combination -
compliance says *a rule is violated*, drift says *the configuration differs from the template*, audit events say *who
did it and when* - is a strong troubleshooting pattern and a good mental model for scenario questions.

## Configuration

Example compliance setup for a PCI-scoped cluster:

| Step | Setting |
|---|---|
| Custom group | "PCI hosts" - membership criteria: hosts in cluster `wld01-pci` |
| Policy | "PCI policy" inheriting from default, assigned to "PCI hosts", priority above default |
| Benchmark | VCF/SDDC security configuration benchmark + the regulatory benchmark the auditor requires, configured for "PCI policy" |
| Compliance threshold | Set in the policy's Compliance section |
| Report | Scheduled compliance report (view + PDF) to the auditor |

## CLI / API

Remediation of hardening findings is often scripted with PowerCLI, for example reading an ESX advanced setting:

```powershell
Connect-VIServer -Server vc-wld01.lab.local
Get-VMHost | Get-AdvancedSetting -Name 'UserVars.SuppressShellWarning' | Select-Object Entity, Name, Value
```

`Get-AdvancedSetting` returns the current value per host so you can compare with the benchmark before changing it.
See [VCF APIs and PowerCLI](lesson:vcf-apis-powercli).

## Failure Scenarios

| Symptom | Cause |
|---|---|
| vCenter missing from Configuration Source list; drift "Unavailable" / "Not Collecting" | vCenter adapter on the Default Collector Group instead of a cloud proxy (KB 438361) |
| Compliance score empty for some objects | Benchmark not activated in their effective policy |
| Telegraf metrics stop | Cloud proxy unreachable or down; agent credentials changed |
| Many violations after an upgrade | New rules in the benchmark, or settings reset; review before mass remediation |

## Troubleshooting

1. Drift: check adapter-to-collector assignment first (KB 438361), then that the cloud proxy is healthy.
2. Compliance: check the object's effective policy and whether the benchmark is configured for it.
3. App monitoring: check cloud proxy reachability from the VM, the agent status, then the service discovery adapter.

## Real-World Scenario

After a merger, a company has five vCenter instances built by different teams. The platform team picks the cleanest
vCenter as the **configuration source**, captures a template and assigns the other four. Drift shows differing
password policies and alarm settings. In parallel, the security team configures the VCF/SDDC security benchmark for
all clusters; the hosts' compliance score is 72% because SSH is enabled on many hosts. They remediate, confirm the
score rises at the next collection, and add a monthly compliance report. The application team installs product-managed
Telegraf on the SQL VMs and builds a business application so the database service, not just the VM, is monitored.

## Lab

::lab[lab-vcf-ops-logs-network]

The lab's later steps configure a compliance benchmark and a drift template.

## Exam Focus

- Compliance: **Security > Compliance**; benchmark types **VMware SDDC/VCF**, **regulatory**, **custom** (from alert
  definitions); activated via the **policy**; output **compliance score**.
- Drift: **Fleet Management > Configuration Drifts**; **source vCenter -> template -> targets**; needs vCenter adapters
  on a **cloud proxy**.
- App monitoring: **product-managed Telegraf** vs **open-source Telegraf** (posts to cloud proxy), **service
  discovery**, **business applications**.

## Common Exam Traps

:::trap
Drift and compliance are not the same. "Compare vCenters with our gold vCenter" = drift; "meet hardening guide" =
compliance.
:::

:::trap
Installing an agent does not bypass collectors: Telegraf data goes to the cloud proxy.
:::

:::trap
A custom benchmark is built from **alert definitions**, not from a script.
:::

## Knowledge Check

::quiz

## Summary

Compliance benchmarks (VMware SDDC/VCF hardening, regulatory, custom) are alert-definition based, activated in
policies and shown as compliance scores under Security > Compliance. Configuration drift compares vCenter instances with
a template captured from a source vCenter under Fleet Management > Configuration Drifts and requires adapters on a
cloud proxy. Application monitoring uses product-managed or open-source Telegraf plus service discovery, all through
the cloud proxy.

## Next Topic

Phase 11 starts with [VCF Automation architecture](lesson:vcf-automation-architecture).
