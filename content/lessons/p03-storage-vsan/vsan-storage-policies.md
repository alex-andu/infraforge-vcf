---
id: vsan-storage-policies
title: vSAN Storage Policies (SPBM, FTT and RAID)
phase: p03-storage-vsan
module: m03-vsan-ops
version: vcf9
minutes: 45
difficulty: intermediate
summary: How VM storage policies drive vSAN data placement — failures to tolerate, RAID-1 vs RAID-5/6, ESA adaptive RAID-5, auto-policy management, the advanced rules, and what happens when you change a policy.
topics: [vsan-policies, vsan-architecture]
objectives: ["2.3"]
keyTerms: [spbm, ftt, raid-1-mirroring, erasure-coding, adaptive-raid-5, vsan-object, vsan-component, vsan-witness-component, object-space-reservation, auto-policy-management]
labs: [lab-vsan-storage-policies]
incidents: [inc-vsan-degraded-objects]
components: [vsan, vcenter]
related: [vsan-architecture-esa-osa, vsan-resilience-fault-domains, vsan-space-efficiency-capacity]
sources:
  - title: "vSAN 9.0 – What are vSAN Policies"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/using-vsan-policies/about-vsan-policies.html
  - title: "vSAN 9.0 – Using vSAN Policies"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/using-vsan-policies.html
  - title: "vSAN 9.0 – vSAN Terms and Definitions"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/what-is-vsan/vsan-concepts/virtual-san-terms-and-definitions.html
  - title: "vSAN 9.0 – RAID 5 or RAID 6 Erasure Coding"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/increasing-space-efficiency-in-a-vsan-cluster/using-raid-5-6-erasure-coding-in-vsan-cluster.html
  - title: "VCF blog – Auto-Policy Management Capabilities with the ESA in vSAN 8 U1"
    url: https://blogs.vmware.com/cloud-foundation/2023/03/20/auto-policy-management-capabilities-with-the-esa-in-vsan-8-u1/
  - title: "Yellow Bricks – vSAN 8.0 ESA, introducing Adaptive RAID-5"
    url: https://www.yellow-bricks.com/2022/11/15/vsan-8-0-esa-introducing-adaptive-raid-5/
  - title: "ESXCLI command reference 9.0 – esxcli vsan"
    url: https://developer.broadcom.com/xapis/esxcli-command-reference/9.0.0/namespace/esxcli_vsan.html
  - title: "Broadcom KB 437757 – vSAN ESA Storage Policy and Encryption FAQ (VCF 9.0)"
    url: https://knowledge.broadcom.com/external/article/437757
---

## Why This Matters

On a SAN you choose *where* a VM goes (which LUN, which RAID group). On vSAN you choose *what the VM needs* — "survive one host failure, use as little capacity as possible" — and vSAN decides where the pieces go. That decision is expressed as a **VM storage policy**. Get the policy wrong and you either waste half your capacity or discover during a host failure that a critical VM had no redundancy.

Exam objective 2.3 says "Given a scenario, configure vSAN Storage policies". Expect scenario questions like: *"A 4-host ESA cluster must tolerate one host failure with the least capacity overhead — which policy?"* This lesson gives you the numbers and the reasoning.

## Learning Objectives

- Explain how SPBM policies are created, assigned and checked for compliance on vSAN.
- Calculate host requirements and capacity overhead for RAID-1, RAID-5 and RAID-6 at FTT 1–3.
- Describe ESA adaptive RAID-5 (2+1 vs 4+1) and auto-policy management.
- Describe the advanced rules (stripes, IOPS limit, object space reservation, checksum, force provisioning) and their ESA differences.
- Predict the impact of changing a policy on a running VM.

## Concept

### Policies as contracts

A [[spbm|VM storage policy]] is a set of rules. vSAN advertises its capabilities to vCenter through its built-in VASA provider. When you assign a policy to a VM (or to each of its disks individually), vSAN builds the VM's [[vsan-object|objects]] to satisfy it and keeps checking: the VM is **compliant** when every object meets its policy, **noncompliant** when one or more do not.

If you assign nothing, the datastore's default policy applies. The classic **vSAN Default Storage Policy** is: failures to tolerate = 1, one disk stripe per object, thin provisioned.

### Failures to tolerate and the failure tolerance method

