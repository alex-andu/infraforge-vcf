---
id: metrics-properties-views-reports
title: Metrics, Properties, Views and Reports
phase: p10-operations
module: m10-ops-core
version: vcf9
minutes: 35
difficulty: intermediate
summary: The VCF Operations data model (metrics vs properties, super metrics) and how to turn it into custom views and scheduled reports.
topics: [metrics-properties]
objectives: ["4.3"]
keyTerms: [metric, property, super-metric, ops-view, report-template, adapter-instance]
labs: [lab-vcf-ops-dashboards-alerts]
components: [vcf-operations]
related: [vcf-operations-architecture, dashboards-alerts-policies]
sources:
  - title: "VCF 9.0 - Viewing Metrics and Properties"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/metric-property-and-alert-definitions.html
  - title: "VCF 9.0 - Property Definitions in VCF Operations"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/metric-property-and-alert-definitions/property-definitions-in-vrealize-operations-manager.html
  - title: "VCF 9.0 - Configuring Reports and Views"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/reports-and-views.html
  - title: "VCF 9.0 - Configuring Views"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/reports-and-views/using-vcops-views.html
  - title: "VCF 9.0 - Creating and Configuring a View"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/reports-and-views/using-vcops-views/create-and-modify-a-view.html
  - title: "VCF 9.0 - Configuring Reports"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/reports-and-views/using-vcops-reports.html
  - title: "VCF 9.0 Infrastructure Operations (Configuring Super Metrics)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations.html
---

## Why This Matters

