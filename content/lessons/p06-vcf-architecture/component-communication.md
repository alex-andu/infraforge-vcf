---
id: component-communication
title: Component Communication in a VCF Fleet
phase: p06-vcf-architecture
module: m06-management
version: vcf9
minutes: 45
difficulty: advanced
summary: Who talks to whom in VCF 9 — monitoring, fleet management, core orchestration, NSX planes, identity, logging and external services — and how to use that map to troubleshoot.
topics: [component-communication, fleet-management, dns, ntp, nsx-architecture, identity-sso]
objectives: ["4.1", "4.2"]
keyTerms: [vcf-operations, vcf-operations-collector, sddc-manager, fleet-management, vcf-identity-broker, vcf-operations-logs]
labs: [lab-explore-vcf-fleet, lab-network-readiness]
incidents: [inc-dns-reverse-lookup, inc-ntp-time-skew, inc-esx-host-disconnected, inc-vcf-ops-collection]
components: [vcf-operations, vcf-operations-collector, vcf-operations-fleet-management, sddc-manager, vcenter, esx-host, nsx-manager, nsx-edge-cluster, vcf-identity-broker, vcf-operations-logs, vcf-automation, dns-service, ntp-service, physical-network]
related: [vcf9-architecture-overview, vcf-operations-fleet-management, dns-ntp-dependencies, nsx-architecture, troubleshooting-core-dependencies]
sources:
  - title: "VCF 9.0 – VCF Management Appliances and Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/deployment/vcf-management-appliances.html
  - title: "VCF 9.0 – Fleet Level Components Networking Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/fleet-level-component-backing-networking-models.html
  - title: "VCF 9.0 – VCF Single Sign-On Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/auth-design-vcf.html
  - title: "VCF 9.0 – VCF Operations Detailed Design"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/design-library/vcf-operations-design.html
  - title: "Broadcom KB 323612 – ESXi host disconnects from vCenter after adding it to the inventory (UDP 902 heartbeat)"
    url: https://knowledge.broadcom.com/external/article/323612
  - title: "Broadcom KB 410581 – Troubleshooting control channel to transport nodes (port 1235)"
    url: https://knowledge.broadcom.com/external/article/410581/troubleshooting-control-channel-to-trans.html
  - title: "Broadcom KB 379698 – Broken management channel on port 1234"
    url: https://knowledge.broadcom.com/external/article/379698
  - title: "Broadcom KB 444793 – NSX Edge drops inbound external Geneve (UDP 6081)"
    url: https://knowledge.broadcom.com/external/article/444793/nsx-edge-drops-inbound-external-geneve-u.html
  - title: "Broadcom KB 431771 – Configuring component log forwarding to VCF Operations for Logs 9.0.x"
    url: https://knowledge.broadcom.com/external/article/431771/configuring-component-log-forwarding-to.html
  - title: "Broadcom KB 440502 – Workload domain inventory tree not displayed in VCF Operations"
    url: https://knowledge.broadcom.com/external/article/440502
---

## Why This Matters

VCF (VMware Cloud Foundation) is a distributed system of a dozen appliances that constantly call each other's APIs. Most real outages are not "component X crashed" but "component X can no longer talk to Y" — because of DNS (Domain Name System), time, certificates, a firewall, or an expired password. If you can draw the communication map from memory, you can turn a vague symptom ("VCF Operations shows no data for the dev domain") into a short list of links to test. The exam tests this indirectly through "which component is responsible…" and "what is the impact of…" scenarios.

## Learning Objectives

- Describe the main communication flows: monitoring, fleet management, core orchestration, vSphere management, NSX management/control/data planes, identity, logging, external depot/licensing.
- Name the shared dependencies of every flow (DNS, NTP (Network Time Protocol), certificates, credentials, network).
- Recall the verified ports covered in this lesson and know where to look up the rest.
- Use the map to scope a failure to one link.

## Concept

Think of five layers of conversation:

| Layer | Who talks | Why |
|---|---|---|
| Consumption | Users/API (Application Programming Interface) clients → VCF Operations, VCF Automation, vCenter, NSX | Operate and consume |
| Fleet management | VCF Operations → fleet management appliance → management components | Deploy/upgrade/configure fleet components |
| Instance orchestration | VCF Operations → SDDC (Software-Defined Data Center) Manager → vCenter, NSX Manager, ESX | Domains, core lifecycle, certificates, passwords |
| Element management | vCenter ↔ ESX; NSX Manager ↔ vCenter and transport nodes | Day-to-day management of compute and network |
| Data plane | ESX ↔ ESX (vMotion, vSAN, Geneve TEP (Tunnel Endpoint)), edges ↔ physical routers | Workload traffic, storage traffic |

Underneath **every** layer: DNS (forward and reverse), NTP, trusted certificates, valid service-account passwords, and IP reachability on the management network.

## Architecture

::diagram[d06-component-communication]

Use the steps in the diagram to walk each flow one at a time.

## Components

### Flow table

