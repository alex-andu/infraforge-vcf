---
id: password-management
title: Password Management - Update, Rotate, Remediate
phase: p12-security
module: m12-trust
version: vcf9
minutes: 40
difficulty: intermediate
summary: Which accounts VCF manages, the difference between Update, Rotate and Remediate, where each action lives in VCF 9.0 (VCF Operations vs SDDC Manager), how expiry works and how to recover from out-of-band password changes.
topics: [passwords]
objectives: ["4.2"]
keyTerms: [password-rotation, password-remediation, service-account]
labs: [lab-password-rotation]
incidents: [inc-lcm-precheck-failure]
components: [vcf-operations, sddc-manager, vcenter, nsx-manager, esx-host, vcf-operations-fleet-management]
related: [certificate-management, vcf-identity-sso-rbac, lifecycle-failures-recovery]
sources:
  - title: "VCF 9.0 TechDocs - Managing Accounts and Passwords for VCF Components"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/manage-passwords.html
  - title: "VCF 9.0 TechDocs - Accounts in VMware Cloud Foundation"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/manage-passwords/accounts-in-vmware-cloud-foundation(1).html
  - title: "VCF 9.0 TechDocs - Update passwords"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/manage-passwords/update-passwords.html
  - title: "VCF 9.0 TechDocs - Remediate passwords"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/manage-passwords/remediate-passwords.html
  - title: "VCF 9.0 TechDocs - Rotate passwords"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/manage-passwords/rotate-passwords-for-vcf-components.html
  - title: "VCF 9.0 TechDocs - Look up account credentials with lookup_passwords"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/manage-passwords/look-up-account-credentials-using-the-lookup-password-command.html
  - title: "Broadcom KB 430609 - Password rotation option missing for management components in VCF 9.0"
    url: https://knowledge.broadcom.com/external/article/430609
  - title: "Broadcom KB 408116 - Unable to manage certificates or passwords under VCF Instances (VCF Operations 9.0)"
    url: https://knowledge.broadcom.com/external/article/408116/unable-to-manage-certificates-or-passwor.html
---

## Why This Matters

VCF (VMware Cloud Foundation) is an automation platform: SDDC (Software-Defined Data Center) Manager logs into vCenter, NSX and every ESX host thousands of times a day using
credentials it stores. If a password changes behind its back, or expires, automation breaks: lifecycle prechecks fail,
host operations fail, VCF Operations shows "disconnected". If passwords never change, auditors are unhappy and a leaked
password stays valid forever. Password management in VCF exists to change credentials **without breaking the
automation that uses them**. The exam objective is "configure Password Management within VMware Cloud Foundation";
expect scenarios that test whether you pick **update**, **rotate** or **remediate**.

## Learning Objectives

- Classify VCF accounts: local OS accounts, application accounts, service accounts.
- Explain precisely what **Update**, **Rotate** and **Remediate** change on the server side and the client side.
- Locate each action in VCF 9.0 (VCF Operations Fleet Management > Passwords, SDDC Manager Security > Password
  Management).
- Interpret password expiry and connection status, and know its refresh interval.
- Retrieve stored credentials safely with `lookup_passwords` or the API (Application Programming Interface).

## Concept

### Server side and client side

Every managed credential has two sides:

- **Server side**: where the account lives (the NSX Manager `admin` account lives on NSX Manager).
- **Client side**: where the account is *used* (SDDC Manager's stored copy of the NSX `admin` password).

The three actions differ only in which side they touch and where the new password comes from:

| Action | New password comes from | Server side | Client side | Where in 9.0 |
|---|---|---|---|---|
| **Update** | You type it | Changed | Changed | VCF Operations > Fleet Management > Passwords |
| **[[password-rotation\|Rotate]]** | Auto-generated per component policy | Changed | Changed | SDDC Manager > Security > Password Management (schedulable) |
| **[[password-remediation\|Remediate]]** | You type the password already set on the component | Not changed | Changed (re-synced) | VCF Operations > Fleet Management > Passwords |

Remediate is a **repair**: someone changed the password directly on the component (or it expired and was reset), and
VCF's stored copy must catch up.

### Account types

| Type | Examples | Default expiry (TechDocs table) | Managed by |
|---|---|---|---|
| **Local OS accounts** | SDDC Manager `vcf`, `root`, `backup`; vCenter `root`; NSX `root`, `admin`, `audit`; ESX `root` | SDDC Manager OS accounts 365 days; vCenter root 90 days; NSX root/admin/audit 90 days; ESX root never expires | VCF (UI/API) or manually, per account |
| **Application accounts** | SDDC Manager `admin@local`; vCenter `administrator@vsphere.local` | Per product | admin@local via SDDC Manager API; administrator@vsphere.local manually |
| **[[service-account\|Service accounts]]** | `svc-*` accounts used between components (e.g. NSX to vCenter, SDDC Manager to ESX `svc-vcf-<host>`) | System managed | Rotated automatically (every 30 days by default for system-managed accounts) |

### Managed components

| Tab | Components |
|---|---|
| **VCF Management** | Fleet management, VCF Automation, VCF Identity Broker, VCF Operations, VCF Operations for logs, VCF Operations for networks |
| **VCF Instances** | ESX, NSX Manager, vCenter, SDDC Manager (backup account only) |

## Architecture

::diagram[d12-password-rotation-flow]

The design is a **credential store with brokers**: SDDC Manager stores instance credentials and applies changes to
vCenter, NSX and ESX; fleet management applies changes to management components; VCF Operations is the console.

## Components

| Component | Password role |
|---|---|
| **VCF Operations** | Console for Update/Remediate, account list, expiry and connection status (refreshed once a day) |
| **SDDC Manager** | Credential store for instance components; executes changes; Rotate and scheduled rotation; `lookup_passwords`; credentials API |
| **Fleet management** | Executes password changes for management components |
| **vCenter, NSX, ESX** | Where the accounts live (server side) |

## How It Works

### Update a password (VCF Operations)

1. Prerequisites: no failed workflows; no running or scheduled workflows; permissions **Fleet Management > Passwords >
   Manage** and **View**.
2. VCF Operations > **Fleet Management > Passwords** > **VCF Management** or **VCF Instances** (pick instance/domain).
3. Select the account > **Update Password**, enter the new password twice > **Update Password**.
4. Watch the progress indicator. Update one password at a time.

### Rotate a password (SDDC Manager)

1. Log in to SDDC Manager with an Administrator account.
2. **Security > Password Management**, select the account(s) > **Rotate password** > **Rotate**.
3. SDDC Manager generates a random password following the component's policy, changes it on the component and updates
   its own store; integrations are re-established.
4. Optionally **schedule** automatic rotation (preset intervals in the UI; custom intervals via the API).
5. **ESX accounts can be rotated, but scheduled rotation is not supported for ESX.**

### Remediate a password (VCF Operations)

1. Someone has already changed the password on the component (server side). VCF shows the account as disconnected or
   failing.
2. Ensure no workflows run; remediate **one account at a time**.
3. VCF Operations > Fleet Management > Passwords > VCF Management or VCF Instances > select the account >
   **Remediate Password** > enter the password that is now on the component > confirm.
4. SDDC Manager (or fleet management) validates it against the component and stores it.

## Deep Dive

### Password policy

TechDocs recommends a consistent standard across accounts even though each component has its own rules: length
**15-20 characters**, at least one lowercase, uppercase, number and special character (from `! @ # $ ^ *`), no
dictionary words, palindromes, long monotonic sequences or repeated consecutive characters. Rotated passwords are
generated to the component's policy automatically.

### Freshness of status

"Password expiration information and connection status in VCF Operations are updated once a day. To get real-time
information, use the SDDC Manager API." If you just remediated something and the console still shows red, check the
API before panicking.

### Known 9.0 gaps

- KB 430609: in 9.0.x, **Rotate** is missing for management components in Fleet Management > Passwords; only Update
  and Remediate appear. Use Update; infrastructure components (ESX, vCenter, NSX) keep rotation via SDDC Manager.
- KB 408116: in 9.0 the VCF Instances tab could show no data (vCenter license without expiry date); workaround SDDC
  Manager UI/API, fixed in 9.0.1.

These are typical of a release that moved UIs: know the concepts, and check the docs for your exact build.

### Looking up stored credentials

On SDDC Manager, as the `vcf` user, run `lookup_passwords`, choose an entity type (for example VCENTER) and
authenticate with an SDDC Manager account with the ADMIN role. It covers **VCF instance components only** (not
management components). The API equivalent is `GET /v1/credentials`. Treat the output as secret.

### Expired passwords

When an account like NSX `admin` or vCenter `root` passes its expiry (90 days by default for those), logins with it
fail. If VCF uses that account, its tasks fail too. Fix: reset the password on the component per the product
procedure (TechDocs has "Reset local account passwords"), then **Remediate** in VCF so the store matches. Better: watch
expiry in VCF Operations and update or rotate before it happens.

:::legacy VCF 5.x / Legacy Context
In VCF 5.x all three actions (Rotate, Update, Remediate) and scheduled rotation lived in the SDDC Manager UI under
Security > Password Management, and Aria Suite passwords were handled in Aria Suite Lifecycle. In 9.0, Update and
Remediate are in VCF Operations, while Rotate and its schedule remain in SDDC Manager.
:::

## Configuration

This section explains the configuration decisions, ownership boundaries, dependencies and evidence an administrator must understand. The executable click path, field values, validation and rollback belong to the linked practical guide.

Recommended baseline:

| Item | Setting |
|---|---|
| Scheduled rotation | Enable for vCenter, NSX and SDDC Manager accounts where policy allows (ESX: rotate manually or via automation) |
| Expiry monitoring | Review Fleet Management > Passwords weekly; alert on accounts near expiry |
| Change process | All changes through VCF (Update/Rotate). Direct changes only in emergencies, followed by Remediate |
| Secret storage | Store `lookup_passwords` output only in a vault |
| Permissions | Grant Passwords: Manage only to the platform team; View to auditors |

## CLI / API

CLI (Command-Line Interface) and API (Application Programming Interface) examples expose the same operational objects for inspection or automation.

```shell
# On SDDC Manager (ssh as vcf)
lookup_passwords
```

```http
GET https://sddc-manager.lab.local/v1/credentials
Authorization: Bearer <token>
```

The SDDC Manager credentials API also supports update, rotate and remediate operations and rotation schedules; use the
API reference for your version for request bodies.

## Failure Scenarios

| Scenario | Symptom | Correct action |
|---|---|---|
| Admin changed NSX `admin` password in NSX UI | VCF shows NSX credential disconnected; NSX tasks fail | **Remediate** with the new password |
| vCenter `root` expired | VCF tasks needing root fail | Reset per docs, then **Remediate** |
| Auditor requires quarterly random passwords | - | **Rotate** (schedule in SDDC Manager) |
| Team wants a known new password | - | **Update** |
| Rotation during upgrade | Rotation blocked or fails | Resource locks; run after the window |
| Workflow already failed | Update refused | Resolve failed workflows first |

## Troubleshooting

1. Confirm **which side is wrong**: can you log in to the component with the password VCF has (`lookup_passwords`)?
   If not, the server side changed: Remediate.
2. Check for **running or failed workflows** that block password operations.
3. Check **expiry** on the component (account locked or expired?).
4. After fixing, check status through the **SDDC Manager API** (VCF Operations refreshes daily).
5. Re-run the lifecycle **precheck**: credentials are one of the things it validates.

## Real-World Scenario

During an outage, an NSX engineer reset the NSX `admin` password from the NSX CLI to regain access. Two weeks later a
workload domain precheck failed on NSX credentials. The platform team used VCF Operations > Fleet Management >
Passwords > VCF Instances > the domain > NSX `admin` > **Remediate Password** with the new value. The precheck passed.
Their post-mortem added a rule: any emergency password change opens a ticket that cannot be closed until Remediate has
been run.


## Exam Focus

:::exam
- **Update** = you choose, both sides. **Rotate** = generated, both sides, schedulable (SDDC Manager in 9.0; ESX
  rotation not schedulable). **Remediate** = re-sync VCF after a change made on the component.
- Update/Remediate path: VCF Operations > Fleet Management > Passwords > VCF Management / VCF Instances.
- Status in VCF Operations refreshes **once a day**; the SDDC Manager API is real time.
- `lookup_passwords` on SDDC Manager (instance components only) or `GET /v1/credentials`.
:::

## Common Exam Traps

:::trap
- Picking **Update** after an out-of-band change: Update would change the password again; **Remediate** is the repair.
- Picking **Rotate** when the requirement says "set this specific password": that is Update.
- "Schedule rotation for ESX root" - not supported.
- "lookup_passwords shows VCF Operations credentials" - instance components only.
:::

## Knowledge Check

::quiz

## Summary

- VCF stores credentials and applies changes on both sides so automation keeps working.
- Update (your password), Rotate (generated, schedulable), Remediate (repair after out-of-band change).
- VCF Operations for Update/Remediate; SDDC Manager for Rotate and schedules in 9.0.
- Watch expiry; status refreshes daily; use the API for real time.

## Next Topic

Finish the phase with [license management](lesson:license-management).
