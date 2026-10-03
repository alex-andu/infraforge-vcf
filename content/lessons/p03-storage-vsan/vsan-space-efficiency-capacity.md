---
id: vsan-space-efficiency-capacity
title: vSAN Space Efficiency and Capacity Management
phase: p03-storage-vsan
module: m03-vsan-ops
version: vcf9
minutes: 40
difficulty: intermediate
summary: Where vSAN capacity goes and how to get more out of it — erasure coding, ESA compression, OSA deduplication and compression, ESA global deduplication in VCF 9.0 (limited availability), TRIM/UNMAP, thin provisioning, and the operations and host rebuild reserves that keep a cluster able to heal.
topics: [vsan-capacity, vsan-policies, design-sizing]
objectives: ["2.3"]
keyTerms: [erasure-coding, global-deduplication, vsan-compression, operations-reserve, host-rebuild-reserve, object-space-reservation, vsan-esa, vsan-osa, disk-group]
labs: [lab-vsan-storage-policies]
incidents: [inc-vsan-degraded-objects]
components: [vsan, vcenter, vcf-operations]
related: [vsan-storage-policies, vsan-architecture-esa-osa, vsan-health-troubleshooting]
sources:
  - title: "vSAN 9.0 – Deduplication and Compression"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/increasing-space-efficiency-in-a-vsan-cluster/using-deduplication-and-compression-in-vsan-cluster.html
  - title: "vSAN 9.0 – vSAN Space Efficiency Features"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/increasing-space-efficiency-in-a-vsan-cluster/vsan-space-efficiency-features.html
  - title: "vSAN 9.0 – RAID 5 or RAID 6 Erasure Coding"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/increasing-space-efficiency-in-a-vsan-cluster/using-raid-5-6-erasure-coding-in-vsan-cluster.html
  - title: "vSAN 9.0 – What are vSAN Policies (space efficiency rule)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsan-deployment-administration-and-monitoring/administering-vmware-vsan/using-vsan-policies/about-vsan-policies.html
  - title: "VCF blog – Global Deduplication in vSAN ESA for VMware Cloud Foundation 9.0"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/19/global-deduplication-in-vsan-esa-for-vmware-cloud-foundation-9-0/
  - title: "Broadcom KB 326889 – vSAN Health Service: Capacity utilization – Storage space"
    url: https://knowledge.broadcom.com/external/article/326889
  - title: "Broadcom KB 437757 – vSAN ESA Storage Policy and Encryption FAQ (VCF 9.0)"
    url: https://knowledge.broadcom.com/external/article/437757
---

## Why This Matters

The capacity number on a vSAN datastore is **raw** capacity. A VM with a 100 GB disk can consume 100 GB, 125 GB, 200 GB or 400 GB of it depending on its policy — and less if data reduction works well. On top of that vSAN needs free space to resync, rebalance and rebuild. Teams that run vSAN at 95 % full discover during the first host failure that the cluster cannot heal.

Exam objective 2.3 says "Given a scenario, describe the purpose of vSAN Space Efficiency". Expect questions on which technique applies to ESA vs OSA, what is enabled by default, and what the status of global deduplication is in 9.0.

## Learning Objectives

- Break down raw vSAN capacity into usable capacity, policy overhead, system usage and reserves.
- Compare the space-efficiency techniques: erasure coding, compression, deduplication, thin provisioning and TRIM/UNMAP.
- State how compression and deduplication differ between ESA and OSA, and the 9.0 status of ESA global deduplication.
- Explain the operations reserve and host rebuild reserve, and how capacity health thresholds work.
- Size a small cluster for a given usable capacity target.

## Concept

### Where the bytes go

| Layer | Example (4-host ESA, 4 × 3.84 TB NVMe per host) |
|---|---|
| Raw capacity | ~61 TB |
| Reserves (operations reserve, optional host rebuild reserve) | A share set aside so vSAN can resync and rebuild |
| Policy overhead | RAID-5 2+1 consumes 1.5× the written data; RAID-1 FTT=1 consumes 2× |
| Data reduction | Compression (ESA default) and, where enabled, deduplication reduce what is written |
| VM data | What guests actually wrote (thin provisioning: unwritten blocks are not consumed) |

### Techniques at a glance

| Technique | What it saves | ESA | OSA |
|---|---|---|---|
| [[erasure-coding\|RAID-5/6 erasure coding]] | Replica overhead (1.25–1.5× instead of 2–3×) | Yes, adaptive RAID-5, RAID-6; performance close to RAID-1 | Yes, all-flash only |
| [[vsan-compression\|Compression]] | Redundancy inside each block | **On by default**, per-policy opt-out, applies to new writes | Optional; "compression-only" or with dedup, all-flash only |
| Deduplication | Identical blocks | **Global deduplication**: VCF 9.0 limited availability | Dedup + compression, per **disk group**, all-flash only |
| Thin provisioning | Unwritten space | Default (object space reservation = thin) | Same |
| TRIM/UNMAP | Space freed inside the guest | Supported | Supported |

## Architecture

::diagram[d03-capacity-breakdown]

