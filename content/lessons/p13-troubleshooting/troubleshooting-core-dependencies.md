---
id: troubleshooting-core-dependencies
title: "Troubleshooting Core Dependencies: DNS, NTP, Certificates and Identity"
phase: p13-troubleshooting
module: m13-method
version: vcf9
minutes: 40
difficulty: intermediate
summary: Why DNS, NTP, certificates and identity sit underneath every VCF workflow, how each one fails, what the symptoms look like in VCF 9, and how to prove or eliminate each dependency quickly.
topics: [dns, ntp, certificates, identity-sso, troubleshooting-method]
objectives: ["4.2", "4.3"]
keyTerms: [root-cause-analysis, vcf-health]
labs: [lab-network-readiness, lab-troubleshooting-drill, lab-certificate-replacement]
incidents: [inc-dns-reverse-lookup, inc-ntp-time-skew, inc-certificate-trust]
components: [dns-service, ntp-service, vcf-identity-broker, vcenter, sddc-manager, vcf-operations]
related: [troubleshooting-methodology, dns-ntp-dependencies, certificate-management, vcf-identity-sso-rbac, deployment-validation-failures]
sources:
  - title: "VCF 9.0 – Monitor Your Environment and Prevent Issues with VCF Health"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/infrastructure-operations/using-vcf-operations-diagnostics/monitor-your-environment-and-prevent-issues-with-vcf-health.html
  - title: "VCF 9.0 – VCF Single Sign-On Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
  - title: "VMware Cloud Foundation blog – 10 VCF 9 enhancements simplifying day-2 operations"
    url: https://blogs.vmware.com/cloud-foundation/2025/09/18/10-vmware-cloud-foundation-9-enhancements-simplifying-your-day-2-operations/
  - title: "Broadcom KB 418890 – VCF Installer fails SDDC specification validation with SSH authentication error"
    url: https://knowledge.broadcom.com/external/article/418890
  - title: "VMware Cloud Foundation Administrator exam guide (2V0-17.25)"
    url: https://docs.broadcom.com/doc/vmware-cloud-foundation-administrator-exam-guide
---

## Why This Matters

Four services sit underneath everything in VCF (VMware Cloud Foundation): **DNS (Domain Name System)**, **NTP (Network Time Protocol)**, **certificates (PKI)** and **identity (SSO (Single Sign-On))**. None of them is a VCF product, yet together they cause a large share of failed deployments, failed commissioning, failed upgrades and "random" authentication errors. The exam guide lists DNS, NTP and certificates among the foundational enterprise IT topics a candidate must already know, and objective 4.2 asks you to configure certificate management and identity/RBAC (Role-Based Access Control).

They also fail in a deceptive way: the error appears in a product UI ("Failed to connect", "Authentication failed", "Validation failed"), so beginners debug the product. This lesson trains the opposite reflex: **check the foundations first, in order.**

## Learning Objectives

- Explain the dependency chain **DNS → NTP → certificates → authentication → services → workflows** and why the order matters.
- Recognise the typical VCF 9 symptoms of forward/reverse DNS errors, time skew, certificate problems and identity broker problems.
- Prove or eliminate each dependency with one or two commands from the right vantage point.
- Choose safe remediations (fix the record, fix the time source, replace/trust the certificate, fix the identity source) and verify them.
- Use VCF Health (Certificates, NTP and DNS cards) to detect these problems before they break workflows.

## Concept

Each link in the chain needs the previous ones:

| Link | What VCF needs from it | Breaks when |
|---|---|---|
| **DNS** | Every component reachable by [[fqdn|FQDN (Fully Qualified Domain Name)]]; **forward ([[a-record|A]]) and reverse ([[ptr-record|PTR]]) records that agree** | Missing/stale PTR, typo, wrong DNS server on one component, split-brain zones |
| **NTP** | All components and ESX hosts on the same time | One source unsynced, firewall blocks UDP 123, host configured without NTP |
| **Certificates** | TLS between every component; each certificate valid *now*, matching the FQDN, issued by a trusted CA (Certificate Authority) | Expiry, wrong SAN/FQDN, CA not trusted by the peer, clock outside validity window |
| **Identity (SSO)** | Users and solution users get tokens from the identity broker / vCenter SSO; tokens validated by time and signature | Identity source unreachable, time skew, broker certificate/trust problems |
| **Services / workflows** | Calls between SDDC (Software-Defined Data Center) Manager, vCenter, NSX, VCF Operations by FQDN over TLS with tokens | Any link above failing |

