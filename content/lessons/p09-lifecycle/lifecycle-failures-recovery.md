---
id: lifecycle-failures-recovery
title: Lifecycle Failures, Retries and Recovery
phase: p09-lifecycle
module: m09-lcm
version: vcf9
minutes: 40
difficulty: advanced
summary: A practical method for failed prechecks and failed upgrades in VCF 9.0 - where to look, how to classify the failure, when to retry, and why "rollback" usually means restore rather than undo.
topics: [lcm-recovery, lcm-workflow]
objectives: ["4.2"]
keyTerms: [precheck, resource-lock, bundle, remediation]
labs: [lab-lifecycle-upgrade-planning]
incidents: [inc-lcm-precheck-failure, inc-certificate-trust]
components: [sddc-manager, vcf-operations-fleet-management, vcenter, nsx-manager, esx-host]
related: [lifecycle-upgrade-workflow, vlcm-images-host-remediation, certificate-management]
sources:
  - title: "VCF 9.0 TechDocs - Lifecycle Management in VMware Cloud Foundation (forward-only upgrades)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 TechDocs - Resource locks during upgrade or patching"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/lifecycle-management/lifecycle-management-of-vcf-core-components/upgrade-or-patch-in-progress-interoperability-in-vcf.html
  - title: "Broadcom KB 450414 - vCenter upgrade fails at VCENTER_UPGRADE_PRECHECK in VCF 9.x"
    url: https://knowledge.broadcom.com/external/article/450414/vcenter-upgrade-fails-at-vcenter_upgrade.html
  - title: "Broadcom KB 390255 - SDDC Manager vCenter upgrade fails at pre-validation stage"
    url: https://knowledge.broadcom.com/external/article/390255/sddc-manager-vcenter-upgrade-fails-at-pr.html
  - title: "Broadcom KB 435597 - VCF Operations upgrade from 9.0.1 to 9.0.2 fails with LCMVROPSYSTEM25008"
    url: https://knowledge.broadcom.com/external/article/435597/vcf-operations-upgrade-from-901-to-902-f.html
  - title: "Broadcom KB 425321 - Upgrading VCF Automation from 9.0.0 to 9.0.1 failing in fleet manager"
    url: https://knowledge.broadcom.com/external/article/425321
  - title: "Broadcom KB 427385 - vCenter RDU post-upgrade task fails to delete original VCSA VM"
    url: https://knowledge.broadcom.com/external/article/427385/sddc-manager-vcenter-rdu-postupgrade-tas.html
  - title: "Broadcom KB 441948 - Identity broker is unhealthy during SSO configuration (version mismatch)"
    url: https://knowledge.broadcom.com/external/article/441948/identity-broker-is-unhealthy-reported-d.html
---

## Why This Matters

Upgrades fail. Not often if you prepared well, but in a stack of a dozen products across hundreds of hosts something
eventually will: a host that drops off the network mid-remediation, a full log partition on an appliance, a bundle that
did not download completely, a certificate nobody renewed. The difference between a 20-minute hiccup and a weekend
outage is method: knowing which engine failed, where its log is, whether the task can be **retried**, and when (rarely)
you need to **restore**. This is also how the exam frames lifecycle troubleshooting: "an upgrade failed with X; what
should the administrator do next?"

## Learning Objectives

- Classify a lifecycle failure by engine (fleet management or SDDC (Software-Defined Data Center) Manager) and by cause (environment, binaries, host
  state, known defect).
- Find and read the right log for a failed task.
- Explain why VCF (VMware Cloud Foundation) upgrades are retried rather than rolled back, and what "rollback" means per component.
- Prepare the backups and evidence that make recovery possible.
- Handle precheck failures before they become upgrade failures.

## Concept

### Retry first, restore last

VCF lifecycle workflows are built as sequences of stages (you will see stage names such as
`VCENTER_UPGRADE_PRECHECK` in errors). When a stage fails, the workflow stops in a known state. The supported path is
almost always: **find the cause, fix it, retry the task** (KB 450414, KB 390255, KB 435597 and KB 425321 all end with
"retry the upgrade").

There is no "undo upgrade" button in VCF. Upgrades are **forward-only**: VCF only moves to versions released after your
current one. "Rollback" therefore means one of:

| Component | What "rollback" realistically means |
|---|---|
| SDDC Manager | Restore from its file-based backup (or a snapshot taken under the documented procedure), with support guidance |
| vCenter | Before switchover the original VM still exists; after a completed upgrade, restore from file-based backup |
| NSX Manager | Restore from NSX backup; data plane changes on hosts are not simply reversed |
| ESX host | Reinstall/remediate to a compliant image; not a per-host "undo" in VCF |
| Management components | Fleet management workflows; fix and retry, or follow the KB for that component |

