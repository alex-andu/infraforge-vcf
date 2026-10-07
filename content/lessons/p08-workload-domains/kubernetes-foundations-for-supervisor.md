---
id: kubernetes-foundations-for-supervisor
title: Kubernetes Foundations for vSphere Supervisor
phase: p08-workload-domains
module: m08-wld
version: vcf9
minutes: 55
difficulty: foundation
summary: A practical mental model for Kubernetes objects, reconciliation, networking, storage and access control, followed by a precise mapping from upstream Kubernetes to vSphere Supervisor and VKS clusters.
topics: [supervisor, workload-domains]
objectives: ["4.1", "4.4"]
keyTerms: [kubernetes-control-plane, kubernetes-node, pod, deployment, kubernetes-service, kubernetes-namespace, persistent-volume-claim, storage-class, desired-state, container-image]
labs: []
incidents: []
components: [supervisor, workload-domain, vcenter, esx-host]
related: [supervisor-in-workload-domain, host-commissioning-wld-creation, workload-domains-architecture, workload-domain-storage]
sources:
  - title: "Kubernetes – Overview"
    url: https://kubernetes.io/docs/concepts/overview/
  - title: "Kubernetes – Components"
    url: https://kubernetes.io/docs/concepts/overview/components/
  - title: "Kubernetes – Workloads"
    url: https://kubernetes.io/docs/concepts/workloads/
  - title: "Kubernetes – Deployments"
    url: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
  - title: "Kubernetes – Services, Load Balancing, and Networking"
    url: https://kubernetes.io/docs/concepts/services-networking/
  - title: "Kubernetes – Persistent Volumes"
    url: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
  - title: "Kubernetes – Namespaces"
    url: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
  - title: "VCF 9.0 – vSphere Supervisor Architecture"
    url: https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/vsphere-supervisor-concepts/supervisor-architecture-and-components/supervisor-architecture.html
  - title: "Broadcom – VM Service API"
    url: https://developer.broadcom.com/xapis/vm-service/latest/
  - title: "Broadcom – vCenter Namespace Management APIs"
    url: https://developer.broadcom.com/xapis/vsphere-automation-api/latest/vcenter-namespace-management/
---

## Why This Matters

VCF administrators do not need to become application developers, but they do need to understand the language used
by the platform they operate. vSphere Supervisor exposes a Kubernetes API. VKS creates Kubernetes clusters. VM
Service uses Kubernetes-style YAML to request virtual machines. Storage is offered through policies and consumed
through claims. If words such as *Pod*, *Deployment*, *Service*, *namespace* and *desired state* remain vague, a
Supervisor design looks like a list of VMware components instead of a working control system.

The useful boundary is operational: understand what an object requests, which controller tries to satisfy it, and
where to look when observed state differs from desired state. You do not need to memorize every Kubernetes API
field. You do need to distinguish a workload from the object that keeps it alive, a stable service address from the
replaceable Pods behind it, and a storage request from the volume that eventually satisfies it.

This foundation supports two items in the official exam description: configuring Supervisor within a Workload
Domain and describing deployment of Supervisor-based Services. The exam may present those VCF tasks using ordinary
Kubernetes concepts. This lesson builds those concepts first; the advanced
[vSphere Supervisor](lesson:supervisor-in-workload-domain) lesson then covers activation, topology, networking and
Supervisor Services in VCF 9.

## Learning Objectives

- Explain the Kubernetes desired-state and reconciliation model.
- Identify the control-plane and node responsibilities in a Kubernetes cluster.
- Distinguish Pods, Deployments, Services, Namespaces, ConfigMaps, Secrets and storage claims.
- Trace basic application traffic and persistent storage from request to implementation.
- Read common `kubectl get`, `describe` and `logs` evidence without changing a cluster.
- Map upstream Kubernetes concepts to vSphere Supervisor, vSphere Namespaces, Spherelet, VKS and VM Service.
- Separate the Supervisor control plane from a VKS workload cluster running on top of it.

## Concept

### The declarative model

