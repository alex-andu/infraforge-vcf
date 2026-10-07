/**
 * Reads everything under /content, validates it against src/content/schema.ts and
 * checks cross-references. Used by the Vite content plugin and by `npm run content:check`.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import * as S from '../src/content/schema.ts';

export const CONTENT_DIR = path.resolve(import.meta.dirname, '..', 'content');

export interface Issue { level: 'error' | 'warn'; file: string; message: string }

export interface LessonDoc { meta: S.TLessonMeta; body: string; anchors: string[]; file: string; words: number }

export interface ContentBundle {
  curriculum: z.infer<typeof S.Curriculum>;
  topics: S.TTopic[];
  objectives: S.TExamObjective[];
  lessons: LessonDoc[];
  questions: S.TQuestion[];
  labs: S.TLab[];
  incidents: S.TIncident[];
  glossary: S.TGlossaryTerm[];
  commands: S.TCommand[];
  components: S.TArchComponent[];
  diagrams: S.TDiagram[];
  scenarios: S.TScenario[];
  homelab: S.THomeLab | null;
  badges: S.TBadge[];
  issues: Issue[];
  files: string[];
}

/** The standalone-theory template; headings must appear in this order. Practical guides live under /labs. */
export const LESSON_SECTIONS = [
  'Why This Matters', 'Learning Objectives', 'Concept', 'Architecture', 'Components', 'How It Works',
  'Deep Dive', 'Configuration', 'CLI / API', 'Failure Scenarios', 'Troubleshooting', 'Real-World Scenario',
  'Exam Focus', 'Common Exam Traps', 'Knowledge Check', 'Summary', 'Next Topic',
];

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[`*_]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function walk(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((x) => e.name.endsWith(x)) && !e.name.startsWith('_')) out.push(p);
  }
  return out.sort();
}

function rel(p: string) { return path.relative(CONTENT_DIR, p); }

export function loadContent(): ContentBundle {
  const issues: Issue[] = [];
  const files: string[] = [];
  const err = (file: string, message: string) => issues.push({ level: 'error', file: rel(file), message });
  const warn = (file: string, message: string) => issues.push({ level: 'warn', file: rel(file), message });

  function readYaml(file: string): unknown {
    files.push(file);
    try { return yaml.load(fs.readFileSync(file, 'utf8')); } catch (e) { err(file, `YAML parse error: ${(e as Error).message}`); return null; }
  }

  function parse<T extends z.ZodTypeAny>(schema: T, data: unknown, file: string): z.infer<T> | null {
    const r = schema.safeParse(data);
    if (r.success) return r.data;
    for (const i of r.error.issues.slice(0, 12)) err(file, `${i.path.join('.')}: ${i.message}`);
    return null;
  }

  /** Validate a list item by item so one bad entry does not discard a whole file. */
  function parseList<T extends z.ZodTypeAny>(schema: T, list: unknown, file: string, key: string): z.infer<T>[] {
    if (!Array.isArray(list)) { err(file, `expected top-level "${key}:" list`); return []; }
    const out: z.infer<T>[] = [];
    list.forEach((item, idx) => {
      const r = schema.safeParse(item);
      if (r.success) out.push(r.data);
      else for (const i of r.error.issues.slice(0, 8)) err(file, `${key}[${idx}]${(item as { id?: string })?.id ? ` (${(item as { id: string }).id})` : ''}.${i.path.join('.')}: ${i.message}`);
    });
    return out;
  }

  const dir = (p: string) => path.join(CONTENT_DIR, p);

  const curriculum = parse(S.Curriculum, readYaml(dir('curriculum.yaml')), dir('curriculum.yaml')) ?? { phases: [] };
  const topics = parseList(S.Topic, (readYaml(dir('topics.yaml')) as { topics?: unknown })?.topics, dir('topics.yaml'), 'topics');
  const objectives = parseList(S.ExamObjective, (readYaml(dir('objectives.yaml')) as { objectives?: unknown })?.objectives, dir('objectives.yaml'), 'objectives');

  // Lessons: markdown with YAML frontmatter.
  const lessons: LessonDoc[] = [];
  for (const file of walk(dir('lessons'), ['.md'])) {
    files.push(file);
    const raw = fs.readFileSync(file, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) { err(file, 'missing --- frontmatter ---'); continue; }
    let fm: unknown;
    try { fm = yaml.load(m[1]); } catch (e) { err(file, `frontmatter YAML: ${(e as Error).message}`); continue; }
    const meta = parse(S.LessonFrontmatter, fm, file);
    if (!meta) continue;
    const body = m[2];
    const headings = [...body.matchAll(/^## (.+)$/gm)].map((h) => h[1].replace(/\s*\{#[^}]+\}\s*$/, '').trim());
    const anchors = [...body.matchAll(/^#{2,3} (.+)$/gm)].map((h) => {
      const explicit = h[1].match(/\{#([^}]+)\}\s*$/);
      return explicit ? explicit[1] : slugify(h[1]);
    });
    let last = -1;
    for (const s of LESSON_SECTIONS) {
      const idx = headings.indexOf(s);
      if (idx === -1) err(file, `missing template section "## ${s}"`);
      else if (idx < last) warn(file, `section "## ${s}" is out of template order`);
      else last = idx;
    }
    const words = body.split(/\s+/).length;
    lessons.push({ meta, body, anchors, file: rel(file), words });
  }

  const loadLists = <T extends z.ZodTypeAny>(sub: string, key: string, schema: T): z.infer<T>[] =>
    walk(dir(sub), ['.yaml', '.yml']).flatMap((f) => parseList(schema, (readYaml(f) as Record<string, unknown>)?.[key], f, key));
  const loadSingles = <T extends z.ZodTypeAny>(sub: string, schema: T): z.infer<T>[] =>
    walk(dir(sub), ['.yaml', '.yml']).map((f) => parse(schema, readYaml(f), f)).filter(Boolean) as z.infer<T>[];

  const questions = loadLists('questions', 'questions', S.Question);
  const glossary = loadLists('glossary', 'terms', S.GlossaryTerm);
  const commands = loadLists('commands', 'commands', S.Command);
  const components = loadLists('architecture', 'components', S.ArchComponent);
  const badges = loadLists('badges', 'badges', S.Badge);
  const labs = loadSingles('labs', S.Lab);
  const incidents = loadSingles('incidents', S.Incident);
  const diagrams = loadSingles('diagrams', S.Diagram);
  const scenarios = loadSingles('scenarios', S.Scenario);
  const homelabFile = dir('homelab/homelab.yaml');
  const homelab = fs.existsSync(homelabFile) ? parse(S.HomeLab, readYaml(homelabFile), homelabFile) : null;

  // ---- uniqueness ---------------------------------------------------------
  const uniq = (kind: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    for (const x of list) { if (seen.has(x.id)) err(kind, `duplicate ${kind} id "${x.id}"`); seen.add(x.id); }
    return seen;
  };
  const topicIds = uniq('topic', topics);
  const lessonIds = uniq('lesson', lessons.map((l) => l.meta));
  uniq('question', questions);
  const labIds = uniq('lab', labs);
  const incidentIds = uniq('incident', incidents);
  const termIds = uniq('glossary', glossary);
  uniq('command', commands);
  const componentIds = uniq('component', components);
  const diagramIds = uniq('diagram', diagrams);
  uniq('scenario', scenarios);
  const objectiveIds = new Set(objectives.map((o) => o.id));
  const lessonAnchors = new Map(lessons.map((l) => [l.meta.id, new Set(l.anchors)]));

  // ---- cross references ---------------------------------------------------
  const phaseIds = new Set(curriculum.phases.map((p) => p.id));
  const listed = new Set<string>();
  for (const p of curriculum.phases) for (const m of p.modules) for (const l of m.lessons) {
    listed.add(l);
    if (!lessonIds.has(l)) warn('curriculum.yaml', `lesson "${l}" (${p.id}/${m.id}) has no file yet`);
  }
  const ref = (file: string, what: string, set: Set<string>, ids: string[] | undefined, level: 'error' | 'warn' = 'warn') => {
    for (const x of ids ?? []) if (!set.has(x)) issues.push({ level, file, message: `unknown ${what} "${x}"` });
  };

  for (const l of lessons) {
    const f = l.file;
    if (!listed.has(l.meta.id)) err(f, `lesson "${l.meta.id}" is not listed in curriculum.yaml`);
    if (!phaseIds.has(l.meta.phase)) err(f, `unknown phase "${l.meta.phase}"`);
    ref(f, 'topic', topicIds, l.meta.topics, 'error');
    ref(f, 'glossary term', termIds, l.meta.keyTerms);
    ref(f, 'lab', labIds, l.meta.labs);
    ref(f, 'incident', incidentIds, l.meta.incidents);
    ref(f, 'component', componentIds, l.meta.components);
    ref(f, 'lesson', lessonIds, l.meta.related);
    ref(f, 'exam objective', objectiveIds, l.meta.objectives, 'error');
    for (const d of l.body.matchAll(/::diagram\[([^\]]+)\]/g)) ref(f, 'diagram', diagramIds, [d[1]]);
    for (const d of l.body.matchAll(/::lab\[([^\]]+)\]/g)) ref(f, 'lab', labIds, [d[1]]);
    for (const d of l.body.matchAll(/\]\(lesson:([a-z0-9-]+)(?:#([a-z0-9-]+))?\)/g)) {
      if (!lessonIds.has(d[1])) warn(f, `link to unknown lesson "${d[1]}"`);
      else if (d[2] && !lessonAnchors.get(d[1])?.has(d[2])) warn(f, `link to unknown anchor "${d[1]}#${d[2]}"`);
    }
    for (const d of l.body.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)) ref(f, 'glossary term', termIds, [d[1]]);
    if (l.words < 1200) warn(f, `only ${l.words} words, lessons should be substantial`);
  }

  for (const q of questions) {
    const f = `question ${q.id}`;
    ref(f, 'topic', topicIds, q.topics, 'error');
    if (!lessonIds.has(q.lesson)) warn(f, `unknown lesson "${q.lesson}"`);
    else if (q.section && !lessonAnchors.get(q.lesson)?.has(q.section)) warn(f, `unknown section "${q.lesson}#${q.section}"`);
    if (q.objective && !objectiveIds.has(q.objective)) err(f, `unknown objective "${q.objective}"`);
    if (q.diagram) ref(f, 'diagram', diagramIds, [q.diagram]);
    if ('options' in q) {
      const n = q.options.filter((o) => o.correct).length;
      if (q.type === 'multi' ? n < 2 : n !== 1) err(f, `${q.type} question has ${n} correct options`);
      if (q.type === 'multi' && q.select && q.select !== n) err(f, `select=${q.select} but ${n} options are correct`);
      for (const o of q.options) if (o.confusedWith) ref(f, 'topic', topicIds, [o.confusedWith]);
    }
  }

  for (const lab of labs) {
    const f = `lab ${lab.id}`;
    ref(f, 'topic', topicIds, lab.topics, 'error');
    ref(f, 'lesson', lessonIds, lab.lessons);
    ref(f, 'diagram', diagramIds, Object.values(lab.topology).filter(Boolean) as string[]);
  }
  for (const inc of incidents) {
    const f = `incident ${inc.id}`;
    ref(f, 'topic', topicIds, inc.topics, 'error');
    ref(f, 'lesson', lessonIds, inc.lessons);
    const ev = new Set(inc.evidence.map((e) => e.id));
    for (const s of inc.idealSequence) if (!ev.has(s)) err(f, `idealSequence references unknown evidence "${s}"`);
    for (const k of ['rootCause', 'nextStep', 'remediation', 'validation'] as const)
      if (inc[k].filter((c) => c.correct).length !== 1) err(f, `${k} must have exactly one correct choice`);
  }
  for (const t of glossary) {
    const f = `glossary ${t.id}`;
    ref(f, 'glossary term', termIds, t.related);
    ref(f, 'lesson', lessonIds, t.lessons);
    ref(f, 'lab', labIds, t.labs);
  }
  for (const c of commands) if (c.lesson) ref(`command ${c.id}`, 'lesson', lessonIds, [c.lesson]);
  for (const c of components) {
    const f = `component ${c.id}`;
    ref(f, 'component', componentIds, [...c.dependsOn, ...c.communicatesWith.map((x) => x.id), ...(c.parent ? [c.parent] : [])]);
    ref(f, 'lesson', lessonIds, c.lessons);
    ref(f, 'lab', labIds, c.labs);
  }
  for (const d of diagrams) {
    const f = `diagram ${d.id}`;
    const ids = new Set([...d.nodes.map((n) => n.id), ...d.groups.map((g) => g.id)]);
    for (const e of d.edges) for (const x of [e.from, e.to]) if (!ids.has(x)) err(f, `edge references unknown node "${x}"`);
    for (const s of d.steps) for (const h of s.highlight) if (!ids.has(h)) err(f, `step highlights unknown node "${h}"`);
    for (const n of d.nodes) if (n.component) ref(f, 'component', componentIds, [n.component]);
  }
  for (const o of objectives) ref(`objective ${o.id}`, 'topic', topicIds, o.topics, 'error');
  for (const s of scenarios) { ref(`scenario ${s.id}`, 'topic', topicIds, s.topics, 'error'); ref(`scenario ${s.id}`, 'lesson', lessonIds, s.lessons); }

  return { curriculum, topics, objectives, lessons, questions, labs, incidents, glossary, commands, components, diagrams, scenarios, homelab, badges, issues, files };
}
