---
id: certificate-management
title: Certificate Management in VCF 9.0
phase: p12-security
module: m12-trust
version: vcf9
minutes: 50
difficulty: advanced
summary: How TLS trust works across a VCF fleet, the roles of VMCA, Microsoft CA, OpenSSL and external CAs, and how to generate CSRs, replace, import and auto-renew certificates from VCF Operations - plus how to diagnose broken trust.
topics: [certificates]
objectives: ["4.2"]
keyTerms: [tls, certificate-chain, root-ca, intermediate-ca, csr, vmca, vecs, machine-ssl-certificate]
labs: [lab-certificate-replacement]
incidents: [inc-certificate-trust]
components: [vcf-operations, sddc-manager, vcenter, nsx-manager, esx-host, vcf-operations-fleet-management, vcf-identity-broker]
related: [vcf-identity-sso-rbac, password-management, lifecycle-failures-recovery]
sources:
  - title: "VCF 9.0 TechDocs - Certificate Management"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/certificate-management-9-0.html
  - title: "VCF 9.0 TechDocs - Configure a Certificate Authority"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/certificate-management-9-0/configure-a-certificate-authority_9-0.html
  - title: "VCF 9.0 TechDocs - Replace a certificate with a CA-signed certificate"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/certificate-management-9-0/replace-a-certificate-with-a-certificate-authority--ca--certificate.html
  - title: "VCF 9.0 TechDocs - Install third-party CA-signed certificates"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/certificate-management-9-0/install-third-party-ca-signed-certificates-using-server-certificate-and-certificate-authority-files_9-0.html
  - title: "VCF 9.0 TechDocs - Set up automatic renewal of certificates"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/certificate-management-9-0/set-up-automatic-renewal-of-certificates-in-vmware-cloud-foundation.html
  - title: "VCF 9.0 TechDocs - View certificates and alerts"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/fleet-management/certificate-management-9-0/view-certificate-information_9-0.html
  - title: "Broadcom KB 376720 - vCenter Server certificate store guide"
    url: https://knowledge.broadcom.com/external/article/376720/
  - title: "Broadcom KB 321380 - Manually reviewing certificates in VECS"
    url: https://knowledge.broadcom.com/external/article/321380/manually-reviewing-certificates-in-vmwar.html
  - title: "Broadcom KB 408116 - Unable to manage certificates or passwords under VCF Instances in VCF Operations 9.0"
    url: https://knowledge.broadcom.com/external/article/408116/unable-to-manage-certificates-or-passwor.html
---

## Why This Matters

Every conversation between VCF components is TLS: SDDC Manager to vCenter, vCenter to ESX, VCF Operations to NSX,
fleet management to the Identity Broker. TLS only works if the client **trusts** the certificate the server presents.
When a certificate expires, or is replaced with one from a CA the clients do not trust, components quietly stop talking:
lifecycle prechecks fail, VCF Operations stops collecting, password operations fail, SSO breaks. Certificates are the
single most common hidden cause of "everything was fine yesterday" incidents.

The exam objective is "configure certificate management within VMware Cloud Foundation". You need the TLS basics, the
VCF 9.0 workflows in VCF Operations, and the diagnostic reflex to separate a harmless browser warning from a real
service-to-service trust failure.

## Learning Objectives

- Explain a [[certificate-chain]]: leaf, [[intermediate-ca]], [[root-ca]], trust store, and why clients need the root.
- Describe [[vmca]] and VECS in vCenter and what they sign and store by default.
- Configure a certificate authority in VCF Operations (Microsoft CA or OpenSSL) and know their scope limits.
- Perform the three replacement flows: configured CA, external CA via [[csr]] and import, and auto-renewal.
- Diagnose certificate trust failures with `openssl` and component evidence.

## Concept

### TLS trust in five sentences

1. A server presents a **leaf certificate** (its identity: names in the Subject Alternative Name list, public key,
   validity dates, issuer).
2. The leaf is signed by an **intermediate (issuing) CA**, which is signed by a **root CA** (self-signed).
3. The client builds a path from leaf to a root it already trusts in its **trust store**.
4. The client checks names (the FQDN it connected to must be in the SAN), dates and key usage.
5. If any check fails, the TLS handshake fails, and an API client refuses to talk (a browser shows a warning you can
   click through, an API client usually cannot).