Kubernetes is an API and a collection of control loops. A user submits an object that describes **desired state**:
for example, “run three replicas of this container image.” Controllers observe the current state and keep acting
until the two converge. If one replica disappears, the system creates a replacement. If the specification changes
from three replicas to five, the controller creates two more.

```text
desired state in API → controller compares → action → observed state
        ↑                                      │
        └──────────── continuous reconcile ────┘
```

This is different from a one-time script. A script says “create three processes” and finishes. A controller keeps
checking whether three suitable instances exist. The stored object is therefore both a request and the reference
against which health is judged.

Every common Kubernetes object has two important views:

| View | Meaning | Example |
|---|---|---|
| `spec` | What the user or controller wants | Deployment requests three replicas and image `web:1.4` |
| `status` | What the system currently observes | Two replicas ready, one pending |

A resource can exist successfully in the API while its requested outcome is still unavailable. “The YAML applied”
only proves that the API accepted it. Operational validation asks whether status, events and dependent resources
show that reconciliation completed.

### Objects form a chain

A typical stateless application is not one object:

```text
Deployment → ReplicaSet → Pods ← Service → stable DNS/IP for clients
                              ↘ ConfigMap / Secret
                              ↘ PersistentVolumeClaim → PersistentVolume
```

- A [[deployment]] defines rollout strategy, Pod template and replica count.
- A ReplicaSet maintains the required number of matching Pods and is normally owned by the Deployment.
- A [[pod]] is the smallest deployable compute object: one or more tightly coupled containers sharing network and
  storage context.
- A [[kubernetes-service|Service]] selects Pods by labels and presents a stable access point even as Pods are
  replaced.
- A ConfigMap holds non-sensitive configuration; a Secret holds sensitive values. Encoding a Secret is not the
  same as encrypting it, so platform security still matters.
- A [[persistent-volume-claim|PersistentVolumeClaim]] asks for durable storage; a matching PersistentVolume is the
  resource bound to the claim.

## Architecture

An upstream cluster has a control plane and one or more nodes. The control plane exposes and reconciles the API;
nodes run workloads.

::figure{src="https://kubernetes.io/images/docs/components-of-kubernetes.svg" caption="Official Kubernetes architecture figure: clients submit state through the API server; control-plane components reconcile it and node components run Pods." source="https://kubernetes.io/docs/concepts/overview/components/"}

The next diagram maps that model to VCF. It deliberately shows two Kubernetes API boundaries. The **Supervisor API**
manages infrastructure-facing resources such as vSphere Namespaces, VM Service VMs, Supervisor Services and VKS
clusters. Each **VKS cluster** has its own API, control plane, nodes and ordinary application objects.

::diagram[d08-kubernetes-to-supervisor]

The distinction prevents a common mistake: a VKS cluster is not another name for Supervisor. Supervisor provisions
and governs the VKS cluster; application teams usually deploy their Pods and Deployments to the VKS cluster API.

## Components

### Control-plane components

| Component | Responsibility | Operational clue |
|---|---|---|
| `kube-apiserver` | Front door for the Kubernetes HTTP API; validates requests and exposes objects | If it is unreachable, `kubectl` cannot list anything |
| `etcd` | Consistent key-value store for API data | Control-plane state depends on its health and quorum |
| `kube-scheduler` | Assigns unscheduled Pods to suitable nodes | A Pod that stays `Pending` may have no node satisfying resources or constraints |
| `kube-controller-manager` | Runs core reconciliation controllers | Replica, node and endpoint state stop converging when relevant controllers fail |

### Node components

| Component | Responsibility | Operational clue |
|---|---|---|
| `kubelet` | Ensures the containers described by assigned Pod specifications run and remain healthy | Node or runtime problems surface as Pod/container status and events |
| Container runtime | Pulls images and runs containers | Registry, credentials or image-name failures appear during image pull |
| Network implementation | Gives Pods connectivity and implements the cluster network model | A running Pod can still be unreachable if network policy or service routing is wrong |

