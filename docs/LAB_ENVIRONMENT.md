# VCF 9.0.2 lab environment

Sanitized infrastructure reference supplied by Alex on 2026-10-08. This file contains topology and build facts only.
It contains no usernames, passwords, tokens, recovery identifiers or private keys. The source inventory contained
plaintext credentials; do not copy it into the repository, screenshots, issues or evidence sheets.

`CURRENT_STATE.md` remains the task and milestone source of truth. This document is the reusable environment reference
for practical-guide authors. Values are **documented**, not independently queried by ChatGPT; each guide records fresh
runtime evidence for the systems it touches.

## Platform and storage

- Proxmox cluster: `andulab`; Proxmox 9.x.
- Primary node: `prox-host-00.andulab.local` / `10.10.10.99`; two Intel Xeon Platinum 8173M CPUs and about 251 GiB RAM.
- Other documented nodes: `prox-host-01` / `10.10.10.100`, `prox-host-02` / `10.10.10.110`, `prox-host-03` / `10.10.10.120`.
- `nvme1n1` Samsung 256 GB is the Proxmox OS device: **do not touch**.
- `vcf-fast`: Kingston 1 TB NVMe, ZFS, about 899 GiB.
- `vcf-aux`: Samsung 256 GB, mounted under `/vcf-aux/pve`, about 231 GiB.
- `vcf-capacity`: two 2 TB HDDs in a mirror, about 1.81 TB.
- Preserve `VM501 infra01` and `CT106 infraforge`.

## Network services and VLANs

- `infra01` provides BIND DNS, chrony NTP and routing services used by the lab.
- Internal DNS and NTP address: `10.100.80.10`.
- DNS zone: `vcf.home.arpa`.

| VLAN | Purpose | Subnet / pool | Gateway | MTU |
|---|---|---|---|---|
| 110 | Management | `10.100.10.0/24` | `10.100.10.1` | 1500 |
| 120 | vMotion | `10.100.20.0/24` | Document during validation | 1500 |
| 130 | vSAN | `10.100.30.0/24` | Document during validation | 1500 |
| 140 | NSX TEP | `10.100.40.0/24`; pool `10.100.40.20-10.100.40.79` | Document during validation | Verify on lab |
| 180 | Infrastructure | service address `10.100.80.10` | Document during validation | Verify on lab |

VLANs 150, 160 and 170 exist, but their exact subnets and purposes remain unknown.

## Nested ESX and management domain

| VMID | ESX host | Management IP |
|---|---|---|
| 701 | `esx01.vcf.home.arpa` | `10.100.10.11` |
| 702 | `esx02.vcf.home.arpa` | `10.100.10.12` |
| 703 | `esx03.vcf.home.arpa` | `10.100.10.13` |
| 704 | `esx04.vcf.home.arpa` | `10.100.10.14` |

- ESX version: 9.0.2; each nested VM has 12 vCPU, about 44–45 GB RAM and four vmxnet3 NICs on `vmbr3`.
- Documented speed-validation lab override: `enable.speed.of.physical.nics.validation=false`.
- Observed on `esx02`: `vmnic0` and `vmnic1` use the `nvmxnet3_ens` driver with MTU 1700; `vmnic2` and `vmnic3` use `nvmxnet3` with MTU 1500.
- VCF instance: `vcf-lab-01`.
- Management domain: `mgmt-domain`, single-node Standard.
- Datacenter: `mgmt-domain-dc01`; cluster: `mgmt-domain-cl01`.
- vSAN: OSA, FTT=0; datastore `mgmt-domain-cl01-ds-vsan01`.
- VDS: `mgmt-domain-cl01-vds01`, MTU 1700, `vmnic0`/`vmnic1` active-active.

## Management components

| Component | FQDN | IP / version notes |
|---|---|---|
| VCF Installer / SDDC Manager | `vcf01.vcf.home.arpa` | `10.100.10.20/24`; gateway `10.100.10.1`; DNS `10.100.80.10`; VLAN 110 |
| vCenter | `vcenter01.vcf.home.arpa` | `10.100.10.21`; Tiny; SSO domain `vsphere.local` |
| NSX VIP | `nsx.vcf.home.arpa` | `10.100.10.30` |
| NSX node | `nsx01.vcf.home.arpa` | `10.100.10.31`; node 9.0.2.0.25150388; product 9.0.2.0.25150386 |
| VCF Operations | `ops01.vcf.home.arpa` | `10.100.10.60` |
| Fleet management | `fleet01.vcf.home.arpa` | `10.100.10.61` |
| Collector | `collector01.vcf.home.arpa` | `10.100.10.62` |
| Offline depot | `depot.vcf.home.arpa` | `10.10.30.100`; HTTPS/443 |

NSX uses one medium node with 6 vCPU, 24 GB RAM and a 300 GB disk. The offline depot is stored under
`/mnt/pve/ssd_storage/vcf-repo/offline-depot`; source media are under
`/mnt/pve/ssd_storage/vcf-repo/00_INCOMING/VCF_9.0.2/`.

## Reusable operational evidence

- Domain Manager log: `/var/log/vmware/vcf/domainmanager/domainmanager.log`.
- NSX on ESX log: `/var/run/log/nsx-syslog.log`.
- A prior NSX transport-node failure affected only `esx03`; `opsAgent` was stopped and local agent connections failed.
  Rebooting `esx03` restored the agent and NSX deployment completed. Treat this as troubleshooting history, not a
  current fault.
- All four nested NICs are vmxnet3.

## Still to verify on the running lab

- Forward and reverse DNS equality for every management component.
- Current NTP configuration and live synchronization state on vCenter, all four ESX hosts and VCF appliances.
- Exact gateways/MTUs where the table above says `Document during validation` or `Verify on lab`.
- Exact subnets and purposes for VLANs 150, 160 and 170.
- Availability and current status of any NSX Edge, Workload Domain, Supervisor, Automation, Logs, Networks or HCX
  components not listed above.