### Who issues certificates in VCF

| Issuer | Where it lives | Signs by default / supports | Notes |
|---|---|---|---|
| **VMCA** | Inside every vCenter | vCenter machine SSL and ESX host certificates by default | Its root is in vCenter's TRUSTED_ROOTS store |
| **Microsoft CA** | Your AD CS server (web enrollment, `https://ca.example.com/certsrv`) | VCF management and VCF instance components | Needs a custom template and a service account |
| **OpenSSL CA** | On the SDDC Manager appliance | VCF instance components **only** | Good for labs |
| **External/third-party CA** | Anywhere | Any component, via CSR, download, sign, import | You manage the signing process |
| **Self-signed** | The component itself | Default for some appliances | Must be trusted explicitly by clients |

### Where certificates are managed in 9.0

**VCF Operations > Fleet Management > Certificates**, with two views:

| View | Components |
|---|---|
| **VCF Management** | Fleet management, VCF Automation, VCF Identity Broker, VCF Operations, VCF Operations for logs, VCF Operations for networks |
| **VCF Instances** (per instance/domain, optional *Show ESX Hosts*) | SDDC Manager, vCenter, NSX Manager, ESX |

There is also a **Certificate Alerts** tab for certificate-related alerts.

:::vcf9 Changed in VCF 9
In VCF 5.x certificates were managed in the SDDC Manager UI (per domain on the workload domain's Certificates tab,
with the CA configured under Security > Certificate Authority), and Aria
products through Aria Suite Lifecycle. VCF 9.0 brings both families into VCF Operations, adds auto-renewal, and keeps
the SDDC Manager certificate APIs. KB 408116 documents a 9.0 defect (fixed in 9.0.1) where the VCF Instances tab showed
no data when the vCenter license had no expiry date; the workaround was the SDDC Manager UI or API.
:::

## Architecture

::diagram[d12-certificate-chain]

Click the client nodes in the diagram: the important design idea is that **replacing a certificate is a two-sided
change**. The server gets a new leaf; every client of that server must trust its issuer.

## Components

| Component | Certificate role |
|---|---|
| **VCF Operations** | UI for viewing, CSR generation, CA configuration, replacement, import, auto-renewal |
| **SDDC Manager** | Executes certificate operations for instance components; hosts the OpenSSL CA; certificate API |
| **Fleet management** | Executes certificate operations for management components |
| **vCenter (VMCA + VECS)** | Issues host/vCenter certificates by default; stores certificates and trusted roots in VECS stores |
| **NSX Manager** | Node and cluster VIP certificates |
| **ESX** | Host certificates (2048-bit keys only when generated through VCF Operations) |
| **Microsoft CA / external CA** | Signs CSRs |

## How It Works

### Flow 1: replace with a configured CA (Microsoft CA or OpenSSL)

1. **Configure CA**: Fleet Management > Certificates > (VCF Management or VCF Instance) > **Configure CA**.
   - Microsoft CA: CA server URL (`https://<ca>/certsrv`), service account username/password, template name.
     Prerequisites: prepared CA and template, network reachability from VCF Operations, time in sync with SDDC Manager.
   - OpenSSL: FQDN of SDDC Manager and the subject details (country, state, locality, organisation, OU). Instance
     components only.
   - Configure per VCF instance: with several instances you configure the CA for each one separately.
2. Select the component, three-dot menu, **Generate CSR**. Fill in Common Name, Organization, OU, Country, State
   (spelled out), Locality, optional email, Host name, **Subject Alternative Names**, and **key size 2048 or 4096**
   (ESX hosts support only 2048).
3. Wait for the CSR to be generated successfully.
4. Three-dot menu > **Replace With Configured CA Certificate**, pick the CA, **Confirm**.
5. VCF has the CA sign the CSR, installs the certificate, and updates trust in the components it manages.

### Flow 2: external CA (CSR, sign, import)

