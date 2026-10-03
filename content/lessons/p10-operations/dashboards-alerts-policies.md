---
id: dashboards-alerts-policies
title: Dashboards, Alerts and Policies in VCF Operations
phase: p10-operations
module: m10-ops-core
version: vcf9
minutes: 45
difficulty: intermediate
summary: Build and share dashboards, design alert definitions from symptoms and recommendations, route notifications, and control all of it per object group with policies.
topics: [dashboards-alerts]
objectives: ["4.3"]
keyTerms: [ops-dashboard, symptom-definition, alert-definition, recommendation, notification-rule, ops-policy, custom-group]
labs: [lab-vcf-ops-dashboards-alerts]
components: [vcf-operations]
related: [metrics-properties-views-reports, vcf-operations-architecture, compliance-drift-app-monitoring]
sources:
  - title: "VCF 9.0 - Configuring Dashboards and Widgets"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/dashboards-and-widgets.html
  - title: "VCF 9.0 - Configuring Dashboards"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/dashboards-and-widgets/using-dashboards.html
  - title: "VCF 9.0 - Create and Configure Dashboards"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/dashboards-and-widgets/using-dashboards/create-and-configure-dashboards.html
  - title: "VCF 9.0 - Manage Dashboards"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/dashboards-and-widgets/using-dashboards/manage-dashboards.html
  - title: "VCF 9.0 - Configuring Alerts and Using Actions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-alerts-and-actions.html
  - title: "VCF 9.0 - Understanding Alerts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-alerts-and-actions/understanding-alerts.html
  - title: "VCF 9.0 - Alert Definitions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-alerts-and-actions/alert-definitions.html
  - title: "VCF 9.0 - Symptom Definitions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-alerts-and-actions/symptom-definitions.html
  - title: "VCF 9.0 - Configuring and Managing Policies"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-policies.html
  - title: "VCF 9.0 - Using the Policy Workspace"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-policies/using-the-monitoring-policy-workspace.html
  - title: "VCF 9.0 - Assigning Policies"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-policies/assigning-policies.html
  - title: "VCF 9.0 - Types of Policies"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/configuring-policies/types-of-policies.html
---

## Why This Matters

Three exam items live in this lesson: "create and share dashboards", "configure Alerting" and "configure VCF
Operations policies". They are also the three things that decide whether VCF Operations is useful in practice. A
dashboard nobody can see is useless; an alert that fires for everything is ignored; and a policy that applies
production thresholds to a test cluster floods you with noise. Policies are the glue: they decide which data is
collected, which alerts are active and with which thresholds, for every group of objects.

## Learning Objectives

- Create a dashboard from widgets and views, configure widget interactions and share it with user groups or by URL.
- Export, import, clone and transfer ownership of dashboards.
- Explain the alert pipeline: symptom definitions, alert definitions, recommendations, actions, notifications.
- Configure an alert definition (base object, impact, criticality, symptom set logic, wait/cancel cycles).
- Create a policy that inherits from a base policy, override thresholds, and assign it to a custom group.
- Predict which policy applies when an object is in several groups.

## Concept

| Building block | What it is |
|---|---|
| [[ops-dashboard|Dashboard]] | Canvas of widgets (and views) showing the state of objects; can be shared |
| Widget | A pane on a dashboard: scoreboard, object list, heat map, View widget, and many more |
| [[symptom-definition|Symptom definition]] | A condition: metric/property, message event, fault, or (new in 9.0) log based |
| [[alert-definition|Alert definition]] | Symptom sets + recommendations for a base object type, with impact and criticality |
| [[recommendation|Recommendation]] | Remediation guidance shown with the alert; can be linked to an action |
| Action | An operation run through an adapter (for example power off a VM) |
| [[notification-rule|Notification]] | Filters alerts and sends them through outbound plugins, shaped by payload templates |
| [[ops-policy|Policy]] | "A set of rules that you define for VCF Operations to use to analyze and display information about the objects" |
| [[custom-group|Custom group]] | A group of objects (static or by criteria) that a policy can be assigned to |

## Architecture

::diagram[d10-alert-pipeline]

The policy is the outer frame: it activates definitions per object. Alerts are raised on a **base object type** and
affect one of three **impact badges**: **Health** (problem now), **Risk** (problem soon), **Efficiency** (wasted
resources). Criticality levels are **Critical, Immediate, Warning, Info** (an alert definition can also take its
criticality from the triggering symptom).

## Components

### Dashboards

