/** Runtime access to content. Metadata is eager; bodies and banks are loaded on demand. */
import {
  meta as rawMeta, lessonLoaders, labLoaders, incidentLoaders, scenarioLoaders, diagramLoaders,
  loadQuestions, loadHomelab, loadSearchDocs,
} from 'virtual:ifc/meta';
import type {
  TPhase, TTopic, TExamObjective, TLessonMeta, TQuestion, TLab, TIncident, TGlossaryTerm, TCommand,
  TArchComponent, TDiagram, TScenario, THomeLab, TBadge,
} from './schema';

export interface TocEntry { depth: number; title: string; id: string }
export type LessonMeta = TLessonMeta & { words: number; toc: TocEntry[] };
export type LabMeta = Pick<TLab, 'id' | 'title' | 'level' | 'complexity' | 'minutes' | 'version' | 'technologies' | 'topics' | 'lessons' | 'objectives'>;
export type IncidentMeta = Pick<TIncident, 'id' | 'title' | 'difficulty' | 'version' | 'topics' | 'lessons' | 'summary' | 'symptoms'>;
export type ScenarioMeta = Pick<TScenario, 'id' | 'title' | 'topics' | 'lessons' | 'brief'>;
export interface QuestionIndexEntry {
  id: string; lesson: string; topics: string[]; difficulty: TQuestion['difficulty']; objective: string | null;
  kind: TQuestion['kind']; type: TQuestion['type']; diagnostic: string | null;
}
export interface SearchDoc { id: string; group: string; title: string; context: string; text: string; url: string }

interface Meta {
  curriculum: { phases: TPhase[] };
  topics: TTopic[];
  objectives: TExamObjective[];
  lessons: LessonMeta[];
  glossary: TGlossaryTerm[];
  commands: TCommand[];
  components: TArchComponent[];
  badges: TBadge[];
  labs: LabMeta[];
  incidents: IncidentMeta[];
  scenarios: ScenarioMeta[];
  diagramIds: string[];
  questionIndex: QuestionIndexEntry[];
  hasHomelab: boolean;
}

export const meta = rawMeta as Meta;

const index = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

export const lessonsById = index(meta.lessons);
export const topicsById = index(meta.topics);
export const termsById = index(meta.glossary);
export const componentsById = index(meta.components);
export const labsById = index(meta.labs);
export const incidentsById = index(meta.incidents);
export const objectivesById = index(meta.objectives);

/** Lessons that exist, in curriculum order (phases/modules without content are dropped). */
export const phases = meta.curriculum.phases
  .map((p) => ({
    ...p,
    modules: p.modules
      .map((m) => ({ ...m, lessons: m.lessons.filter((l) => lessonsById.has(l)) }))
      .filter((m) => m.lessons.length > 0),
  }))
  .filter((p) => p.modules.length > 0);

export const orderedLessons: LessonMeta[] = phases.flatMap((p) => p.modules.flatMap((m) => m.lessons.map((l) => lessonsById.get(l)!)));

export function phaseOf(lessonId: string) {
  return phases.find((p) => p.modules.some((m) => m.lessons.includes(lessonId)));
}
export function moduleOf(lessonId: string) {
  for (const p of phases) for (const m of p.modules) if (m.lessons.includes(lessonId)) return m;
  return undefined;
}

export const questionsByLesson = new Map<string, QuestionIndexEntry[]>();
for (const q of meta.questionIndex) {
  const arr = questionsByLesson.get(q.lesson) ?? [];
  arr.push(q);
  questionsByLesson.set(q.lesson, arr);
}

// ---- lazy loaders -----------------------------------------------------------

const memo = new Map<string, Promise<unknown>>();
function once<T>(key: string, f: () => Promise<{ default: T }>): Promise<T> {
  if (!memo.has(key)) memo.set(key, f().then((m) => m.default));
  return memo.get(key) as Promise<T>;
}

export const getLessonBody = (id: string) => (lessonLoaders[id] ? once<string>(`l:${id}`, lessonLoaders[id]) : Promise.resolve(null));
export const getLab = (id: string) => (labLoaders[id] ? once<TLab>(`lab:${id}`, labLoaders[id]) : Promise.resolve(null));
export const getIncident = (id: string) => (incidentLoaders[id] ? once<TIncident>(`inc:${id}`, incidentLoaders[id]) : Promise.resolve(null));
export const getScenario = (id: string) => (scenarioLoaders[id] ? once<TScenario>(`scn:${id}`, scenarioLoaders[id]) : Promise.resolve(null));
export const getDiagram = (id: string) => (diagramLoaders[id] ? once<TDiagram>(`d:${id}`, diagramLoaders[id]) : Promise.resolve(null));
export const getHomelab = () => once<THomeLab | null>('homelab', loadHomelab);
export const getSearchDocs = () => once<SearchDoc[]>('search', loadSearchDocs);

let questionMap: Map<string, TQuestion> | null = null;
export async function getQuestions(): Promise<Map<string, TQuestion>> {
  if (questionMap) return questionMap;
  const list = await once<TQuestion[]>('questions', loadQuestions);
  questionMap = new Map(list.map((q) => [q.id, q]));
  return questionMap;
}

export type { TQuestion, TLab, TIncident, TDiagram, TScenario, THomeLab, TGlossaryTerm, TCommand, TArchComponent, TTopic, TBadge, TExamObjective };
