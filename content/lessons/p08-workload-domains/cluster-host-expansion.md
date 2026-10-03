---
id: cluster-host-expansion
title: Cluster and Host Expansion
phase: p08-workload-domains
module: m08-wld
version: vcf9
minutes: 35
difficulty: intermediate
summary: How to grow and shrink VCF 9.0 domains — adding hosts to an SDDC cluster, adding clusters to a domain, removing hosts and clusters — with prerequisites, UI locations, what VCF automates and how imported clusters differ.
topics: [cluster-expansion, host-commissioning, workload-domains, vlcm]
objectives: ["4.1"]
keyTerms: [sddc-cluster, unassigned-host, host-commissioning, host-decommissioning, network-pool, principal-storage, vcenter-import]
labs: [lab-commission-hosts-create-wld]
incidents: [inc-host-commissioning]
components: [sddc-manager, vcenter, esx-host, vsan, nsx-manager, workload-domain, vds]
related: [host-commissioning-wld-creation, workload-domain-storage, import-existing-vcenter, vlcm-images-host-remediation, design-sizing-scalability]
sources:
  - title: "VCF 9.0 – Expand a VCF Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/expand-a-workload-domain.html
  - title: "VCF 9.0 – Add an ESX Host to an SDDC Cluster in a VCF Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/expand-a-workload-domain/add-a-host-to-a-vsphere-cluster-using-the-sddc-manager-ui.html
  - title: "VCF 9.0 – Add an SDDC Cluster to a VCF Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/expand-a-workload-domain/add-a-cluster-to-a-workload-domain-using-the-sddc-manager-ui.html
  - title: "VCF 9.0 – Shrink a Workload Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/reduce-a-workload-domain-1.html
  - title: "VCF 9.0 – Remove a Host from a vSphere Cluster in a Workload Domain"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/reduce-a-workload-domain-1/remove-a-host-from-a-cluster-in-a-workload-domain.html
  - title: "VCF 9.0 – Decommission ESX Hosts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/host-management/decommission-hosts.html
  - title: "VCF 9.0 – Managing VCF Domains (child pages incl. configuration drift, delete domain)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains.html
  - title: "William Lam – Host lifecycle operations after importing vCenter into a VCF 9.x fleet"
    url: https://williamlam.com/2026/06/what-host-lifecycle-operations-are-available-after-importing-vcenter-into-vcf-9-x-fleet.html
---

## Why This Matters

Workload domains are not static: capacity grows, hardware is refreshed, clusters are split by workload type. In VCF you do not just drag a host into a cluster — VCF has to configure the VDS uplinks, NSX transport node, VMkernel IPs from the network pool, principal storage and the vLCM image consistently. Doing it the VCF way keeps SDDC Manager's inventory correct; doing it behind VCF's back creates drift that breaks later lifecycle operations. The exam asks *where* you do these operations and *what must be true first*.

## Learning Objectives

- Add an unassigned host to an existing SDDC cluster and describe what VCF configures automatically.
- Add a new SDDC cluster to a domain, choosing storage type, image and switch profile.
- Remove a host from a cluster and return it to service in another domain.
- Delete a cluster and predict what happens to its storage.
- Explain the different rules for clusters that came in through vCenter import.

## Concept

| Operation | Where (TechDocs 9.0) | Needs |
|---|---|---|
| Add host to cluster | vSphere Client → cluster → **Actions → Add Hosts → Add Unassigned Hosts** | Unassigned, active hosts commissioned with the cluster's storage type |
| Add cluster to domain | vSphere Client → VCF datacenter → **Actions → New Cluster → Create SDDC Cluster** | Enough unassigned hosts of one storage type, a cluster image |
| Remove host from cluster | Workload domain → **Clusters** tab → cluster → **Hosts** tab → **Remove Selected Hosts** | Workloads moved, enough hosts left for vSAN availability, no NSX Edge nodes on it |
| Delete cluster | Workload domain → cluster → delete | Workloads and data migrated off first (removing a whole domain is the separate *Delete a Workload Domain* procedure) |
| Decommission host | vSphere Client → Global Inventory Lists → Hosts → Unassigned Hosts → **Decommission Selected Hosts** | Host not in any domain |

Two terms: an [[sddc-cluster|SDDC cluster]] is a vSphere cluster created and managed by VCF (SDDC Manager knows its hosts, storage and networking). An **imported cluster** came with a brownfield vCenter.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x all expansion and shrink operations ran in the SDDC Manager UI (Workload Domains → domain → Actions → Add Cluster / Add Host). In VCF 9.0 TechDocs documents adding hosts and clusters from the **vSphere Client**, backed by the same SDDC Manager workflows.
:::

