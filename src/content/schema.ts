/**
 * InfraForge content model.
 *
 * Every piece of learning content lives under /content as YAML or Markdown and is
 * validated against these schemas both at build time (scripts/check-content.ts)
 * and when loaded by the app. The UI never hardcodes lessons, questions or labs.
 */
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are kebab-case');
const md = z.string().min(1);

/** Which generation of VMware behaviour a piece of content describes. */
export const VersionTag = z.enum(['vcf9', 'legacy', 'general']);

export const Source = z.object({
  title: z.string(),
  url: z.string().url(),
});

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export const Module = z.object({
  id,
  title: z.string(),
  summary: z.string(),
  lessons: z.array(id).min(1),
});

export const Phase = z.object({
  id,
  number: z.number().int().min(0),
  title: z.string(),
  summary: z.string(),
  modules: z.array(Module).min(1),
});

export const Curriculum = z.object({ phases: z.array(Phase) });

/** A topic is the unit of mastery tracking (finer than a lesson). */
export const Topic = z.object({
  id,
  title: z.string(),
  domain: z.enum([
    'foundations', 'vsphere', 'storage', 'networking', 'nsx', 'vcf-architecture',
    'deployment', 'workload-domains', 'lifecycle', 'operations', 'automation',
    'security', 'troubleshooting', 'design',
  ]),
  description: z.string(),
});

export const ExamObjective = z.object({
  id: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  section: z.string(),
  title: z.string(),
  items: z.array(z.string()).default([]),
  topics: z.array(id).default([]),
});

export const LessonFrontmatter = z.object({
  id,
  title: z.string(),
  phase: id,
  module: id,
  version: VersionTag,
  minutes: z.number().int().positive(),
  difficulty: z.enum(['foundation', 'intermediate', 'advanced', 'expert']),
  summary: z.string(),
  topics: z.array(id).min(1),
  objectives: z.array(z.string()).default([]),
  keyTerms: z.array(id).default([]),
  labs: z.array(id).default([]),
  incidents: z.array(id).default([]),
  components: z.array(id).default([]),
  related: z.array(id).default([]),
  sources: z.array(Source).min(1),
});

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const Difficulty = z.enum(['foundation', 'intermediate', 'advanced', 'expert']);

const Option = z.object({
  id: z.string(),
  text: md,
  correct: z.boolean().default(false),
  /** Why this option is right or wrong. Required for every option. */
  why: md,
  /** Topic the learner probably confused when choosing this distractor. */
  confusedWith: id.optional(),
});

const QuestionBase = z.object({
  id,
  kind: z.enum(['concept', 'scenario', 'architecture', 'command', 'log', 'troubleshooting', 'design']),
  difficulty: Difficulty,
  version: VersionTag.default('vcf9'),
  topics: z.array(id).min(1),
  objective: z.string().optional(),
  lesson: id,
  section: z.string().optional(),
  /** Optional extra context shown above the stem: a scenario, a log excerpt, command output. */
  context: z.string().optional(),
  /** Optional interactive diagram shown with the question (architecture identification). */
  diagram: id.optional(),
  stem: md,
  explanation: z.object({
    correct: md,
    concept: z.string(),
    architecture: z.string().optional(),
    trap: z.string().optional(),
  }),
  diagnostic: z.enum(['virtualization', 'esxi', 'vsphere', 'networking', 'storage', 'nsx', 'vcf', 'troubleshooting']).optional(),
  sources: z.array(Source).default([]),
});

export const Question = z.discriminatedUnion('type', [
  QuestionBase.extend({ type: z.literal('single'), options: z.array(Option).min(2) }),
  QuestionBase.extend({ type: z.literal('multi'), options: z.array(Option).min(3), select: z.number().int().min(2).optional() }),
  QuestionBase.extend({ type: z.literal('truefalse'), options: z.array(Option).length(2) }),
  /** Items are written in the correct order; the UI shuffles them. */
  QuestionBase.extend({ type: z.literal('ordering'), items: z.array(z.object({ id: z.string(), text: md })).min(3) }),
  QuestionBase.extend({ type: z.literal('matching'), pairs: z.array(z.object({ id: z.string(), left: md, right: md })).min(3) }),
  /** Free-text command answer. `answers` are accepted forms, compared after whitespace normalisation. */
  QuestionBase.extend({ type: z.literal('cli'), answers: z.array(z.string()).min(1), placeholder: z.string().optional() }),
]);
export const QuestionFile = z.object({ questions: z.array(Question) });

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

