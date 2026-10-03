---
id: dns-ntp-dependencies
title: DNS and NTP – The Two Hard Dependencies
phase: p04-networking
module: m04-net-fundamentals
version: vcf9
minutes: 35
difficulty: foundation
summary: Why every VCF component needs matching forward and reverse DNS records and synchronized time, how the VCF Installer and SDDC Manager check them, and how DNS or NTP faults show up as certificate, login and commissioning failures.
topics: [dns, ntp, deployment-planning]
objectives: ["2.4", "4.1"]
keyTerms: [dns, fqdn, a-record, ptr-record, ntp, time-skew, first-hop-gateway]
labs: [lab-network-readiness]
incidents: [inc-dns-reverse-lookup, inc-ntp-time-skew]
components: [dns-service, ntp-service, vcf-installer, sddc-manager, esx-host]
related: [network-fundamentals-for-vcf, vcf-network-design]
sources:
  - title: "VCF 9.0 Design Library – Network Fabric Detailed Design (IP assignment requirements)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design/datacenter-network-requirements/network-fabric-design.html
  - title: "VCF 9.0 Design Library – External Services Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/external-services-design.html
  - title: "Broadcom KB 437102 – VCF Installer precheck failure: DNS aliases / reverse lookup for vCenter"
    url: https://knowledge.broadcom.com/external/article/437102/vcf-installer-precheck-failure-please-en.html
  - title: "Broadcom KB 448781 – Host commissioning fails at 39% with NoRouteToHostException and checkTime errors"
    url: https://knowledge.broadcom.com/external/article/448781/host-commissioning-fails-at-39-with-noro.html
  - title: "Broadcom KB 443781 – NTP synchronization issues on ESXi hosts"
    url: https://knowledge.broadcom.com/external/article/443781/ntp-synchronization-issues-on-esxi-host.html
  - title: "Broadcom KB 301589 – Manually update NTP servers on VCF components"
    url: https://knowledge.broadcom.com/external/article/301589/manually-update-ntp-servers-on-vcf-compo.html
  - title: "William Lam – NSX Edge fails DNS pre-check as part of VCF 9.0.2 upgrade"
    url: https://williamlam.com/2026/01/quick-tip-nsx-edge-fails-dns-pre-check-as-part-of-vcf-9-0-2-upgrade.html
---

## Why This Matters

Ask any VCF engineer what breaks deployments most often and you will hear the same two answers: **DNS** and
**time**. VCF components identify each other by fully qualified domain name, trust each other through
certificates issued to those names, and authenticate with tokens that are only valid within a time window. If a
name does not resolve both ways, or a clock is minutes off, you get errors that do not mention DNS or NTP at all —
`NoRouteToHostException`, "certificate not yet valid", "Time validation failed", a login loop.

VCF 9 design requirement **VCF-NET-REQD-IPA-002** is explicit: "forward and reverse DNS records for all management
components". Requirement **VCF-NET-REQD-NTP-001**: "configure time synchronization using an internal NTP time
source for all management components".

## Learning Objectives

- Explain what forward (A) and reverse (PTR) DNS records are and why VCF requires both to match.
- List the VCF components that need DNS records and NTP configuration before deployment.
- Describe how DNS and time problems surface during VCF Installer validation, host commissioning and upgrades.
- Verify DNS and NTP from ESX hosts and appliances with `nslookup`, `dig -x`, `esxcli` and `ntpq`.
- Design resilient DNS and NTP for a VCF instance.

## Concept

### DNS in one paragraph

The [[dns]] (Domain Name System) translates names to IP addresses. An [[a-record|A record]] maps
`esx-01.lab.internal` → `10.10.10.11` (**forward lookup**). A [[ptr-record|PTR record]] in a reverse zone
(`10.10.10.in-addr.arpa`) maps `10.10.10.11` → `esx-01.lab.internal` (**reverse lookup**). The name must be an
[[fqdn]] — host plus domain — and both directions must return the **same, single** answer.

### Why VCF insists on both directions

| Reason | Where it bites |
|---|---|
| Components are registered and contacted by FQDN | VCF Installer, SDDC Manager and vCenter store hosts and appliances by FQDN |
| Certificates are issued to FQDNs | TLS fails if the name a client uses does not match the certificate SAN |
| Validation checks reverse lookup | VCF Installer precheck verifies the vCenter IP "uniquely resolves" back to its FQDN (KB 437102) |
| Upgrades fetch bundles by FQDN | NSX Edges without DNS fail the 9.0.2 upgrade precheck: "Edge will not be able to resolve the fqdn to download the upgrade bundle" |

### NTP in one paragraph

The [[ntp]] (Network Time Protocol, UDP 123) keeps clocks synchronized to a reference. VCF needs it because:

- **Certificates** carry `notBefore` / `notAfter` times; a host whose clock is behind rejects a freshly issued
  certificate as "not yet valid".
- **Authentication tokens** (SSO/SAML/OIDC, Kerberos for Active Directory) are valid for a limited window.
- **Logs and events** from many components must line up to troubleshoot anything.
- **Clustered services** (NSX Manager cluster, VCF Operations cluster, vSAN) assume consistent time.

