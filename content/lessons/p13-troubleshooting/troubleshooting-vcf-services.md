---
id: troubleshooting-vcf-services
title: "Troubleshooting VCF Services: Deployment, Commissioning, Lifecycle, Automation and Where the Logs Are"
phase: p13-troubleshooting
module: m13-method
version: vcf9
minutes: 45
difficulty: advanced
summary: Which VCF 9 component executes each workflow, where its evidence lives (UI tasks, logs, support bundles), how to troubleshoot deployment, host commissioning, workload domains, lifecycle and ESX-to-vCenter connectivity, and which log paths are verified for 9.x.
topics: [logs-locations, troubleshooting-method, host-commissioning, lcm-recovery, deployment-validation, health-diagnostics]
objectives: ["4.1", "4.2", "4.3"]
keyTerms: [hostd, vpxa, esx-heartbeat, sos-utility, support-bundle, log-assist, remote-syslog]
labs: [lab-troubleshooting-drill, lab-commission-hosts-create-wld, lab-lifecycle-upgrade-planning]
incidents: [inc-esx-host-disconnected, inc-host-commissioning, inc-lcm-precheck-failure, inc-vcf-ops-collection]
components: [sddc-manager, vcf-installer, vcenter, esx-host, vcf-operations, vcf-operations-fleet-management, vcf-operations-logs, nsx-manager, vcf-automation]
related: [troubleshooting-methodology, troubleshooting-core-dependencies, troubleshooting-network-nsx-vsan, deployment-validation-failures, lifecycle-failures-recovery, host-commissioning-wld-creation]
sources:
  - title: "Broadcom KB 402476 – Collecting VCF Installer logs and VMSP logs (VCF 9.0.x / 9.1.x)"
    url: https://knowledge.broadcom.com/external/article/402476
  - title: "Broadcom KB 385749 – Collecting SDDC Manager and VMSP logs"
    url: https://knowledge.broadcom.com/external/article/385749/how-to-collect-sddc-manager-logs.html
  - title: "Broadcom KB 439546 – Workload Domain creation fails with 'Failed to validate domain spec' in VCF 9"
    url: https://knowledge.broadcom.com/external/article/439546
  - title: "Broadcom KB 397253 – SDDC Manager log location and purpose (5.2)"
    url: https://knowledge.broadcom.com/external/article/397253/sddc-manager-log-location-and-purpose.html
  - title: "Broadcom KB 306962 – Location and contents of ESXi log files"
    url: https://knowledge.broadcom.com/external/article/306962/location-of-esxi-log-files.html
  - title: "Broadcom KB 312194 – Location of vCenter Server log files"
    url: https://knowledge.broadcom.com/external/article/312194/location-of-vcenter-server-log-files.html
  - title: "Broadcom KB 376813 – Troubleshooting NSX Installation Operations"
    url: https://knowledge.broadcom.com/external/article/376813/troubleshooting-nsx-installation-operati.html
  - title: "Broadcom KB 323612 – ESXi host disconnects from vCenter Server after adding or connecting it"
    url: https://knowledge.broadcom.com/external/article/323612
  - title: "Broadcom KB 320280 – Restarting Management Agents in ESXi"
    url: https://knowledge.broadcom.com/external/article/320280
  - title: "VMware Cloud Foundation blog – 10 VCF 9 enhancements simplifying day-2 operations"
    url: https://blogs.vmware.com/cloud-foundation/2025/09/18/10-vmware-cloud-foundation-9-enhancements-simplifying-your-day-2-operations/
  - title: "VCF 9.0 – Use Log Assist to Accelerate Your Support Cases"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics/use-log-assist-to-accelerate-your-support-cases.html
  - title: "Broadcom Community – VCF9 installer log files"
    url: https://community.broadcom.com/vmware-cloud-foundation/question/vcf9-installer-log-files
---

## Why This Matters

Once DNS (Domain Name System), NTP (Network Time Protocol), certificates and identity are proven healthy, the next question is: **which service actually executes the workflow that failed, and where does it write its evidence?** In VCF (VMware Cloud Foundation) 9 this is less obvious than before. A workload domain is *requested* in VCF Operations, *executed* by SDDC (Software-Defined Data Center) Manager services, and *materialised* in vCenter, NSX and ESX. A host is commissioned from the vCenter UI. An upgrade is planned in VCF Operations fleet management. If you open the wrong log you will find nothing — or worse, a misleading secondary error.

This lesson is your map: workflow → executor → evidence. It is also honest about which log paths have been verified for VCF 9 and which come from earlier versions.

## Learning Objectives

