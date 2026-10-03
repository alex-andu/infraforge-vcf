---
id: deployment-validation-failures
title: Deployment Validation and Common Failures
phase: p07-deployment
module: m07-deploy
version: vcf9
minutes: 40
difficulty: advanced
summary: What the VCF Installer validates, how to read warnings versus errors, and how to diagnose the classic deployment failures — DNS, NTP, MTU, passwords, certificates/thumbprints and host preparation.
topics: [deployment-validation, vcf-installer, dns, ntp, mtu, certificates]
objectives: ["4.1"]
keyTerms: [vcf-installer, ssl-thumbprint, deployment-specification, network-pool]
labs: [lab-deploy-vcf-management-domain, lab-network-readiness]
incidents: [inc-host-commissioning, inc-dns-reverse-lookup, inc-ntp-time-skew, inc-mtu-overlay]
components: [vcf-installer, esx-host, dns-service, ntp-service, physical-network, vsan, nsx-manager]
related: [deployment-planning-prereqs, vcf-installer-workflow, host-commissioning-wld-creation, dns-ntp-dependencies, troubleshooting-core-dependencies]
sources:
  - title: "VCF 9.0 – Start a New VCF Fleet or a New VCF Instance Deployment (validation and retry)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/deploying-a-new-vmware-cloud-foundation-or-vmware-vsphere-foundation-private-cloud-/deploy-a-new-vcf-fleet-or-a-new-vcf-instance.html
  - title: "VCF 9.0 – Commission ESX Hosts (host prerequisites)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/commission-hosts.html
  - title: "VCF Installer API 9.0 – Validate SDDC Spec"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/v1/sddcs/validations/post
  - title: "VCF Installer API 9.0 – Deploy SDDC (SddcSpec fields)"
    url: https://developer.broadcom.com/xapis/vcf-installer-api/9.0/v1/sddcs/post
  - title: "Broadcom KB 411694 – Regenerating self-signed certificates on standalone ESXi hosts"
    url: https://knowledge.broadcom.com/external/article/411694/
  - title: "Broadcom KB 307780 – Change the hostname of an ESXi host via DCUI or CLI"
    url: https://knowledge.broadcom.com/external/article/307780/
  - title: "William Lam – Disable 10GbE NIC pre-check in the VCF 9.0 Installer"
    url: https://williamlam.com/2025/06/disable-10gbe-nic-pre-check-in-the-vcf-9-0-installer.html
  - title: "William Lam – vSAN ESA disk HCL workaround for VCF 9.0"
    url: https://williamlam.com/2025/06/vsan-esa-disk-hcl-workaround-for-vcf-9-0.html
  - title: "David Ring – Deploying VCF with VCF Installer (domainmanager log)"
    url: https://davidring.ie/2026/07/28/vcf-9-1-on-dpc-1-4-walkthrough-part3-management-wld/
---

## Why This Matters

The VCF Installer refuses to deploy into an environment that does not meet its prerequisites. That is a feature: a deployment that fails half-way through leaves appliances, switches and vSAN configuration behind. Your job is to read validation output like an engineer — recognise which layer is broken (DNS, time, network, host, certificate, password) and fix the cause, not the symptom. Exam scenarios regularly describe a failed validation and ask for the *first* thing to check.

## Learning Objectives

- Describe the validation step of the VCF Installer and the difference between warnings and errors.
- Map common validation and deployment errors to their root-cause layer.
- Diagnose DNS, NTP, MTU, password, certificate/thumbprint and host-preparation failures with the right tool.
- Explain how to resume a failed deployment (fix, then retry the task).
- Identify which lab-only workarounds exist and why they are unsupported.

## Concept

Validation happens at two moments:

1. **Pre-deployment validation** — after the Review page, the installer validates "all provided information". **Warnings** can be acknowledged and you can proceed. **Errors** block deployment until resolved; you fix them in the wizard or upload a corrected JSON spec.
2. **Runtime failures** — a deployment task fails (for example the NSX Manager deployment). The deployment stops at that task; TechDocs' guidance is to "review failed tasks, address issues, and retry".

In the API, a validation returns an `executionStatus` (`IN_PROGRESS`, `COMPLETED`, `FAILED`, …) and a `resultStatus` (`SUCCEEDED`, `FAILED`, `WARNING`, …) with a list of `validationChecks`. The `SddcSpec` even contains two explicit escape hatches — `skipEsxThumbprintValidation` and `skipGatewayPingValidation` — which tells you that thumbprints and gateway reachability are real checks.

:::general
**Dependency order for troubleshooting** — always fix the lowest layer first: physical network and VLANs → IP/gateway → DNS → NTP → MTU → host state → certificates/thumbprints → passwords/credentials → component-specific. A DNS error can masquerade as a certificate error; a time-skew error can masquerade as an authentication error.
:::