:::general
**Why reverse DNS matters.** VCF components and validations look up IP → name to confirm identity (for example, that the host at 10.10.10.107 really is `esx-07.vcf.lab`), and certificates are issued to FQDNs. A missing or stale PTR record can make a perfectly healthy host fail validation.
:::

## Architecture

::diagram[d13-dependency-chain]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/a9030c92-6fbe-4251-a1ed-61494feee0f6.original.svg" caption="VCF Identity Broker Models for VMware Cloud Foundation (Broadcom TechDocs)" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html"}

Where the dependencies live in a VCF 9 instance:

- **DNS and NTP** are external services you provide (an AD/DNS server, a BIND/Unbound server, your router). VCF does not run them for you.
- **Certificates**: every appliance and ESX host has a machine certificate. VCF 9 manages them from VCF Operations (*Fleet Management → Certificates*, including *Configure CA*), per the VCF blog's day-2 overview.
- **Identity**: the **[[vcf-identity-broker|VCF Identity Broker]]** provides VCF single sign-on. TechDocs describes two broker models — **embedded** (runs as part of vCenter, protected by vSphere HA (High Availability), no extra appliance) and **appliance** (a three-node cluster, more resilient to host failures, more resources) — and placement choices (fleet-wide, cross-instance or per-instance).

## Components

| Component | Role in this chain | Who manages it | Failure impact |
|---|---|---|---|
| DNS server(s) | Forward + reverse zones for all VCF FQDNs | You (infrastructure team) | Deployment/commissioning validation fails, components cannot reach each other |
| NTP source(s) | Time for hosts, appliances, DNS server and CA | You | TLS/SSO failures, log timestamps unusable, validation failures |
| Certificate authority | Issues machine certificates (VMCA/internal or external Microsoft/OpenSSL CA) | You + VCF Operations certificate management | Untrusted or expired certs break integrations and UI logins |
| VCF Identity Broker | SSO for VCF components and users | Fleet admin | Users cannot log in; integrations using SSO tokens fail |
| VCF Health (VCF Operations) | Monitors certificates, NTP and DNS among other cards | Ops team | Early warning lost if not reviewed |

## How It Works

The order to check when "something cannot talk to something":

1. **Name resolution from the complaining component.** Run the forward lookup of the target FQDN *and* the reverse lookup of the returned IP, from the appliance or host that reports the error — not from your laptop, which may use a different DNS server.
2. **Time on both ends.** Compare UTC time on the source and target. If they differ by more than a few seconds, fix NTP before anything else.
3. **Certificate presented by the target.** Check validity dates, subject/SAN (must contain the FQDN used), and issuer. Ask whether the *source* trusts that issuer.
4. **Authentication.** Can the user/service obtain a token? Is the identity source reachable? Is the broker healthy?
5. **Service.** Only now look at the service itself (is it running, is the disk full, what does its log say).
6. **Workflow.** Retry the original workflow and verify.

:::tip
Run tests **from the component that reports the error**. DNS views, firewalls and trust stores differ between machines. "It resolves from my laptop" proves nothing about SDDC Manager.
:::

## Deep Dive

### DNS failure patterns

| Pattern | Typical symptom in VCF | Proof |
|---|---|---|
| Missing PTR record | Validation failures for hosts/appliances; installer pre-validation errors | `nslookup <ip>` returns NXDOMAIN |
| Stale PTR (IP reused) | Host "is" another name; certificate/hostname mismatch | Reverse lookup returns the old name |
| Forward/reverse disagree | Intermittent failures depending on which lookup a service performs | A → 10.10.10.107 but PTR 10.10.10.107 → esx-17 |
| Wrong DNS server on one component | Only that component fails to resolve | `cat /etc/resolv.conf` (appliance) or `esxcli network ip dns server list` (ESX) |
| Short name vs FQDN confusion | Certificates or SSH fail | Compare configured hostname with FQDN |