- Map each VCF 9 day-0/day-2 workflow (deployment, commissioning, workload domain, edge cluster, lifecycle, certificates/passwords) to the UI where it starts and the component that executes it.
- Locate the main logs for ESX, vCenter, SDDC Manager/VCF Installer and NSX, and know which are verified for 9.x.
- Collect support bundles correctly (`sos` utility, Log Assist) before remediation.
- Troubleshoot an ESX host that is *Not Responding/Disconnected* in vCenter using the `hostd`/`vpxa`/heartbeat model.
- Troubleshoot lifecycle and depot failures and recognise when a retry is valid.

## Concept

:::vcf9 Changed in VCF 9
Many day-2 workflows moved out of the SDDC Manager UI (VCF blog, *10 VCF 9 enhancements*):

| Workflow | Where you start it in VCF 9.0 | VCF 5.x location |
|---|---|---|
| Network pools | vCenter: *Global Inventory List → Hosts → Network Pools* | SDDC Manager |
| Host commissioning/decommissioning | vCenter: *Global Inventory List → Hosts → Unassigned Hosts* | SDDC Manager *Inventory → Hosts* |
| Workload domain deployment | VCF Operations: *Inventory → VCF Instance* | SDDC Manager *Inventory → Workload Domains* |
| Cluster creation/expansion | vCenter: *Hosts and Clusters → Datacenter → New Cluster → New SDDC Cluster* | SDDC Manager |
| Backup configuration | VCF Operations: *Fleet Management → Lifecycle → Settings*; *Manage VCF Instance Settings → Backup Settings* | SDDC Manager |
| DNS/NTP settings | VCF Operations: *Inventory → VCF Instance → Actions → Manage VCF Instance Settings → Network Settings* | SDDC Manager |
| Certificates / CA (Certificate Authority) | VCF Operations: *Fleet Management → Certificates* (*Configure CA*) | SDDC Manager *Security* |
| Passwords | VCF Operations: *Fleet Management → Passwords* | SDDC Manager *Security* |
| NSX Edge cluster | vCenter: *Network → Network Connectivity* | SDDC Manager |

The **SDDC Manager appliance still exists** in each VCF instance (it is what the VCF Installer becomes when reused) and its services still perform much of the orchestration; KBs for VCF 9 workload domain failures point at `/var/log/vmware/vcf/domainmanager/domainmanager.log`.
:::

## Architecture

::diagram[d13-log-evidence-map]

The evidence map in one sentence per component:

- **ESX host** — the VMkernel, `hostd` (host management agent) and `vpxa` (vCenter agent) each log locally; logs can (and should) be forwarded with syslog.
- **vCenter** — each service logs under `/var/log/vmware/<service>/`; `vpxd` is the core vCenter service.
- **SDDC Manager / VCF Installer** — services log under `/var/log/vmware/vcf/<service>/`; the `sos` utility collects them.
- **NSX Manager / Edge** — `/var/log/syslog` plus service logs (for example `nsxapi`); the NSX CLI (Command-Line Interface) can tail them.
- **VCF Operations** and fleet management — evidence surfaced in the UI (alerts, VCF Health, Diagnostics Findings) and collected with **[[log-assist|Log Assist]]**.
- **VCF Operations for logs** — the central place where all of the above can be searched together.

## Components

### Log locations and verification status

| Component | Path / tool | What you find | Verified for VCF 9? |
|---|---|---|---|
| ESX | `/var/log/vmkernel.log` | Device discovery, storage, networking, vmknic events | Documented for ESXi 7/8 (KB 306962); layout used in 9.x KBs — confirm with `ls /var/log` on your host |
| ESX | `/var/log/hostd.log` | Host agent: VM and host tasks/events | **Yes** — KB 320280 (applies to 9.x) points to it |
| ESX | `/var/log/vpxa.log` | vCenter agent, communication with vCenter, heartbeat | Documented for 7/8 (KB 306962, KB 323612) |
| ESX | `/var/log/syslog.log`, `/var/log/auth.log` | Service start/watchdogs; shell logins | Documented for 7/8 |
| ESX | `/var/log/esxupdate.log` | VIB/image installs (e.g. NSX VIBs) | Listed in NSX install troubleshooting KB 376813 |
| vCenter | `/var/log/vmware/<service>/`, e.g. `/var/log/vmware/vpxd/vpxd.log` | vCenter services | Documented for 6.7–8.x (KB 312194, KB 376813) — confirm on 9.0 |
| SDDC Manager / VCF Installer | `/var/log/vmware/vcf/domainmanager/domainmanager.log` | Deployment, domains, clusters, hosts | **Yes** — VCF 9 KBs 439546 and 418890 |
| SDDC Manager | `/var/log/vmware/vcf/lcm/` | Lifecycle prechecks, bundles, upgrades | Path documented for 5.2 (KB 397253); cited for VCF 9 installer in the Broadcom community — verify |
| SDDC Manager | `/var/log/vmware/vcf/operationsmanager/` | Host commission, certificates, passwords, backups (5.2 description) | 5.2 KB; cited for 9 in community — verify |
| SDDC Manager | `/var/log/vmware/vcf/commonsvcs/` | Inventory, tasks, API (Application Programming Interface) logins | 5.2 KB; cited for 9 in community — verify |
| SDDC Manager | `/var/log/vmware/vcf/sddc-support/` | Output of `sos` bundles | **Yes** — KB 402476 (9.0.x) |
| NSX Manager | `/var/log/syslog`, `/var/log/proton/nsxapi*`, `/var/log/policy/nsxapi*`, `/var/log/corfu/`, `/var/log/cbm/` | API, policy, clustering | KB 376813 (version not stated) — verify |
| NSX Edge | `/var/log/syslog` | Edge datapath/agents | KB 376813 — verify |
| VCF Operations, fleet management, VCF Automation | UI evidence + **Log Assist** / product support bundles | — | Individual file paths **not verified here**; use the documented collection tools |

