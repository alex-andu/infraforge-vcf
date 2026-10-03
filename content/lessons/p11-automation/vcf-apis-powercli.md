---
id: vcf-apis-powercli
title: Automating VCF with REST APIs and VCF PowerCLI
phase: p11-automation
module: m11-apis
version: vcf9
minutes: 45
difficulty: intermediate
summary: The API landscape of VCF 9 (SDDC Manager, vCenter, NSX, VCF Operations, VCF Automation), how each authenticates, worked curl examples with JSON explained line by line, and the VCF.PowerCLI module with Connect-VIServer and Connect-VcfSddcManagerServer.
topics: [apis-powercli]
objectives: ["4.4"]
keyTerms: [vcf-powercli, sddc-manager-api-token, vcenter-api-session]
labs: [lab-vcf-api-powercli]
components: [sddc-manager, vcenter, nsx-manager, vcf-operations, vcf-automation]
related: [vcf-automation-architecture, vcf-operations-architecture, vcf-automation-org-admin]
sources:
  - title: "SDDC Manager API 9.0 reference (authentication, tokens)"
    url: https://developer.broadcom.com/xapis/sddc-manager-api/9.0/
  - title: "VCF 9.0 - VMware Cloud Foundation PowerCLI"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/administration-sdks-cli-and-tools/introduction-to-vmware-vsphere-powercli.html
  - title: "VMware blog - Introducing VCF PowerCLI 9.0"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/24/introducing-vcf-powercli-9-0/
  - title: "PowerShell Gallery - VCF.PowerCLI"
    url: https://www.powershellgallery.com/packages/VCF.PowerCLI/
  - title: "Broadcom KB 447072 - Using the REST API with VCF/Aria Operations (token acquire)"
    url: https://knowledge.broadcom.com/external/article/447072/
  - title: "VCF Operations API 9.0 - security schema"
    url: https://developer.broadcom.com/xapis/vcf-operations-api/9.0/api-security-schema/
  - title: "SDDC Manager API 9.0 - VcfAutomationSpec"
    url: https://developer.broadcom.com/xapis/sddc-manager-api/9.0/data-structures/VcfAutomationSpec/
---

## Why This Matters