[[ftt|Failures to tolerate (FTT)]] is the number of host (or fault domain) failures an object must survive. The method decides how:

| Policy | Method | Components (typical) | Minimum hosts / fault domains | Capacity for 100 GB |
|---|---|---|---|---|
| No data redundancy | none | 1 | 1 | 100 GB |
| FTT=1, RAID-1 | Mirroring | 2 replicas + witness | 3 | 200 GB |
| FTT=1, RAID-5 (OSA, 3+1) | Erasure coding | 4 (3 data + 1 parity, rotated) | 4 | ~133 GB |
| FTT=1, RAID-5 (ESA, 2+1) | Erasure coding | 3 | 3 | 150 GB |
| FTT=1, RAID-5 (ESA, 4+1) | Erasure coding | 5 | 6 | 125 GB |
| FTT=2, RAID-1 | Mirroring | 3 replicas + witnesses | 5 | 300 GB |
| FTT=2, RAID-6 (4+2) | Erasure coding | 6 | 6 | 150 GB |
| FTT=3, RAID-1 | Mirroring | 4 replicas + witnesses | 7 | 400 GB |

Rules of thumb: RAID-1 needs **2 × FTT + 1** hosts. RAID-5/6 trade CPU and network work for capacity savings. Erasure coding requires all-flash (on OSA) — ESA is all-NVMe by definition.

### Adaptive RAID-5 (ESA)

[[adaptive-raid-5]] is ESA's automatic choice of RAID-5 layout:

- **2+1** (150 % consumption) on clusters with fewer than 6 hosts.
- **4+1** (125 % consumption) on clusters of 6 or more hosts.

vSAN monitors cluster size. If a 6-host cluster drops to 5 hosts for a sustained period (Duncan Epping describes 24 hours), objects are reconfigured to 2+1; when hosts return, they move back to 4+1. You do not choose 2+1 or 4+1 in the policy; you choose "RAID-5" and ESA adapts.

### Auto-policy management (ESA)

With [[auto-policy-management]] enabled (cluster → **Configure → vSAN → Services → Storage → Edit**), vSAN creates a cluster-specific default policy named like *"<cluster> - Optimal Datastore Default Policy - RAIDx"* and keeps it appropriate for the cluster size. The VCF blog's table for standard clusters with host rebuild reserve **off**:

| Hosts | Optimal default policy |
|---|---|
| 3 | FTT=1, RAID-1 |
| 4–5 | FTT=1, RAID-5 (2+1) |
| 6+ | FTT=2, RAID-6 (4+2) |

With host rebuild reserve **on**, the thresholds shift up by one host (4 → RAID-1, 5 → RAID-5 2+1, 6 → RAID-5 4+1, 7+ → RAID-6). Stretched clusters get site mirroring plus the same in-site logic; two-node clusters get host-level mirroring.

:::note
Broadcom has published a newer "Auto-RAID" capability for VCF 9.1. Behaviour of default-policy automation differs by version: check the release notes for the version you run.
:::

## Architecture

::diagram[d03-raid-layouts]

The diagram shows the same 100 GB VMDK object placed three ways across a 6-host cluster: RAID-1 (two full replicas plus a witness on a third host), ESA RAID-5 4+1 (five components on five hosts), and RAID-6 4+2 (six components on six hosts). Use the step-through to see which hosts can fail.

## Components

| Element | Role |
|---|---|
| VM storage policy (vCenter) | The set of rules; stored and versioned in vCenter |
| vSAN VASA provider | Advertises vSAN capabilities to SPBM (registered automatically) |
| CLOM on each host | Turns the policy into a component layout and repairs it after failures |
| DOM (distributed object manager) | Handles I/O to the object's components |
| Datastore default policy | Applied when a VM or disk has no explicit policy |
| Compliance checker | Periodically compares objects to their policy; shows compliant / noncompliant / out of date |

## How It Works

1. You create a policy in **Policies and Profiles → VM Storage Policies → Create**, enabling "vSAN storage" rules.
2. You set **Availability** (site disaster tolerance, failures to tolerate), **Storage rules** (encryption services, space efficiency, storage tier) and **Advanced rules**.
3. When you deploy a VM, vCenter lists compatible datastores; vSAN reports compatible if it can satisfy the rules with current resources.
4. CLOM computes a layout — for example 2+1 RAID-5 on three hosts — and the components are created.
5. The compliance service keeps checking. A host failure that removes a component makes the object noncompliant (reduced availability) while it stays accessible.
6. When you **change** a policy, vSAN builds the new layout alongside the old one, resyncs data, then deletes the old components. This needs **transient capacity**.