So the real safety net is not rollback, it is **preparation**: green prechecks, verified backups, enough capacity, and
knowledge of where logs are.

### Two engines, two log trails

| Engine | Upgrades | Key log |
|---|---|---|
| **SDDC Manager** | SDDC Manager, NSX, vCenter, ESX (via vLCM (vSphere Lifecycle Manager)) | `/var/log/vmware/vcf/lcm/lcm-debug.log` |
| **Fleet management** | VCF Operations, Automation, logs, networks, Identity Broker | `/var/log/vrlcm/vmware_vrlcm.log` |

Then go one level deeper to the target component's own logs (vCenter upgrade logs, NSX upgrade coordinator, host
logs, VCF Operations logs).

## Architecture

::diagram[d09-lcm-failure-triage]

## Components

| Piece | Why it matters during failure |
|---|---|
| **Task list in VCF Operations** | First evidence: stage name, error text, time |
| **SDDC Manager LCM (Lifecycle Management) service** | Holds the workflow state for core components; retry resumes from it |
| **Fleet management** | Holds the workflow state for management components |
| **Bundle repository on SDDC Manager** | Stale or partial bundle data can break a stage (KB 450414) |
| **Backups** | SDDC Manager, vCenter and NSX file-based backups are your recovery point |
| **Resource locks** | A failed workflow can keep a lock; resolve or retry it before starting other work |

## How It Works

A repeatable sequence for any failed lifecycle task:

1. **Stop and record.** Note the task, stage name, error text and time. Do not click retry immediately.
2. **Identify the engine.** Management component: fleet management. Core component: SDDC Manager.
3. **Read the engine log** around the failure time. Find the first error, not the last.
4. **Read the target component's log** if the engine says the target failed.
5. **Classify** the cause:
   - Environment: DNS (Domain Name System), NTP (Network Time Protocol), certificates, passwords, disk space, host connectivity, locks.
   - Binaries: incomplete or stale bundle, depot issue, wrong version.
   - Host/cluster state: disconnected host, maintenance mode blocked, image incompatible.
   - Known defect: search the Broadcom KB with the exact error string.
6. **Fix the cause.** Change one thing at a time and record it.
7. **Re-run the precheck** where one exists, then **retry** the failed task.
8. **Verify** versions, health and compliance before continuing the sequence.
9. **Escalate** with logs if the component is left unusable; restore only with a clear plan.

## Deep Dive

### Real examples, decoded

| KB | Failure | Cause | Fix pattern |
|---|---|---|---|
| 390255 | vCenter upgrade pre-validation: "bundle is not compatible with your existing version" | A host in the cluster is Not Responding/Disconnected; the LCM service cannot read its version | Restore host connectivity (or remove the host), then retry |
| 450414 | VCF 9.x vCenter upgrade fails at `VCENTER_UPGRADE_PRECHECK`, "Unable to get vCenter upgrade status" | Stale data in the SDDC Manager bundle `update_repo` | Clean the repo per KB, re-download if needed, retry |
| 435597 | VCF Operations 9.0.1 to 9.0.2 fails with `LCMVROPSYSTEM25008` | Orphaned directory left by an earlier failed attempt | Clean up per KB, delete failed task, retry |
| 425321 | VCF Automation 9.0.0 to 9.0.1 times out after 2 h; retry does not help | `/var/log/messages` grew to tens of GB on VCFA nodes | Truncate the log per KB, retry |
| 427385 | vCenter upgrade post-task cannot delete original VM | Host running the vCenter VMs not responding | Fix host, then manually rename/delete per KB |
| 441948 | "Identity broker is unhealthy" during SSO (Single Sign-On) configuration | Identity Broker and fleet management on different patch levels | Patch the broker to match |

Notice the pattern: **the error message points at the symptom, the log points at the cause, and the cause is usually
environmental**. Note also the KB 425321 lesson: if retrying the same thing fails the same way, stop retrying and find
the cause.

:::warning
Some KBs include workarounds such as disabling a compatibility check or deleting repository folders. Apply them only
for the exact symptom and version the KB names, ideally with Broadcom support, and revert temporary changes afterwards.
:::

### Precheck failures are the cheap kind

A failed precheck costs nothing: nothing changed. The most common precheck blockers map to the platform dependencies
you met in earlier phases:

| Precheck finding | Underlying dependency |
|---|---|
| Host not responding / disconnected | Host management network, certificates, vpxa |
| Credential invalid | Password changed outside VCF (needs remediation) |
| Certificate expired or untrusted | PKI and trust stores |
| Insufficient disk space on an appliance | Log growth, old bundles |
| Name resolution or time issues | DNS forward/reverse, NTP |
| Conflicting operation running | Resource locks, failed workflows left behind |