## Architecture

::diagram[d08-cluster-expansion]

What VCF does when a host joins an SDDC cluster:

1. Applies the cluster's **vLCM image** to the new host (remediation is scoped to the newly added hosts only).
2. Adds the host to the cluster's **VDS**; you map free vmnics to the existing uplinks (different NIC enumeration is allowed).
3. Allocates **VMkernel IPs** for vMotion and storage from the host's **network pool**.
4. Configures **principal storage**: joins vSAN, or mounts the NFS / vVols datastore automatically; VMFS on FC must be zoned and visible beforehand.
5. Prepares the host as an **NSX transport node** with TEP IPs from the static IP pool (or DHCP).
6. Marks the host **assigned** in SDDC Manager's inventory.

## Components

| Piece | Role in expansion |
|---|---|
| SDDC Manager | Orchestrates the add/remove workflow and keeps inventory |
| vCenter | Cluster membership, VDS, vLCM image |
| NSX Manager | Transport node preparation, TEP pool |
| Network pool | Source of vMotion/vSAN/NFS/iSCSI VMkernel IPs |
| Commissioned hosts | The only hosts that can join SDDC clusters |

## How It Works

### Add hosts to a cluster

1. Commission the new host(s) with the same storage type (and a pool with free IPs).
2. vSphere Client → select the cluster → *Actions → Add Hosts → Add Unassigned Hosts*.
3. Select hosts (multiple at once is fine). A mismatch with existing hosts' configuration produces a **warning**, not an error — clusters should stay balanced.
4. Review VDS and NSX settings; assign free vmnics to uplinks.
5. Review host, switch and license details → finish → watch Tasks.

### Add a cluster

1. vSphere Client → VCF datacenter → *Actions → New Cluster → Create SDDC Cluster*.
2. Pages: storage type → cluster name (3–80 chars) → cluster image → storage details → hosts (Next becomes available once the minimum is selected; optional *skip failed hosts*) → distributed switch profile → review.
3. Multiple add-cluster tasks can run in parallel.

### Remove a host and reuse it

1. Move or delete workload VMs created outside VCF; relocate any **NSX Edge** node on that host.
2. Workload domain → Clusters → cluster → Hosts → *Remove Selected Hosts* (*Force Remove* appears if you go below the minimum — avoid it).
3. Host becomes unassigned → **decommission** it → **re-image** → **commission** it again (with the right storage type/pool for its next home).

### Delete a cluster

The cluster's hosts are removed; **vSAN datastores on those hosts are destroyed**, other storage types are **unmounted**. Move workloads first.

## Deep Dive

### Imported clusters behave differently

For clusters that came in through vCenter import, the hosts were not provisioned by SDDC Manager. TechDocs: adding hosts to imported clusters requires the **vSphere Client** (ordinary vCenter add-host). William Lam's VCF 9.x summary: "VCF commissioned hosts cannot be added to an imported cluster." You *can* create **new** SDDC clusters in an imported domain from commissioned hosts, and expand those.

### Configuration drift

If someone changes VCF-managed objects directly in vCenter (renames a cluster, edits VDS uplinks), SDDC Manager's view diverges. VCF 9.0 has a dedicated procedure, *Manage VCF Domain Configuration Drift*, and inventory synchronisation became integrated into SDDC Manager in 9.0. Prefer VCF workflows so drift never appears.

### Capacity and limits

Check configmax.broadcom.com for maximum hosts per commissioning task, parallel tasks and hosts per cluster. Remember the management domain hosts the vCenter and NSX of every workload domain — adding domains (not hosts) grows the management domain's load.

### vSAN-specific care

Before removing a vSAN host, make sure the remaining hosts still satisfy the storage policies (FTT=1 with RAID-1 needs at least 3 hosts; more for RAID-5/6 or FTT=2). Otherwise objects become non-compliant or — if you force it — the datastore can become read-only or lose data, exactly as the TechDocs warning says.

### Add a host or add a cluster?

| Situation | Better choice | Reason |
|---|---|---|
| Same workload needs more CPU/RAM | Add hosts to the existing cluster | Keeps one DRS/HA pool; vLCM image and storage already defined |
| New workload with different hardware or licensing boundary | Add a new cluster | Separate image, storage type and failure domain |
| Need a different principal storage type | Add a new cluster | Principal storage cannot change on an existing cluster |
| Cluster approaching vSphere maximums | Add a new cluster | Hosts per cluster are capped (see configmax) |
| Need a separate vCenter/NSX/SSO boundary | Create a new workload domain | Clusters share their domain's vCenter and NSX |