The diagram follows 1 TB of raw capacity down to what a VM can really use, and shows where each technique acts.

## Components

| Element | Where it acts | Notes |
|---|---|---|
| ESA compression | Host that owns the I/O, near the top of the stack, before data crosses the network | "Compression for vSAN ESA is only for new writes. Old blocks are left uncompressed" |
| OSA dedup & compression | During destage from cache to capacity tier, within each disk group | "Deduplication occurs inline when data is written back from the cache tier to the capacity tier" |
| ESA global deduplication | Post-process, after data "cools down", using free CPU cycles; 4 KB blocks; cluster-wide domain | 9.0 limited availability |
| Space efficiency policy rule | VM storage policy | No preference / compression only / dedup and compression / none |
| Capacity reserves | Cluster setting | Operations reserve and host rebuild reserve |
| Capacity health check | vSAN Skyline Health | Warns/errors based on thresholds and reserves |

## How It Works

### ESA compression

1. A write arrives at the vSAN layer of the host running the VM.
2. If the object's policy allows compression (the default), ESA compresses the block.
3. The compressed block is sent to the hosts holding the object's components: less network traffic, less device capacity.
4. If you later disable compression for a VM via policy, already-compressed blocks stay as they are; only new writes change.

### OSA deduplication and compression

1. Writes land in the disk group's cache device.
2. When data destages to the capacity devices, vSAN deduplicates (fixed block size) **within that disk group** and compresses the unique blocks.
3. Dedup metadata is spread across the disk group's capacity devices — which is why, with dedup enabled, "a single disk failure causes the entire disk group to fail".
4. Enabling or disabling dedup on an existing OSA cluster requires each disk group to be evacuated and reformatted, one at a time (the wizard offers "allow reduced redundancy" for small clusters).

### ESA global deduplication (VCF 9.0)

The VCF blog describes it this way:

- **Post-process**: "vSAN will deduplicate data after it has been persisted to disk and cools down", using only free CPU cycles.
- **Granularity**: 4 KB blocks, with the whole cluster as one deduplication domain (unlike OSA's per-disk-group domain).
- **Availability**: "initially under limited release, available through Broadcom's Technical Qualification Request (TQR) program."
- **Scope at launch**: single-site vSAN HCI clusters or vSAN storage clusters of 3–16 hosts, 25 GbE or faster; stretched clusters and data-at-rest encryption are not supported. KB 437757 confirms: "Clusters utilizing vSAN Data-at-Rest Encryption are currently ineligible for Global Deduplication."
- **Reporting**: savings are shown as one data reduction ratio including compression and deduplication.

:::vcf9 Changed in VCF 9
Before 9.0, ESA offered compression but no deduplication. VCF 9.0 adds ESA global deduplication as a **limited-availability** feature (TQR). For exam answers: ESA compression = on by default; ESA dedup = global, post-process, limited availability in 9.0; OSA dedup = per disk group, all-flash, inline at destage.
:::

### TRIM/UNMAP

When a guest deletes files and issues TRIM/UNMAP, vSAN can release the blocks of the thin object: "vSAN supports SCSI unmap commands that enable you to reclaim storage space that is mapped to a deleted vSAN object." Without it, thin disks only grow.

## Deep Dive

### Reserves: why "free" is not free

[[operations-reserve|Operations reserve]] is capacity kept for internal operations (resync, rebalancing, policy changes). For ESA, KB 326889 gives the formula as roughly 765 GB per host plus a small per-device amount.

[[host-rebuild-reserve|Host rebuild reserve]] is capacity kept so that the data of one failed host can be rebuilt on the others (N+1). It is larger on small clusters: the KB's examples are about **25 % on a 4-node cluster** and about **3 % on a 32-node cluster**.

Both are enabled with toggles under the cluster's vSAN capacity view (**Monitor → vSAN → Capacity → Reservations and Alerts**). When enabled, vSAN prevents new provisioning from eating into the reserve.

### Capacity health thresholds

The *Capacity utilization – Storage space* health check (KB 326889):

| | Host rebuild reserve **off** | Host rebuild reserve **on** |
|---|---|---|
| Yellow | MIN(70 % of total, host rebuild threshold) | MIN(70 % of total, 80 % of host rebuild threshold) |
| Red | MIN(90 % of total, vSAN operations threshold) | MIN(90 % of total, host rebuild threshold) |

A custom threshold, if set, takes precedence.

### Sizing example

Target: 20 TB of VM data, ESA, 4 hosts, FTT=1.

1. ESA RAID-5 at 4 hosts = 2+1 → 20 TB × 1.5 = 30 TB.
2. Host rebuild reserve on a 4-node cluster ≈ 25 % of raw; plus operations reserve (~765 GB × 4 ≈ 3 TB).
3. Raw needed ≈ (30 TB + ~3 TB) / 0.75 ≈ 44 TB before data reduction.
4. Compression may reduce this, but do not size on an assumed ratio you have not measured; use the vSAN sizer and real data.

Same data at 6 hosts: RAID-5 becomes 4+1 (×1.25 = 25 TB) and the host rebuild share drops to about one sixth — larger clusters are more capacity-efficient.

### Thick vs thin

[[object-space-reservation]] of 100 % (thick) reserves capacity up front: predictable, but wastes space. Broadcom's VCF 9.0 FAQ recommends thick (100 %) for core management VMs so a full datastore cannot stop them. Workload VMs normally stay thin, with capacity alarms.

## Configuration

- **ESA compression off for a workload** (already-compressed data such as media or encrypted backups): create a policy with *Space efficiency = No space efficiency* and apply it to those VMs.
- **OSA dedup and compression**: cluster → **Configure → vSAN → Services → Space efficiency → Edit** → Deduplication and compression (or Compression only). Expect a rolling disk group reformat.
- **Reserves**: cluster → **Monitor → vSAN → Capacity** → Reservations and Alerts → enable Operations reserve and Host rebuild reserve.
- **Global dedup**: only for clusters approved through TQR; follow the instructions provided with that approval.

## CLI / API

Disk-level capacity on a host:

```shell
esxcli vsan debug disk overview
```

Resync volume (capacity temporarily used by policy changes and rebuilds):

```shell
esxcli vsan debug resync summary get
```

```log
   Total Number Of Resyncing Objects: 14
   Total Bytes Left To Resync: 412316860416
   Total GB Left To Resync: 384.00
```

Capacity is best read from the vSphere Client capacity view or from VCF Operations (storage capacity dashboards), which show used, free, reserved and data-reduction savings for the cluster.

## Failure Scenarios

| Situation | Effect |
|---|---|
| Cluster at red threshold, host fails | Not enough room to rebuild; objects stay reduced availability |
| Large policy change at 85 % used | Transient capacity pushes cluster to full; provisioning fails |
| OSA dedup cluster loses one capacity device | Whole disk group fails → many components degraded |
| Thin VMs fill the datastore | Writes fail for VMs needing new blocks; VMs may pause |
| Global dedup requested on encrypted cluster | Not eligible in 9.0 |

## Troubleshooting

1. Start with **Monitor → vSAN → Capacity**: usage breakdown (VM data, system usage, reserves) and data reduction savings.
2. Check the Skyline Health capacity check and whether reserves are enabled.
3. Look for runaway snapshots, orphaned objects or VMs with FTT=2 RAID-1 where RAID-6 would do.
4. Ensure guests issue TRIM/UNMAP so deleted space is released.
5. If a rebuild cannot proceed, free capacity (delete/move VMs) or add capacity (devices or hosts) before anything else.

## Real-World Scenario

A 5-host ESA cluster reports 78 % used and a yellow capacity warning. The team wanted to enable global deduplication to "fix it", but the cluster uses vSAN data-at-rest encryption — not eligible in 9.0, and global dedup is limited availability anyway. They instead:

- Move 30 VMs from FTT=1 RAID-1 to RAID-5 (ESA 2+1 at 5 hosts: 1.5× instead of 2×), in batches, watching resync.
- Turn on TRIM/UNMAP in the guests and clean up 4 TB of old snapshots.
- Enable host rebuild reserve so new provisioning cannot use the space needed to survive a host failure.
- Order a sixth host: RAID-5 becomes 4+1 automatically (1.25×) and the rebuild share shrinks.

## Lab

In the policy lab you will compare the consumed capacity of the same VM under RAID-1, RAID-5 and FTT=0.

::lab[lab-vsan-storage-policies]

## Exam Focus

:::exam
- ESA: compression on by default, per-policy opt-out, new writes only.
- OSA: dedup + compression per disk group, all-flash only, inline at destage; compression-only option.
- ESA global dedup: VCF 9.0, post-process, 4 KB, cluster-wide, limited availability (TQR), not with stretched clusters or data-at-rest encryption.
- Erasure coding saves capacity versus mirroring; RAID-5/6 on OSA requires all-flash.
- Operations reserve + host rebuild reserve protect the cluster's ability to heal.
:::

## Common Exam Traps

:::trap
- **"Dedup is enabled by default on ESA"** — compression is; dedup is global and limited availability in 9.0.
- **"OSA dedup works on hybrid clusters"** — all-flash only.
- **"Disabling compression decompresses existing data"** — no, it affects new writes.
- **"The datastore free space is what I can provision"** — not if you need reserves and policy overhead.
- **"Space efficiency fixes a full cluster during a failure"** — reductions take effect on writes; you need free capacity first.
:::

## Knowledge Check

::quiz

## Summary

- Raw capacity minus reserves, divided by policy overhead, reduced by compression/dedup, is your real usable capacity.
- ESA compresses by default; OSA dedup/compression is per disk group; ESA global dedup is a 9.0 limited-availability feature.
- Erasure coding is the biggest lever on ESA (1.25–1.5× vs 2×).
- Keep operations and host rebuild reserves so vSAN can resync and rebuild.

## Next Topic

Capacity is one health dimension of many. [vSAN Health and Troubleshooting](lesson:vsan-health-troubleshooting) puts Skyline Health, object health, resync and esxcli together into a method.
