---
id: private-cloud-and-sddc
title: Private Cloud and the Software-Defined Data Center
phase: p00-orientation
module: m00-vcf-intro
version: general
minutes: 25
difficulty: foundation
summary: The principles, use cases and value proposition of private cloud (exam objective 2.1), how an SDDC differs from a merely virtualized data center, and how VCF maps each principle to a component.
topics: [private-cloud, sddc, vcf-overview]
objectives: ["2.1"]
keyTerms: [private-cloud, sddc, vcf, hypervisor]
labs: []
incidents: []
components: [vcf-operations, vcf-automation, sddc-manager]
related: [what-is-vcf, vcf-vs-vsphere, vcf9-terminology]
sources:
  - title: "VCF 9.0 – What Is VMware Cloud Foundation?"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/what-is-vmware-cloud-foundation-and-vmware-vsphere-foundation.html
  - title: "VCF 9.0 – Capabilities by Job Function"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/overview-of-vmware-cloud-foundation-9/vcf-capabilities.html
  - title: "VCF blog – VCF 9.0 Use Cases"
    url: https://blogs.vmware.com/cloud-foundation/2025/06/17/vcf-9-0-use-cases/
  - title: "VCF 9.0 – Fleet Deployment Models"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html
  - title: "VCF 2V0-17.25 Administrator exam guide"
    url: https://docs.broadcom.com/doc/vmware-cloud-foundation-administrator-exam-guide
---

## Why This Matters

Exam objective 2.1, *Private Cloud Vision*, asks you to **describe the principles** of private cloud, **identify its use cases** and **identify its value proposition**. These questions are not technical in the "which port" sense, but they are easy to lose if you confuse "virtualized" with "cloud". They also explain *why* VMware Cloud Foundation (VCF) is built the way it is: every major VCF component exists to deliver one of the principles below.

## Learning Objectives

- Explain the difference between a virtualized data center, an [[sddc]] and a [[private-cloud]].
- List the core principles of a private cloud and map each to a VCF component.
- Identify the private cloud use cases and value proposition Broadcom positions for VCF 9.
- Recognise the personas (provider admin, tenant admin, consumer) and what each expects.

## Concept

### Three steps of maturity

| Stage | What you have | How a virtual machine (VM) is delivered |
|---|---|---|
| **Virtualized data center** | Hypervisors on servers; storage and network still physical and configured by hand | Ticket → admin creates a virtual machine (VM) → network/storage teams do their parts → days or weeks |
| **Software-defined data center (SDDC)** | Compute, storage *and* network virtualized and controlled by software; lifecycle automated | Admin uses one platform; network segments and storage policies are software objects → hours |
| **Private cloud** | SDDC + self-service, multi-tenancy, policy-based governance, metering, unified operations | Consumer clicks or calls an Application Programming Interface (API) within a quota → minutes, no ticket |

A [[hypervisor]] alone does not make a cloud. The cloud comes from the operating model on top.

### Terms and operating boundaries

**Software-Defined Data Center (SDDC).** An SDDC expresses compute, storage and networking as software-controlled
resources. vSphere supplies compute, vSAN supplies policy-based storage and NSX supplies virtual networking and
security. Controllers and APIs turn those resources into repeatable objects instead of device-by-device changes.
An SDDC needs working physical servers, storage devices and an Internet Protocol (IP) underlay; it cannot remove hardware limits or fix
a broken physical network. Administrators use vCenter and NSX Manager for detailed configuration, while VCF
coordinates supported deployment and lifecycle. For the exam, an SDDC is the infrastructure foundation beneath
the cloud operating model.

**Private cloud.** A private cloud adds self-service, governance, tenancy, measurement and unified operations to the
SDDC. It lets consumers request approved services while provider administrators retain control of capacity, policy,
security and location. It can offer public-cloud-like consumption on infrastructure dedicated to one organization;
it does not mean every request is unlimited, automatic or free of operational ownership. In VCF, VCF Automation is
the main consumption surface and VCF Operations is the main fleet operations surface. Exam scenarios usually ask
which missing cloud principle explains a business symptom.