### Sizing the change

When you add capacity, think N+1: with vSphere HA admission control and vSAN, one host's worth of resources is held back for failures and maintenance. Adding a single host to a 4-node cluster raises usable capacity by far less than 25% once vSAN slack space and HA reserves are considered. For removals, do the reverse calculation *before* you click Remove: after the host leaves, can the cluster still satisfy every storage policy and still tolerate a host failure? If not, add capacity elsewhere first.

### Order of operations in a hardware refresh

1. Commission the new hosts (same storage type, a pool with free IPs).
2. Add them to the cluster — the image is applied only to them.
3. Let DRS rebalance; check vSAN resync has finished.
4. Remove the old hosts one at a time (move any NSX Edge nodes first).
5. Decommission the old hosts; re-image if they will be reused.

This keeps the cluster at or above its original capacity throughout and never puts vSAN below its policy minimum.

## Configuration

Expansion checklist:

| # | Check |
|---|---|
| 1 | Host prepared (FQDN, DNS A+PTR, cert regenerated, NTP, clean disks, ≥10 Gbps NICs) |
| 2 | Commissioned with the **same storage type** as the target cluster |
| 3 | Network pool has free IPs for each network type |
| 4 | NSX host TEP pool has free IPs (or DHCP on the TEP VLAN) |
| 5 | For FC: zoning and LUN presented |
| 6 | Host hardware matches existing cluster nodes (avoid imbalance warning) |

## CLI / API

SDDC Manager API (9.0) – find candidates and check results:

```http
GET /v1/hosts?status=UNASSIGNED_USEABLE&storageType=VSAN_ESA
GET /v1/hosts?clusterId=<cluster-id>
GET /v1/network-pools/{id}/networks
```

On the new host after expansion:

```shell
esxcli network ip interface ipv4 get     # vmk IPs from the pool
esxcli vsan cluster get                  # vSAN membership (vSAN clusters)
```

## Failure Scenarios

| Situation | Effect |
|---|---|
| Host commissioned as NFS, cluster is vSAN | Host not offered |
| Pool out of IPs | Add-host task fails at VMkernel creation — add an IP range to the pool |
| TEP pool exhausted | NSX transport node preparation fails |
| Host carries an NSX Edge node | Removal blocked until the edge is moved |
| Forced removal below vSAN minimum | Datastore read-only or data loss |
| Host added to imported cluster through VCF workflow | Not supported — use vSphere Client |

## Troubleshooting

Read the failed subtask: it names the stage (image remediation, VDS, VMkernel, vSAN, NSX). Then check the corresponding resource: image compliance in vLCM, free IPs in the pool, vmnic mapping, vSAN health, NSX TEP pool. Retry the task after fixing. If a host fails at commissioning time, see the incident below.

::incident[inc-host-commissioning]

## Real-World Scenario

A media company's render workload domain needs 50% more CPU for a project. They commission four new vSAN ESA hosts and add them to the existing cluster: the vLCM image is applied only to the new hosts, VDS uplinks mapped, vSAN and vMotion IPs drawn from the rack's pool. When the project ends, two hosts are removed: VMs are evacuated by DRS, vSAN data migrates, the hosts are decommissioned, re-imaged and commissioned again into the VDI domain's pool.

## Lab

::lab[lab-commission-hosts-create-wld]

## Exam Focus

:::exam
- Add host: vSphere Client → cluster → Add Hosts → Add Unassigned Hosts (same storage type; vLCM remediation scoped to new hosts).
- Add cluster: vSphere Client → New Cluster → Create SDDC Cluster; each cluster can have a different principal storage type.
- Remove host → decommission → re-image → commission before reuse.
- Delete cluster: vSAN datastores destroyed, other storage unmounted.
- Imported clusters: add hosts with the vSphere Client.
:::

## Common Exam Traps

:::trap
- "Add a decommissioned host straight to another domain" — commission it first (and re-image if it was in a domain).
- "Removing a host returns it to the pool ready for any domain" — it must be decommissioned, re-imaged and re-commissioned.
- "Edge nodes move automatically when a host is removed" — remove/relocate them first.
:::

## Knowledge Check

::quiz

## Summary

VCF grows domains by adding commissioned hosts to SDDC clusters or adding new SDDC clusters, configuring image, VDS, pool IPs, storage and NSX automatically. It shrinks them by removing hosts (then decommission, re-image, re-commission) or deleting clusters (vSAN data destroyed). Imported clusters keep vSphere-Client host management.

## Next Topic

Next: [vSphere Supervisor in a Workload Domain](lesson:supervisor-in-workload-domain).