On Supervisor, **Spherelet** performs the kubelet role on ESX hosts. In a VKS cluster, its worker nodes are virtual
machines and run the normal node software for that Kubernetes distribution. These are different layers and should
be diagnosed separately.

### Workload and policy objects

| Object | What it represents | What it does not guarantee |
|---|---|---|
| [[pod]] | One scheduled workload unit with shared network identity | A stable identity after failure |
| [[deployment]] | Declarative rollout and replica management for interchangeable Pods | Durable application data by itself |
| Service | Stable discovery and traffic distribution to selected Pods | That selected Pods are healthy or ready |
| [[kubernetes-namespace|Namespace]] | Scope for names and a boundary for access/policy/quotas | Hard isolation without the relevant policies |
| ConfigMap / Secret | Configuration supplied independently of an image | Automatic application reload or complete secret protection |
| PVC | A request for storage with capacity and access requirements | A bound volume if no compatible class/capacity exists |
| [[storage-class|StorageClass]] | A named provisioning class and policy | That every claim can be satisfied |

## How It Works

Consider a Deployment that requests three web replicas:

1. A user sends a YAML document to the API server with `kubectl apply` or another API client.
2. The API server authenticates and authorizes the request, validates the object, and stores the accepted desired
   state.
3. The Deployment controller creates or updates a ReplicaSet.
4. The ReplicaSet controller creates enough Pod objects to satisfy the replica count.
5. The scheduler chooses a node for each unscheduled Pod based on available resources and constraints.
6. The node's kubelet asks the runtime to pull the referenced [[container-image]] and start its containers.
7. Readiness checks determine whether each Pod is ready to receive traffic.
8. A Service selects ready Pods by labels and provides a stable virtual address and DNS name.
9. Controllers keep watching. A failed Pod is replaced; a changed image triggers a controlled rollout.

Labels connect many of these objects. A Service does not normally point to named Pod instances. Its selector matches
labels such as `app: web`. If the Deployment template uses a different label, both resources may look healthy in
isolation while the Service has no endpoints.

### Networking path

Kubernetes gives each Pod an address in the cluster network. A Service supplies a stable virtual endpoint over the
changing Pod set. External traffic needs an exposure mechanism such as a load balancer or ingress implementation:

```text
client → external load balancer / ingress → Service → ready Pod endpoint
```

Cluster DNS publishes names for Services. This DNS is inside the Kubernetes environment and is distinct from the
VCF management DNS that resolves vCenter, NSX and ESX FQDNs. Both layers can fail, and the query origin tells you
which one to test.

### Storage path

An application requests storage with a PVC. A StorageClass can trigger dynamic provisioning through a CSI driver.
The resulting PV binds to the claim and is mounted into the Pod:

```text
Pod → PVC → StorageClass / CSI → PV → underlying datastore and policy
```

On vSphere, a storage policy exposed to the Kubernetes environment becomes part of this placement and provisioning
contract. The claim expresses application requirements; vSphere supplies storage that satisfies the selected policy.

## Deep Dive

### Supervisor, vSphere Namespace and Kubernetes Namespace

The names are similar but the scopes differ:

| Construct | Managed from | Primary purpose |
|---|---|---|
| Supervisor | vCenter / Supervisor API | Infrastructure-facing Kubernetes control plane on vSphere |
| vSphere Namespace | vCenter and Supervisor | Tenancy and governance boundary for permissions, quotas, VM classes, storage policies and networks |
| Kubernetes Namespace in a VKS cluster | That VKS cluster API | Logical scope for application objects inside the guest cluster |

A vSphere Namespace can contain a VKS cluster. That VKS cluster can contain many Kubernetes Namespaces. Therefore
“give access to the namespace” is incomplete unless the speaker identifies which API and which namespace type.

### Supervisor node model

Supervisor uses one or three control-plane VMs. ESX hosts participate as Kubernetes nodes through Spherelet. This
does not turn every workload into a conventional container directly on ESX. Supervisor supports several resource
types, including VM Service VMs, VKS clusters, vSphere Pods where supported, volumes and Supervisor Services. Each
has its own controller and runtime behavior.

