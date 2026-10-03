---
id: supervisor-in-workload-domain
title: vSphere Supervisor in a Workload Domain
phase: p08-workload-domains
module: m08-wld
version: vcf9
minutes: 45
difficulty: advanced
summary: What vSphere Supervisor is, how it is activated in a VCF 9.0 workload domain (wizard option, simplified deployment, full deployment), its networking and load balancer choices, zones and control plane HA, namespaces, and how Supervisor Services such as VKS, Harbor and Contour are deployed.
topics: [supervisor, workload-domains, nsx-vpc, nsx-edge, vcf-automation]
objectives: ["4.1", "4.4"]
keyTerms: [supervisor, vsphere-zone, vsphere-namespace, supervisor-service, vks, foundation-load-balancer, workload-domain]
labs: [lab-enable-supervisor]
incidents: []
components: [supervisor, workload-domain, vcenter, nsx-manager, nsx-edge-cluster, vds, vcf-automation]
related: [host-commissioning-wld-creation, nsx-vpcs-and-vcf-networking, nsx-edge-nodes-clusters, vcf-automation-architecture, vcf-automation-tenancy-regions]
sources:
  - title: "VCF 9.0 – vSphere Supervisor Installation and Configuration"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration.html
  - title: "VCF 9.0 – vSphere Supervisor Architecture"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/vsphere-supervisor-concepts/supervisor-architecture-and-components/supervisor-architecture.html
  - title: "VCF 9.0 – Simplified Supervisor Deployment"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/deploying-easy-supervisor.html
  - title: "VCF 9.0 – vSphere Supervisor Models (design)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/design/vmware-cloud-foundation-concepts/vsphere-supervisor-deployment-types.html
  - title: "VCF 9.0 – Create a New Workload Domain Using VCF Operations (Supervisor page)"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/building-your-private-cloud-infrastructure/working-with-workload-domains/deploy-a-vi-workload-domain-using-the-sddc-manager-ui.html
  - title: "Supervisor Services catalog (vsphere-tmm, GitHub)"
    url: https://github.com/vsphere-tmm/Supervisor-Services
---

## Why This Matters

vSphere Supervisor turns a workload domain cluster into a Kubernetes-API-driven platform: developers and VCF Automation request VMs, Kubernetes clusters, volumes and services declaratively, and vSphere builds them. In VCF 9.0 the workload domain wizard offers to activate Supervisor **by default**, and VCF Automation's modern consumption model is built on it. Objective 4.1 ends with "configure Supervisor within a Workload Domain" and 4.4 with "describe the deployment of Supervisor-based Services" — both are covered here.

## Learning Objectives

- Describe the Supervisor architecture: control plane VMs, Spherelet, vSphere Pods, VM Service, VKS, zones.
- Activate Supervisor during workload domain creation and explain what the wizard deploys.
- Compare the networking stacks (VPC, NSX segments, VDS) and load balancers (NSX, Avi, Foundation Load Balancer).
- Explain the simplified Supervisor and how to grow it.
- Describe how Supervisor Services (VKS, Harbor, Contour, …) are deployed and consumed through vSphere Namespaces.

## Concept

TechDocs defines [[supervisor]] as "a workload domain capability that, when activated, enables a self-service consumption experience that uses a single declarative API to create resources such as Virtual Machines, Kubernetes Guest Clusters, Storage Volumes and other advanced services."

| Building block | What it is |
|---|---|
| Supervisor control plane VMs | Kubernetes control plane running as VMs on the cluster — **one** (simple) or **three** (HA, recommended for control plane HA) |
| Spherelet | "A kubelet that is ported natively to ESX", making each ESX host a Kubernetes node |
| vSphere Pods | Containers running in a CRX (Container Runtime Executive) — a paravirtualised Linux kernel with VM-level isolation |
| VM Service | Declarative VMs (and the VMs behind VKS clusters) |
| [[vks]] | vSphere Kubernetes Service — provisions and manages conformant Kubernetes clusters on the Supervisor |
| [[vsphere-zone]] | A vSphere cluster mapped to a zone; Supervisor runs on **one** zone or **three** zones |
| [[vsphere-namespace]] | Tenancy unit: resource quotas, permissions, storage policies, VM classes; spans up to three zones |
| [[supervisor-service]] | Add-on services installed into the Supervisor (VKS, Harbor, Contour, ExternalDNS, Velero, …) |

