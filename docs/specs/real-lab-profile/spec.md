# REAL-LAB-PROFILE-01 — sanitized topology profile

## Status

Complete on feature branch. Content is documented from Alex's supplied inventory and has not been independently queried from the running lab.

## Goal

Expose the existing `vcf-lab-01` topology in the Home Lab Builder so later practical guides can use one sanitized reference without copying credentials or inventing missing capacity and network facts.

## Included

- Proxmox platform, safe storage boundaries and protected workloads.
- Four nested ESX 9.0.2 hosts and the current management-domain structure.
- vSAN OSA FTT=0, VDS MTU 1700 and VLANs 110/120/130/140/180.
- Sanitized management component names and addresses already recorded in `docs/LAB_ENVIRONMENT.md`.
- Explicit validation gaps for DNS, NTP, MTU, gateways and components not present in the supplied inventory.

## Content rules

- `docs/CURRENT_STATE.md` remains the source of truth; `docs/LAB_ENVIRONMENT.md` is the reusable inventory reference.
- Supplied facts are labelled documented rather than observed.
- No username, password, token, recovery identifier, private key or unredacted capture enters the repository.
- Unknown VM disk sizes and appliance sizing are omitted rather than inferred. The resource table therefore lists only the NSX node whose complete sizing was supplied and says that it is not the total footprint.
- This profile describes the current lab. It does not replace the minimal, recommended or advanced design profiles.

## Acceptance

- The profile validates against the existing schema and renders in `/homelab`.
- Strict content validation, unit tests, typecheck, production build and route smoke pass.
- Visual review confirms the documented-state warning, topology and validation limitations are legible.
- A secret scan finds no credential-like material.
- Only the verified feature branch may be pushed; no infrastructure action, deployment, PR or merge is part of this package.