| From | To | Purpose | Protocol / port (verified) |
|---|---|---|---|
| VCF Operations collector | vCenter, NSX Manager, SDDC Manager of its instance | Collect metrics, properties, inventory locally in the instance | HTTPS APIs |
| VCF Operations collector | VCF Operations | Forward collected data to the analytics cluster | HTTPS |
| VCF Operations | SDDC Manager (per instance) | Fleet management of core components: domains, LCM (Lifecycle Management), certs, passwords | HTTPS REST (integration account "VMware Cloud Foundation") |
| VCF Operations | Fleet management appliance | Lifecycle/deployment of management components | HTTPS |
| Fleet management appliance | VCF Operations, VCF Automation, Identity Broker, logs, networks | Deploy, upgrade, configure | HTTPS |
| SDDC Manager | vCenter, NSX Manager, ESX hosts | Deploy domains, upgrade, commission hosts, rotate passwords, replace certificates | HTTPS APIs |
| SDDC Manager / fleet mgmt appliance | Broadcom online depot or offline depot | Download binaries | HTTPS (outbound, or offline depot) |
| vCenter | ESX hosts | Manage hosts (vpxa/hostd) | TCP 443 and TCP 902 vCenter → host |
| ESX hosts | vCenter | Heartbeat every 10 s; 6 missed (60 s) → host shown disconnected | **UDP 902** host → vCenter |
| NSX Manager | vCenter | vCenter registered as compute manager: discover clusters, deploy edges | HTTPS |
| ESX transport nodes / edges | NSX Manager | **Management channel** (MPA / appliance proxy) | **TCP 1234** |
| ESX transport nodes / edges | NSX Manager (CCP) | **Control channel** (nsx-proxy → controller) | **TCP 1235** |
| TEP ↔ TEP (hosts, edges) | — | Overlay data plane | **Geneve UDP 6081** |
| NSX Edge (Tier-0) | Physical routers | North-south routing (BGP (Border Gateway Protocol) or static) | Uplink VLANs |
| vCenter, NSX, VCF Ops, VCF Automation… | VCF Identity Broker | Authentication for VCF SSO (Single Sign-On) | HTTPS (OIDC/SAML flows) |
| VCF Identity Broker | External IdP | AD/OpenLDAP directory or OIDC/SAML federation | Per IdP |
| Components | VCF Operations for logs | Log ingestion | CFAPI **9000** (clear) / **9543** (SSL); syslog **514** UDP/TCP, **1514** UDP, **6514** TLS |
| VCF Operations | VCF Business Services console | License reporting in connected mode | Outbound internet |
| VCF Automation | vCenter / NSX / Supervisor of its regions | Provision VMs, networks, namespaces | HTTPS APIs |
| Everything | DNS | Forward and reverse resolution of every FQDN (Fully Qualified Domain Name) | DNS (53) |
| Everything | NTP | Time sync (tokens, certificates, logs) | NTP (UDP 123) |

For any other port, use the official Ports and Protocols tool (ports.broadcom.com) for your exact release — do not guess.

## How It Works

### Flow 1 — Monitoring

1. The collector in each instance polls vCenter, NSX Manager and SDDC Manager of that instance.
2. It forwards the data to VCF Operations (analytics node/cluster) in the first instance.
3. VCF Operations builds the inventory tree (fleet → instance → domain → cluster…) from the **VMware Cloud Foundation** integration account.

### Flow 2 — Create a workload domain

1. Admin starts the wizard in VCF Operations.
2. VCF Operations sends the spec to SDDC Manager of the target instance; SDDC Manager's domain manager validates it (binaries, hosts, DNS).
3. SDDC Manager deploys vCenter into the management domain (via the management vCenter), configures clusters on the commissioned ESX hosts, and deploys or reuses NSX Manager.
4. NSX Manager registers the new vCenter as a compute manager and prepares hosts (management channel 1234, control channel 1235).
5. The new domain appears in VCF Operations once the integration syncs.

### Flow 3 — Single sign-on login

1. User opens vCenter (or VCF Operations, NSX, VCF Automation).
2. The component redirects to the VCF Identity Broker.
3. The Identity Broker authenticates against the external IdP (AD/LDAP or OIDC/SAML).
4. A token returns to the component. SDDC Manager and ESX are **not** part of VCF SSO.

### Flow 4 — Upgrade a management component

1. Binaries are downloaded from the depot to the fleet management appliance.
2. VCF Operations → fleet management appliance → target appliance (e.g. VCF Automation) performs the upgrade.

## Deep Dive

### Why DNS and NTP break "everything"

- Components address each other by **FQDN**; certificates contain FQDNs. A missing **reverse** record breaks many validation checks and certificate trust.
- Tokens and certificates are time-bound. Clock skew causes authentication failures between VCF Operations, SDDC Manager, vCenter and the Identity Broker that look like "invalid credentials".
- Logs from components with different clocks are impossible to correlate.

### Credentials are a communication dependency

