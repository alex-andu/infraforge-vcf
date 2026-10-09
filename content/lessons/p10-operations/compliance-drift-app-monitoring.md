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
  - title: "VCF 9.0 - Activate VCF Benchmarks"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/security-and-compliance/viewing-and-configuring-compliance/how-to-configure-compliance-benchmarks/activate-vcf-cloud-account-benchmarks.html
  - title: "VCF 9.0 - Using the Policy Workspace (Compliance section)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-policies/using-the-monitoring-policy-workspace.html
  - title: "Broadcom KB 438361 - vCenter Servers not listed in VCF Operations Configuration Drift source list"
    url: https://knowledge.broadcom.com/external/article/438361/vcenter-servers-not-listed-in-vcf-operat.html
  - title: "VCF 9.0 - Managing Configuration Templates in VCF Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is-configuration-management/creating-a-configuration-template.html
  - title: "VCF 9.0 - Using the Configuration Drifts Overview Page"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/what-is-configuration-management/using-the-configuration-management-dashboard.html
  - title: "VCF 9.0 - Workload Monitoring and Observability"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-monitoring-and-observability.html
  - title: "VCF 9.0 - Steps to Monitor Applications"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-monitoring-and-observability/os-and-application-monitoring/steps-to-monitor-your-applications.html
  - title: "VCF 9.0 - Install an Agent from the UI"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-monitoring-and-observability/os-and-application-monitoring/steps-to-monitor-your-applications/install-and-uninstall-an-agent/install-an-agent-from-the-ui.html
  - title: "VCF 9.0 - Add Business Application"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-monitoring-and-observability/configuring-business-applications/add-business-application.html
  - title: "VCF 9.0 - Property Definitions (OS and application monitoring, service discovery)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/metric-property-and-alert-definitions/property-definitions-in-vrealize-operations-manager.html
---

## Why This Matters

Monitoring answers "is it working?". This lesson answers three different questions the exam asks about:

- **Is it configured securely?** - "monitor security hardening and compliance using VCF (VMware Cloud Foundation) Operations".
- **Is it still configured the way we decided?** - "configure configuration drift in VCF Operations".
- **Is the application inside the VM healthy?** - "monitor application using VCF Operations".

All three are built on the same engine you already know (properties, symptoms, alerts, policies, collectors), which
is why they appear in the Operations objective rather than the security objective.

## Learning Objectives

- Explain compliance benchmarks (VMware SDDC (Software-Defined Data Center)/VCF standards, regulatory, custom) and how a policy activates them.
- Read compliance scores and violations and plan remediation.
- Describe configuration drift: configuration sources, templates and target vCenter instances, and its collector prerequisite.
- Compare product-managed Telegraf, open-source Telegraf and the service discovery adapter for application monitoring.
- Model a business application for monitoring.

## Concept

| Capability | Question | Built from | Where (VCF 9.0) |
|---|---|---|---|
| [[compliance-benchmark|Compliance]] | Does each object meet a security/regulatory standard? | Compliance alert definitions + property checks, activated in policy | **Security > Compliance** |
| Security operations / audit events | What is our consolidated security posture? Which security-relevant events occurred? | Security pages, audit events from vSphere, vSAN, NSX | Security section ("Monitoring Security Operations", "Audit Events") |
| [[configuration-drift|Configuration drift]] | Do vCenter instances and eligible vSphere clusters still match desired configuration? | Configuration templates captured from a source vCenter; vSphere Configuration Profiles for clusters | **Fleet Management > Configuration Drifts** |
| Application monitoring | Are the OS and services (databases, web servers...) healthy? | [[telegraf-agent|Telegraf]] agents, service discovery adapter, business applications | Workload monitoring pages |

TechDocs: "VCF Operations helps you visualize the compliance of the objects in your inventory by displaying compliance
benchmarks which are measured against a set of standard rules, regulatory best practices, or custom alert definitions."

## Architecture

::diagram[d10-compliance-drift-flow]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/82bd438e-10e4-4dd5-b317-b661c7074cd5.original.svg" caption="Official application-monitoring setup flow (Broadcom TechDocs, VCF 9.0). The figure retains the inherited VMware Aria Operations label, while the surrounding VCF 9 documentation uses VCF Operations." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/workload-monitoring-and-observability/os-and-application-monitoring/steps-to-monitor-your-applications.html"}

Everything still flows through collectors. Compliance evaluates collected **properties and metrics** against
compliance-subtype alert definitions. Drift needs the **vCenter account registered to a cloud proxy or cloud proxy
group**, a configuration template and an active policy that activates that template. Application agents send data
**to the cloud proxy**.

## Components

### Compliance benchmark types