**Hypervisor.** A hypervisor isolates and schedules VMs on physical compute. VMware ESX executes the VM data plane
and exposes host resources to vCenter. It depends on compatible hardware, firmware, drivers and management
connectivity. A hypervisor can run and isolate VMs, but by itself it does not provide self-service, multi-tenancy,
metering or full-stack lifecycle. Administrators manage individual hosts locally only for limited tasks; normal
cluster operations use vCenter and VCF workflows.

**VCF control and consumption layers.** SDDC Manager coordinates the desired inventory and core lifecycle of one
VCF instance. VCF Operations provides fleet health, capacity and supported management workflows. VCF Automation
applies catalog, organization, project, quota and placement policy for consumers. None of them replaces vCenter or
NSX Manager for every element-level setting, and losing a management service does not automatically stop existing
VM traffic. The exam tests ownership: choose the component that owns the requested action and its scope.

### Principles of a private cloud

| Principle | What it means | VCF component that delivers it |
|---|---|---|
| **Self-service / on-demand** | Consumers provision resources themselves from a catalog or Application Programming Interface (API) | VCF Automation |
| **Resource pooling** | Hardware is abstracted into shared pools of compute, storage, network | vSphere clusters, vSAN, NSX |
| **Rapid elasticity / scale** | Add capacity without redesigning; scale out with standard building blocks | Host commissioning, cluster expansion, workload domains |
| **Multi-tenancy and isolation** | Teams or customers share infrastructure safely | Workload domains, VCF Automation organizations, NSX segmentation |
| **Policy-based governance** | Quotas, placement, storage and security policy applied automatically | VCF Automation policies, vSAN storage policies, NSX firewall |
| **Measured service / visibility** | Usage, capacity and cost are visible | VCF Operations |
| **Automated lifecycle** | Deploy, patch, upgrade the stack as one | VCF Installer, SDDC Manager, VCF Operations fleet management |
| **Security and resilience built in** | Compliance, certificates, identity, recovery are part of the platform | VCF Operations (compliance, certificates, passwords), Identity Broker, High Availability (HA) and vSAN resilience |

:::general
The United States National Institute of Standards and Technology (NIST) definition of cloud computing lists five essential characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity and measured service. Broadcom's private cloud messaging adds *on-premises control, security, resilience and lower total cost of ownership*. Expect exam wording to mix both vocabularies.
:::

## Architecture

The layers of a private cloud: hardware at the bottom, the SDDC in the middle, and the operate and consume layers on top.

::diagram[d00-private-cloud-layers]

## Components

The personas Broadcom uses in the VCF 9 documentation help you remember who uses which layer:

| Persona | Responsibility | Main tool |
|---|---|---|
| **Virtual Infrastructure (VI) / provider administrator** | Build, manage and operate cloud infrastructure that provides resources for applications | VCF Operations, vSphere Client |
| **Platform operator** | Track and analyze performance and behavior of workloads | VCF Operations |
| **Organization / tenant administrator** | Enable consumers to operate autonomously within the resources given to the organization | VCF Automation |
| **Platform engineer** | Manage, automate and monitor infrastructure for self-service provisioning | VCF Automation, APIs |
| **Application developer / DevOps engineer** | Deploy VM- or container-based apps, manage Kubernetes and VMs for Continuous Integration and Continuous Delivery (CI/CD) | VCF Automation, Kubernetes APIs |
| **Storage / network administrator** | Build and manage storage and network services | vSAN, NSX |

Broadcom also groups capabilities by lifecycle phase: **Build** (deploy, expand domains, configure clusters and networks), **Manage** (licensing, identity, inventory, certificates and passwords, backup), **Operate** (alerts, logs, monitoring, diagnostics, capacity and cost), **Consume** (Supervisor, organizations, VM/Kubernetes provisioning).