export const LabStep = z.object({
  id,
  title: z.string(),
  why: z.string(),
  instructions: md,
  hint: z.string().optional(),
  validate: md,
  expected: md,
});

export const Topology = z.object({
  /** One interactive diagram id per view. */
  logical: id.optional(),
  physical: id.optional(),
  network: id.optional(),
  component: id.optional(),
});

export const Lab = z.object({
  id,
  title: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'challenge']),
  complexity: z.number().int().min(1).max(5),
  minutes: z.number().int().positive(),
  version: VersionTag,
  technologies: z.array(z.string()),
  topics: z.array(id).min(1),
  lessons: z.array(id).default([]),
  objectives: z.array(z.string()).min(1),
  prerequisites: z.array(z.string()),
  topology: Topology.default({}),
  requirements: z.object({
    network: z.array(z.string()),
    vms: z.array(z.string()),
    ip: z.array(z.string()),
  }),
  startingState: md,
  steps: z.array(LabStep).min(2),
  troubleshooting: z.array(z.object({ symptom: z.string(), fix: md })).min(1),
  challenge: md,
  cleanup: md,
  sources: z.array(Source).default([]),
});

// ---------------------------------------------------------------------------
// Troubleshooting incidents
// ---------------------------------------------------------------------------

export const EvidenceCategory = z.enum(['logs', 'network', 'dns', 'ntp', 'services', 'certificates', 'hosts', 'storage', 'nsx']);

const Choice = z.object({ id: z.string(), text: md, correct: z.boolean().default(false), why: md });

export const Incident = z.object({
  id,
  title: z.string(),
  difficulty: Difficulty,
  version: VersionTag,
  topics: z.array(id).min(1),
  lessons: z.array(id).default([]),
  summary: z.string(),
  symptoms: z.array(z.string()).min(2),
  environment: md,
  evidence: z.array(z.object({
    id,
    category: EvidenceCategory,
    action: z.string(),
    output: md,
    /** key = needed to prove the root cause, useful = narrows scope, noise = a red herring. */
    relevance: z.enum(['key', 'useful', 'noise']),
    note: z.string(),
  })).min(4),
  /** Ideal diagnostic order of the key/useful evidence ids. */
  idealSequence: z.array(id).min(2),
  rootCause: z.array(Choice).min(3),
  nextStep: z.array(Choice).min(2),
  remediation: z.array(Choice).min(3),
  validation: z.array(Choice).min(2),
  hints: z.array(z.string()).min(2),
  debrief: md,
  sources: z.array(Source).default([]),
});

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const GlossaryTerm = z.object({
  id,
  term: z.string(),
  expansion: z.string().optional(),
  definition: md,
  whyItMatters: md,
  version: VersionTag.default('general'),
  related: z.array(id).default([]),
  lessons: z.array(id).default([]),
  labs: z.array(id).default([]),
});
export const GlossaryFile = z.object({ terms: z.array(GlossaryTerm) });

export const Command = z.object({
  id,
  technology: z.enum(['esxi', 'vsphere', 'vsan', 'nsx', 'vcf', 'powercli', 'api', 'network', 'linux']),
  title: z.string(),
  purpose: z.string(),
  syntax: z.string(),
  example: z.string(),
  output: z.string(),
  mistake: z.string(),
  lesson: id.optional(),
  version: VersionTag.default('general'),
  source: Source.optional(),
});
export const CommandFile = z.object({ commands: z.array(Command) });

export const ArchComponent = z.object({
  id,
  name: z.string(),
  category: z.enum(['fleet', 'management', 'compute', 'storage', 'network', 'security', 'operations', 'automation', 'external']),
  version: VersionTag.default('vcf9'),
  parent: id.optional(),
  summary: z.string(),
  function: md,
  runsOn: z.string(),
  managedBy: z.string(),
  dependsOn: z.array(id).default([]),
  communicatesWith: z.array(z.object({ id, purpose: z.string(), protocol: z.string().optional() })).default([]),
  failureImpact: md,
  verify: md,
  lessons: z.array(id).default([]),
  labs: z.array(id).default([]),
});
export const ArchitectureFile = z.object({ components: z.array(ArchComponent) });