VM Service illustrates the shared model well: a consumer submits a Kubernetes-style VM resource, and the platform
creates and manages a vSphere VM inside administrative guardrails. Broadcom describes the service as a declarative
API for production-ready Linux and Windows VMs, including lifecycle, guest customization and extra disks through
PVCs. Kubernetes is therefore the control model, even when the resulting workload is a full VM.

### Ownership tells you where to act

Kubernetes objects record ownership. A Pod created by a ReplicaSet is replaceable evidence of a higher-level desired
state. Editing or repeatedly deleting that Pod does not fix a bad Deployment template; the controller recreates the
same problem. Diagnose upward:

```text
failing container → Pod events → owner ReplicaSet → owner Deployment → referenced config/image/storage
```

The same reasoning applies to Supervisor. If a VKS worker VM is controller-managed, manual edits in vCenter may be
reverted or leave desired and observed state inconsistent. Use the owning API and supported lifecycle workflow.

### Availability is layered

Three replicas do not automatically mean application availability. Replicas can all land on one failure domain;
the Service can have no ready endpoints; storage can be single-failure-domain; the external load balancer can be
missing. Ask four separate questions:

1. Is the API/control plane available?
2. Are enough workload instances ready and spread appropriately?
3. Can clients reach a stable service path?
4. Is persistent data protected at the required level?

## Configuration

This compact example is for reading practice. It is not a runbook for Alex's current lab and is not applied by the
course.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: registry.example/web:1.4
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: demo
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
```

Read it from relationships rather than syntax:

- Both objects live in `demo`.
- The Deployment requests three Pods.
- Its Pod template applies `app: web`.
- The Service selects that same label.
- Clients use Service port 80; traffic reaches container port 8080.
- The image tag identifies the requested application build. The registry must be reachable and trusted.

## CLI / API

These read-only commands form an evidence ladder. They require a valid kubeconfig and authorization for the selected
cluster context.

```shell
# Prove which API and identity you are using
kubectl config current-context
kubectl auth can-i get pods --all-namespaces

# Move from summary to detail
kubectl get nodes
kubectl get deployments,pods,services -n demo -o wide
kubectl describe deployment web -n demo
kubectl describe pod <pod-name> -n demo
kubectl get events -n demo --sort-by=.metadata.creationTimestamp

