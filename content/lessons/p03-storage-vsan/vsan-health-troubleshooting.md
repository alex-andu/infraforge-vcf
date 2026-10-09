---
id: vsan-health-troubleshooting
title: vSAN Health and Troubleshooting
phase: p03-storage-vsan
module: m03-vsan-ops
version: vcf9
minutes: 45
difficulty: advanced
summary: How to diagnose VMware vSAN through Skyline Health, object state, resynchronization, capacity, network and hardware evidence across vSphere and VMware Cloud Foundation (VCF) Operations.
topics: [vsan-health, troubleshooting-method, health-diagnostics]
objectives: ["2.3", "4.3"]
keyTerms: [skyline-health, resync, absent-component, degraded-component, vsan-object, network-partition, hcl-database]
labs: [lab-vsan-esa-cluster, lab-vsan-storage-policies]
incidents: [inc-vsan-degraded-objects]
components: [vsan, esx-host, vcenter, vcf-operations]
related: [vsan-resilience-fault-domains, vsan-space-efficiency-capacity, vsan-architecture-esa-osa]
sources:
  - title: "vSAN 9.0 – Monitoring vSAN Skyline Health"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-monitoring-and-troubleshooting/monitoring-vsan-skyline-health.html
  - title: "vSAN 9.0 – Monitoring and Troubleshooting vSAN"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-monitoring-and-troubleshooting.html
  - title: "vSAN 9.0 – vSAN Terms and Definitions (component and object states)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/what-is-vsan/vsan-concepts/virtual-san-terms-and-definitions.html
  - title: "VCF blog – Skyline Health Scoring, Diagnostics and Remediation in vSAN 8 U1"
    url: https://blogs.vmware.com/cloud-foundation/2023/03/24/skyline-health-scoring-diagnostics-and-remediation-in-vsan-8-u1/
  - title: "Broadcom KB 447177 – vSAN Skyline Health score remains low after silencing alerts"
    url: https://knowledge.broadcom.com/external/article/447177/vsan-skyline-health-score-remains-low-or.html
  - title: "Broadcom KB 438821 – vSAN massive resync and degraded object health alerts after exiting Maintenance Mode"
    url: https://knowledge.broadcom.com/external/article/438821/vsan-massive-resync-and-degraded-object.html
  - title: "Broadcom KB 326889 – vSAN Health Service: Capacity utilization – Storage space"
    url: https://knowledge.broadcom.com/external/article/326889
  - title: "ESXCLI command reference 9.0 – esxcli vsan"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_vsan.html
  - title: "vSphere 8.0 – Using esxcli commands with vSAN"
    url: https://docs.vmware.com/en/VMware-vSphere/8.0/vsan-monitoring-troubleshooting/GUID-7799D2D7-2513-4372-92EA-4A1FB510E012.html
---

## Why This Matters

In a VMware Cloud Foundation (VCF) environment, management components such as VMware vCenter, VMware NSX Managers and VCF Operations commonly live on VMware vSAN. A vSAN incident can block lifecycle work, interrupt backups or affect the management plane. vSAN also reports warnings that may be expected, such as an outdated compatibility database in an isolated lab or resynchronization after maintenance. Effective troubleshooting ranks evidence by availability impact before chasing secondary findings.

This lesson supports objective 2.3 (resilience and availability options in practice) and objective 4.3 ("monitor vSAN storage using VCF Storage Operations").

## Learning Objectives

- Use Skyline Health, the health score and its findings to find the root-cause issue first.
- Interpret object health states and resync information.
- Diagnose network partitions, device failures and capacity problems with the ESX command-line interface (`esxcli`).
- Separate noise (informational or expected warnings) from real availability risks.
- Know where VCF Operations fits for fleet-wide vSAN monitoring.

## Concept

### The health layers

| Layer | Question | Where |
|---|---|---|
| Cluster health ([[skyline-health]]) | Is the cluster configured and operating correctly? | Cluster → Monitor → Skyline Health (vSAN) |
| Object health | Is every object accessible and fully redundant? | Monitor → vSAN → Virtual Objects; `esxcli vsan debug object health summary get` |
| Resync | Is vSAN repairing or moving data? | Monitor → vSAN → Resyncing Objects; `esxcli vsan debug resync summary get` |
| Capacity | Is there room to operate and heal? | Monitor → vSAN → Capacity |
| Performance | Latency, IOPS, throughput, congestion | Monitor → vSAN → Performance (performance service) |
| Hardware | Devices and controllers healthy and certified? | Disk Management, Skyline Health hardware compatibility |