export const Diagram = z.object({
  id,
  title: z.string(),
  /** Text alternative for screen readers and for the "describe" toggle. */
  description: md,
  width: z.number().default(1000),
  height: z.number().default(600),
  groups: z.array(z.object({
    id, x: z.number(), y: z.number(), w: z.number(), h: z.number(), label: z.string(),
    kind: z.string().default('zone'),
  })).default([]),
  nodes: z.array(z.object({
    id, x: z.number(), y: z.number(), w: z.number().default(140), h: z.number().default(56),
    label: z.string(), sublabel: z.string().optional(),
    kind: z.enum(['mgmt', 'compute', 'storage', 'network', 'nsx', 'ops', 'security', 'external', 'vm']).default('compute'),
    info: z.string(),
    component: id.optional(),
  })).min(1),
  edges: z.array(z.object({
    from: id, to: id, label: z.string().optional(),
    kind: z.enum(['mgmt', 'data', 'overlay', 'control', 'storage', 'north-south', 'dependency']).default('mgmt'),
    dashed: z.boolean().default(false),
    bidirectional: z.boolean().default(false),
  })).default([]),
  steps: z.array(z.object({ title: z.string(), text: z.string(), highlight: z.array(z.string()) })).default([]),
});

export const Scenario = z.object({
  id,
  title: z.string(),
  topics: z.array(id).min(1),
  lessons: z.array(id).default([]),
  brief: md,
  requirements: z.array(z.string()),
  constraints: z.array(z.string()),
  existing: md,
  decisions: z.array(z.object({
    id,
    question: z.string(),
    options: z.array(Choice).min(2),
  })).min(2),
  recommended: md,
});

export const HomeLabProfile = z.object({
  id,
  name: z.string(),
  purpose: z.string(),
  cpu: z.string(), ram: z.string(), disk: z.string(), nics: z.string(),
  storageLayout: md, nested: md, network: md,
  vms: z.array(z.object({ name: z.string(), role: z.string(), vcpu: z.number(), ramGb: z.number(), diskGb: z.number(), notes: z.string().optional() })),
  limitations: z.array(z.string()),
});

export const HomeLab = z.object({
  intro: md,
  platforms: z.array(z.object({ id, name: z.string(), verdict: z.string(), notes: md })),
  profiles: z.array(HomeLabProfile).min(3),
  yourLab: md,
  ipPlan: z.array(z.object({ hostname: z.string(), fqdn: z.string(), ip: z.string(), vlan: z.string(), role: z.string() })),
  vlanPlan: z.array(z.object({ vlan: z.number(), name: z.string(), subnet: z.string(), gateway: z.string(), mtu: z.number(), purpose: z.string() })),
  dnsPlan: md,
  naming: md,
  sections: z.array(z.object({ id, title: z.string(), body: md })),
  dependencyChecklist: z.array(z.object({ id, item: z.string(), how: z.string() })),
  readinessChecklist: z.array(z.object({ id, item: z.string(), how: z.string() })),
  sources: z.array(Source),
});

export const Badge = z.object({
  id,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  rule: z.object({
    metric: z.enum(['lessons', 'correct', 'labs', 'incidents', 'streak', 'mock-pass', 'mastered-topics', 'perfect-incident', 'reviews', 'xp']),
    gte: z.number(),
  }),
});

export type TPhase = z.infer<typeof Phase>;
export type TModule = z.infer<typeof Module>;
export type TTopic = z.infer<typeof Topic>;
export type TExamObjective = z.infer<typeof ExamObjective>;
export type TLessonMeta = z.infer<typeof LessonFrontmatter>;
export type TQuestion = z.infer<typeof Question>;
export type TLab = z.infer<typeof Lab>;
export type TIncident = z.infer<typeof Incident>;
export type TGlossaryTerm = z.infer<typeof GlossaryTerm>;
export type TCommand = z.infer<typeof Command>;
export type TArchComponent = z.infer<typeof ArchComponent>;
export type TDiagram = z.infer<typeof Diagram>;
export type TScenario = z.infer<typeof Scenario>;
export type THomeLab = z.infer<typeof HomeLab>;
export type TBadge = z.infer<typeof Badge>;
export type TSource = z.infer<typeof Source>;