1. **Generate CSR** as above.
2. **Download** the CSR and submit it to your CA.
3. Three-dot menu > **Import Certificate**: give it a name and either paste the PEM text or upload the chain
   (`.crt`, `.cer`, `.pem`, `.p7b`, `.p7c`). Only **PEM-encoded** certificates are supported; the CA chain is
   intermediate first, then root.
4. **Validate**, then **Save**.
5. Three-dot menu > **Replace With Imported Certificate**, pick it, confirm.

### Flow 3: automatic renewal

1. Configure a CA first if the certificates come from Microsoft CA or OpenSSL.
2. Fleet Management > Certificates > VCF Management or VCF Instances > toggle **Activate Auto-renewal** > Confirm.
3. VCF renews eligible certificates **60 days before expiration**. Supported for VMCA, Microsoft CA, OpenSSL and
   self-signed certificates, on components that support non-disruptive updates (ESX SSL, vCenter machine SSL, NSX
   manager and VIP, SDDC Manager, Identity Broker, VCF Operations, VCF Automation, logs, networks, fleet management).
4. Configure VCF Management and each VCF instance separately.

## Deep Dive

### VECS: where vCenter keeps certificates

The VMware Endpoint Certificate Store ([[vecs]]) holds vCenter's certificates in named stores (KB 376720):

| Store | Purpose |
|---|---|
| **MACHINE_SSL_CERT** | The [[machine-ssl-certificate]] used by the reverse proxy on port 443 |
| **TRUSTED_ROOTS** | All trusted root certificates (synced with VMDIR) |
| TRUSTED_ROOT_CRLS | CRLs published by VMCA |
| machine, vpxd, vpxd-extension, vsphere-webclient, wcp, hvc, data-encipherment, SMS | Solution user and service certificates |

When you trust a new enterprise root in vCenter, it lands in TRUSTED_ROOTS. When you replace vCenter's certificate,
MACHINE_SSL_CERT changes.

### CSR fields that matter

| Field | Why it matters |
|---|---|
| **SAN** | Clients check the FQDN they used against the SAN list. Include the FQDN (and short name or IP only if clients use them). A CN without a matching SAN fails modern clients. |
| **Key size** | 2048 or 4096; ESX supports 2048 only through VCF Operations |
| **Organisation fields** | Many enterprise CAs reject CSRs with abbreviations or mismatched values |
| **Template (MS CA)** | Must allow server authentication and the key usage the component needs |

### Reading a chain problem

The three classic chain failures:

| Failure | `openssl` hint | Typical cause |
|---|---|---|
| Unknown issuer | `verify error:num=20:unable to get local issuer certificate` | Client lacks the root/intermediate, or server does not send the intermediate |
| Self-signed in chain | `verify error:num=19:self signed certificate in certificate chain` | Root not in the client trust store |
| Expired | `verify error:num=10:certificate has expired` | Missed renewal |
| Name mismatch | Client reports hostname/SAN mismatch | SAN missing the FQDN used |

:::warning
A browser warning on your laptop only proves that **your laptop** does not trust the root. It says nothing about
whether SDDC Manager trusts vCenter. Always test trust from the component that is failing.
:::

### Resource locks and timing

Certificate operations for management components are blocked while core component upgrades run (resource locks,
phase 9). Plan certificate work outside upgrade windows, and never let certificates expire during a long upgrade
programme: auto-renewal at 60 days helps.

## Configuration

Design decisions:

| Question | Typical answer |
|---|---|
| Who signs instance components? | Enterprise Microsoft CA via VCF Operations (or VMCA for hosts if policy allows) |
| Who signs management components? | Microsoft CA (OpenSSL is not available for them) or external CA via import |
| Key size | 2048 for ESX; 2048 or 4096 elsewhere per policy |
| Renewal | Activate auto-renewal for VCF Management and each instance |
| Trust distribution | Enterprise root and intermediate in VCF trust stores and on admin workstations |

## CLI / API

Verification from any Linux shell (or the SDDC Manager appliance):