# Inspect logs only after identifying the correct Pod and container
kubectl logs <pod-name> -n demo --container web
```

Interpretation:

- `get` answers **what exists and its summarized state**.
- `describe` adds conditions, ownership and events explaining **why it is in that state**.
- `logs` shows application/container output, which is useful only after control-plane scheduling, image and mount
  failures have been ruled out.
- `current-context` matters because Supervisor and every VKS cluster are separate API targets.

The vCenter Namespace Management API manages Supervisor lifecycle and related resources. The API includes separate
operations for Supervisors, namespaces, storage profiles and installed Supervisor Services; this mirrors the object
boundaries explained here.

## Failure Scenarios

| Symptom | Likely layer | First evidence |
|---|---|---|
| `kubectl` cannot connect to server | API endpoint, route, DNS, certificate or context | `current-context`, endpoint resolution/reachability |
| Request returns `Forbidden` | Authentication succeeded; RBAC denied the verb/resource/scope | `kubectl auth can-i ...` and the exact identity |
| Pod remains `Pending` | Scheduling or unbound storage | Pod events; node resources/constraints; PVC state |
| Pod shows `ImagePullBackOff` | Registry, image name, trust or credentials | Pod events and image reference |
| Pod restarts with `CrashLoopBackOff` | Container starts and exits repeatedly | Previous/current container logs and Pod events |
| Service exists but has no endpoints | Selector mismatch or Pods not ready | Service selector, Pod labels, readiness |
| PVC remains `Pending` | No compatible StorageClass, policy, capacity or provisioner | PVC events and selected StorageClass |
| VKS cluster exists but application objects are absent | Wrong API context | Current context and API server endpoint |

## Troubleshooting

Use a fixed order so application symptoms do not trigger random infrastructure changes:

1. **Identify the API boundary.** Record `kubectl config current-context`. Decide whether you are looking at
   Supervisor or a specific VKS cluster.
2. **Check access.** A timeout, TLS error, unauthorized response and forbidden response represent different layers.
3. **Read desired and observed state.** Compare replicas requested, replicas available, conditions and timestamps.
4. **Follow ownership.** Start at the failed object and inspect its controller owner before editing anything.
5. **Read events.** Scheduling, image, mount and admission failures usually appear here before application logs help.
6. **Trace dependencies.** For traffic, follow load balancer → Service → endpoints → ready Pod. For storage, follow
   Pod → PVC → PV → StorageClass/policy.
7. **Change the owning specification.** Remediate through the supported API or vSphere workflow, then watch the
   controller reconcile.
8. **Validate the outcome.** Confirm status and client behavior; the absence of a red task alone is insufficient.

Do not delete a failing Pod as the first diagnostic step. Deletion can erase useful evidence, and its controller
will usually create another Pod from the unchanged specification.

## Real-World Scenario

A team reports that its web application is down. Three Pods show `Running`, and the Service object exists. The
administrator first checks the VKS context, then lists the Service endpoints. None exist. `describe service` shows
selector `app: storefront`; the Deployment's Pod template uses `app: store-front`.

The fault is not the NSX Tier-0, load balancer or ESX host. The stable Service has no matching backends because labels
are exact keys and values. The team corrects the Deployment template or Service selector through the owning manifest,
watches ready endpoints appear, and validates the client path. This scenario demonstrates why object relationships
matter more than memorizing command names.

## Exam Focus

:::exam
- Kubernetes is declarative: controllers continually reconcile actual state toward `spec`.
- Control plane means API server, state store, scheduler and controllers; nodes run workloads through kubelet and a
  container runtime.
- Pod is the smallest deployable unit; Deployment manages replaceable replicas; Service provides stable discovery.
- PVC requests storage; StorageClass describes a provisioning class; the resulting PV supplies the resource.
- Supervisor and a VKS cluster are separate Kubernetes API boundaries. Supervisor provisions/governs the VKS
  cluster; application Pods normally run in the VKS cluster.
- On Supervisor, Spherelet performs the kubelet role on ESX hosts, and vSphere Namespaces carry permissions, quotas,
  storage policies, VM classes and network assignments.
- Objective 4.1 applies these foundations when configuring Supervisor in a Workload Domain. Objective 4.4 applies
  them when installing and consuming Supervisor Services.
:::

## Common Exam Traps

:::trap
- A Pod is not a container image and is not a durable server identity. Controllers replace Pods.
- A Deployment does not expose an application to clients; a Service or other exposure path is still needed.
- `Running` does not necessarily mean `Ready`, and an accepted YAML object does not prove successful reconciliation.
- A Kubernetes Service is a traffic/discovery object; a Supervisor Service extends Supervisor. The shared word
  “Service” does not make them the same resource.
- A vSphere Namespace is not the same scope as a Kubernetes Namespace inside a VKS cluster.
- Supervisor is not a VKS cluster. Always identify the current API context.
- Base64 text in a Kubernetes Secret is encoding, not encryption by itself.
:::

## Knowledge Check

::quiz

## Summary

- Kubernetes stores desired state as API objects and uses controllers to reconcile observed state continuously.
- The control plane decides and records; nodes run Pods through kubelet and a container runtime.
- Deployments manage replaceable Pods, Services provide stable discovery, and PVCs request durable storage.
- Events, ownership and status explain most failures more directly than deleting resources or starting with logs.
- Supervisor applies the Kubernetes control model to vSphere resources; VKS clusters are separate workload clusters
  created and governed through Supervisor.
- Context is evidence: identify whether a command targets Supervisor or a VKS cluster before interpreting output.

## Next Topic

Continue with [vSphere Supervisor in a Workload Domain](lesson:supervisor-in-workload-domain) to apply these
foundations to VCF 9 activation, zones, networking, load balancing and Supervisor Services.