:::vcf9 Changed in VCF 9
vSphere 8 called this *vSphere with Tanzu* / *vSphere IaaS control plane* and its Kubernetes service *TKG Service*. In VCF 9.0 it is **vSphere Supervisor** and **vSphere Kubernetes Service (VKS)**. New in 9.0: the **workload domain wizard can activate Supervisor** (on by default), **VCF Networking with VPC** is the recommended workload network, the **simplified Supervisor** deployment exists, and the [[foundation-load-balancer|Foundation Load Balancer]] (packaged with vCenter, L4, VDS networking only) is available.
:::

## Architecture

::diagram[d08-supervisor-architecture]

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/0b627ecf-2348-4545-bd0c-2f2707c56e2e.original.svg" caption="vSphere Supervisor general architecture (VCF 9.0, Supervisor Architecture)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/vsphere-supervisor-concepts/supervisor-architecture-and-components/supervisor-architecture.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/190ea85d-f6f2-41d8-82a2-2ba0759825ab.original.svg" caption="One-zone Supervisor architecture (VCF 9.0, Supervisor Architecture)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/vsphere-supervisor-concepts/supervisor-architecture-and-components/supervisor-architecture.html"}

::figure{src="https://techdocs.broadcom.com/content/broadcom/techdocs/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/_jcr_content/assetversioncopies/97bd1a8c-a1eb-4d48-8a31-0cdd057e36c4.original.svg" caption="Three-zone Supervisor architecture (VCF 9.0, Supervisor Architecture)." source="https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/vsphere-supervisor-concepts/supervisor-architecture-and-components/supervisor-architecture.html"}

Where things run:

| Element | Runs on / managed by |
|---|---|
| Supervisor control plane VMs | The workload domain cluster(s) (zones); managed by vCenter's Supervisor service |
| Spherelet | Every ESX host of the Supervisor cluster(s) |
| VKS clusters, VM Service VMs, vSphere Pods | Workload domain hosts, inside vSphere Namespaces |
| NSX (VPC or segments), Tier-0/Edge | NSX Manager in management domain; Edges usually in the workload domain |
| Load balancer | NSX LB (VPC/segments), Avi, or Foundation LB (VDS) |

## Components

### Networking stacks

| Stack | Load balancer | Notes |
|---|---|---|
| **VCF Networking with VPC** | NSX (default) or Avi | Recommended workload network; the supported stack for VCF Automation environments |
| **NSX segments** | NSX or Avi | Software-defined segments via NSX Edge |
| **VDS networking** | Avi or **Foundation Load Balancer** | VLAN-backed; no NSX overlay for workloads |

### Load balancers (design guide)

| LB | Where available | Features |
|---|---|---|
| NSX | Default for VPC/NSX segment models | L4, no extra configuration |
| Avi | All networking models | Advanced (L7, analytics); additional entitlement |
| Foundation LB | VLAN (VDS) networking only | Packaged with vCenter; single/dual-node; L4 |

### Control plane and zones

| Choice | Effect |
|---|---|
| 1 control plane VM | Default for workload domain creation; minimal resources; single point of failure for the control plane |
| 3 control plane VMs | Control plane HA; **required for three-zone** deployments |
| 1 zone | One vSphere cluster |
| 3 zones | Three clusters; control plane VMs spread one per zone; cluster-level HA. Namespace quotas are split equally across zones |

## How It Works

### Option A – activate during workload domain creation (VCF Operations)

1. General page: **Enable vSphere Supervisor** (default on).
2. Cluster page: **vSphere Zone name** (the wizard creates a single zone).
3. NSX page: choose **Centralized connectivity** — required for Supervisor in this flow.
4. Supervisor page:

| Field | Meaning |
|---|---|
| Supervisor name | Object name in vCenter |
| Service CIDR | Kubernetes service IPs; must not overlap Supervisor-routable networks |
| Use ESX management VMK settings | Reuse management VLAN, subnet, gateway, VDS for the control plane management network |
| VLAN / subnet / gateway / VDS | Otherwise, the control plane management network |
| Control plane IP range | **At least 5** addresses |
| NSX project / VPC connectivity profile | Not configurable when a **new** NSX Manager is deployed |
| Private (transit gateway) CIDR, Private CIDR | VPC address space for namespaces/workloads |
| Workload DNS / Workload NTP | DNS and routable NTP for workloads |

5. Finish. The result is a Supervisor with **one control plane VM** and **one vSphere zone**.
6. **Complete activation**: deploy an **NSX Edge cluster with an active-standby Tier-0 gateway** (centralized connectivity), unless you reused a compatible existing NSX Manager. Until then the Supervisor cannot reach external networks.

### Option B – simplified Supervisor (vSphere Client)

The simplified flow needs fewer resources: a single control plane VM, **one network for management and workload traffic**, **no load balancer**, and it supports **VM Service only** (no vSphere Pods, no Supervisor Services). Grow it in steps: first **add a load balancer** (Avi or Foundation LB) — which enables vSphere Pods and Supervisor Services — then, in any order, **scale the control plane from 1 to 3** VMs and **add a second NIC** to separate management and workload traffic.

### Option C – full activation in the vSphere Client

Activate Supervisor on one or three zones with your chosen networking stack (VPC, NSX segments or VDS + Avi/Foundation LB), control plane size and count. Three-zone with isolated workload zones is API-only per the design guide.

### Deploying Supervisor Services (objective 4.4)

1. Download the service definition (YAML) from the Broadcom support portal (*vSphere Supervisor Services*) — catalog maintained at the vsphere-tmm GitHub repository.
2. In vCenter, **register/add** the service version.
3. **Install** it on the Supervisor, optionally with a `values.yaml` for configuration.
4. The service runs in its own Supervisor namespace and is consumed by namespace users (e.g. Harbor as a registry, Contour as ingress).

| Service | Purpose |
|---|---|
| VKS | Kubernetes clusters; delivered as a Supervisor Service, so it updates independently of the Supervisor |
| Harbor | Container registry |
| Contour | Ingress controller (Envoy) |
| ExternalDNS | Publishes DNS records for services |
| Velero (operator) | Backup/restore of Kubernetes resources |
| Local Consumption Interface | Namespace consumption UI in the vSphere Client |
| ArgoCD | GitOps CD (requires VCF 9.0.1+ per the catalog) |

Remember: services need a Supervisor with a **load balancer** — a simplified Supervisor without LB cannot run them.

## Deep Dive

### vSphere Namespaces

A namespace is where a DevOps user works: CPU/memory/storage quotas, permissions (view/edit/owner), assigned storage policies (which become Kubernetes storage classes), VM classes and content libraries for VM Service images. With three zones, a namespace spans them and quotas are split equally (300 MHz across three zones = 100 MHz per cluster).

### Storage

Each zone should have its own datastore with consistent performance; storage is not replicated across zones by Supervisor. Sharing one vSAN datastore across zones is not recommended in the design guide.

### Relationship to VCF Automation

VCF Automation's "All Apps" organizations consume Supervisor namespaces through regions; VPC networking is the supported stack there. Plan Supervisor networking with VCF Automation in mind (see [VCF Automation Architecture](lesson:vcf-automation-architecture)).

## Configuration

Minimum worksheet for wizard-based activation:

| Item | Example |
|---|---|
| Zone name | `wld01-az1` |
| Service CIDR | 10.96.0.0/23 |
| Control plane IPs | 10.0.30.50–10.0.30.54 (5) on VLAN 30 |
| Private transit gateway CIDR | 172.16.100.0/24 |
| Private CIDR | 172.16.0.0/20 |
| Workload DNS / NTP | 10.0.10.2 / 10.0.10.2 |
| Tier-0 | active-standby, BGP or static to ToR |