```shell
# show the chain a server sends and the verification result
openssl s_client -connect vcenter-mgmt.lab.local:443 -servername vcenter-mgmt.lab.local -showcerts </dev/null

# decode a certificate file: issuer, subject, SAN, validity, key usage
openssl x509 -in vcenter.crt -noout -text

# only the dates
openssl x509 -in vcenter.crt -noout -dates
```

On the vCenter appliance shell (read-only inspection):

```shell
/usr/lib/vmware-vmafd/bin/vecs-cli store list
/usr/lib/vmware-vmafd/bin/vecs-cli entry list --store MACHINE_SSL_CERT --text | less
```

vCenter also ships the `certificate-manager` utility (`/usr/lib/vmware-vmca/bin/certificate-manager`) for
vCenter-only replacements. In VCF, prefer VCF Operations (or the SDDC Manager certificates API) so that SDDC Manager
and the other components learn about the change.

## Failure Scenarios

| Scenario | Impact |
|---|---|
| vCenter certificate replaced outside VCF with an untrusted CA | SDDC Manager prechecks and tasks fail; VCF Operations collection errors |
| NSX VIP certificate expired | vCenter-NSX integration and SDDC Manager NSX operations fail |
| ESX certificate CSR with 4096-bit key | Not supported through VCF Operations for ESX |
| Intermediate not sent by server | Some clients fail with "unable to get local issuer certificate" |
| Microsoft CA template wrong | Replacement fails at signing |
| Clock skew on CA vs SDDC Manager | Certificates appear "not yet valid" or signing fails |

## Troubleshooting

1. Identify the failing **client** and **server** (e.g. SDDC Manager -> vCenter).
2. From the client side, run `openssl s_client -connect server:443 -showcerts` and read the verify result.
3. Decode the leaf: issuer, SAN, dates (`openssl x509 -noout -text`).
4. Compare with the trust store on the client (for vCenter, TRUSTED_ROOTS in VECS).
5. Fix by importing the right root/intermediate, or re-issuing the certificate through VCF Operations.
6. Re-run the failing task and the lifecycle precheck.

## Real-World Scenario

A team replaced the vCenter machine SSL certificate directly in vCenter with a certificate from their new enterprise
CA. Browsers on their (domain-joined) laptops were happy. The next day the SDDC Manager precheck failed and VCF
Operations alerts showed collection failures. `openssl s_client` from SDDC Manager returned "unable to get local issuer
certificate": SDDC Manager did not trust the new CA. They added the CA chain to VCF's trust and, from then on,
performed replacements through VCF Operations. Practise exactly this in the incident.

::incident[inc-certificate-trust]

## Lab

::lab[lab-certificate-replacement]

## Exam Focus

:::exam
- Path: **VCF Operations > Fleet Management > Certificates > VCF Management / VCF Instances**.
- CA types: **Microsoft CA** (management and instance), **OpenSSL** (instance only). Configure per instance.
- Flows: Generate CSR > Replace With Configured CA Certificate; or Generate CSR > download > sign > Import (PEM,
  intermediate then root) > Validate > Replace With Imported Certificate.
- Auto-renewal: **60 days before expiry**; needs a configured CA for MS CA/OpenSSL.
- ESX key size **2048 only**.
:::

## Common Exam Traps

:::trap
- "Use OpenSSL CA for VCF Operations" - OpenSSL is only for instance components.
- "Browser warning = root cause" - test trust from the failing component.
- "Replace vCenter's certificate with certificate-manager and you are done" - VCF components must trust it too; use
  VCF Operations.
- "Auto-renewal works for Microsoft CA without configuration" - configure the CA first.
- "DER files are fine" - only PEM-encoded certificates are supported for import.
:::

## Knowledge Check

::quiz

## Summary

- TLS trust needs a valid leaf (SAN, dates) and a path to a trusted root on the **client**.
- VMCA signs vCenter/ESX by default; Microsoft CA and OpenSSL (instance only) can be configured in VCF Operations;
  external CAs via CSR and import.
- Certificates are managed in VCF Operations > Fleet Management > Certificates; auto-renewal at 60 days.
- Diagnose with `openssl s_client` and `openssl x509`, and with VECS on vCenter.

## Next Topic

The other half of credential hygiene: [password management](lesson:password-management).
