---
id: troubleshooting-methodology
title: "A Troubleshooting Method for VCF: Observe, Scope, Hypothesize, Validate, Remediate, Verify"
phase: p13-troubleshooting
module: m13-method
version: vcf9
minutes: 40
difficulty: intermediate
summary: A repeatable six-step diagnostic method for VCF 9, how to apply it across layers (physical, ESX, vCenter, NSX, vSAN, management components) and how VCF Operations diagnostics, logs and support bundles fit into each step.
topics: [troubleshooting-method, logs-locations, health-diagnostics]
objectives: ["4.3"]
keyTerms: [root-cause-analysis, vcf-health, troubleshooting-workbench, log-assist, support-bundle, sos-utility]
labs: [lab-troubleshooting-drill]
incidents: [inc-esx-host-disconnected, inc-dns-reverse-lookup, inc-ntp-time-skew]
components: [vcf-operations, sddc-manager, vcenter, esx-host]
related: [troubleshooting-core-dependencies, troubleshooting-vcf-services, troubleshooting-network-nsx-vsan, vcf-operations-logs-network-ops]
sources:
  - title: "VCF 9.0 – Using VCF Operations diagnostics"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics.html
  - title: "VCF 9.0 – Monitor Your Environment and Prevent Issues with VCF Health"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics/monitor-your-environment-and-prevent-issues-with-vcf-health.html
  - title: "VCF 9.0 – Use Log Assist to Accelerate Your Support Cases"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics/use-log-assist-to-accelerate-your-support-cases.html
  - title: "VCF 9.0 – Troubleshooting Using Troubleshooting Workbench"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/troubleshooting-workbench-home-page.html
  - title: "Broadcom KB 402476 – Collecting VCF Installer logs and VMSP logs"
    url: https://knowledge.broadcom.com/external/article/402476
  - title: "Broadcom KB 320280 – Restarting Management Agents in ESXi"
    url: https://knowledge.broadcom.com/external/article/320280
  - title: "VMware Cloud Foundation Administrator exam guide (2V0-17.25)"
    url: https://docs.broadcom.com/doc/vmware-cloud-foundation-administrator-exam-guide
---

## Why This Matters

VCF (VMware Cloud Foundation) is a stack of tightly coupled products: ESX hosts, vCenter, vSAN, NSX, SDDC (Software-Defined Data Center) Manager, VCF Operations, VCF Automation and the identity broker, all glued together by DNS (Domain Name System), NTP (Network Time Protocol), certificates and a physical network. When something breaks, the symptom almost never appears where the cause is. A host commissioning failure in the UI can be a reverse DNS record. An NSX "tunnel down" alarm can be an MTU mismatch on a physical switch port. A failed upgrade precheck can be a clock that drifted four minutes.