## CLI / API

Supervisor configuration is exposed through the vSphere Automation API (`Vcenter NamespaceManagement Supervisors …` data structures, including `SupervisorServices CreateSpec`). After activation, users log in with the vSphere kubectl plugin:

```shell
kubectl vsphere login --server=<supervisor-control-plane-address> --vsphere-username devops@vsphere.local
kubectl config use-context <namespace>
kubectl get virtualmachineclasses
```

## Failure Scenarios

| Situation | Effect |
|---|---|
| Edge cluster / Tier-0 not deployed after WLD creation | Supervisor activation incomplete; no external connectivity |
| Fewer than 5 control plane IPs | Wizard validation fails |
| Service CIDR overlaps a routed network | Kubernetes service routing breaks |
| Simplified Supervisor without LB | Supervisor Services and vSphere Pods unavailable |
| 1 control plane VM, host failure | Control plane unavailable until vSphere HA restarts it |
| Workload NTP not routable | Workload time drift, certificate errors in clusters |

## Troubleshooting

Work bottom-up: ESX hosts healthy and in the zone cluster → management network for control plane VMs (IPs free, VLAN, gateway) → NSX Edge/Tier-0 or LB health → DNS/NTP reachable from workload networks → Supervisor config status in vCenter → service-level issues. TechDocs organises Supervisor troubleshooting by storage, networking, identity and lifecycle layers.

## Real-World Scenario

A software company creates a workload domain `dev01` with Supervisor enabled, centralized connectivity and a single zone. The wizard finishes but developers cannot reach the Kubernetes API from their laptops. The platform engineer realises the NSX Edge cluster and active-standby Tier-0 were never deployed — the wizard explicitly leaves that for afterwards. After deploying the edge cluster with BGP to the ToR, the Supervisor completes activation. They then scale the control plane to three VMs for HA, install Harbor and Contour as Supervisor Services, and create namespaces per team with quotas.

## Lab

Running Supervisor in a nested home lab is the hardest exercise in this course — read its sizing notes carefully.

::lab[lab-enable-supervisor]

## Exam Focus

:::exam
- Supervisor = workload domain capability; WLD wizard enables it by default with 1 control plane VM and 1 zone.
- Centralized connectivity requires an NSX Edge cluster with active-standby Tier-0 **after** WLD creation.
- Control plane: 1 or 3 VMs (3 for HA and for three zones). Zones: 1 or 3.
- Networking: VPC (recommended, VCF Automation), NSX segments, VDS. LBs: NSX, Avi, Foundation LB (VDS only).
- Simplified Supervisor: VM Service only until a load balancer is added.
- Supervisor Services (VKS, Harbor, Contour…) are registered in vCenter and installed on the Supervisor.
:::

## Common Exam Traps

:::trap
- "Foundation Load Balancer with VPC networking" — Foundation LB is for VDS (VLAN) networking only.
- "Two-zone Supervisor" — one or three zones.
- "Supervisor Services run on a simplified Supervisor out of the box" — they need a load balancer.
- "The WLD wizard deploys the Edge cluster" — you deploy it afterwards.
:::

## Knowledge Check

::quiz

## Summary

vSphere Supervisor adds a Kubernetes control plane to a workload domain cluster so that VMs, VKS clusters, vSphere Pods and services are consumed declaratively through namespaces. In VCF 9.0 you activate it in the workload domain wizard (then deploy an Edge cluster/Tier-0), through the simplified flow, or fully in the vSphere Client, choosing VPC, NSX segment or VDS networking and an NSX, Avi or Foundation load balancer. Supervisor Services extend it with VKS, registry, ingress and more.

## Next Topic

Next phase: [Lifecycle Concepts](lesson:lifecycle-concepts) — keeping the fleet you just built up to date.