| Task | Where / how (VCF 9.0) |
|---|---|
| Create | Infrastructure Operations > Dashboards & Reports > Dashboards > **Create**; name it, add widgets or views, configure widget interactions, create dashboard navigation, **Save** |
| Edit | Open the dashboard > Actions > Edit Dashboard |
| Manage | Infrastructure Operations > Dashboards & Reports > Dashboards > **Manage** |
| Share with groups | Manage > Shared column > Group Sharing dialog; select user groups; optional **Allow Editing** |
| Share by URL | URL column shows externally shared links |
| Export / import | Export creates a **JSON** file; Import accepts **ZIP, PAK or JSON**, conflict: **Overwrite** or **Rename** |
| Change ownership | Select dashboards > Change Ownership; it disappears from your list; sharing is retained |
| Other | Clone, activate/deactivate, delete, dashboard folders, auto-rotate, summary dashboards, favorites, pin |

TechDocs: "When you share a dashboard, it becomes available to all the users in the user group that you select."
The dashboard time panel defaults to 6 hours and offers 1 h, 6 h, 24 h, 7 days or custom.

### Alerting

| Element | Detail |
|---|---|
| Symptom types | Metric/Property, Message Event, Fault, Log (log symptoms are new in 9.0) |
| Thresholds | Use a series of symptoms for incremental concern, e.g. "volume nearing capacity" = Warning, "volume reached capacity" = Critical |
| Alert definition | Name, base object type, adapter type, impact (Health/Risk/Efficiency), criticality, type/subtype, symptom sets with **all** or **any** logic, recommendations, policies |
| Menu | Infrastructure Operations > Configurations > **Alert Definitions** tile / **Symptom Definitions** tile |
| Alerts list | Infrastructure Operations > Alerts; or object > Alerts tab |
| Toolbar | Add, edit, delete, clone, export, import (overwrite or skip conflicts) |

### Policies

| Policy workspace section | Controls |
|---|---|
| Metrics and Properties | Which metrics, properties and super metrics are collected/calculated |
| Alerts and Symptoms | Activate or deactivate alert and symptom definitions, override thresholds |
| Capacity | Capacity calculation settings (e.g. committed projects) |
| Compliance | Compliance threshold |
| Workload Automation | Optimization settings |
| Groups and Objects | Which groups/objects the policy applies to |

Menu: Infrastructure Operations > Configurations > **Policy Definition** tile.

## How It Works

Building an alert end to end:

1. **Symptom**: create (or reuse) symptom definitions, for example *datastore free space < 15% = Warning* and
   *< 5% = Critical*.
2. **Alert definition**: base object type Datastore, impact Risk, criticality "Symptom based", symptom set with
   **any** of the two symptoms.
3. **Wait and cancel cycles**: the number of collection cycles a condition must be true before the alert is raised
   (wait) or false before it is cancelled (cancel). They suppress flapping.
4. **Recommendation**: "Extend the datastore or migrate VMs with Storage vMotion", optionally linked to an action.
5. **Policy**: make sure the definition is active in the policy applied to the datastores in scope.
6. **Notification**: create a notification rule (for example criticality Critical, object type Datastore) using an
   outbound plugin configured under outbound settings, with a payload template.
7. **Test**: temporarily lower the threshold or fill a test datastore, confirm the alert, the recommendation and the
   email.

How a policy is chosen for an object:

1. Policies are assigned to objects and [[custom-group|custom groups]] in the Policy Assignment workspace (drag and
   drop; child objects can be included up to 10 levels).
2. If several policies apply, **the policy with the highest priority is enforced**.
3. Exception: "a lower-priority policy is enforced if it is assigned directly to the object."
4. Settings not defined locally are **inherited from the base policy**.

## Deep Dive

### Policy types

TechDocs names three categories: the **default policy** ("a set of rules that applies to most of your objects"),
**custom policies** that you build by inheriting from existing ones, and **policies provided with VCF Operations** that
you can use as-is or as starting points. Best practice: never tune the default policy for one team; create a custom
policy that inherits from it, override only what differs, and assign it to a custom group.

### Alert noise reduction

- **Alert groups** and **intelligent alert clustering** (machine learning clustering of related alerts; TechDocs
  describes a 15-minute window and topology distance of 1) group duplicates.
- Deactivate definitions you do not need in the policy, rather than deleting them.
- Use symptom series (Warning then Critical) and wait cycles to avoid flapping.

### Alert details pane

