---
id: dns-ntp-dependencies
title: DNS and NTP – Identity, Trust, and Time in VCF
phase: p04-networking
module: m04-net-fundamentals
version: vcf9
minutes: 50
difficulty: foundation
summary: A structured explanation of how names and time become identity and trust dependencies across VCF, how the platform validates them, and how to reason from indirect symptoms back to DNS or NTP.
topics: [dns, ntp, deployment-planning]
objectives: ["2.4", "4.1"]
keyTerms: [dns, fqdn, a-record, ptr-record, ntp, time-skew, first-hop-gateway]
labs: [lab-verify-vcf-dns-ntp]
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
  - title: "Broadcom KB 435717 – VCF Installer validation fails because forward and reverse DNS do not match"
    url: https://knowledge.broadcom.com/external/article/435717
  - title: "Broadcom KB 394448 – DNS and NTP server selection in VCF Operations 9.0"
    url: https://knowledge.broadcom.com/external/article/394448
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

The useful mental model is that an IP address only tells VCF **where** to send packets. DNS tells it **which named
identity** owns that address. Time tells it **whether the proof of that identity is valid now**. VCF orchestration
depends on all three at once:

| Dependency | Question it answers | What fails when the answer is unreliable |
|---|---|---|
| IP reachability | Can packets reach the endpoint? | Connections time out or are refused |
| Forward and reverse DNS | Is this address the exact component named in the workflow? | Prechecks, registration and certificate-name checks fail |
| Synchronized time | Is the certificate/token currently valid, and can events be ordered? | TLS, SSO, commissioning and troubleshooting become unreliable |

That separation matters during diagnosis. A successful ping proves only reachability. A successful forward lookup
proves only one direction of identity. A configured NTP server proves only intent. Each layer needs its own evidence.

VCF 9 design requirement **VCF-NET-REQD-IPA-002** is explicit: "forward and reverse DNS records for all management
components". Requirement **VCF-NET-REQD-NTP-001**: "configure time synchronization using an internal NTP time
source for all management components".

## Learning Objectives

- Explain what forward (A) and reverse (PTR) DNS records are and why VCF requires both to match.
- Trace a DNS query from a VCF component to the authoritative zone and distinguish client resolver selection from zone data.
- List the VCF components that need DNS records and NTP configuration before deployment.
- Describe how DNS and time problems surface during VCF Installer validation, host commissioning and upgrades.
- Interpret read-only DNS and NTP evidence without confusing configuration with health.
- Relate DNS/NTP foundations to deployment, management and troubleshooting scenarios in the exam blueprint.

## Concept

### DNS in one paragraph

The [[dns]] (Domain Name System) translates names to IP addresses. An [[a-record|A record]] maps
`vcenter01.vcf.home.arpa` → `10.100.10.21` (**forward lookup**). A [[ptr-record|PTR record]] in the corresponding
reverse zone maps `10.100.10.21` → `vcenter01.vcf.home.arpa` (**reverse lookup**). The name must be an [[fqdn]] —
host plus domain — and both directions must identify the same component. The A record and PTR record live in
different DNS zones and can therefore drift independently.

A client does not usually ask the authoritative zone directly. It asks its configured resolver. That resolver may
answer from cache or walk/delegate the query to the authoritative server. This gives us two distinct questions:

1. **Did the component send the query to the intended resolver?** Inspect the component's resolver configuration.
2. **Does that resolver hold or obtain the correct zone answer?** Query it explicitly in both directions.

Testing from a laptop answers neither question for an appliance that uses a different resolver. Split-DNS makes
this especially visible: Alex's workstation routes only `.vcf.home.arpa` queries to the internal resolver through
NRPT, while public names keep the normal resolver. The same name can therefore work from the workstation and fail
inside a VCF component whose DNS settings differ.

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

NTP is a control loop, not a one-time clock copy. A client polls one or more peers, evaluates reachability and
quality, selects a usable source and gradually corrects its clock. This is why these observations are different:

| Observation | What it proves |
|---|---|
| A server address appears in configuration | The desired peer was saved |
| UDP 123 requests and replies are visible | The network path carries NTP traffic |
| A peer is selected and reach increases | The daemon receives usable responses |
| Offset remains small over time | The local clock is synchronized and stable |

The first row alone is insufficient. VCF cares about the resulting clock, because certificates, tokens and event
timestamps consume time; they do not consume the configuration file.

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

The diagram is intentionally logical. It does not imply that DNS and NTP must run on the same VM or that every
environment uses the same redundancy design. It shows the dependency boundary: these services must be reachable
before the management domain is built and must remain available when that domain is unhealthy.

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

### A forward/reverse validation, step by step

Assume the deployment specification contains `vcenter01.vcf.home.arpa` and `10.100.10.21`:

1. The installer asks its configured resolver for the A record of `vcenter01.vcf.home.arpa`.
2. The resolver returns `10.100.10.21`.
3. The installer asks for the PTR of `10.100.10.21`.
4. The resolver should return `vcenter01.vcf.home.arpa`.
5. The installer compares the returned identity with the deployment specification. A missing PTR, old name or
   inconsistent answer means the specification and DNS do not describe one stable identity.

This explains why "the website opens by IP" is irrelevant to this precheck. Reachability can be perfect while the
identity contract is wrong.

::figure{src="https://api-broadcomcms-software.wolkenservicedesk.com/es/attachments/get_attachment_content?uniqueFileId=2339411294298" caption="Official Broadcom example accompanying KB 435717: a VCF Installer DNS validation failure caused by an inconsistent IP/FQDN relationship." source="https://knowledge.broadcom.com/external/article/435717"}

## Deep Dive

### "Uniquely resolves" — the DNS alias trap

If an IP has **two** PTR records (for example an old name and a new name), reverse lookup returns either name.
The VCF Installer message "Please ensure there are no DNS aliases configured for vCenter FQDN" refers to this. One
IP → one name → same IP. CNAME aliases for management components are a common cause.

### Short name vs FQDN

Always enter FQDNs. A host whose hostname is `esx-01` but whose PTR returns `esx-01.lab.internal` may still pass
some checks, but certificate SANs and inventory entries are built from what you enter. Case should be consistent;
lowercase is safest.

### Resolver path vs authoritative data

When one client succeeds and another fails, first determine whether they asked the same DNS server. A Windows NRPT
rule, a VPN-assigned resolver, an appliance's `/etc/resolv.conf` and an ESX DNS setting can all select different
paths. Querying the intended resolver explicitly isolates zone correctness from client routing. If two configured
resolvers hold different copies of the zone, failures can appear intermittent because successive queries reach
different servers.

Caching adds a time dimension. Correcting a zone does not instantly erase old answers in every cache. Record the
answering server and TTL, then allow for propagation or flush only the appropriate client cache. Avoid restarting
unrelated VCF services until the DNS evidence shows that they are actually using stale information.

### NTP sync health on ESX

ESX runs an NTP client. `ntpq -p` shows each peer; the **reach** column is an octal bitmask of the last eight polls:
**377** means the last eight succeeded, **0** means none did (KB 443781). An asterisk (`*`) marks the peer currently
selected for synchronization. `vmkping -I vmk0 <ntp>` proves ICMP, not UDP 123 — a firewall can allow one and block
the other.

Broadcom KB 443781 currently lists ESXi 7.x/8.x. Its diagnostic model remains useful, but this course does not
silently promote every command/output detail to ESX 9. The associated practical guide records the exact 9.0.2 build
and observed command behavior before treating it as validated for Alex's environment.

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

Resilience means more than entering two IP addresses. Both DNS servers must contain equivalent forward and reverse
data. All NTP sources must be reachable and mutually sane. A second server with stale zones or bad time increases
intermittency rather than availability. Monitor the service from at least one management-network perspective and
periodically compare component configuration with the intended design.

## Configuration

The following BIND-style excerpt illustrates the **relationship** between forward and reverse data. It is an
explanation, not a procedure to paste into Alex's running DNS service:

```shell
; forward zone vcf.home.arpa
vcenter01  IN A    10.100.10.21

; matching reverse-zone entry (zone name depends on the delegated prefix)
21          IN PTR  vcenter01.vcf.home.arpa.
```

On an ESX host, commands such as these express the desired state. Exact syntax and behavior must be verified for
the installed build before making a change; the separate guide uses read-only inspection first:

```shell
esxcli network ip dns server list
esxcli system ntp get
```

UI labels can move between builds. Use the host's time-configuration view in the installed vSphere Client and record
the product/build with any screenshot. The practical guide treats the UI as evidence and does not rely on a memorized
menu path.

## CLI / API

```shell
# Forward and reverse against the intended internal resolver
nslookup vcenter01.vcf.home.arpa 10.100.80.10
nslookup 10.100.10.21 10.100.80.10
dig @10.100.80.10 +short vcenter01.vcf.home.arpa A
dig @10.100.80.10 +short -x 10.100.10.21

# ESX: which DNS servers is this host using?
esxcli network ip dns server list

# ESX: NTP configuration and live peer status
esxcli system ntp get
ntpq -p

# ESX: when a later troubleshooting task is approved, observe NTP traffic on the correct VMkernel interface
tcpdump-uw -c 5 -n -i vmk0 host <ntp-server-ip> and port 123
```

## Failure Scenarios

| Fault | Symptom | Where seen |
|---|---|---|
| Missing PTR for vCenter | Precheck: "no DNS aliases… vCenter IP" | VCF Installer validation |
| PTR returns a different name | Validation mismatch; certificate name mismatch later | Installer, browser TLS errors |
| ESX host not using the right DNS server | Host resolves some names, not others | Commissioning, `esxcli network ip dns server list` |
| UDP 123 blocked | `ntpq` reach 0, clock drifts on CMOS time | Commissioning "checkTime" fault, NoRouteToHostException (KB 448781) |
| DNS exists only inside the management domain | After a power outage nothing resolves and recovery becomes circular | Whole instance |
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

The order prevents unnecessary change. First identify the failing component and its resolver/time source; then prove
the answer or synchronization state. Remediation belongs in a controlled change after the evidence identifies the
fault. The practical guide linked from the lesson is deliberately read-only.

::incident[inc-dns-reverse-lookup]

::incident[inc-ntp-time-skew]

## Real-World Scenario

A company re-IPs its DNS servers during a data-center move. Forward zones are migrated, reverse zones are
forgotten. Nothing breaks immediately. Three weeks later the team tries to add a workload domain: validation fails
on the new vCenter ("ensure there are no DNS aliases…"), and when they retry certificate replacement the old vCenter
also fails. Root cause: no PTR records anywhere. Fix: rebuild reverse zones for every management subnet, verify with
`dig -x` from SDDC Manager and the VCF Installer, retry. Prevention: add reverse lookup to the monitoring checks.

## Exam Focus

:::exam
- DNS: **forward and reverse** records for all management components, static IPs, FQDNs everywhere.
- NTP: internal, consistent source for all components; time skew breaks certificates and authentication.
- Recognize indirect symptoms: certificate validity errors and commissioning failures often mean **time**;
  validation failures naming vCenter IP/FQDN often mean **reverse DNS**.
- DNS and NTP are prerequisites gathered in the Planning and Preparation Workbook before running the VCF Installer.
- The official candidate profile names foundational DNS and NTP knowledge. In questions, expect these foundations to
  appear inside deployment, management or troubleshooting scenarios rather than as isolated protocol trivia.
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
- Resolver selection and authoritative zone data are different layers; test both from the component that fails.
- All components must use reliable internal NTP sources; configuration alone is not proof of synchronization.
- DNS/NTP faults surface indirectly — learn to suspect them first.
- Verify from the failing component: `nslookup`, `dig -x`, `esxcli network ip dns server list`, `ntpq -p`.

## Next Topic

With the external services in place, you can build the host's virtual networking: the
[vSphere Distributed Switch](lesson:vsphere-distributed-switch).