Everything you click in VCF is an API call underneath. Knowing the APIs lets you verify state quickly ("list every
domain and its version"), automate repetitive work (tagging 300 VMs), and integrate VCF with pipelines, CMDBs and
ticketing. For the exam, API knowledge supports the "Consume and Automate" objective: recognising which endpoint and
authentication pattern belongs to which component, and what PowerCLI provides. For the home lab, the API is the fastest
way to check that the environment is what you think it is.

## Learning Objectives

- Map each VCF component to its API and authentication method.
- Obtain and refresh an SDDC Manager API token and call `/v1/domains`.
- Create a vCenter REST session and list VMs; read the JSON response.
- Query the NSX Policy and management APIs.
- Acquire a VCF Operations API token.
- Install VCF.PowerCLI and use `Connect-VIServer`, `Connect-VcfSddcManagerServer` and the SDK discovery cmdlets.

## Concept

There is **no single VCF API**. Each component keeps its own REST API:

| Component | Base path | Authentication | Header on later calls |
|---|---|---|---|
| SDDC Manager | `https://<sddc-manager>/v1/...` | `POST /v1/tokens` with username/password | `Authorization: Bearer <accessToken>` |
| vCenter | `https://<vcenter>/api/...` | `POST /api/session` with HTTP basic auth | `vmware-api-session-id: <session>` |
| NSX | `https://<nsx-vip>/policy/api/v1/...` (Policy) and `/api/v1/...` (management) | HTTP basic auth over HTTPS (session-based auth also exists) | `Authorization: Basic ...` |
| VCF Operations | `https://<ops>/suite-api/api/...` | `POST /suite-api/api/auth/token/acquire` | `Authorization: vRealizeOpsToken <token>` (as shown in KB 447072) |
| VCF Automation | Provider and organization APIs | Per the VCF Automation API reference | Used by Terraform and scripts |

SDDC Manager tokens: [[sddc-manager-api-token|access token]] valid **1 hour**, refresh token valid **24 hours**.
Response codes: valid token 200; missing or expired access token **401**; insufficient privileges **403**;
expired/invalid refresh token **404**.

## Architecture

::diagram[d11-api-landscape]

## Components

| Tool | What it is | When to use |
|---|---|---|
| curl / Postman / Invoke-RestMethod | Raw HTTP clients | Learning, quick checks, any language |
| [[vcf-powercli|VCF.PowerCLI]] | PowerShell module collection (renamed from VMware.PowerCLI in 9.0) | Windows/Linux/macOS automation of vSphere, vSAN, NSX, SDDC Manager, VCF Operations... |
| SDK-style cmdlets | Auto-generated `Initialize-*` (build request objects client-side) and `Invoke-*` (call the API) | Any API operation without a hand-written cmdlet |
| Discovery cmdlets | `Get-vSphereOperation`, `Get-NsxOperation`, `Get-VcfSddcManagerOperation` | Find the SDK cmdlet for an API path |
| Terraform providers | Declarative IaC | VCF Automation and NSX configuration as code |

:::vcf9 Changed in VCF 9
The PowerCLI module is now **VCF.PowerCLI** (version 9.0 at VCF 9.0 GA). Broadcom recommends uninstalling the old
`VMware.PowerCLI` module and installing `VCF.PowerCLI`. New modules include SDDC Manager (`Connect-VcfSddcManagerServer`,
`Get-SddcDomain`, `Get-SddcCluster`, `Get-SddcHost`, `Get-SddcVcenter`) and NSX VPC. Core cmdlets were rewritten as
compiled .NET classes: up to 70% faster in some scenarios and module import in about 18 seconds instead of over a minute.
:::

## How It Works

### Example 1 - SDDC Manager: token, then list domains

```shell
curl -sk -X POST https://sddc-manager.lab.local/v1/tokens \
  -H 'Content-Type: application/json' \
  -d '{"username":"administrator@vsphere.local","password":"<password>"}'
```

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": { "id": "4a6d0c55-..." }
}
```

Line by line:

1. `POST /v1/tokens` - creates a token pair.
2. `username` / `password` - an SSO account with a role in SDDC Manager.
3. `accessToken` - a JWT valid for one hour; copy it into the `Authorization: Bearer` header.
4. `refreshToken` - valid 24 hours; use it with `PATCH /v1/tokens/access-token/refresh` to get a new access token
   without resending the password.

```shell
curl -sk https://sddc-manager.lab.local/v1/domains \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json'
```

```json
{
  "elements": [
    { "id": "8b2e...", "name": "mgmt-domain", "type": "MANAGEMENT", "status": "ACTIVE" },
    { "id": "c41f...", "name": "wld01", "type": "VI", "status": "ACTIVE" }
  ]
}
```

`elements` is the page of results; each domain has an `id` (used in later calls such as `/v1/domains/{id}`), a `name`,
a `type` (MANAGEMENT or VI) and a `status`. Response fields are trimmed here; check the API reference for the full model.

### Example 2 - vCenter: session, then VMs

```shell
curl -sk -X POST -u 'administrator@vsphere.local:<password>' https://vc-mgmt.lab.local/api/session
# -> "b7f3c1e0b0e3f9a1d2c4e5f6a7b8c9d0"
curl -sk https://vc-mgmt.lab.local/api/vcenter/vm -H "vmware-api-session-id: $SID"
```

```json
[
  { "vm": "vm-1012", "name": "sddc-manager", "power_state": "POWERED_ON", "cpu_count": 4, "memory_size_MiB": 16384 }
]
```

1. `POST /api/session` with basic auth returns the session ID as a JSON string.
2. Every later call sends it in the `vmware-api-session-id` header.
3. `vm` is the managed object ID (stable inside this vCenter); `power_state`, `cpu_count`, `memory_size_MiB` are a
   summary. Use `GET /api/vcenter/vm/{vm}` for detail.
4. `DELETE /api/session` ends the session when you are done.

### Example 3 - NSX: cluster status and segments

```shell
curl -sk -u 'admin:<password>' https://nsx-mgmt.lab.local/api/v1/cluster/status
curl -sk -u 'admin:<password>' https://nsx-mgmt.lab.local/policy/api/v1/infra/segments
```

The first (management API) reports the manager cluster's health; the second (Policy API) lists segments with
`display_name`, `path` and connectivity settings. The Policy API is the intent-based API that the NSX UI uses; prefer
it for configuration.

### Example 4 - VCF Operations token

```shell
curl -sk -X POST https://ops01.lab.local/suite-api/api/auth/token/acquire \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"username":"admin","password":"<password>","authSource":"local"}'
```

`authSource` names the identity source. The response's `token` is sent as `Authorization: vRealizeOpsToken <token>`
(format shown in Broadcom KB 447072; check the API reference of your version for accepted prefixes).

### Example 5 - VCF.PowerCLI

```powershell
Install-Module -Name VCF.PowerCLI -Scope CurrentUser
Set-PowerCLIConfiguration -InvalidCertificateAction Ignore -Scope User -Confirm:$false   # lab only
Connect-VIServer -Server vc-mgmt.lab.local -User administrator@vsphere.local -Password '<password>'
Get-VM | Select-Object Name, PowerState, NumCpu, MemoryGB
Connect-VcfSddcManagerServer -Server sddc-manager.lab.local -User administrator@vsphere.local -Password '<password>'
Get-SddcDomain
```

1. Installs the module from the PowerShell Gallery for the current user.
2. Accepts self-signed lab certificates (in production trust the CA instead).
3. Connects to vCenter.
4. Lists VMs with their CPU and memory.
5. Connects to SDDC Manager (new in VCF.PowerCLI 9.0).
6. Lists workload domains.

## Deep Dive

### Choosing between API, PowerCLI and Terraform

| Need | Best fit |
|---|---|
| One-off inspection | curl / browser API explorer |
| Bulk changes to vSphere objects | PowerCLI |
| Declarative, repeatable tenant or network config | Terraform (NSX, VCF Automation) |
| Integration from another system | REST API from that system |

### Security hygiene

- Use dedicated service accounts with least privilege; tokens inherit the account's role (403 shows privilege gaps).
- Never store passwords in scripts; use a secret store or `Get-Credential`.
- In production, do not use `-k` / `InvalidCertificateAction Ignore`; trust the VCF CA.
- Refresh SDDC Manager tokens with the refresh token rather than re-authenticating in loops.

### Finding the right SDK cmdlet

`Get-vSphereOperation`, `Get-NsxOperation` and `Get-VcfSddcManagerOperation` map API paths to the generated cmdlets.
SDK cmdlets follow the pattern `Initialize-<Spec>` to build a request object and `Invoke-<Operation>` to send it, for
example `Initialize-TaggingCategoryCreateSpec` then `Invoke-CreateCategory`.


### Reading API responses like an operator

Most VCF APIs return JSON with predictable shapes:

| Pattern | Example | What to do |
|---|---|---|
| Paged list | SDDC Manager `{"elements": [...], "pageMetadata": {...}}` | Loop pages when there are many objects |
| Plain array | vCenter `GET /api/vcenter/vm` returns `[ {...}, {...} ]` | Filter with query parameters (for example by name or power state) or with `jq` |
| Results wrapper | NSX Policy `{"results": [...], "result_count": n}` | Use `result_count` to check completeness, `cursor` for the next page |
| Task object | Long-running SDDC Manager operations return a task with an `id` | Poll `GET /v1/tasks/{id}` until it finishes |

When something fails, read the HTTP status first, then the JSON error body: SDDC Manager and vCenter both return an
error message and often a message key you can search in the KB.

### Safe change workflow with APIs

1. **Read first** (GET) and save the current state to a file.
2. Build the change body from that state rather than from memory.
3. Apply to one object in the lab, verify with a GET, then scale out.
4. Keep scripts idempotent: running them twice must not create duplicates.
5. Log every call (method, path, status) without logging secrets.

This is the same discipline VCF itself uses for desired-state lifecycle, and it prevents the classic automation
outage where a loop applies a wrong setting to every host in seconds.

## Configuration

Lab setup for API work:

| Item | Value |
|---|---|
| Workstation | Windows or Linux VM with PowerShell 7, curl, jq |
| Module | `VCF.PowerCLI` |
| Accounts | `svc-automation@vsphere.local` with read-only role for exploration |
| Trust | Import the lab CA into the workstation trust store |

## CLI / API

The whole lesson is the CLI/API reference; the commands are collected in the command library. Key ones:
`POST /v1/tokens`, `PATCH /v1/tokens/access-token/refresh`, `GET /v1/domains`, `POST /api/session`,
`GET /api/vcenter/vm`, `GET /api/v1/cluster/status`, `GET /policy/api/v1/infra/segments`,
`POST /suite-api/api/auth/token/acquire`, `Connect-VIServer`, `Connect-VcfSddcManagerServer`.

## Failure Scenarios

| Symptom | Cause |
|---|---|
| SDDC Manager call returns 401 after working for a while | Access token expired (1 hour) - refresh it |
| Refresh returns 404 | Refresh token expired (24 hours) or invalid - request a new pair |
| 403 | Account lacks the privilege for that operation |
| vCenter call returns 401 / "Unauthenticated" | Session ID missing, expired or sent in the wrong header |
| TLS error | Untrusted certificate (e.g. after certificate replacement); trust the CA |
| `Connect-VcfSddcManagerServer` not recognised | Old VMware.PowerCLI installed instead of VCF.PowerCLI |

## Troubleshooting

1. Re-run the call with `-v` to see status code and headers.
2. Check the auth header name for that component (Bearer vs `vmware-api-session-id` vs Basic).
3. Check time on the client (token validity) and the certificate chain.
4. For PowerCLI, `Get-Module -ListAvailable VCF.*` to confirm which modules are installed.

## Real-World Scenario

Every Monday the operations lead wants a list of workload domains, their vCenter versions and VM counts. A 20-line
PowerShell script connects to SDDC Manager (`Get-SddcDomain`), loops through domains, connects to each vCenter with
`Connect-VIServer` and counts VMs, then emails a CSV. The script uses a read-only service account stored in a secret
vault. When the vCenter certificates were replaced, the script failed with TLS errors until the new CA was trusted on
the automation host - the same failure mode as VCF Operations adapters.

## Lab

::lab[lab-vcf-api-powercli]

## Exam Focus

- Each component has its own API and auth: SDDC Manager **Bearer token** (`/v1/tokens`, 1 h / 24 h), vCenter
  **session ID** (`/api/session`, `vmware-api-session-id`), NSX **Policy API** `/policy/api/v1`, VCF Operations
  `/suite-api` token.
- PowerCLI module is **VCF.PowerCLI**; new **Connect-VcfSddcManagerServer**; SDK cmdlets `Initialize-`/`Invoke-`.
- 401 = missing/expired token; 403 = privileges; 404 on refresh = refresh token expired.

## Common Exam Traps

:::trap
Sending a vCenter session ID as `Authorization: Bearer` - vCenter's REST API expects `vmware-api-session-id`.
:::

:::trap
Installing `VMware.PowerCLI` for VCF 9 cmdlets: the SDDC Manager cmdlets ship in `VCF.PowerCLI`.
:::

:::trap
Using the NSX management API for configuration when the Policy API is the intended interface for desired-state config.
:::

## Knowledge Check

::quiz

## Summary

VCF exposes one REST API per component, each with its own authentication: SDDC Manager Bearer tokens from `/v1/tokens`,
vCenter session IDs from `/api/session`, NSX Policy and management APIs, and VCF Operations suite-api tokens. VCF.PowerCLI
wraps these with high-level cmdlets (`Connect-VIServer`, `Connect-VcfSddcManagerServer`, `Get-SddcDomain`) and
generated SDK cmdlets discoverable by API path.

## Next Topic

Phase 12 continues with [identity, SSO and RBAC](lesson:vcf-identity-sso-rbac), which decides what your API accounts may do.