Beginners usually troubleshoot by **guessing and restarting**: reboot the appliance, restart a service, retry the task. Sometimes it works, and you learn nothing. Often it makes things worse: you destroy the evidence (logs roll over, a stuck task gets a new ID), or you restart the wrong thing (`services.sh restart` on a vSAN host, see [Troubleshooting](#troubleshooting)).

The exam guide describes the target candidate as someone who can "install, configure, manage, and perform basic troubleshooting" of VCF, and lists DNS, NTP and certificates as assumed foundational knowledge. Questions are written as "Given a scenario…", so you are rewarded for knowing *which evidence to look at first* and *what to do next*, not for memorising error strings. A method gives you that.

## Learning Objectives

- Apply the six-step method — **Observe → Scope → Hypothesize → Validate → Remediate → Verify** — to any VCF incident.
- Separate a **symptom** from a **cause**, and a **trigger** from a **root cause**.
- Scope an incident by layer (physical, host, cluster, domain, instance, fleet) and by blast radius.
- Choose the cheapest discriminating test for each hypothesis, and know which tools (VCF Health, Diagnostics Findings, Troubleshooting Workbench, logs, CLI (Command-Line Interface)) provide the evidence.
- Remediate with the smallest safe change, verify against the original symptom, and capture evidence (support bundles) before destructive actions.

## Concept

Troubleshooting ([[root-cause-analysis]]) is applied scientific method under time pressure. Each step has a clear output; if you cannot write that output down in one sentence, you are not ready for the next step.

| Step | Question it answers | Output | Typical VCF tools |
|---|---|---|---|
| **1. Observe** | What exactly is happening, since when, and who noticed? | A precise symptom statement with timestamps and exact error text | UI task details, alarms, VCF Operations alerts, user report |
| **2. Scope** | What is affected and what is *not*? Which layer? | Blast radius: one VM / host / cluster / domain / whole instance; what changed recently | vCenter inventory, VCF Health, NSX/vSAN health, change log |
| **3. Hypothesize** | What could cause exactly this pattern? | A short ranked list of causes, most likely and cheapest-to-test first | Dependency chain (DNS → NTP → certs → auth → services), experience, KBs |
| **4. Validate** | Which hypothesis does the evidence confirm or eliminate? | One confirmed cause, with proof (a log line, a failed lookup, a ping that fails at 8972 bytes) | Logs, `nslookup`, `vmkping`, `esxcli`, Troubleshooting Workbench |
| **5. Remediate** | What is the smallest safe fix? | A change, ideally reversible, done in a controlled way | Fix DNS record, resync time, replace certificate, restart one agent, retry task |
| **6. Verify** | Is the original symptom gone, and did we break nothing else? | Symptom cleared, health green, task retried successfully, notes written | Retry the original task, health checks, alarms cleared |

:::general
**Symptom vs cause.** "Host shows *Not Responding* in vCenter" is a symptom. "UDP 902 heartbeats from the host are dropped by a new firewall rule" is a cause. "Someone pushed a firewall change at 14:02" is the trigger. A good root cause statement names the *mechanism* and the *trigger*, so the fix and the prevention are both obvious.
:::

Two principles keep the method honest:

1. **Preserve evidence before you change anything.** Collect a support bundle or at least copy the relevant log lines and timestamps *before* restarting or rebooting. Restarts reset in-memory state and can rotate logs.
2. **Change one thing at a time.** If you fix DNS, resync NTP and restart three services at once, you will not know what fixed it, and you will not be able to write the root cause.

## Architecture

The method is layered on top of the VCF dependency stack. Every VCF symptom lives somewhere in this picture, and scoping is the act of finding the lowest layer that is still unhealthy.

::diagram[d13-troubleshooting-framework]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/c99bb603-c1e2-495b-96ca-47c4d55c33ee.original.png" caption="Example VCF Nodes Configuration in a VCF Fleet (Broadcom TechDocs)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html"}

Read the stack bottom-up when scoping:

| Layer | Examples of what lives here | If unhealthy, typically affects |
|---|---|---|
| Physical / external services | Switches, VLANs, MTU, router, DNS, NTP, CA (Certificate Authority), identity provider | Everything above it, often many components at once |
| ESX host | VMkernel, `hostd`, `vpxa`, vmknics, storage devices | VMs on that host, vSAN/NSX participation of that host |
| Cluster services | vSAN, vSphere HA (High Availability), DRS (Distributed Resource Scheduler), NSX transport node / TEPs | All VMs in the cluster, cluster-level operations |
| Domain control | vCenter, NSX Manager cluster | Management operations for the domain (data plane often continues) |
| Instance / fleet management | SDDC Manager, VCF Operations, fleet management, VCF Automation, identity broker | Workflows (commissioning, LCM (Lifecycle Management), certificates, passwords), self-service, SSO (Single Sign-On) |

:::tip
A single unhealthy component is usually a local problem. **Many unrelated components failing at once** almost always points down the stack: DNS, NTP, a certificate authority, the identity provider, or the physical network.
:::

## Components

The tools you use in each step, and where they run:

| Tool | Where it runs / how you reach it | Best for step |
|---|---|---|
| **VCF Operations – [[vcf-health|VCF Health]]** | VCF Operations, under *Infrastructure Operations* → diagnostics. Cards for Certificates, NTP and DNS, vCenter, VM operations, vMotion and VM snapshots | Observe, Scope |
| **VCF Operations – Diagnostics Findings** | VCF Operations diagnostics; matches property- and log-based signatures to known issues | Hypothesize (known issue match) |
| **[[troubleshooting-workbench|Troubleshooting Workbench]]** | VCF Operations: *Infrastructure Operations → Troubleshooting Workbench*; adjustable scope and time range around an object or alert | Scope, Validate (what changed, what is anomalous) |
| **VCF Operations for logs** | Central log platform receiving syslog from ESX, vCenter, NSX and others | Validate (correlate log lines across components by time) |
| **Component logs** | ESX `/var/log/*.log`, vCenter `/var/log/vmware/<service>/`, SDDC Manager `/var/log/vmware/vcf/...`, NSX `/var/log/...` | Validate |
| **CLI checks** | ESX Shell/SSH (`esxcli`, `vmkping`), appliance shells (`systemctl`, `journalctl`, `df -h`), NSX CLI | Validate, Verify |
| **[[support-bundle|Support bundles]]** | `sos` utility on SDDC Manager/VCF Installer; Log Assist in VCF Operations; vCenter and ESX log bundles | Preserve evidence, escalate to support |

:::vcf9 Changed in VCF 9
VCF 9 moves day-2 workflows out of the SDDC Manager UI: per the VCF blog, host commissioning is done in vCenter (*Global Inventory List → Hosts → Unassigned Hosts*), workload domain creation, certificates and passwords in VCF Operations (*Inventory → VCF Instance*, *Fleet Management → Certificates / Passwords*). The UI where a failure is *reported* is therefore not always the component that *executes* it — SDDC Manager services still do much of the work in the background, so their logs remain key evidence.
:::

## How It Works

A worked pass of the method on a typical VCF symptom: *"Commissioning esx-07 fails at validation."*

1. **Observe.** Open the failed task and copy the exact error text and timestamp. Note the UI (vCenter commissioning wizard), the host FQDN (Fully Qualified Domain Name), and who ran it. Ask: did this ever work? Did anything change (new host, re-IP, new DNS server)?
2. **Scope.** Is it only esx-07 or every new host? Can esx-07 be reached at all (ping, Host Client)? Do existing hosts and workloads behave normally? Here: other hosts are fine, only esx-07 fails → local to esx-07 or its records.
3. **Hypothesize.** Rank causes for "validation fails for one host": (a) forward/reverse DNS mismatch for esx-07, (b) NTP not configured/time skew on esx-07, (c) wrong root password or SSH disabled, (d) host certificate does not match the FQDN, (e) network pool / VLAN (Virtual Local Area Network) wrong for vMotion or vSAN. Cheapest tests first: DNS and NTP are one command each.
4. **Validate.** From the SDDC Manager appliance run `nslookup esx-07.vcf.lab` and `nslookup 10.10.10.107`. The reverse lookup returns `esx-17.vcf.lab` — a stale PTR record. Hypothesis (a) confirmed; you also read the matching validation error in the SDDC Manager service log to make sure the evidence agrees.
5. **Remediate.** Fix the PTR record on the DNS server (smallest change). Do not touch the host.
6. **Verify.** Repeat both lookups from the SDDC Manager appliance, retry the commissioning validation, confirm it passes, and write the root cause: "Stale PTR record for 10.10.10.107 (left from esx-17 decommission) caused commissioning validation failure."

:::exam
On the exam, scenario answers that **jump straight to a disruptive action** (reboot the vCenter, redeploy the appliance, restart all services) are almost always wrong when a cheaper, more specific check exists. Look for the option that *gathers or validates evidence* or that fixes the *dependency*.
:::

## Deep Dive

### Observe: write a precise symptom statement

A useful symptom statement has five parts: **what** (exact error/alarm), **where** (object, FQDN, domain), **when** (first seen, timestamps, frequency), **who/what triggered** (user action, scheduled job, upgrade), and **what still works**. "vCenter is broken" is not a symptom. "Since 09:14 UTC, vc-mgmt UI login fails for all users with a token error; API (Application Programming Interface) logins from VCF Operations also fail; VMs keep running" is.

Always record times in one time zone and note the clock of the component you read it from. If clocks disagree, that is already evidence (see [Troubleshooting Core Dependencies](lesson:troubleshooting-core-dependencies)).

### Scope: blast radius and layers

Scope along three axes:

| Axis | Ask | Example conclusion |
|---|---|---|
| **Breadth** | One object, a cluster, a domain, the instance, the fleet? | "Only hosts in cluster wld01-c01" |
| **Plane** | Management, control or data plane? | "VMs still pass traffic; only NSX Manager UI is slow" → management plane |
| **Time** | Sudden or gradual? Correlated with a change or schedule? | "Started right after the 02:00 backup job" |

Management-plane failures (vCenter, NSX Manager, SDDC Manager down) usually **do not stop running workloads**: VMs keep running on ESX, and established NSX data-plane forwarding continues on hosts. That is why scoping the plane matters — it changes urgency and remediation risk.

### Hypothesize: use the dependency chain

When you do not know where to start, walk the chain **DNS → NTP → certificates → authentication → services → workflow**. Each later link depends on the earlier ones: a TLS handshake needs correct time, SSO tokens need correct time and trusted certificates, workflows call services by FQDN. This chain is the subject of the next lesson.

Rank hypotheses by **likelihood × cheapness**. A `nslookup` costs seconds; a full log bundle analysis costs an hour. Do the cheap discriminating test first.

### Validate: discriminating tests

A good test **eliminates** hypotheses. "Ping vCenter" proves little if all your hypotheses predict ping works. A test that distinguishes is, for example, `vmkping -d -s 8972` between two TEPs: an MTU problem predicts failure at 8972 bytes but success at 1472, a routing problem predicts failure at both sizes.

| Hypothesis | Discriminating test | Result if true |
|---|---|---|
| Reverse DNS wrong | `nslookup <ip>` from the component that complains | Wrong or no name |
| Time skew | Compare time on both ends (`date -u`, `esxcli system time get`) | Difference of minutes |
| Certificate untrusted/expired | `openssl s_client -connect fqdn:443` and read dates/issuer | Expired / unknown issuer |
| Jumbo MTU missing on path | `vmkping -d -s 8972` vs `-s 1472` | Large fails, small works |
| Heartbeat blocked (UDP 902) | Capture UDP 902 on vCenter or the host uplink | No packets arrive |

### Remediate: smallest safe change

Prefer, in order: fix the **dependency** (DNS record, NTP source) → fix **configuration** (MTU, VLAN) → restart **one** failed service → retry the **workflow** from the UI/API → only then larger actions (reboot, redeploy, restore from backup). Before anything destructive, take a snapshot or backup where it is supported, and collect logs.

:::warning
Do not take snapshots of NSX Manager nodes as a "backup" before a change and do not revert management appliances from ad-hoc snapshots in production: VCF components keep state with each other, and reverting one in isolation can create inconsistencies. Use the supported file-based backups (SFTP target configured in VCF Operations fleet management / instance settings). In your nested home lab, whole-lab snapshots taken while everything is powered off are a different story — see the Home Lab section.
:::

### Verify: close the loop

Verification is against the **original symptom**, by the **original path**: if commissioning failed in the vCenter wizard, it must pass in that wizard. Also check that you did not create a new problem (new alarms, health cards turning yellow). Finally write a one-paragraph incident note: symptom, scope, root cause, fix, prevention.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

There is little to "configure" for a method, but a few settings make every future incident easier:

| Setting | Why it helps | Where |
|---|---|---|
| Central logging to **VCF Operations for logs** (or another syslog server) | Logs survive host reboots and you can correlate across components by time | ESX: `esxcli system syslog config set --loghost=...`; vCenter/NSX syslog settings; VCF Operations integrations |
| Consistent **NTP** everywhere | Timestamps line up, TLS and SSO work | ESX, appliances, physical switches, DNS server |
| **VCF Health** reviewed daily | Catches certificate expiry, NTP/DNS drift before they break workflows | VCF Operations diagnostics |
| **Backups** configured (SFTP) | Gives a supported recovery path | VCF Operations: *Fleet Management → Lifecycle → Settings*, and instance backup settings |
| Change log | Most incidents correlate with a change | Your own notes, ticketing |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

The first commands to reach for, by layer (details and outputs in the next lessons and in the Commands reference):

```shell
# ESX host: live kernel, host agent and vCenter agent logs
tail -f /var/log/vmkernel.log
tail -f /var/log/hostd.log
grep -i heartbeat /var/log/vpxa.log | tail -20

# ESX host: where are logs going?
esxcli system syslog config get

# Photon OS appliances (vCenter, SDDC Manager): service state and disk space
systemctl --failed
df -h

# SDDC Manager / VCF Installer: the domain manager log (deployments, domains)
tail -f /var/log/vmware/vcf/domainmanager/domainmanager.log

# SDDC Manager / VCF Installer 9.0.x: collect a support bundle before changing things (as root)
/opt/vmware/sddc-support/sos --sddc-manager-logs --zip
```

## Failure Scenarios

How the method behaves on common failure patterns:

| Pattern | Typical wrong move | Method-driven move |
|---|---|---|
| Many components fail at the same minute | Restart each appliance | Scope says "everything" → check shared dependencies: DNS, NTP, physical network, CA |
| A task fails at the same step every retry | Retry ten times | Read the task error and the owning service log for the first error, not the last |
| Intermittent disconnects every ~60 s | Reboot host | Pattern suggests heartbeat loss (UDP 902) → capture traffic |
| Works with small packets, fails with large transfers | Blame the application | Test path MTU with `vmkping -d` |
| Only after an upgrade/cert replacement | Roll back immediately | Check trust and time first; compare before/after |

## Troubleshooting

Method-level pitfalls (the things that make troubleshooting itself fail):

- **Restarting before collecting.** Always grab the timestamps, error text and a bundle first. In VCF 9.0.x, `sos --sddc-manager-logs --zip` (or `--vcf-installer-logs`) on the SDDC Manager/VCF Installer, Log Assist in VCF Operations for other components.
- **Using `services.sh restart` reflexively on ESX.** Broadcom KB 320280 says *not* to use `services.sh restart` (or the DCUI restart of all agents) on hosts using vSAN, LACP, NSX or shared graphics. Restart only [[hostd]] and/or [[vpxa]] with `/etc/init.d/hostd restart` and `/etc/init.d/vpxa restart`.
- **Reading the last error instead of the first.** Cascading failures produce many errors; the first error in time is usually closest to the cause.
- **Trusting one component's clock.** Correlate timestamps only after confirming NTP.
- **Fixing two things at once.** You lose the ability to state a root cause.

## Real-World Scenario

Monday morning, Alex finds that VCF Operations shows many red alerts: vCenter collection failing, NSX Manager adapter errors, and the SDDC Manager integration in warning. Nobody changed VCF over the weekend.

- **Observe:** All errors started Saturday 03:00 UTC. Error text mentions "certificate" and "authentication".
- **Scope:** Every integration from VCF Operations fails; vCenter UI login works for local admin but SSO users fail; VMs are fine → management plane, multi-component, started at one moment.
- **Hypothesize:** Shared dependency: (1) NTP source changed/broke and clocks drifted, (2) a CA or certificate expired, (3) identity provider down.
- **Validate:** VCF Health's NTP and DNS card shows the home router (the NTP source) was rebooted Saturday and now serves time from an unsynchronised RTC; appliance clocks differ by 6 minutes.
- **Remediate:** Point the router's NTP to a reliable upstream, wait for sync, then confirm appliances converge.
- **Verify:** Integrations go green within a collection cycle, SSO logins work. Prevention: two independent NTP sources.

The same incident without a method usually ends with someone rebooting vCenter, which "fixes" nothing and costs an hour.


## Exam Focus

:::exam
- Know the order **Observe → Scope → Hypothesize → Validate → Remediate → Verify** and what each step produces. Expect ordering questions.
- "What should the administrator do **first**?" → gather evidence/scope, or check the most likely shared dependency; not reboot/redeploy.
- Know what VCF Operations diagnostics provides: **VCF Health** (certificates, NTP and DNS, vCenter, VM operations, vMotion, snapshots), **Diagnostics Findings** (known issues), **Log Assist** (log bundles to support), and the **Troubleshooting Workbench**.
- Management-plane outage ≠ data-plane outage: VMs keep running if vCenter or NSX Manager is down.
:::

## Common Exam Traps

:::trap
- **"Restart all management agents"** sounds safe; on vSAN/NSX/LACP hosts `services.sh restart` is explicitly discouraged. Restart `hostd`/`vpxa` individually.
- **Retrying a failed workflow** without fixing the cause is not remediation.
- **Symptom shown in VCF Operations ≠ problem in VCF Operations.** VCF Operations often just *reports* a failure in vCenter, NSX or SDDC Manager.
- **Verification** means re-testing the original symptom path, not just "the service is running".
- Many simultaneous failures → think **DNS/NTP/certificates/network** before individual products.
:::

## Knowledge Check

::quiz

## Summary

- Troubleshoot with a method: **Observe** precisely, **Scope** by breadth/plane/time, **Hypothesize** using the dependency chain, **Validate** with cheap discriminating tests, **Remediate** with the smallest safe change, **Verify** against the original symptom.
- Preserve evidence (timestamps, first error, support bundles) before restarts.
- VCF Operations diagnostics (VCF Health, Findings, Log Assist) and the Troubleshooting Workbench support Observe/Scope/Validate; component logs and CLI provide proof.
- Simultaneous multi-component failures point to shared dependencies.

## Next Topic

Next you will apply the method to the dependencies that break VCF most often: [DNS, NTP, certificates and identity](lesson:troubleshooting-core-dependencies).