[[time-skew|Time skew]] is the difference between two clocks. Broadcom's procedure for changing NTP on VCF
components requires the skew between NTP servers and components to be **less than 5 minutes** before you start
(KB 301589).

## Architecture

The dependency map shows who resolves whom and who syncs to what. Every arrow is a dependency that must exist
**before** the VCF Installer runs.

::diagram[d04-dns-ntp-dependency-map]

Design principles from the map:

- DNS and NTP are **external services**: VCF consumes them but does not provide them. They must not run only inside
  the VCF management domain you are about to build (chicken-and-egg).
- Every management component gets a static IP, an A record and a matching PTR record.
- All components point at the **same** internal NTP sources; "internal" means a source you control (which itself
  may sync to the internet or GPS).

## Components

| Component | Needs A + PTR | Needs NTP | Notes |
|---|---|---|---|
| ESX hosts (management VMkernel IP) | Yes | Yes | Configured before deployment; hosts are added by FQDN |
| VCF Installer appliance | Yes | Yes | Validates DNS/NTP of everything in the spec |
| vCenter | Yes | Yes | Precheck fails on missing PTR or DNS alias (KB 437102) |
| NSX Manager nodes + cluster VIP | Yes (each node and VIP) | Yes | VIP gets its own name |
| NSX Edge nodes | Yes | Yes | DNS needed for upgrades |
| SDDC Manager | Yes | Yes | Orchestrates commissioning, certificate and password tasks |
| VCF Operations nodes, cloud proxy, VCF Automation, Identity Broker appliances | Yes | Yes | Load balancer FQDNs also need records where used |
| DNS servers | — | Yes | Should themselves be time-synced |

:::warning
Do not use link-local addresses (169.254.x.x) for DNS or NTP servers in a deployment spec; Broadcom documents a
validation failure for exactly that case. Use routable addresses reachable from the management network.
:::

## How It Works

What happens during deployment validation and day-2 tasks:

1. You enter DNS servers, DNS domain, NTP servers and every component FQDN/IP in the VCF Installer wizard or JSON
   spec.
2. The installer resolves each FQDN (forward) and each IP (reverse) and compares them; a mismatch, a missing PTR or
   a second name for the same IP fails validation.
3. It also validates the NTP configuration in the spec (the exact checks vary by release — read the validation report line by line).
4. During deployment, appliances are deployed with these DNS/NTP settings and certificates are generated for their
   FQDNs.
5. Day 2: when SDDC Manager commissions a host it connects by FQDN to `https://<host>:443` and installs a temporary
   certificate; if the host clock is far off, "Time validation failed. Check host Time and/or Certificate expiration"
   appears in the operations manager log (KB 448781).
6. During upgrades, components download bundles by FQDN; missing DNS on any node fails the precheck.

## Deep Dive

### "Uniquely resolves" — the DNS alias trap

If an IP has **two** PTR records (for example an old name and a new name), reverse lookup returns either name.
The VCF Installer message "Please ensure there are no DNS aliases configured for vCenter FQDN" refers to this. One
IP → one name → same IP. CNAME aliases for management components are a common cause.

### Short name vs FQDN

Always enter FQDNs. A host whose hostname is `esx-01` but whose PTR returns `esx-01.lab.internal` may still pass
some checks, but certificate SANs and inventory entries are built from what you enter. Case should be consistent;
lowercase is safest.

### NTP sync health on ESX

ESX runs an NTP client. `ntpq -p` shows each peer; the **reach** column is an octal bitmask of the last eight polls:
**377** means the last eight succeeded, **0** means none did (KB 443781). An asterisk (`*`) marks the peer currently
selected for synchronization. `vmkping -I vmk0 <ntp>` proves ICMP, not UDP 123 — a firewall can allow one and block
the other.

### How bad is a few minutes?

| Skew | Typical effect |
|---|---|
| < 1 s | Normal |
| Seconds | Log correlation harder, usually harmless |
| > 5 minutes | Kerberos (AD) authentication fails; Broadcom NTP-change procedure precondition violated |
| Hours or days | Certificates "not yet valid" or "expired", SSO token rejection, commissioning failures |

### Designing DNS and NTP for VCF

- At least **two** DNS servers and **two or more** NTP sources reachable from the management network, ideally in
  different failure domains.
- Create reverse zones for every management subnet (`10.10.10.in-addr.arpa` for 10.10.10.0/24).
- Pre-create records for everything you will deploy, including future workload domain vCenters and NSX Managers.
- Firewalls must allow DNS (UDP/TCP 53) and NTP (UDP 123) from every management subnet.
- If DNS runs as VMs, run them **outside** the VCF management domain you are deploying, or at least with a copy
  outside, so a management-domain outage does not take name resolution with it.

## Configuration

DNS records for a small lab (BIND zone excerpt):

```shell
; forward zone lab.internal
esx-01     IN A    10.10.10.11
esx-02     IN A    10.10.10.12
vcenter-01 IN A    10.10.10.20
; reverse zone 10.10.10.in-addr.arpa
11  IN PTR  esx-01.lab.internal.
12  IN PTR  esx-02.lab.internal.
20  IN PTR  vcenter-01.lab.internal.
```