## Deep Dive

### Advanced rules and ESA differences

| Rule | Default | Notes |
|---|---|---|
| Number of disk stripes per object | 1 (max 12) | Splits components across more devices; rarely needed on ESA |
| IOPS limit for object | 0 (no limit) | Caps a noisy VM's IOPS |
| [[object-space-reservation]] | Thin provisioning | 25/50/75 % or thick; reserves capacity up front |
| Flash read cache reservation | 0 % | Hybrid OSA only; not used on ESA |
| Disable object checksum | No (checksum on) | On ESA checksum is always on and cannot be disabled |
| Force provisioning | No | Allows provisioning even when the policy cannot be met (VM created as FTT=0). Use only for emergencies |
| Space efficiency | No preference | On ESA, compression is enabled by default and is applied per object |
| Encryption services | No preference | Data-at-rest encryption is a cluster feature; this rule requires/forbids it |

:::warning
The VCF 9.0 storage policy FAQ (KB 437757) warns that management VMs such as vCenter and VCF Operations should stay **thick provisioned (object space reservation 100 %)** so capacity exhaustion cannot lock them out, and that vSphere VM Encryption should not be used on core management VMs.
:::

### Site disaster tolerance

The **Site disaster tolerance** rule selects:

- *None – standard cluster* (default)
- *Host mirroring – 2 node cluster*
- *Site mirroring – stretched cluster*, combined with an in-site FTT (for example site mirroring + RAID-5 inside each site)

Details in [resilience and fault domains](lesson:vsan-resilience-fault-domains).

### Changing policies safely

| Change | What vSAN does | Risk |
|---|---|---|
| RAID-1 → RAID-5 | Builds new erasure-coded components, resyncs, removes mirrors | Needs temporary extra capacity; resync traffic |
| FTT=1 → FTT=2 | Adds components | Needs more hosts and capacity |
| Policy edited in vCenter | Every VM using it becomes **out of date** until reapplied | Reapplying many VMs at once creates a large resync |
| FTT=1 → FTT=0 | Removes redundancy | Any failure now causes data unavailability |

Best practice: create a **new** policy, apply it to a few VMs, watch resync and capacity, then roll out in batches.

### Why "compliant" ≠ "healthy"

Compliance answers "does the object match the policy?". Health answers "is the object accessible and are all components active?". A VM can be accessible but noncompliant (one replica absent after a host reboot). It can also be compliant with an FTT=0 policy and still be one disk failure away from data loss.

## Configuration

Create an ESA RAID-5 policy for general workloads:

1. **Policies and Profiles → VM Storage Policies → Create**. Name: `vsan-esa-raid5-ftt1`.
2. Policy structure: enable **"Enable rules for vSAN storage"**.
3. Availability: Site disaster tolerance **None – standard cluster**; Failures to tolerate **1 failure – RAID-5 (Erasure Coding)**.
4. Storage rules: leave encryption and space efficiency as **No preference** (compression stays on by default on ESA).
5. Advanced: leave defaults (thin, 1 stripe, no IOPS limit).
6. Storage compatibility: confirm your vSAN datastore appears as compatible.
7. Apply: VM → **Configure → Policies → Edit VM Storage Policies**, choose the policy for VM home and each disk, then watch **Monitor → vSAN → Resyncing Objects** on the cluster.

Change the default for the datastore: vSAN datastore → **Configure → General → Default Storage Policy → Edit**.

## CLI / API

The host-level default policy used by vSAN for objects created without an SPBM policy:

```shell
esxcli vsan policy getdefault
```

```log
Policy Class  Policy Value
------------  --------------------------------------------------------
cluster       (("hostFailuresToTolerate" i1))
vdisk         (("hostFailuresToTolerate" i1))
vmnamespace   (("hostFailuresToTolerate" i1))
vmswap        (("hostFailuresToTolerate" i1) ("forceProvisioning" i1))
vmem          (("hostFailuresToTolerate" i1) ("forceProvisioning" i1))
```

Watch the resync caused by a policy change:

```shell
esxcli vsan debug resync summary get
```