### Preparing to recover

- **File-based backups** of SDDC Manager, vCenter and NSX, recent and verified (restore tested at least once in the
  lab).
- **Snapshots**: only where a documented procedure says so, and delete them afterwards; snapshots of clustered
  appliances taken inconsistently can be worse than none.
- **Evidence kit**: the exact versions before the change, precheck report, screenshot of the plan, and a log bundle
  location.
- **Capacity**: free space on appliances and datastores, and at least N+1 host capacity for remediation.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Configure backups before you ever upgrade:

| Component | Where backups are configured | What to verify |
|---|---|---|
| SDDC Manager | SDDC Manager backup settings (SFTP target) | Last backup successful, target reachable |
| vCenter | VAMI file-based backup | Schedule and last result |
| NSX | NSX Manager backup configuration | Last successful backup |
| VCF Operations and others | Per product / fleet management documentation | Check the docs for your version |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Read-only commands you will use during a failure (SDDC Manager, logged in as `vcf`, then `su -` to root):

```shell
# follow the lifecycle engine while retrying
tail -f /var/log/vmware/vcf/lcm/lcm-debug.log

# find the first error around the failure
grep -n "ERROR" /var/log/vmware/vcf/lcm/lcm-debug.log | tail -50

# check free space on the appliance
df -h
```

On the fleet management appliance the equivalent is `/var/log/vrlcm/vmware_vrlcm.log`.

## Failure Scenarios

| When it fails | State after failure | Typical next step |
|---|---|---|
| During precheck | Nothing changed | Fix, re-run precheck |
| During binary validation | Nothing changed on targets | Re-download bundle, retry |
| During NSX upgrade | Some NSX nodes upgraded | Fix and retry from the NSX stage; do not start vCenter |
| During vCenter upgrade before switchover | Original vCenter still active | Fix and retry |
| After vCenter switchover, cleanup failed | New vCenter running, old VM left | Manual cleanup per KB |
| During ESX remediation | Mixed host versions in cluster (supported temporarily) | Fix the blocking host, remediate again |

## Troubleshooting

:::tip
"First error, not last error." Lifecycle logs are noisy and a single root failure produces many follow-on errors.
Search backwards from the failure time to the first exception.
:::

1. Confirm whether a **lock** is still held by the failed workflow; do not start unrelated workflows on top.
2. Check **disk space** on the engine appliance and the target.
3. Check **DNS, NTP, certificates and passwords** for the target component; these explain a large share of
   failures and are covered in phase 12 and phase 13.
4. Search the KB with the **exact** error string and stage name.
5. Retry once after a fix. If the same error repeats, collect logs and escalate.

## Real-World Scenario

During a workload domain upgrade the NSX stage succeeded and vCenter failed at pre-validation with "bundle is not
compatible". The on-call engineer resisted re-clicking retry, opened `lcm-debug.log`, and found an exception while
fetching versions for hosts in one cluster. In vCenter, one host was Not Responding after a NIC firmware issue. They
put the host in maintenance mode, removed it from the cluster, retried, and the vCenter upgrade completed. The host was
repaired and re-added after the ESX step. Total delay: 40 minutes, no restore.


## Exam Focus

:::exam
- Failed lifecycle task: **find cause in logs, fix, retry**. Restore is a last resort.
- Upgrades are **forward-only**; there is no generic rollback.
- Know the two engines and their logs: SDDC Manager `lcm-debug.log`, fleet management `vmware_vrlcm.log`.
- Prechecks catch most problems; dependencies (DNS, NTP, certificates, passwords, host state) are the usual causes.
:::

## Common Exam Traps

:::trap
- "Revert all components to snapshots" as a first reaction - not the supported first step.
- "Retry repeatedly until it works" - if the error repeats, the cause is still there.
- "Skip the failed component and continue with the next" - the sequence exists for compatibility; do not continue past
  a failed core component.
- "A browser certificate warning caused the upgrade failure" - browsers are not part of the workflow; check
  service-to-service trust.
:::

## Knowledge Check

::quiz

## Summary

- Classify by engine and cause; read the engine log, then the component log.
- Fix, then retry; restore only when a component is left unusable.
- Upgrades are forward-only; "rollback" means restoring from backup.
- Preparation (prechecks, backups, capacity, evidence) is the real recovery plan.

## Next Topic

Lifecycle is done. Phase 12 starts with [VCF identity, SSO and RBAC (Role-Based Access Control)](lesson:vcf-identity-sso-rbac); many lifecycle
failures you just met are really identity, certificate or password problems.