## How It Works

What happens when a developer needs a new three-tier test environment in a VCF private cloud:

1. The **provider admin** has already built workload domains and exposed capacity to VCF Automation as a region.
2. The **organization admin** gave the developer's team a quota, a network and a catalog of approved templates.
3. The developer **requests** the environment from the catalog or Application Programming Interface (API).
4. **VCF Automation** applies policy (quota, placement, naming) and calls vCenter and NSX.
5. **vCenter** places the VMs in a cluster (Distributed Resource Scheduler (DRS) chooses hosts); **vSAN** applies the storage policy; **NSX** creates the network and firewall rules.
6. **VCF Operations** starts collecting metrics and logs and attributes the cost/capacity to the team.
7. The developer receives the environment, often in minutes, without a ticket.

## Deep Dive

### Value proposition (why organisations choose private cloud)

| Value | Explanation |
|---|---|
| **Cost / Total Cost of Ownership (TCO)** | Higher hardware utilization through pooling; fewer manual operations per VM; predictable cost compared with variable public-cloud bills for steady workloads. |
| **Control and sovereignty** | Data stays on-premises or in a chosen location; meets regulatory and data-residency requirements. |
| **Security and compliance** | Consistent hardening, micro-segmentation and compliance checks built into the platform. |
| **Performance and latency** | Workloads run close to data and users; predictable performance for demanding apps (including Artificial Intelligence (AI)). |
| **Agility** | Public-cloud-like speed through self-service and automation. |
| **Operational consistency** | One platform, one lifecycle, one operations console for VMs and containers. |

### Use cases Broadcom positions for VCF 9

| Theme | Use case | Typical exam scenario wording |
|---|---|---|
| Infrastructure modernization | Build and operate private cloud infrastructure on-premises or at the edge | "Replace ageing hardware and siloed teams with a standard platform" |
| | Implement automated infrastructure to provide IaaS | "Developers wait weeks for VMs" |
| | Extend the data center to the cloud | "Burst or migrate between sites/clouds" |
| Unified cloud experience | Kubernetes and other modern workloads | "Run containers next to VMs on the same platform" |
| | Private AI | "Run Graphics Processing Unit (GPU) workloads on-premises because of data privacy" |
| | Traditional workloads | "Keep existing VM applications running with better operations" |
| Secure and resilient platform | Ransomware protection and recovery | "Recover cleanly after a ransomware attack" |
| | Disaster recovery | "Protect against site loss" |
| | Integrated security, compliance and resilience | "Continuous compliance against a hardening standard" |

### Select the use-case theme from the business outcome

The same component can support several themes, so classify the **outcome**, not a product name:

| Scenario signal | Primary theme | Why |
|---|---|---|
| Standardize ageing sites, add edge capacity, replace ticket-driven VM delivery with automated Infrastructure as a Service (IaaS) | Infrastructure modernization | The requested outcome changes how infrastructure is built and supplied |
| Give application teams one self-service experience for VMs, Kubernetes, Private AI and traditional applications | Unified cloud experience | The requested outcome is a common consumption model across workload types |
| Recover from ransomware/site loss or prove continuous hardening and compliance | Secure and resilient platform | The requested outcome protects service, data and security posture |

When a scenario spans themes, identify its dominant success measure. “Run AI on-premises because the data is
sensitive” combines unified consumption with control, but the explicit workload-delivery request maps first to the
**Private AI** use case under unified cloud experience. “Restore that AI service after ransomware” maps to secure and
resilient platform.

### How VCF 9 deployment models express the principles

Resilience and scale are also principles, and VCF 9 documents them as **fleet deployment models**: a basic design in one availability zone or region; site high availability across zones (stretched clusters, fault domains); disaster recovery across regions (a secondary instance with replication and failover); and a combination of fault domains plus disaster recovery. You will design with these in the Design phase. For now, notice that the same private cloud (one fleet, one operations console, one self-service portal) can span several of these physical layouts.

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/4fe239ae-d280-4681-9cff-99099ac27124.original.png" caption="VMware Cloud Foundation Fleet Deployment Basic Design" source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vcf-operations-deployment-models.html"}