A real VCF 9 example (Broadcom KB 418890): the VCF Installer failed specification validation with `SSH: Failed to establish SSH session to <VCF Installer FQDN> Auth fail` in `/var/log/vmware/vcf/domainmanager/domainmanager.log`. The cause was the OVA's *DNS Domain Name* field populated with the appliance FQDN instead of the domain name. The fix was redeploying the installer with the domain name only (the *Host Name* field holds the FQDN). Lesson: naming inputs are dependency inputs too.

### NTP failure patterns

[[time-skew|Time skew]] rarely produces an error that says "time". It produces:

- TLS errors ("certificate not yet valid") when a clock is behind the certificate's *notBefore*.
- SSO/token errors, because tokens carry issue/expiry timestamps.
- vSAN/cluster and upgrade prechecks reporting time inconsistencies.
- Logs from different components that cannot be correlated.

VCF Health's **NTP and DNS Health** card exists precisely because these problems are silent until a workflow fails. On ESX, check the configuration and current time with `esxcli system ntp get` and `esxcli system time get`; on Photon OS appliances use `timedatectl` (look for *System clock synchronized: yes*).

:::warning
Do not "fix" skew by setting clocks manually on individual appliances. Fix the **source** (NTP server reachability, upstream, firewall UDP 123), then let clients converge. A manual jump on one component can break tokens and active sessions.
:::

### Certificate failure patterns

| Pattern | Symptom | Proof |
|---|---|---|
| Expired certificate | Integration suddenly fails on a date; browsers warn | `openssl s_client -connect fqdn:443 </dev/null 2>/dev/null \| openssl x509 -noout -dates` |
| SAN does not include FQDN used | Hostname verification fails | Same command with `-noout -subject -ext subjectAltName` |
| Issuer not trusted by peer | "Unable to verify certificate" in the *calling* component's log | Inspect the issuer; check whether the CA chain was added to the trust store |
| Clock skew | "Not yet valid" | Compare `date -u` with *notBefore* |

In VCF 9, certificate replacement and CA configuration for managed components are driven from VCF Operations (*Fleet Management → Certificates*). Replacing a certificate directly on one appliance outside that workflow can leave other components without the new trust — a classic cause of "it worked until we replaced the cert" incidents (see the incident `inc-certificate-trust`).

### Identity failure patterns

- **Identity source unreachable** (AD/LDAP/IdP down, DNS or firewall to it): SSO users cannot log in; local accounts still work. Scope test: try a local administrator account.
- **Time skew** between broker and clients: tokens rejected.
- **Broker availability**: the *embedded* broker shares fate with its vCenter (protected by vSphere HA); the *appliance* model is a three-node cluster that tolerates a host failure. TechDocs notes that moving from embedded to an external broker requires an SSO reset — a design decision, not a troubleshooting step.
- **SDDC Manager** is excluded from identity broker management (per the SSO models page), so it keeps its own local accounts — useful when SSO is down.

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

What "correct" looks like before you deploy or troubleshoot:

| Item | Correct state | Verify |
|---|---|---|
| DNS records | A and PTR for every ESX host, vCenter, NSX Manager nodes and VIP, edges, SDDC Manager/VCF Installer, VCF Operations nodes, fleet management, collectors, VCF Automation | Forward + reverse lookup for each, from the installer appliance |
| DNS servers | Same (redundant) servers configured on every component | `esxcli network ip dns server list`; `/etc/resolv.conf` |
| NTP | Same sources everywhere, reachable on UDP 123, synced upstream | `esxcli system ntp get`; `timedatectl` |
| Certificates | Valid, SAN = FQDN, chain trusted fleet-wide | VCF Operations certificate view; `openssl` checks |
| Identity | Identity source reachable; break-glass local accounts known and tested | Log in with SSO user *and* local admin |

In VCF 9 the DNS and NTP settings of an instance are changed in VCF Operations: *Inventory → VCF Instance → Actions → Manage VCF Instance Settings → Network Settings*.

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