## Architecture

::diagram[d07-validation-failure-map]

What the installer touches during validation:

| Target | Typical check |
|---|---|
| DNS server | Forward and reverse resolution of every host and appliance FQDN |
| NTP server | Reachability and time consistency of hosts |
| Gateways | Ping the gateways of the networks you specified (can be skipped only through the JSON spec) |
| ESX hosts | Reachable, credentials valid, ESX version supported, hostname/FQDN, certificate thumbprint, NIC count and speed, disks eligible for the chosen storage |
| IP ranges | Enough free addresses for vMotion/vSAN, no overlap, no network/broadcast addresses |
| Passwords | Complexity rules per component |

## Components

| Component | Failure it typically produces |
|---|---|
| DNS service | "Cannot resolve", reverse lookup mismatch, wrong FQDN in certificate |
| NTP service | Time-skew warnings, token/auth failures later, certificate "not yet valid" |
| Physical network | Gateway unreachable, vMotion/vSAN connectivity test fails, MTU mismatch |
| ESX host | Not 10 Gbps, partitions on disks, wrong ESX build, stale certificate, SSH/credentials |
| Certificate (host) | Thumbprint not confirmed, CN/SAN not matching FQDN |
| Passwords | Complexity rejection, unsupported character (`%` in vCenter password) |

## How It Works

The diagnostic loop for a failed validation:

1. **Read the exact check** that failed and the object it names (host, appliance, network).
2. **Classify the layer**: DNS, NTP, network/MTU, host, certificate, password.
3. **Test from the installer's point of view** — the installer's DNS resolver and routing are what matter, not your laptop's.
4. **Fix the source** (DNS record, NTP config, switch port MTU, host certificate…), never by editing the spec around it.
5. **Re-run validation**; repeat until only acknowledged warnings remain.
6. **Deploy**; if a runtime task fails, read its error, fix the cause, **retry**.

## Deep Dive

### DNS

The single most common cause. Rules: every FQDN has an A record **and** a PTR record; the PTR returns the same FQDN (case and domain match); the hostname configured on the ESX host is the FQDN. Typical traps: reverse zone missing, PTR pointing to an old name, split-brain DNS where the installer uses a different resolver from yours, hostnames entered in the wizard in a different case.

```shell
nslookup esx03.lab.local     # forward
nslookup 10.0.10.13          # reverse must return esx03.lab.local
```

### NTP

Hosts and appliances must agree on time. Skew causes certificate validity errors ("not yet valid"), token failures and SSO problems after deployment. Point every host and the installer at the same NTP source, and verify the source is reachable over UDP 123 from the management network.

### MTU

vSAN, vMotion and NSX overlay traffic are commonly configured with jumbo frames. If one switch port or the inter-switch link stays at 1500, small pings work and large frames are dropped. Test with don't-fragment pings sized to the MTU:

```shell
vmkping -I vmk2 -d -s 8972 10.0.12.12   # 9000 MTU
vmkping -I vmk10 -d -s 1572 10.0.13.12  # 1600 MTU overlay (TEP vmk number varies)
```

### Passwords

The wizard enforces per-component complexity (auto-generated passwords are 20 characters with at least one special character, number and uppercase letter). The vCenter page explicitly warns against `%`. Different root passwords per host are not possible in the UI — use a JSON spec.

### Certificates and thumbprints

When ESX is installed, it generates a self-signed certificate for whatever name it had at that moment (often `localhost`). If you then set the FQDN without regenerating, the certificate does not match the host name. The installer asks you to **confirm thumbprints** of each host; a stale certificate, a host re-installed with the same IP (new thumbprint), or a man-in-the-middle proxy all show up here.

```shell
esxcli system hostname set --fqdn=esx03.lab.local
/sbin/generate-certificates
/etc/init.d/hostd restart && /etc/init.d/vpxa restart
```

If you deploy with hosts that use certificates from an **external CA**, hosts later added to VCF domains must also use external-CA certificates.

### Host preparation

| Symptom | Cause | Fix |
|---|---|---|
| Disk not eligible for vSAN | Old partitions on the device | Delete partitions (Host Client → Storage → Devices → Clear partition table) |
| "No vSAN ESA certified disks found" | Disk not on the vSAN ESA HCL | Use certified hardware; in a lab, see the unsupported workaround below |
| NIC speed check fails | Management NIC below 10 Gbps | Use 10 Gbps+ NICs; lab-only property exists |
| vMotion validation fails | MAC address filtering on the physical network blocks the test VMkernels | Allow the MACs / disable filtering on those ports |
| Host version rejected | ESX build not in the BOM | Re-image with the supported build |