TechDocs summarizes Skyline Health as a way to "check the overall health of the vSAN cluster, including hardware compatibility and networking configuration and operations", plus "storage device health, and virtual machine object health".

### Health score and findings

Since vSAN 8 U1 Skyline Health computes a **cluster health score** from 0 to 100. The VCF blog describes the bands: 81–100 healthy ("no immediate attention"), 61–80 degraded ("attention is suggested"), 0–60 unhealthy ("immediate attention is required"). Findings are weighted by category — Availability, Performance, Capacity Utilization, Efficiency and Compliance — and "the default view will sort by the triggered findings that have the most impact and are identified by vSAN as a root cause of any secondary, symptomatic issues."

Two KB-backed operational details:

- **Silencing** a check hides it but "does not restore the cluster health score"; fix the cause and click **RETEST**.
- A huge resync after a host leaves maintenance mode is normal: the displayed size is the size of the affected objects, not the data actually copied (KB 438821).

### Object health states

From `esxcli vsan debug object health summary get` and the Virtual Objects view:

| State | Meaning | Urgency |
|---|---|---|
| healthy | All components active and compliant | — |
| reduced-availability-with-no-rebuild-delay-timer | Components absent; waiting for the 60-minute repair delay | Watch; the host may come back |
| reduced-availability-with-active-rebuild | Rebuild running | Watch resync, do not add load |
| reduced-availability-with-no-rebuild | Cannot rebuild (no spare host/fault domain or no capacity) | **Act**: one more failure may cause data unavailability |
| inaccessible | Quorum lost | **Outage** for affected VMs |
| nonavailability-related-incompliance | Accessible but noncompliant for other reasons (for example policy change pending) | Low |

## Architecture

::diagram[d03-vsan-troubleshooting-flow]

The flow starts with the health score, then splits into the four most common causes: network partition, device/host failure, capacity, and configuration/compatibility.

## Components

| Component | Where it runs | Logs / evidence |
|---|---|---|
| vSAN health service | vCenter | Skyline Health findings, health history |
| vSAN performance service | vCenter + stats object on vSAN | Performance charts, proactive tests |
| CMMDS / clomd / vSAN data path | Every ESX host | `/var/run/log/clomd.log`, `/var/run/log/vobd.log`, `vmkernel.log` |
| Hardware compatibility (HCL) database | vCenter | "vSAN HCL DB up-to-date" finding |
| VCF Operations | Management domain | Fleet-wide vSAN capacity, performance and alerts across clusters |

### Component responsibilities and limits

**Skyline Health.** Skyline Health correlates cluster configuration, availability, network, capacity, hardware and performance checks and ranks findings by impact. It is the first triage surface. It cannot replace direct evidence from hosts, devices and object state, and silencing a check does not resolve its cause.

**Object health.** Object state shows whether components are active, absent, rebuilding, unable to rebuild or inaccessible. It directly describes data availability and compliance. It does not alone identify whether the originating cause is a device, host, network partition or exhausted capacity.

**Resynchronization view.** Resync evidence shows objects and bytes remaining for repair, policy change or maintenance recovery. It helps estimate exposure and progress, but displayed affected-object size can exceed the actual changed data transferred after maintenance.

**Host evidence.** `esxcli`, VMkernel connectivity tests and ESX logs expose membership, devices, peers and low-level failures. They provide local truth, but one host's view can be incomplete during a partition; compare evidence across the cluster.

**VCF Operations.** VCF Operations aggregates trends, health and capacity across domains and clusters. It is suited to fleet prioritization and forecasting. Skyline Health and host evidence remain the primary tools for root-cause work on one vSAN cluster.

## How It Works

The method this course uses everywhere — Observe, Scope, Hypothesize, Validate, Remediate, Verify — applied to vSAN:

1. **Observe**: open Skyline Health; note the score and the top finding (sorted by impact).
2. **Scope**: one host, one fault domain, or the whole cluster? Check `Sub-Cluster Member Count` on each host with `esxcli vsan cluster get`.
3. **Classify objects**: `esxcli vsan debug object health summary get`. Absent (waiting) vs active rebuild vs no-rebuild vs inaccessible.
4. **Hypothesize**: partition? device failure? host down? capacity? config drift?
5. **Validate** with targeted evidence: `vmkping` on the vSAN VMkernel, `esxcli vsan storagepool list` (ESA) or `esxcli vsan storage list` (OSA), `/var/run/log/vobd.log` for device events, capacity view.
6. **Remediate** the cause (replace device, fix MTU/VLAN, free capacity, bring host back).
7. **Verify**: resync completes, object health returns to healthy, RETEST Skyline Health.

## Deep Dive

### Network partition

Symptoms: Skyline Health network findings (for example a partition or unicast check), hosts showing different member counts, some objects absent from the point of view of other hosts.

Checks:

- `esxcli vsan cluster get` on each host: `Sub-Cluster Member Count` should equal the cluster size.
- `esxcli vsan network list`: the right VMkernel adapter is tagged for vSAN.
- `esxcli vsan cluster unicastagent list`: each host knows its peers.
- `vmkping -I vmk2 -s 8972 -d <peer-vsan-ip>`: MTU 9000 end to end (8972 bytes payload + headers, don't-fragment bit).

Typical causes: a switch port with the wrong VLAN or MTU after a change, a NIC failure without teaming, a host with a stale unicast agent list after re-IP.

### Device failure

ESA: one NVMe device fails → only its components become degraded and rebuild starts immediately. OSA: a cache device failure takes the whole disk group, and with dedup enabled any device failure takes the disk group. Evidence: Disk Management shows the device unhealthy, `vobd.log` shows device errors, Skyline Health physical disk findings.

Remediation: let the rebuild finish (if capacity allows), remove the failed device from the storage pool / disk group, replace it, claim the new device.

### Host down vs host in maintenance

A host that is down gives **absent** components and the 60-minute timer; a host entering maintenance with "Ensure accessibility" also leaves some objects at reduced availability, and on exit a delta resync catches up stale components. Do not "fix" either by forcing rebuilds unless the host is not coming back.

### Noise you will often see in labs

| Finding | Usually means |
|---|---|
| vSAN HCL database up-to-date | vCenter cannot download the compatibility DB (no internet); update it offline |
| Controller/driver/firmware compatibility | Nested or non-certified hardware (expected in a home lab) |
| Performance service status | Performance service not enabled yet |
| Time is synchronized across hosts | NTP drift: can matter, but rarely causes object issues by itself |

These are worth fixing, but they do not explain inaccessible or degraded objects.

### VCF Operations

In VCF the same vSAN clusters appear in VCF Operations, which aggregates capacity, performance and health across all workload domains and alerts on them. Use it for trends ("which cluster will be full in 60 days?") and fleet views; use Skyline Health and esxcli for root-cause work on one cluster. Dashboard names vary by version — check the VCF Operations documentation for your release.

## Configuration

| Observability decision | Management surface | Evidence |
|---|---|---|
| Is historical performance available? | vSAN performance service | Healthy statistics object and usable latency, throughput and congestion history |
| Is compatibility evidence current? | Skyline hardware compatibility checks | Current hardware compatibility list (HCL) database or documented offline update |
| Will capacity risk be visible early? | vSAN reserves/alerts and VCF Operations | Operations and rebuild reserves, alert threshold and growth forecast |
| Does the cluster work after a change? | Skyline proactive tests | Successful supported test and recorded remediation for failures |
| Will logs survive a host outage? | Central log collection | ESX `vobd`, `clomd` and VMkernel events searchable by host and time |
| Can responders distinguish symptoms from causes? | Alert routing and runbook | Owner, severity, affected objects and first evidence path |

The separate practical guide owns exact VCF 9.0.2 navigation and the controlled partition exercise. Theory keeps the diagnostic order: availability and object state first, then scope, cause-specific evidence, remediation and verification.

Automation can use an application programming interface (API) or command-line interface (CLI), but diagnostic collection must preserve timestamps, host identity and the difference between observed evidence and inferred cause.

## CLI / API

```shell
# Health findings from the host's point of view
esxcli vsan health cluster list

# Details of one check (use a test name from the list output)
esxcli vsan health cluster get -t "vSAN object health"

# Object states
esxcli vsan debug object health summary get

# Resync progress
esxcli vsan debug resync summary get

# Membership / partition
esxcli vsan cluster get

# ESA devices
esxcli vsan storagepool list
```

Sample output of the object health summary during a device failure:

```log
Health Status                                     Number Of Objects
------------------------------------------------  -----------------
reduced-availability-with-no-rebuild-delay-timer                  0
reduced-availability-with-active-rebuild                         23
reduced-availability-with-no-rebuild                              2
inaccessible                                                      0
healthy                                                         311
```

## Failure Scenarios

| Scenario | First signal | Root cause evidence |
|---|---|---|
| One host's vSAN vmk on wrong VLAN | Partition finding, member count 1 on that host | `vmkping` fails, member count differs |
| NVMe device failed | Physical disk finding, degraded components | Device state in Disk Management, `vobd.log` |
| Cluster 92 % full during rebuild | Capacity red; objects with no rebuild | Capacity view, resync stalled |
| Host rebooted for patching | Objects in no-rebuild-delay-timer | Host in maintenance/disconnected, returns within 60 min |
| HCL DB outdated | Yellow compatibility finding | No object impact — noise |

## Troubleshooting

Checklist when a learner reports "vSAN datastore degraded but VMs still running":

1. Skyline Health: top Availability finding?
2. Object summary: absent vs active rebuild vs no-rebuild?
3. Hosts: all connected? any in maintenance? member counts equal?
4. Devices: any unhealthy in Disk Management or `esxcli vsan storagepool list`?
5. Capacity: enough free space for rebuild?
6. Fix, then verify resync to zero and RETEST.

The incident below gives you exactly this situation with realistic evidence and red herrings.

::incident[inc-vsan-degraded-objects]

## Real-World Scenario

Monday 08:10: VCF Operations raises a vSAN alert for VI workload domain cluster `wld01-cl01`. Skyline Health score: 54. The top finding is object health; secondary findings are physical disk health and an outdated HCL DB. The engineer:

1. Runs the object health summary: 23 objects with an active rebuild, none inaccessible, none waiting on the repair timer.
2. Finds one NVMe device unhealthy on esx-03; `vobd.log` shows device errors at 07:52.
3. Notes the HCL DB warning is weeks old — unrelated.
4. Checks capacity: 71 % used, enough room for the rebuild to finish. Components are **degraded** (permanent failure), so waiting for a 60-minute timer is not relevant.
5. Opens a hardware ticket, replaces the device, claims it into the storage pool, waits for resync to finish, clicks RETEST: score back to 100 except the HCL DB finding, which is then updated.

## Exam Focus

:::exam
- Skyline Health is the starting point; findings are prioritized by impact and root cause.
- Know the object states and which ones need action (no-rebuild, inaccessible).
- Partition diagnosis: member count, vSAN VMkernel, unicast agents, `vmkping` with MTU.
- Silencing a check does not fix the score; RETEST after remediation.
- Large resync after maintenance can be normal.
:::

## Common Exam Traps

:::trap
- **Chasing the HCL DB warning** when objects are degraded — fix availability first.
- **Forcing a rebuild right after a host reboot** — the host is likely back within the repair delay.
- **Assuming "degraded datastore" means data loss** — reduced availability means one more failure is the danger.
- **Using `ping` instead of `vmkping -I <vsan-vmk>`** — you must test the vSAN VMkernel path with the right MTU.
:::

## Knowledge Check

::quiz

## Summary

- Health layers: cluster (Skyline Health), objects, resync, capacity, performance, hardware.
- The health score ranks findings so the root cause is first; silence is not a fix.
- Object states tell you whether to wait, watch, or act.
- Partition, device failure, capacity and configuration drift cover most vSAN incidents.
- VCF Operations gives the fleet view; Skyline Health and esxcli give the root cause.

## Next Topic

Phase 3 is complete. Next, [Networking fundamentals for VCF](lesson:network-fundamentals-for-vcf) covers the VLANs, MTU, DNS and NTP that vSAN and every other VCF component depend on.