```shell
# Forward and reverse lookup (run on the appliance/host that reports the error)
nslookup esx-07.vcf.lab
nslookup 10.10.10.107

# ESX: which DNS servers and NTP config is the host using, and what time is it?
esxcli network ip dns server list
esxcli system ntp get
esxcli system time get

# Photon OS appliance: clock synchronisation state
timedatectl

# Certificate presented by a component: validity and subject
openssl s_client -connect vc01.vcf.lab:443 -servername vc01.vcf.lab </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

```log
# Example: VCF Installer validation failure caused by a naming input (KB 418890)
SSH: Failed to establish SSH session to sddcm01.vcf.lab Auth fail
```

## Failure Scenarios

| Scenario | What you see | Root cause | Fix |
|---|---|---|---|
| New host fails commissioning validation | Validation error for one host only | Missing/stale PTR | Correct PTR, re-validate |
| All integrations in VCF Operations fail at once | Many red alerts at the same time | NTP source broke / clocks drifted, or CA/cert expired | Fix time source / renew certificate |
| SSO users cannot log in; local admin can | Login errors in UI | Identity source unreachable or token/time problems | Restore identity source reachability; check time |
| Integration fails right after a cert replacement | "Unable to verify" in caller's log | New issuer not trusted by caller | Use the VCF Operations certificate workflow / trust the CA chain |
| Installer cannot SSH to itself | `Auth fail` in domainmanager.log | Bad DNS domain name input in OVA | Redeploy installer with correct inputs (KB 418890) |

## Troubleshooting

A fast checklist you can run in under five minutes from the appliance that reports a problem:

1. `nslookup <target-fqdn>` → IP correct?
2. `nslookup <target-ip>` → returns the same FQDN?
3. `date -u` here and on the target → within a second or two?
4. `openssl s_client ...` → dates valid, SAN matches, issuer expected?
5. Log in with a local account → if it works but SSO fails, focus on identity.
6. Only then: service status (`systemctl --failed`), disk (`df -h`), service logs.

:::details Why not start with service logs?
Service logs are long and full of secondary errors. When a dependency is broken, *every* service logs errors, and they all look like the problem. Proving the dependencies healthy first narrows the log search to one component.
:::

## Real-World Scenario

Alex rebuilds the DNS server VM of his home lab and restores zones from an export. The next morning, the VCF Installer refuses to validate the deployment spec: two of three hosts fail validation.

- Forward lookups all work. Reverse lookups for esx02 and esx03 return NXDOMAIN — the export only contained the forward zone.
- Fix: recreate the `10.10.10.in-addr.arpa` zone and PTR records, re-run validation, all hosts pass.
- Prevention: Alex adds a script to the readiness checklist that loops over every planned FQDN and checks forward + reverse agreement (see the Home Lab section).


## Exam Focus

:::exam
- VCF requires **forward and reverse DNS** for components; a reverse-lookup failure is a classic cause of validation/commissioning failures.
- **Time skew** shows up as TLS/SSO/token errors; the fix is the **NTP source**, not manual clock changes.
- VCF 9 manages certificates and CAs from **VCF Operations → Fleet Management → Certificates**; DNS/NTP instance settings from **Manage VCF Instance Settings → Network Settings**.
- Identity broker models: **embedded** (in vCenter, HA via vSphere HA) vs **appliance** (three-node cluster).
- VCF Health cards include **Certificates** and **NTP and DNS** health.
:::

## Common Exam Traps

:::trap
- Testing DNS from your workstation instead of the component that reports the error.
- Treating a "certificate not yet valid" error as a certificate problem when it is a **clock** problem.
- Assuming SSO problems mean the identity broker is down — check the **identity source** and **time** first; try a local account to scope.
- Replacing a certificate directly on one appliance outside the VCF workflow, then wondering why integrations break.
- Forgetting that a **forward record alone** is not enough.
:::

## Knowledge Check

::quiz

## Summary

- DNS → NTP → certificates → identity → services → workflows: check in that order.
- Test from the complaining component; verify both forward and reverse DNS; compare UTC time on both ends; inspect the presented certificate; scope identity issues with a local account.
- Fix the source (record, time server, CA trust), never patch symptoms on single appliances.
- Use VCF Health to catch drift before it becomes an outage.

## Next Topic

With the foundations proven, move up the stack to the VCF management services themselves — what runs where and where they log: [Troubleshooting VCF Services and Workflows](lesson:troubleshooting-vcf-services).