PowerCLI (connected to vCenter) to list policies and check compliance:

```powershell
Get-SpbmStoragePolicy | Select-Object Name
Get-VM app01 | Get-SpbmEntityConfiguration | Select-Object Entity, StoragePolicy, ComplianceStatus
```

## Failure Scenarios

| Scenario | Outcome |
|---|---|
| FTT=1 RAID-1, one host fails | Object accessible (one replica + witness = >50 % votes); noncompliant until rebuilt |
| FTT=1 RAID-5 2+1, one host fails | Accessible (2 of 3 segments); rebuild needs a 4th host |
| FTT=1, two hosts fail at once | Object inaccessible if both lost components belong to it |
| FTT=0 VM, host with its only component reboots | VM's disk inaccessible until the host returns |
| Policy needs 6 fault domains, cluster has 5 | Provisioning fails or objects stay noncompliant (unless force provisioning) |

## Troubleshooting

- **Datastore shows "incompatible" when deploying a VM**: the policy needs more hosts/fault domains than the cluster has (for example RAID-6 on 4 hosts) or asks for a feature the cluster does not provide.
- **VMs "out of date"**: the policy was edited; reapply it in batches.
- **Noncompliant after a host reboot**: components are absent; wait for the host or the 60-minute repair timer. Check **Monitor → vSAN → Virtual Objects**.
- **Capacity spike after policy change**: transient capacity during reconfiguration; check **Monitor → vSAN → Capacity** and resync progress.

## Real-World Scenario

An 8-host ESA VI workload domain in VCF runs three classes of VMs:

| Class | Policy | Why |
|---|---|---|
| Databases | FTT=2, RAID-6 (4+2) | Survive two failures at 150 % overhead (RAID-1 FTT=2 would need 300 %) |
| General app servers | FTT=1, RAID-5 (ESA uses 4+1 at 6+ hosts) | 125 % overhead, one failure |
| Build agents (disposable) | FTT=1 RAID-1 or RAID-5 — not FTT=0 | FTT=0 saves capacity but any host reboot makes those disks inaccessible; acceptable only for truly disposable data |

The team creates the policies, applies them to five VMs first, monitors resync, then applies them by tag in batches overnight.

## Lab

Create RAID-1, RAID-5 and FTT=0 policies on your nested ESA cluster and observe component placement and compliance.

::lab[lab-vsan-storage-policies]

## Exam Focus

:::exam
- RAID-1 hosts = 2 × FTT + 1 (3, 5, 7).
- OSA RAID-5 = 4 hosts (3+1), RAID-6 = 6 hosts (4+2). ESA RAID-5 = 2+1 from 3 hosts, 4+1 from 6 hosts. ESA RAID-6 = 4+2, 6 hosts.
- Overheads: RAID-1 FTT1 200 %, FTT2 300 %; RAID-5 133 % (OSA) / 150 % (ESA 2+1) / 125 % (ESA 4+1); RAID-6 150 %.
- Default policy: FTT=1, one stripe, thin.
- ESA: checksum always on; compression on by default; flash read cache reservation not applicable.
:::

## Common Exam Traps

:::trap
- **"RAID-5 needs four hosts"** — true for OSA, not for ESA 2+1.
- **"Choose 4+1 in the policy"** — you choose RAID-5; ESA picks 2+1 or 4+1 by cluster size.
- **"Force provisioning guarantees protection"** — it does the opposite: it lets a VM be created without meeting the policy.
- **"Editing a policy changes nothing until VMs restart"** — vSAN reconfigures objects (after reapply) online, with resync traffic.
- **Witness components do not hold VM data**; they hold metadata for quorum.
:::

## Knowledge Check

::quiz

## Summary

- SPBM policies describe requirements; vSAN turns them into component layouts and checks compliance.
- FTT decides how many failures an object survives; RAID-1 mirrors, RAID-5/6 use erasure coding for lower overhead.
- ESA's adaptive RAID-5 uses 2+1 below 6 hosts and 4+1 at 6+; auto-policy management keeps a cluster-optimal default.
- Policy changes create resync traffic and need transient capacity; roll them out in batches.

## Next Topic

Policies say "tolerate N failures" — but failures of *what*? [vSAN Resilience, Fault Domains and Stretched Clusters](lesson:vsan-resilience-fault-domains) explains hosts, racks and sites.