An alert shows: **Alert Details** (recommendations, symptoms, conditions, troubleshooting logs, notes), **Related
Alerts** (past 30 days, peers, topology) and **Potential Evidence** (events, property changes, anomalous metrics in a
2.5-hour window). This is where you start troubleshooting.

:::tip
"Potential Evidence" often shows a *property change* just before a metric spike, for example a VM's CPU count was
reduced. That is the metric-vs-property distinction paying off.
:::

### Widget interactions

Widgets can send their selection to other widgets: select a cluster in an object list and the heat map shows only that
cluster's hosts. Dashboard navigation links one dashboard to another. These are configured in the dashboard editor
("Widget and View Interactions", "Dashboard Navigation").

## Configuration

Scenario configuration for a "Production" policy:

| Setting | Value |
|---|---|
| Name | Production-Clusters |
| Inherit from | Default policy |
| Metrics and Properties | Activate super metric "Cluster max CPU ready" |
| Alerts and Symptoms | Lower VM CPU contention warning threshold; activate datastore space alert |
| Groups and Objects | Custom group "Prod clusters" (membership criteria: cluster name contains `prod`) |
| Priority | Above the default policy |

## CLI / API

Dashboards and alert definitions can be exported (JSON) and imported, which is the practical way to move content
between instances or keep it in version control. Alerts can be read through the suite API (see
[VCF APIs and PowerCLI](lesson:vcf-apis-powercli)). There is no CLI for policy design; use the policy workspace.

## Failure Scenarios

| Symptom | Cause |
|---|---|
| Alert never fires | Definition not active in the object's effective policy; wait cycle too long; symptom threshold wrong; data not collected |
| Alert floods | Thresholds from the default policy applied to a noisy test environment; no wait cycle |
| Email never arrives | Notification rule filter too narrow, or outbound plugin (SMTP) misconfigured |
| Shared dashboard empty for a user | User's role/scope does not include the objects; the dashboard is shared, the data permissions are not |
| Wrong thresholds on an object | Object directly assigned to a lower-priority policy, overriding the group policy |

## Troubleshooting

1. On the object, check which policy is effective (object Summary / policy info) and whether the alert definition is
   active there.
2. Check the symptom: does the metric exist on the object and is it current?
3. Check wait cycle and criticality settings in the definition.
4. For notifications, test the outbound plugin and widen the rule temporarily.
5. For dashboards, verify group sharing *and* the user's object permissions.

## Real-World Scenario

A retailer's VI team gets 400 alerts a day, mostly CPU contention on a dev cluster that is overcommitted on purpose.
They create a **Dev** custom group, a **Dev policy** inheriting from the default policy with the contention alerts
deactivated and capacity settings relaxed, and assign it with a priority above the default. Production keeps the
stricter policy. A shared "Prod Health" dashboard (group sharing to the NOC group, no editing) shows only production,
and a notification rule pages the on-call engineer only for Critical health alerts in production.

## Lab

::lab[lab-vcf-ops-dashboards-alerts]

## Exam Focus

- Dashboards: create from widgets and views; share with **user groups** (optionally editable) or by **URL**; export
  JSON; import ZIP/PAK/JSON; change ownership; clone.
- Alert definition = **symptom sets (all/any) + recommendations** on a **base object type**, with **impact** (Health,
  Risk, Efficiency) and **criticality**.
- Symptom types: **metric/property, message event, fault, log**.
- Notifications use **outbound plugins** and **payload templates**.
- Policies: inherit from a **base policy**; assign to **custom groups**; **highest priority wins** unless a
  lower-priority policy is assigned **directly** to the object.

## Common Exam Traps

:::trap
Editing the default policy to fix one cluster's noise changes it for every object that uses the default. Create a
custom policy instead.
:::

:::trap
A recommendation is not an action. Recommendations are guidance text; actions execute changes (and can be linked).
:::

:::trap
Sharing a dashboard does not grant permissions to the objects it shows.
:::

## Knowledge Check

::quiz

## Summary

Dashboards combine widgets and views and are shared with user groups or by URL, exported as JSON and imported as
ZIP/PAK/JSON. Alerts are built from symptom definitions grouped into alert definitions with recommendations, impact and
criticality, then routed by notification rules through outbound plugins. Policies decide what is collected and which
alerts are active, inherit from a base policy, are assigned to custom groups, and resolve by priority with direct
assignment winning.

## Next Topic

Next: [VCF Operations for logs, Network Operations, Health and Storage Operations](lesson:vcf-operations-logs-network-ops).
