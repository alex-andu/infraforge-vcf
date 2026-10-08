# vSphere Supervisor practical guide package

Package ID: `K8S-SUPERVISOR-GUIDE-01`

Branch: `content/vsphere-supervisor-practical-guide`

Status: complete on feature branch; real-lab validation pending

## Outcome

Convert `lab-enable-supervisor` from a short generic challenge into a complete UI-first VCF 9.0 runbook. Keep it
separate from theory and mark it **PREPARED — NOT YET LAB-VALIDATED** until Alex adds a VI Workload Domain and runs
the procedure. Preserve the existing guide ID, route and learner progress.

## Environment boundary

The sanitized inventory contains a VCF 9.0.2 management environment but no confirmed VI Workload Domain, active
Supervisor, load balancer, namespace network, content library image or available capacity. The guide must therefore
use discovery variables for the future workload-domain cluster, storage policy, port group, IP range, service CIDR,
FQDN and disposable VM. It must not claim that the generic `wld01` / `10.10.60.0/24` design exists.

## Verified VCF 9.0 activation workflow

Broadcom TechDocs was checked on 2026-10-08; the page reports last update 2026-09-29.

1. Sign in to the target vCenter with the vSphere Client and select the target cluster.
2. Select **Actions > Activate Supervisor**.
3. Select DHCP or Static for the shared initial management/workload network. The Primary Workload Network carries
   control-plane and workload traffic; namespaces may later receive different port groups for Layer 2 isolation.
4. For Static, supply the port group, control-plane/workload IP range, subnet mask, gateway, NTP servers, DNS servers,
   Service CIDR and Supervisor FQDN. The FQDN DNS record points to the floating IP and is required for secure SNI access
   to the single-NIC configuration. The address range must not overlap a future load-balancer VIP range.
5. Select the control-plane VM storage policy and click **Activate**.
6. The initial simplified result has one control-plane VM, one NIC and no load balancer.

Primary source:
`https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-0/vsphere-supervisor-installation-and-configuration/deploying-easy-supervisor/activate-easy-supervisor.html`

## Planned guide gates

- Freeze the design and evidence sheet; verify current release/interoperability, capacity, DNS/NTP and address
  ownership before any UI action.
- Prepare or verify storage policy and Primary Workload Network without inventing real-lab values.
- Activate the simplified Supervisor with the exact verified wizard path and record task/status evidence.
- Validate control-plane health, FQDN resolution, floating-IP reachability and API access.
- Create a disposable vSphere Namespace; assign permissions, quota, storage, VM class and content library/image.
- Log in with the vSphere kubectl plugin, use the namespace context and inventory available VM classes/images.
- Deploy and validate one disposable VM Service VM, then capture infrastructure and guest evidence.
- Treat load balancer, second NIC, three-node control plane, Supervisor Services and VKS as explicit growth gates.
- Provide failure triage, acceptance evidence and dependency-aware cleanup/rollback.

## Acceptance

- Strict content validation has zero errors and warnings; existing IDs remain stable.
- Official 59-item coverage remains 59/59 at target.
- Unit tests, typecheck, production build and browser smoke pass.
- Visual review covers the prepared-state warning, activation, namespace, CLI/VM Service and cleanup steps.
- Secret scan passes before automatic feature-branch publication.
- No infrastructure action, PR, merge or deployment occurs.

## Validation result

- Preserved `lab-enable-supervisor`, its route, linked lessons and persisted learner identity while replacing the four
  generic steps with ten evidence-gated UI/CLI steps.
- Removed invented `wld01`, `10.10.60.0/24`, datastore, policy, namespace and host values from both the guide and its
  original interactive topology; all environment inputs are mandatory discovery variables.
- Strict content validation: 72 lessons / 161,862 words, 683 questions, 25 guides, 10 incidents, 279 glossary terms,
  116 command/API entries, 24 Architecture Explorer components, 111 diagrams and 3 scenarios; zero errors/warnings.
- Exam mapping remains 674/674 objective-tagged questions mapped and 59/59 items at the internal target.
- Automated checks: 23/23 unit tests, TypeScript project build and Vite production build passed.
- Browser smoke: 15 main routes plus the guide and both companion lessons; no console errors.
- Visual review: prepared-state warning, generic discovery-variable topology, activation, namespace, CLI inventory,
  VM Service and cleanup sections passed at 1440 × 1000.
- No real-lab action, deployment, PR or merge was performed. The guide remains **PREPARED — NOT YET LAB-VALIDATED**.