:::warning
**Lab-only, unsupported workarounds** (documented by William Lam, not by Broadcom support): a property `enable.speed.of.physical.nics.validation=false` to skip the 10 GbE check, the vSAN ESA hardware mock VIB, and refreshing the installer's embedded vSAN HCL JSON when it is older than 90 days. They exist for nested labs; never use them in production. VCF 9.0.1 added the ability to use non-certified ESA disks for proof-of-concept only (TechDocs, commission hosts page).
:::

### Symptoms that mislead

| What you see | What it often really is |
|---|---|
| Certificate or thumbprint error on one host | Host renamed after install without regenerating the certificate, or DNS returning another host's name |
| Authentication or token errors after deployment | Time skew between appliances and hosts (NTP) |
| vMotion or vSAN connectivity check fails, but ping works | MTU mismatch on one hop, or MAC address filtering on the physical switch |
| Host "not reachable" for one step only | Firewall or VLAN on a specific VMkernel network, not the management network |
| Random appliance deployment failures | Duplicate IP address on the appliance network |

## Configuration

A validation-ready checklist you can run in 15 minutes before pressing Validate:

| # | Check | Command / place |
|---|---|---|
| 1 | Every FQDN resolves forward and reverse from the installer | `nslookup` on the installer shell |
| 2 | Host time within seconds of NTP source | Host Client → Manage → System → Time & date |
| 3 | Hostname = FQDN, cert regenerated | `esxcli system hostname get`; view cert subject in Host Client |
| 4 | Disks empty | Host Client → Storage → Devices |
| 5 | Jumbo frames end to end | `vmkping -d -s 8972` between hosts |
| 6 | Gateways answer ping on each VLAN | `vmkping` to gateway |
| 7 | Passwords meet rules, no `%` for vCenter | Workbook |

## CLI / API

```shell
# Validate via API and poll
curl -sk -X POST https://installer.lab.local/v1/sddcs/validations \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @spec.json
curl -sk https://installer.lab.local/v1/sddcs/validations/<id> -H "Authorization: Bearer $TOKEN"

# Follow deployment orchestration on the appliance
tail -f /var/log/vmware/vcf/domainmanager/domainmanager.log
```

## Failure Scenarios

| Scenario | Error type | Root cause | Fix |
|---|---|---|---|
| Validation: "reverse lookup does not match" for esx03 | Error | PTR points to old name | Fix PTR, re-validate |
| Validation: host thumbprint cannot be confirmed / certificate mismatch | Error | Certificate generated before hostname change | Regenerate certificate, restart hostd/vpxa |
| Validation: vSAN IP range insufficient | Error | Range smaller than host count | Extend range |
| Validation: NTP warning | Warning | Time slightly off / unreachable secondary | Fix and re-validate; do not just acknowledge |
| Runtime: NSX Manager deployment task fails | Task failure | DNS for NSX nodes/VIP or IP conflict | Fix, retry task |
| Post-deploy: vSAN partitioned | Health alarm | MTU mismatch on vSAN VLAN | Fix switch MTU |

## Troubleshooting

- **Always test from the installer**, because its resolver and routes define success.
- **Do not acknowledge warnings blindly**; an NTP warning today is an authentication incident next month.
- **Reverse DNS failures** are not fixed by adding hosts files — fix the DNS zone.
- **Retrying** a runtime failure without fixing the cause repeats the failure; read the log.

::incident[inc-host-commissioning]

## Real-World Scenario

A deployment validates cleanly, then fails at the NSX Manager deployment task. The task error says the appliance could not be reached after power-on. The engineer checks DNS (fine), then notices the NSX Manager IP is also assigned to a forgotten test VM — an IP conflict. After removing the conflict, they **retry** the task in the Tasks panel and the deployment continues from where it stopped rather than starting over.

## Lab

Validation is the core of the deployment lab — intentionally break DNS and a certificate before validating to see the errors.

::lab[lab-deploy-vcf-management-domain]

## Exam Focus

:::exam
- Warnings can be acknowledged; errors must be fixed before Deploy.
- A failed task is fixed and **retried** — no need to start over.
- Root-cause order: network → DNS → NTP → MTU → host → certificate → password.
- Hostname change requires certificate regeneration.
- JSON spec needed for different host passwords or LAG.
:::

## Common Exam Traps

:::trap
- Blaming the installer for a DNS problem: "re-deploy the VCF Installer" is never the first fix.
- Choosing "skip validation" as a fix — skipping checks hides root causes.
- Confusing an MTU problem (large frames dropped, small pings OK) with a VLAN problem (nothing works).
:::

## Knowledge Check

::quiz

## Summary

The VCF Installer validates DNS, NTP, gateways, IP ranges, host configuration, certificates and passwords before deployment. Warnings can be acknowledged, errors block. Most failures are environmental — fix the lowest broken layer, re-validate, and retry failed tasks after fixing their cause.

## Next Topic

Next: [Importing and Converging an Existing vCenter](lesson:import-existing-vcenter).