ESX host DNS and NTP (before deployment):

```shell
esxcli network ip dns server add --server=10.10.10.2
esxcli network ip dns search add --domain=lab.internal
esxcli system ntp set -s 10.10.10.2 -e 1
```

In the vSphere Client the same NTP setting is on **Host > Configure > System > Time Configuration**; in the Host
Client under **Manage > System > Time & Date** (KB 301589).

## CLI / API

```shell
# Forward and reverse, from the VCF Installer appliance or any Linux admin box
nslookup esx-01.lab.internal
nslookup 10.10.10.11
dig +short esx-01.lab.internal
dig +short -x 10.10.10.11

# ESX: which DNS servers is this host using?
esxcli network ip dns server list

# ESX: NTP configuration and live peer status
esxcli system ntp get
ntpq -p

# ESX: see NTP packets actually leave and return on vmk0
tcpdump-uw -c 5 -n -i vmk0 host 10.10.10.2 and port 123
```

## Failure Scenarios

| Fault | Symptom | Where seen |
|---|---|---|
| Missing PTR for vCenter | Precheck: "no DNS aliases… vCenter IP" | VCF Installer validation |
| PTR returns a different name | Validation mismatch; certificate name mismatch later | Installer, browser TLS errors |
| ESX host not using the right DNS server | Host resolves some names, not others | Commissioning, `esxcli network ip dns server list` |
| UDP 123 blocked | `ntpq` reach 0, clock drifts on CMOS time | Commissioning "checkTime" fault, NoRouteToHostException (KB 448781) |
| DNS VMs inside the management domain only | After a power outage nothing resolves and nothing starts cleanly | Whole instance |
| Edge nodes without DNS | Upgrade precheck failure | VCF 9.0.2 upgrade |

## Troubleshooting

1. **Reproduce from the right place.** Test from the component that failed (VCF Installer, SDDC Manager, vCenter
   shell, ESX host), not from your laptop — they may use different DNS servers.
2. **Forward then reverse.** `nslookup <fqdn>` then `nslookup <ip>`. Both must return one consistent answer.
3. **Check which server answered.** Two DNS servers with different zone contents produce intermittent failures.
4. **Check time everywhere.** Compare `date -u` on the appliance with `esxcli system time get` on the host and the
   NTP server.
5. **Check NTP health, not just configuration.** `esxcli system ntp get` shows settings; `ntpq -p` shows whether
   sync works (reach 377, a selected `*` peer).
6. **Fix the source, then retry.** After fixing DNS or time, retry the failed task; some services cache results,
   and Broadcom KBs sometimes instruct restarting specific services before retrying.

::incident[inc-dns-reverse-lookup]

::incident[inc-ntp-time-skew]

## Real-World Scenario

A company re-IPs its DNS servers during a data-center move. Forward zones are migrated, reverse zones are
forgotten. Nothing breaks immediately. Three weeks later the team tries to add a workload domain: validation fails
on the new vCenter ("ensure there are no DNS aliases…"), and when they retry certificate replacement the old vCenter
also fails. Root cause: no PTR records anywhere. Fix: rebuild reverse zones for every management subnet, verify with
`dig -x` from SDDC Manager and the VCF Installer, retry. Prevention: add reverse lookup to the monitoring checks.

## Lab

The lab builds DNS forward and reverse zones and an NTP server for the home lab, then verifies them from nested ESX.

::lab[lab-network-readiness]

## Exam Focus

:::exam
- DNS: **forward and reverse** records for all management components, static IPs, FQDNs everywhere.
- NTP: internal, consistent source for all components; time skew breaks certificates and authentication.
- Recognize indirect symptoms: certificate validity errors and commissioning failures often mean **time**;
  validation failures naming vCenter IP/FQDN often mean **reverse DNS**.
- DNS and NTP are prerequisites gathered in the Planning and Preparation Workbook before running the VCF Installer.
:::

## Common Exam Traps

:::trap
- "Add the host to vCenter by IP to avoid DNS" — VCF expects FQDNs and validates DNS; avoiding DNS is not an option.
- Forward lookup alone is not enough. A missing PTR is the classic validation failure.
- Configuring NTP on the host is not the same as being synchronized; check reach and the selected peer.
- A successful `vmkping` to the NTP server does not prove UDP 123 is open.
:::

## Knowledge Check

::quiz

## Summary

- Every VCF management component needs a static IP, an FQDN, an A record and a matching PTR record.
- One IP must resolve to exactly one name, and that name back to the same IP.
- All components must sync to the same internal NTP sources; skew above minutes breaks certificates and logins.
- DNS/NTP faults surface indirectly — learn to suspect them first.
- Verify from the failing component: `nslookup`, `dig -x`, `esxcli network ip dns server list`, `ntpq -p`.

## Next Topic

With the external services in place, you can build the host's virtual networking: the
[vSphere Distributed Switch](lesson:vsphere-distributed-switch).