| Type | What it checks | Notes |
|---|---|---|
| VMware SDDC / VCF benchmarks | Security configuration / hardening standards for vSphere, vSAN, NSX objects | The "security hardening" exam item |
| Regulatory benchmarks | Industry regulations (named per benchmark in the UI) | Check the benchmarks available for your version |
| Custom benchmarks | Your own rules built from alert definitions | For internal standards |

All compliance standards are based on alert definitions; only definitions with subtype **Compliance** count toward the
score. When you enable a scorecard from **Security > Compliance**, VCF Operations activates its alert definitions in
the selected active policy. Results include a percentage **compliance score**, non-compliant objects and violated
rules. The evaluated data sources must already be configured.

### Configuration drift

| Element | Meaning |
|---|---|
| Configuration source | A vCenter whose configuration is captured as the desired state |
| Configuration schema | The specific source settings selected for the desired state; exclude settings you do not intend to standardize |
| Configuration template | Named desired state plus object type, schema, author, creation date and assigned-policy count |
| Policy assignment | The template is activated in one or more VCF Operations policies; vCenter objects using those policies become enabled targets |
| Cluster desired state | vSphere 9.0+ clusters with Configuration Profiles enabled also appear in cluster drift status |
| Overview | Enabled-object summary plus **Not Drifted**, **Drift Detected**, **Drift Check Failed** and **Unavailable** statuses |
| Prerequisite | vCenter account registered to a Cloud Proxy or Cloud Proxy group; version 9.0+ for this feature; required drift privileges |

### Application monitoring

| Option | How it works |
|---|---|
| Product-managed Telegraf | Agent deployed and managed from VCF Operations; monitors physical servers and VMs "managed or unmanaged by the vCenter cloud account" |
| Open-source Telegraf | You run Telegraf yourself (vCenter VM, EC2, Azure VM) and configure it, via a helper script or specific configuration, to post metrics to the cloud proxy |
| Service discovery adapter | Discovers services and applications running in VMs and their relationships |
| Business applications | First-class objects that group applications, services, hosts and optional tiers; can be manual, discovered or imported from VCF Operations for networks |

Product-managed Telegraf has two target types. A **Virtual Machine** belongs to a configured vCenter cloud account and
can be selected for UI installation. An **Endpoint** is a physical server or a machine outside that vCenter account;
install or uninstall its product-managed agent with the platform helper script, then manage its lifecycle from VCF
Operations. The UI install action does not install directly on Endpoint objects.

## How It Works

Compliance:

1. Go to **Security > Compliance**.
2. Select the data-source carousel entry, for example **VMware Cloud Foundation**. VCF benchmark assessment can cover
   ESX, SDDC Manager, vCenter, vSAN and NSX once those sources are configured.
3. On the required scorecard select **Enable**. For the audit-guide content, use **VCF Compliance based on the VCF
   Audit Guides**; regulatory scorecards can require an installed management pack.
4. Select the active policy whose assigned objects should be evaluated, then select **Enable** to confirm. If parent
   and child policies both appear, you can select the child and unselect the parent to control scope precisely.
5. VCF Operations activates the scorecard's compliance alert definitions in that policy and evaluates the collected
   properties and metrics. Review the percentage score, non-compliant objects and violations.
6. Remediate only after reading the failed rule and affected object. Re-run collection/evaluation and preserve the
   before/after score and alert evidence.

Configuration drift:

1. Confirm the vCenter is version 9.0 or later and its account is registered to a cloud proxy or cloud proxy group.
   The user needs Configuration Drifts **Manage** privilege to create templates/assign policy/run checks, or **View**
   privilege to inspect templates and results.
2. Open **Fleet Management > Configuration Drifts > Configuration Templates** and select **Create Config Template**.
3. Enter a name and description. In **Template Setup**, choose the source vCenter and select **Next**. In
   **Configuration Schema**, choose only the settings that belong in the desired state, then select **Next**.
4. In **Assign vCenters using Policy (Optional)** choose one or more VCF Operations policies, review the preview and
   select **Create**. If you skip assignment, later open **Infrastructure Operations > Configurations > Policy
   Definition**, edit the policy, open **Configuration Templates**, select the template and set it to **Activated**.
5. Under **Fleet Management > Configuration Drifts**, expand **VCF Instances**, select the instance and open **Drifts**.
   Select one or more vCenters and **Detect Drift**. This evaluates all templates activated by their effective policy.
6. Open a vCenter result and select a template. Compare **Current vCenter Value** with **Config Template Value**. Use
   **Download Drift Status Report** for dated evidence; the report defaults to seven days and global settings can extend
   it to 30 days.
7. Read status before acting: **Not Drifted** means no difference, **Drift Detected** means deviation, **Drift Check
   Failed** includes unavailable/in-progress/not-yet-computed cases, and **Unavailable** includes pre-9.0 or not
   registered with a cloud proxy.

Application monitoring:

1. Configure a cloud proxy with the OS and Application adapter, configure the vCenter cloud account for managed VMs,
   and satisfy OS, network and credential prerequisites.
2. Open **Workload Operations > Applications > Manage Telegraf Agents**. Select vCenter-managed VMs, then **Agent
   Actions > Install**. Choose a cloud proxy or an application-monitoring HA (High Availability) collector group if the adapter does not
   yet exist for that vCenter.
3. Choose common credentials or per-VM credentials, optionally restore a backed-up agent configuration, review the VM
   list and select **Install Agent**. Credentials are runtime inputs and do not belong in course evidence.
4. Refresh **Manage Telegraf Agents**. Success is **Agent Status = Agent Running** and **Last Operation Status = Install
   Success**. Expand the VM to inspect discovered services, then activate the required application service/plugin.
5. For a physical server or a machine outside the vCenter account, use the product-managed helper script; for an EC2,
   Azure or independently managed endpoint where you own the agent, configure open-source Telegraf to post to the cloud
   proxy.
6. Open **Workload Operations > Business Applications**. Select **Add Business Application > Define Manually**, set
   description, tag, business criticality and environment, add tiers, then drag inventory objects or custom groups into
   tiers and select **Save**.
7. Validate the Business Application health and the underlying OS/service metrics. Manual tier membership is static;
   update it when objects change, or use VCF Operations-discovered/imported application models when dynamic discovery
   is required.

## Deep Dive

### Compliance is policy-driven

Because compliance rules are alert definitions, the same policy rules apply: a benchmark is only evaluated for objects
whose effective policy activates it. If the auditor's cluster has its own custom policy with a higher priority, you must
activate the benchmark *in that policy* too. This is the most common reason for "compliance shows nothing for cluster X".

### Drift vs compliance

| | Compliance | Configuration drift |
|---|---|---|
| Reference | External standard (hardening guide, regulation, custom rules) | Your own known-good vCenter |
| Scope | VCF, vCenter, vSAN, NSX and cloud objects supported by the scorecard | vCenter 9.0+ configuration and vSphere 9.0+ clusters using Configuration Profiles |
| Output | Score + violated rules | List of differences vs template |
| Location | Security > Compliance | Fleet Management > Configuration Drifts |
| Activation | Enable scorecard alert definitions in an active policy | Activate a configuration template in a policy assigned to the target vCenter |

:::legacy VCF 5.x / Legacy Context
Aria Operations 8.18 already had a vCenter configuration drift capability; in VCF 9 it sits under Fleet Management in
VCF Operations, beside the other fleet-wide tasks.
:::

### Telegraf choices

Product-managed Telegraf trades flexibility for lifecycle: VCF Operations installs and manages it. Open-source Telegraf
works anywhere (including public cloud VMs) but you own installation, configuration and upgrades. In both cases data
arrives at the **cloud proxy**, so a missing or unreachable cloud proxy breaks application monitoring.

Application-monitoring HA uses a collector group in primary-secondary mode. Select the HA-enabled group when installing
or reinstalling the agent; an existing agent does not become HA merely because its cloud proxy is later added to a
group. Broadcom documents three collection cycles of downtime for failover/failback and for cloud-proxy membership
changes, so short gaps during those transitions do not automatically indicate an agent failure.

### Configuration drift is template plus policy plus execution

A template by itself is stored desired state. A policy activation connects that desired state to objects. **Detect
Drift** or a scheduled drift-detection job performs the comparison. Treat these as three checkpoints:

| Checkpoint | What to prove |
|---|---|
| Template | Correct source vCenter and only intended schema settings |
| Policy | Template is **Activated** in the effective policy of the target vCenter |
| Execution | Manual Detect Drift completed or the Automation Central schedule ran; result is current |

This model explains three superficially similar failures: no template means there is no desired state; no policy
activation means the target is not enabled; no successful run means the status can be old or **Drift Check Failed**.


### Worked exam-style scenarios

| Scenario | Correct reasoning |
|---|---|
| "The security team must prove ESX hosts follow the VMware hardening guidance and track improvement monthly." | Configure the VMware SDDC/VCF security benchmark for the hosts' policy, read the compliance score under Security > Compliance, schedule a report. Not drift (there is no gold vCenter involved). |
| "Five vCenter instances must keep selected settings aligned with the reference vCenter; differences must be reported." | Configuration drift: capture the intended schema from the reference vCenter, activate the template in policies applied to the target vCenters, then detect drift. |
| "Drift templates cannot be created because the vCenter list is empty." | Move the vCenter adapters from the Default Collector Group to a cloud proxy (KB 438361). |
| "The DBA wants service-level metrics for SQL Server running in VMs, managed centrally." | Product-managed Telegraf through the cloud proxy, plus a business application for the SQL tiers. |
| "An EC2 instance must report OS metrics into VCF Operations." | Open-source Telegraf configured to post to the cloud proxy (product-managed targets VMs/physical servers known to the vCenter cloud account or unmanaged ones; open source covers EC2/Azure endpoints). |
| "Compliance shows results for cluster A but nothing for cluster B." | Cluster B's objects use a different effective policy in which the benchmark is not configured. |
| "A template exists, but a vCenter is absent from enabled objects." | Activate the template in the vCenter's effective policy and verify the account is registered to a cloud proxy. |
| "A physical server needs a centrally managed agent." | Install product-managed Telegraf with the helper script; the UI install action is for vCenter-managed VM objects. |