Every dashboard, alert, capacity forecast and compliance score in VCF (VMware Cloud Foundation) Operations is built from two kinds of data:
**metrics** and **properties**. If you cannot tell them apart, you will build the wrong view ("show me which hosts
run ESX build X" is a property question, not a metric), write symptoms that never fire, and misread exam scenarios
that hinge on exactly this difference. Views and reports are then how you present that data to people who do not
live in the console: managers, auditors, application owners.

The exam has two items here: "differentiate between metrics and properties" and "create custom Views and Reports".

## Learning Objectives

- Differentiate metrics, properties and super metrics with examples.
- Choose the right view type (List, Summary, Trend, Distribution, Text, Image) for a requirement.
- Create a custom view and know where it can be consumed (View widget, reports, object pages).
- Build a report template from views and dashboards, schedule it and choose PDF or CSV output.
- Explain how views and reports respect the data model and the object's policy.

## Concept

Each object VCF Operations discovers (a VM, a host, a cluster, a datastore, an NSX edge...) carries two kinds of
data, collected by [[adapter-instance|adapter instances]]:

| | [[metric|Metric]] | [[property|Property]] |
|---|---|---|
| What it is | A numeric measurement sampled every collection cycle | An attribute that describes the object |
| Changes | Constantly | Rarely (on configuration change) |
| Stored as | Time series (history, trend, forecast) | Current value plus change history |
| Examples | CPU usage %, memory usage %, datastore latency, IOPS, network packets dropped | Number of vCPUs, guest OS, ESX version/build, power state, vSAN cluster type, VM hardware version |
| Typical use | Performance, capacity, thresholds, trend views | Inventory, compliance, filtering, configuration views |
| In symptoms | Metric thresholds (static or dynamic) | Property conditions (equals, contains, changed) |

TechDocs states: "Metric definitions provide an overview of how the metric value is calculated or derived" and
"Properties are attributes of objects in the VCF Operations environment. You use properties in symptom definitions."

A **[[super-metric]]** is a metric *you* define with a formula over one or more objects' metrics, for example the
maximum CPU ready of all VMs in a cluster. Super metrics are calculated only for objects whose policy activates them.

:::general
A quick test: "Could I draw this as a line over time?" Yes means metric. "Is this a fact about how the object is
configured or what it is?" Yes means property. Disk space capacity of a VM is listed by TechDocs as a hardware
property; disk space *usage* over time is a metric.
:::

## Architecture

::diagram[d10-ops-data-model]

Views sit between the raw data and the consumers. A view is defined once and reused in three places: on an object's
details pages, in a dashboard through the **View widget**, and inside reports.

## Components

| Component | Definition | Menu path (VCF 9.0) |
|---|---|---|
| Metric / property definitions | Catalog of what each adapter collects | Infrastructure Operations documentation section "Viewing Metrics and Properties"; visible in the Metrics tab of an object |
| [[ops-view|View]] | Shapes metrics/properties of a subject object type | Infrastructure Operations > Views (Create / Manage) |
| [[report-template|Report template]] | Ordered set of views and dashboards with optional cover page, table of contents, footer | Infrastructure Operations > Dashboards & Reports > Reports |
| Generated report | The PDF or CSV output of a template run | Generated Reports list of the template |
| Super metric | Formula-based custom metric | Infrastructure Operations > Configurations (see "Configuring Super Metrics") |

### The six view types

| View type | Shows | Pick it when... |
|---|---|---|
| **List** | Tabular data about specific objects, one row per object | "List all VMs with vCPU count, OS and average CPU usage" |
| **Summary** | Tabular aggregated resource utilization (totals, averages) | "Total and average memory used per cluster" |
| **Trend** | Historical data with trend and forecast lines | "How will datastore usage grow over the next 30 days?" |
| **Distribution** | Aggregated distribution (pie/bar of buckets) | "How many VMs per guest OS?" or "VM count by size bucket" |
| **Text** | Dynamic text with formatting | Explanatory text block in a report |
| **Image** | Static image | Logo on a report cover |

## How It Works

Creating a custom view:

1. Go to **Infrastructure Operations > Views > Create**.
2. Select the view type (List, Summary, Trend, Distribution, Text or Image).
3. Name it and describe it.
4. Choose the **subject** (the object type, for example vSphere VM, Host System, Cluster).
5. Add the **data**: metrics and/or properties; for each choose a transformation (how values are aggregated, such as
   current, average, maximum), units and optional trend or forecast.
6. Set the **time settings** (range) and optional **filter** (for example only powered-on VMs).
7. Define **visibility**: where the view is available (dashboards, reports, details pages).
8. Click **Create**. Test it on an object or in a dashboard View widget.

Creating a report:

1. Go to **Infrastructure Operations > Dashboards & Reports > Reports** and create a new template.
2. Choose views and dashboards to include, set the order, and pick formats (**PDF**, **CSV**).
3. Optionally add a cover page, table of contents and footer.
4. **Run** it against an object (for example a cluster) or **schedule** it to recur.
5. Deliver through outbound settings (for example email) or download from the generated reports list.

## Deep Dive

### Transformations and time

A view does not just show raw samples. The **transformation** decides how the value over the selected time range is
summarised: the last value, an average, a maximum, a percentile. A "VMs with high CPU" list view using *current*
will look very different from one using *maximum over 7 days*. TechDocs also lists a **trend** option ("shows how the
values tend to change, based on the historical, raw data") and a **forecast** option ("shows what the future values
can be, based on the trend calculations").

### Metrics, properties and policies

What is collected is controlled per object by its **policy** (Metrics and Properties section of the policy
workspace). If a view shows empty columns for a metric, check that the metric is collected in the policy applied to
those objects. Policies are covered in [Dashboards, alerts and policies](lesson:dashboards-alerts-policies).

### Sharing and reuse

Views can be shared (TechDocs has a "Share a View" procedure), cloned, edited and deleted. Report templates can be
run on demand, scheduled, edited and downloaded; scheduled reports remove manual work from recurring compliance or
capacity reviews.

:::details Property categories listed in TechDocs
Property definitions are grouped by source: vCenter components, self-monitoring (VCF Operations' own objects), OS and
application monitoring, service discovery, vSAN, certificate monitoring, VCF Automation, NSX, placement groups, Green
Score, policies and others. The system also adds "Object Type Classification" properties that state whether an
object is an adapter instance, custom group, application, tier or general object.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Example: the operations manager wants a weekly PDF listing every VM in the workload domain with its vCPU count,
memory size, guest OS (properties) and 7-day average CPU and memory usage (metrics), plus a trend of cluster CPU demand.

| Item | Setting |
|---|---|
| View 1 | **List** view, subject vSphere VM, columns: vCPUs (property), memory (property), guest OS (property), CPU usage (metric, average), memory usage (metric, average), time range last 7 days |
| View 2 | **Trend** view, subject Cluster Compute Resource, metric CPU demand, trend + forecast on |
| Report template | View 1, View 2, cover page, PDF + CSV |
| Schedule | Weekly, run against the workload domain cluster, email via outbound settings |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Views and reports are UI-driven. The suite API can list report definitions and download generated reports for
automation; check the VCF Operations API reference for your version before scripting. Authentication is shown in
[VCF APIs and PowerCLI](lesson:vcf-apis-powercli#cli-api).

## Failure Scenarios

| Symptom | Likely cause |
|---|---|
| View column empty for some objects | Metric not collected for those objects (policy), or adapter not collecting |
| Property shows old value | Adapter stopped collecting; property changes are only seen when collected |
| Report not delivered | Outbound setting (email) misconfigured, or schedule not active |
| Trend view flat or empty | Not enough history yet (new object, recently added adapter) |
| Super metric shows no data | Super metric not activated in the object's policy |

## Troubleshooting

1. Open the object, check the **Metrics** tab: is the metric there and current?
2. If not, check the integration status for that object's source and its collector.
3. Check the effective policy of the object: is the metric/super metric collected and activated?
4. For reports: run the template manually first; if that works, the problem is scheduling or delivery.

## Real-World Scenario

An auditor asks for proof every month that no VM runs an unsupported guest OS and that every ESX host runs the
approved build. Both are **properties**. The administrator builds a List view (subject VM, property guest OS, filter
for unsupported values) and another (subject Host System, property ESX build), puts them in a report template with a
cover page, and schedules it monthly as PDF to the auditor's mailbox. Meanwhile, the capacity team receives a separate
CSV of **metrics** (7-day average CPU/memory per cluster) they feed into their own spreadsheets.


## Exam Focus

- Metrics = numeric time series; properties = attributes/configuration. Properties are used in symptom definitions.
- Six view types: **List, Summary, Trend, Distribution, Text, Image**.
- Views are used in **dashboards (View widget)**, **reports** and object details.
- Reports = scheduled snapshots of **views and dashboards**; output **PDF or CSV**.
- Super metrics need activation in a policy.

## Common Exam Traps

:::trap
"Number of vCPUs" and "ESX version" are **properties**, not metrics, even though they are numbers.
:::

:::trap
A report cannot include arbitrary raw data on its own; it includes **views and dashboards**. To add a new table to a
report, first create the view.
:::

:::trap
Summary vs Distribution: Summary aggregates values (total/average) in a table; Distribution shows how objects are
spread across buckets.
:::

## Knowledge Check

::quiz

## Summary

Metrics are numeric, constantly changing measurements kept as time series; properties are attributes describing
objects and are used heavily in symptoms, inventory and compliance. Super metrics derive new metrics from formulas.
Views (List, Summary, Trend, Distribution, Text, Image) shape the data for a subject object type, and reports bundle
views and dashboards into scheduled PDF or CSV snapshots.

## Next Topic

Continue with [dashboards, alerts and policies](lesson:dashboards-alerts-policies) to act on the data.