:::warning
Where a path is marked "verify", it comes from a 5.x/8.x document or a community answer. Before you rely on it in an incident, run `ls` on the appliance. If it differs, trust what is on disk and the 9.x documentation for your build.
:::

### The ESX management agents

| Agent | Role | Talks to | If it fails |
|---|---|---|---|
| [[hostd]] | Host management service; executes VM and host operations; backs the Host Client and API | `vpxa`, Host Client, API clients | Host Client unresponsive; vCenter operations on the host fail; VMs keep running |
| [[vpxa]] | vCenter agent on the host; relays vCenter (`vpxd`) requests to `hostd`; sends heartbeats | `vpxd` on vCenter, `hostd` | Host shows *Not Responding*/*Disconnected* in vCenter; VMs keep running |

Broadcom KB 323612 documents the [[esx-heartbeat|heartbeat]]: the host sends UDP heartbeats to vCenter on **port 902** every **10 seconds**; if vCenter misses them for **60 seconds**, the host is marked not responding. Blocked UDP 902 is the most common cause of hosts that disconnect 30–90 s after being reconnected.

## How It Works

The generic flow for a failed VCF workflow:

1. **Read the task in the UI where it was started** (vCenter, VCF Operations, VCF Installer). Copy the failed step name, error text and timestamp.
2. **Identify the executor.** Domain/cluster/host workflows → SDDC Manager services (domain manager). Lifecycle → fleet management / SDDC Manager LCM (Lifecycle Management). Host-level steps → `hostd`/`vpxa`/`esxupdate` on the host. Network steps → NSX Manager.
3. **Open the executor's log at that timestamp** and search backwards for the **first** error or exception.
4. **Check dependencies for the failing target** (DNS, NTP, certs, credentials, depot/binaries, connectivity).
5. **Collect a bundle** if you will change anything significant: `sos` on SDDC Manager/VCF Installer, Log Assist in VCF Operations.
6. **Fix the cause** and **retry** the workflow from the same UI. Most VCF workflows resume from the failed step; a retry without a fix just fails again.
7. **Verify** the end state in the target product (host in cluster, domain healthy, upgrade completed).

## Deep Dive

### Deployment (VCF Installer)

The VCF Installer appliance runs validation, then executes deployment; its services log under `/var/log/vmware/vcf/...` (collected with the [[sos-utility|SoS utility]]) — `domainmanager.log` is the community-recommended single file to follow during a deployment. Typical causes found there: DNS/NTP inputs, ESX host thumbprints/passwords, network spec errors (VLAN (Virtual Local Area Network), MTU, IP pools), and binaries missing from the depot.

Collect installer logs on 9.0.x (SSH as `vcf`, then `su` to root):

```shell
/opt/vmware/sddc-support/sos --vcf-installer-logs --zip
```

:::vcf9 Changed in VCF 9.1
In 9.1.x, KB 402476 adds `--vcf-mgmt-svcs-logs` (VCF management services, "VMSP") and a *Support-bundle* option in the VCF Installer UI. The exam targets 9.0.
:::

### Host commissioning

Commissioning (vCenter, *Unassigned Hosts*) validates each host before it enters the VCF inventory: reachability, credentials, DNS forward/reverse, NTP, network pool compatibility and storage type. The fastest diagnosis is almost always the dependency checklist from the previous lesson. Broadcom KB 427267 (9.1) also shows the reverse problem: hosts **added to vCenter manually** outside commissioning do not appear correctly in VCF Operations/lifecycle; the fix is to remove them and commission them properly.

### Workload domain and depot failures

KB 439546 (VCF 9.x): workload domain creation failed with *Failed to validate domain spec* / *Failed to retrieve component binary*. `domainmanager.log` showed `Failed to get install image for component VCENTER ...` and `... NSX_T_MANAGER ...`. Causes: binaries not present in the offline depot, and VCF Operations configured to reach the depot on port 80 instead of 443. Fix: seed the depot with the VCF Download Tool, correct the depot port in *Fleet Management → Lifecycle → Depot Settings*, download the bundles, retry. Pattern to remember: **workflow failure → domain manager log → missing dependency (binary/depot) → fix → retry.**

### Lifecycle (upgrades, prechecks)

Lifecycle is planned and executed through VCF Operations fleet management with SDDC Manager LCM services underneath. Precheck failures are *good* failures: they stop before changing anything. Treat each failed precheck as a hypothesis already validated for you — read the check name, fix the stated condition (time, certificates, disk space, health, compatibility), rerun the precheck. Avoid skipping prechecks in production. The lifecycle lessons cover sequencing and recovery.

### Automation (VCF Automation)

VCF Automation depends on everything below it: identity (organisation users log in through SSO (Single Sign-On)), DNS, certificates, vCenter/NSX/Supervisor connectivity for regions, and the content library. When a tenant action fails, scope first: does the same operation work directly in vCenter (for example, deploying the VM from the same template)? If yes, the problem is in VCF Automation configuration (region, org networking, policy); if no, it is in the infrastructure. Detailed VCF Automation log paths are not covered here — use the product's documented support bundle collection.

### ESX host Not Responding / Disconnected

| Observation | Likely layer | Next test |
|---|---|---|
| Host pingable, Host Client works, vCenter shows *Not Responding* | `vpxa` or heartbeat path | Check `vpxa.log`, capture UDP 902 on vCenter |
| Host Client also unresponsive, VMs running | `hostd` | Check `hostd.log`; restart `hostd` only |
| Host not pingable | Network/physical/host down | DCUI/console, physical network |
| Disconnects every ~60 s after reconnect | UDP 902 blocked or wrong managed IP | Firewall rules, vCenter managed IP setting |
| Many hosts at once | vCenter, network, DNS | Scope at vCenter/network level |

KB 323612 lists `Started heartbeating..` repeating every minute in `vpxa.log` as the signature of heartbeat loss, and suggests `tcpdump src <host-ip> and udp port 902` on vCenter to see whether heartbeats arrive.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Make future troubleshooting possible:

| Setting | How | Why |
|---|---|---|
| ESX [[remote-syslog|remote syslog]] | `esxcli system syslog config set --loghost='udp://logs01.vcf.lab:514'` then `esxcli system syslog reload` | Logs survive reboots; correlate in VCF Operations for logs |
| Persistent scratch on ESX | Host configured with persistent OSData/scratch | Avoid losing logs on reboot |
| VCF Operations integrations | Add vCenter, NSX, SDDC Manager, logs | VCF Health, Findings and Log Assist need them |
| Backups | SFTP backup settings in VCF Operations | Supported recovery path for SDDC Manager/NSX/vCenter |
| Depot | Online or offline depot configured with correct protocol/port | Lifecycle and domain workflows need binaries |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

```shell
# ESX: follow the three main logs
tail -f /var/log/vmkernel.log
tail -f /var/log/hostd.log
tail -f /var/log/vpxa.log

# ESX: restart only the agents (NOT services.sh on vSAN/NSX/LACP hosts, KB 320280)
/etc/init.d/hostd restart
/etc/init.d/vpxa restart

# ESX: are heartbeats leaving the uplink? (KB 307364)
pktcap-uw --uplink vmnic0 --capture UplinkSndKernel -o - | tcpdump-uw -r - -nn port 902

# vCenter appliance shell: do heartbeats arrive?
tcpdump src 10.10.10.101 and port 902

# SDDC Manager / VCF Installer (as root): logs and bundles
tail -f /var/log/vmware/vcf/domainmanager/domainmanager.log
/opt/vmware/sddc-support/sos --sddc-manager-logs --zip

# Photon OS appliances: failed units, a unit's journal, disk space
systemctl --failed
journalctl -u <unit-name> --since "30 min ago"
df -h
```

```log
# vpxa.log pattern for heartbeat loss (KB 323612)
[Originator@6876 sub=Heartbeat opID=HostSync-host-1234-4ff474ef-5c] Started heartbeating..

# domainmanager.log pattern for missing binaries (KB 439546)
Failed to get install image for component VCENTER, version 9.0.2.0.25148086
```

## Failure Scenarios

| Scenario | Executor / evidence | Typical root cause | Remediation |
|---|---|---|---|
| Deployment validation fails | VCF Installer UI + `domainmanager.log` | DNS/NTP/input errors, host credentials | Fix inputs/dependencies, re-validate |
| WLD creation fails "Failed to retrieve component binary" | `domainmanager.log` | Depot missing binaries / wrong port | Seed depot, fix port 443, download, retry |
| Host commissioning fails | vCenter task + SDDC Manager logs | DNS, NTP, password, network pool | Fix the dependency, retry |
| Hosts missing in VCF Operations lifecycle | VCF Operations inventory | Host added manually to vCenter | Remove and commission properly |
| Host *Not Responding* | `vpxa.log`, UDP 902 capture | Firewall blocks UDP 902, `vpxa` hung | Fix firewall / restart `vpxa` |
| Upgrade precheck fails | Fleet management lifecycle | Health/time/space/compatibility | Fix condition, rerun precheck |

## Troubleshooting

- **Read the first error, not the last.** In long workflow logs, search backwards from the failure timestamp for the first `ERROR`/exception related to the failed step.
- **Disk full is a silent killer.** Appliances with a full `/` or log partition fail in odd ways; `df -h` is a 2-second check.
- **Restarting SDDC Manager services** is a valid step only after you know which service is unhealthy; William Lam's single-host lab post uses `/opt/vmware/vcf/operationsmanager/scripts/cli/sddcmanager_restart_services.sh` after changing installer feature properties — a lab technique, not a production fix.
- **Do not run `services.sh restart`** on hosts with vSAN, NSX, LACP or shared graphics (KB 320280).
- **Retry only after a fix.** Most VCF workflows are designed to resume, but a retry without a change is just another data point.

## Real-World Scenario

During Alex's nested lab bring-up the VCF Installer stops at an NSX deployment step. The UI error is generic. Following the method:

1. `tail` of `domainmanager.log` around the failure shows a timeout reaching the NSX Manager FQDN (Fully Qualified Domain Name).
2. Dependency check from the installer: forward lookup OK, **reverse lookup of the NSX VIP returns NXDOMAIN** — the PTR record was forgotten for the VIP (only node records existed).
3. Fix: add PTR for the VIP; retry from the installer UI; the workflow resumes from the failed step and completes.
4. Verification: NSX Manager UI reachable via VIP FQDN; installer task green.


## Exam Focus

:::exam
- Know **where VCF 9 workflows start**: commissioning in **vCenter** (*Unassigned Hosts*), workload domains in **VCF Operations** (*Inventory → VCF Instance*), certificates/passwords in **VCF Operations → Fleet Management**, edge cluster in **vCenter → Network Connectivity**.
- `hostd` = host agent; `vpxa` = vCenter agent on the host; heartbeats UDP **902**; host marked not responding after **60 s** without heartbeats.
- Restart `hostd`/`vpxa` individually; avoid `services.sh restart` on vSAN/NSX/LACP hosts.
- Support data: `sos` on SDDC Manager/VCF Installer; **Log Assist** in VCF Operations; VCF Operations for logs for central search.
:::

## Common Exam Traps

:::trap
- Looking for commissioning in the SDDC Manager UI — in 9.0 it starts in **vCenter**.
- Confusing `hostd` and `vpxa`: if only vCenter loses the host but the Host Client works, suspect `vpxa`/heartbeat first.
- Assuming a disconnected host means VMs are down — they keep running.
- Rebooting an appliance to "clear" a failed workflow instead of fixing the dependency and retrying.
- Trusting a 5.x log path blindly in 9.x.
:::

## Knowledge Check

::quiz

## Summary

- Map workflow → executor → evidence. VCF 9 starts many workflows in vCenter and VCF Operations, while SDDC Manager services still execute much of the orchestration.
- Verified for VCF 9: `domainmanager.log` path, `sos` usage/output path, ESX agent restart guidance. Other paths are carried over from 5.x/8.x documentation — confirm on disk.
- For disconnected hosts think `vpxa` + UDP 902 heartbeat; for unresponsive Host Client think `hostd`.
- Collect bundles before changes; retry workflows only after fixing the cause.

## Next Topic

Finish the troubleshooting module with the data path: [Troubleshooting Networking, NSX and vSAN](lesson:troubleshooting-network-nsx-vsan).