### Audit events and security operations

The Security area also has **Monitoring Security Operations** (a consolidated view of security posture across the
fleet for risk planning) and **Audit Events** (log events from vSphere, vSAN and NSX resources, filterable by time
range). Use audit events to answer "who changed it?" after compliance or drift shows "what changed". The combination -
compliance says *a rule is violated*, drift says *the configuration differs from the template*, audit events say *who
did it and when* - is a strong troubleshooting pattern and a good mental model for scenario questions.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Example compliance setup for a PCI-scoped cluster:

| Step | Setting |
|---|---|
| Custom group | "PCI hosts" - membership criteria: hosts in cluster `wld01-pci` |
| Policy | "PCI policy" inheriting from default, assigned to "PCI hosts", priority above default |
| Benchmark | VCF/SDDC security configuration benchmark + the regulatory benchmark the auditor requires, configured for "PCI policy" |
| Compliance threshold | Set in the policy's Compliance section |
| Report | Scheduled compliance report (view + PDF) to the auditor |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

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
| Template exists but vCenter is not configuration-enabled | Template is not activated in the vCenter object's effective policy |
| Drift Check Failed | Resource unavailable, comparison still running, or drift has not yet been computed for it |
| Compliance score empty for some objects | Benchmark not activated in their effective policy |
| Telegraf metrics stop | Cloud proxy unreachable or down; agent credentials changed |
| Endpoint absent from the UI install list | UI install lists vCenter-managed VMs; physical/unmanaged endpoints require the helper script |
| Many violations after an upgrade | New rules in the benchmark, or settings reset; review before mass remediation |

## Troubleshooting

1. Drift: confirm version 9.0+, cloud-proxy registration and drift privileges; then verify template schema, activation in
   the effective policy, and the most recent Detect Drift/scheduled-job result.
2. Compliance: confirm the data source is configured, then check the object's effective policy and whether the
   scorecard is enabled there.
3. App monitoring: check cloud-proxy reachability from the VM, **Agent Status**, **Last Operation Status**, discovered
   services and plugin activation. Hover the red failure icon for the detailed install error.
4. Business Application: verify manual tier membership after inventory changes; manual memberships are static.

## Real-World Scenario

After a merger, a company has five vCenter instances built by different teams. The platform team picks the cleanest
vCenter as the **configuration source**, captures a template and assigns the other four. Drift shows differing
password policies and alarm settings. In parallel, the security team configures the VCF/SDDC security benchmark for
all clusters; the hosts' compliance score is 72% because SSH is enabled on many hosts. They remediate, confirm the
score rises at the next collection, and add a monthly compliance report. The application team installs product-managed
Telegraf on the SQL VMs and builds a business application so the database service, not just the VM, is monitored.


## Exam Focus

- Compliance: **Security > Compliance**; benchmark types **VMware SDDC/VCF**, **regulatory**, **custom** (from alert
  definitions); activated via the **policy**; output **compliance score**.
- Drift: **Fleet Management > Configuration Drifts**; **source vCenter -> schema -> template -> policy activation ->
  Detect Drift**; covers vCenter/vSphere cluster desired state in 9.0+ and needs a **cloud proxy**.
- App monitoring: **product-managed Telegraf** vs **open-source Telegraf** (posts to cloud proxy), **service
  discovery**, **business applications**; UI agent installation is for vCenter-managed VMs, while Endpoint objects use
  the helper script.

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

:::trap
A configuration template does not select targets by itself. Activate it in the VCF Operations policy applied to the
target vCenter, then run or schedule drift detection.
:::

## Knowledge Check

::quiz

## Summary

Compliance benchmarks (VMware SDDC/VCF hardening, regulatory, custom) are alert-definition based, activated in
policies and shown as compliance scores under Security > Compliance. Configuration drift compares vCenter instances with
a template captured from a source vCenter under Fleet Management > Configuration Drifts; the template is activated in
the target's effective policy and the account must use a cloud proxy. Application monitoring uses product-managed or
open-source Telegraf plus service discovery through the cloud proxy, while Business Applications provide the monitored
service model.

## Next Topic

Phase 11 starts with [VCF Automation architecture](lesson:vcf-automation-architecture).