### Private vs public vs hybrid

Private cloud is not "anti-public-cloud". It is a choice of *where* a cloud operating model runs. Steady, data-sensitive, latency-sensitive or regulated workloads are classic private cloud candidates; short-lived bursty workloads may fit public cloud. VCF 9 messaging focuses explicitly on the private cloud.

## Configuration

Nothing to configure yet. The private cloud principles turn into concrete configuration later: workload domains (Workload Domains phase), VCF Automation organizations and quotas (Automation phase), storage policies (vSAN phase) and NSX segments and firewall rules (NSX phase).

## CLI / API

Not applicable to this concept lesson. "API-first" is itself a private cloud principle: every capability you will configure later in VCF (vCenter, NSX, SDDC Manager, VCF Operations, VCF Automation) has a Representational State Transfer (REST) API, covered in the Automation phase.

## Failure Scenarios

Private cloud *projects* fail more often for operating-model reasons than for technical ones:

| Failure | Symptom | Principle missing |
|---|---|---|
| Self-service never enabled | Teams still raise tickets; VCF is "just expensive vSphere" | Self-service |
| One giant shared cluster for everything | Noisy neighbours, compliance scope covers everything | Multi-tenancy / isolation |
| No quotas or policies | Sprawl, capacity exhausted | Governance |
| No metering | Nobody knows who uses what; no capacity planning | Measured service |
| Manual out-of-band patching | Upgrade prechecks fail, Bill of Materials (BOM) drift | Automated lifecycle |

## Troubleshooting

When a scenario asks "what should the organisation do?", diagnose which principle is missing: a speed complaint usually means self-service/automation; a compliance complaint means isolation/governance; a cost complaint means visibility and right-sizing (VCF Operations); an upgrade-pain complaint means lifecycle automation.

## Real-World Scenario

A hospital group keeps patient data on-premises for regulatory reasons, but its developers have started using public cloud accounts because getting a VM internally takes three weeks. The infrastructure team deploys VCF: a dedicated workload domain for clinical systems with NSX micro-segmentation, a second workload domain for development, and VCF Automation organizations per development team with quotas. VCF Operations gives finance a showback report per team. Result: data stays on-premises (sovereignty), developers self-serve in minutes (agility), and the clinical domain has its own lifecycle and security scope (isolation, compliance).

## Exam Focus

:::exam
- Be able to match a **principle** (self-service, pooling, elasticity, multi-tenancy, governance, metering, lifecycle automation) to the **VCF component** that delivers it.
- Recognise the three VCF 9 use-case themes: **infrastructure modernization**, **unified cloud experience**, **secure and resilient platform**.
- Know that virtualization alone is not private cloud: self-service and governance are what make it cloud.
:::

## Common Exam Traps

:::trap
- Choosing "server virtualization" as the defining feature of private cloud. It is a prerequisite, not the defining principle.
- Thinking private cloud means "no automation, just on-premises". On-premises *with* cloud operating model is the point.
- Attributing self-service to VCF Operations. Self-service consumption is **VCF Automation**; VCF Operations is operate, monitor and govern.
:::

## Knowledge Check

::quiz

## Summary

- Virtualized data center → SDDC → private cloud: each step adds software control, then self-service and governance.
- Principles: self-service, pooling, elasticity, multi-tenancy, policy governance, measured service, automated lifecycle, built-in security.
- VCF maps them to components: VCF Automation (consume), VCF Operations (operate/measure), vSphere/vSAN/NSX (pool), SDDC Manager and the installer (lifecycle).
- Use-case themes: infrastructure modernization, unified cloud experience, secure and resilient platform.

## Next Topic

[VCF vs vSphere](lesson:vcf-vs-vsphere): what VCF adds on top of a standalone vSphere estate, and what vSphere Foundation is.