SDDC Manager and VCF Operations log in to vCenter, NSX and ESX with service accounts. If someone changes a password directly on the component (outside fleet management), the next API call fails — the component shows as disconnected or a password needs **remediation**.

### Management vs data plane failures

Losing the NSX management/control plane does not immediately stop existing overlay traffic (hosts keep their forwarding state), and losing vCenter does not stop VMs. Losing the data plane (TEP MTU, uplinks, physical network) does stop workloads. Separate the two in every troubleshooting session.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x the hub was SDDC Manager (UI and API) and Aria Operations was an optional consumer of SDDC Manager data. Aria Suite Lifecycle talked to SDDC Manager to obtain Aria bundles, and Workspace ONE Access provided identity to Aria products. In 9.0 the hub is VCF Operations, the fleet management appliance replaces Aria Suite Lifecycle, and the Identity Broker replaces WSA for fleet-wide SSO.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

What to have in place so every flow works:

| Requirement | Applies to |
|---|---|
| Forward + reverse DNS for every appliance and host | All |
| One NTP source for all components and hosts | All |
| Management network reachability (VM management network) | Fleet and instance components, collectors |
| Firewall rules per the Ports and Protocols tool | Between networks/sites |
| Trusted CA (Certificate Authority) chain imported where needed | All HTTPS flows |
| Service-account passwords managed only through fleet management | SDDC Manager/VCF Ops → components |
| MTU ≥ 1600 (overlay) end to end where TEPs talk | Data plane |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

Verify links from the shell (examples):

```shell
# DNS forward and reverse from SDDC Manager or any Linux appliance
nslookup vcenter-wld01.lab.local
nslookup 10.0.10.21

# ESX: verify the heartbeat port configured for vpxa (default UDP 902)
grep -i port /etc/vmware/vpxa/vpxa.cfg

# NSX transport node: management and control channel status (nsxcli)
get managers
get controllers
```

```shell
# from an ESX host, test the control channel to an NSX Manager node
nc -zv 10.0.10.31 1235
```

## Failure Scenarios

| Broken link | Symptom | Scope |
|---|---|---|
| Collector ↔ vCenter of instance B | Instance B objects stale/no data | Monitoring only |
| VCF Ops ↔ SDDC Manager B | Cannot create domains or rotate passwords in B | Fleet management of B |
| Host → vCenter UDP 902 blocked | Host shows "not responding" every ~60 s | That host's management |
| Transport node → NSX TCP 1235 | Controller connectivity down; new config not pushed | That node's control plane |
| TEP MTU too small | Overlay drops large packets | Workload data plane |
| Identity Broker ↔ IdP | SSO logins fail; local accounts still work | Authentication |
| DNS reverse record missing | Validations and trust fail | Any workflow touching that FQDN |

## Troubleshooting

1. **Name the two endpoints** of the failing conversation using the flow table.
2. **Check shared dependencies first**: DNS (both directions), NTP offset, certificate validity/trust, credentials.
3. **Test reachability** on the documented port from the source side.
4. **Read the logs of the initiator** (e.g. SDDC Manager `domainmanager.log` for domain workflows).
5. **Re-validate integrations** in VCF Operations (Administration → Integrations → Accounts).

Incident to practice:

::incident[inc-dns-reverse-lookup]

## Real-World Scenario

After a weekend firewall change, VCF Operations shows the Cluj instance as healthy but with metrics frozen since Saturday, and a password rotation in Cluj fails. vCenter in Cluj works fine locally. The map points to a link, not a component: the collector in Cluj (and VCF Operations → SDDC Manager Cluj) are crossing the new firewall. Opening HTTPS between the sites' management networks restores both flows.


## Exam Focus

:::exam
- The collector collects locally per instance; VCF Operations analyses centrally.
- VCF Operations drives SDDC Manager for core-component tasks and the fleet management appliance for management components.
- vCenter ↔ ESX and NSX ↔ transport nodes are element-management links; losing them does not stop running VMs.
- DNS (forward + reverse) and NTP are dependencies of every flow.
- VCF SSO excludes SDDC Manager and ESX.
:::

## Common Exam Traps

:::trap
- "VCF Operations collects directly from every vCenter in the fleet" — it uses collectors deployed per instance.
- "If NSX Manager is down, all overlay traffic stops" — no, the data plane continues with existing state.
- "SSO failure means nobody can log in anywhere" — local accounts and non-SSO components (SDDC Manager, ESX) still authenticate locally.
:::

## Knowledge Check

::quiz

## Summary

- VCF communication flows: monitoring, fleet management, instance orchestration, element management, data plane, identity, logging, depot/licensing.
- Every flow depends on DNS, NTP, certificates, credentials and network reachability.
- Verified ports here: UDP 902 heartbeat, TCP 1234/1235 NSX channels, Geneve UDP 6081, logs 9000/9543/514/1514/6514; use the Ports and Protocols tool for the rest.

## Next Topic

Finish the phase with [Deployment Models](lesson:vcf-deployment-models): simple vs HA (High Availability) components, fleet designs, cluster models and stretched clusters.
