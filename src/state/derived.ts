/** Derived, memoized views over the learner state + content: mastery, readiness, recommendations. */
import { useMemo } from 'react';
import { useStore } from './store';
import { meta, orderedLessons, lessonsById, topicsById, labsById, incidentsById } from '../content';
import { computeTopicMastery, topConfusions, type TopicLinks, type TopicMastery } from '../engine/mastery';
import { computeReadiness, type Readiness } from '../engine/readiness';
import { dueItems } from '../engine/srs';
import type { DiagnosticArea, PersistedState } from './types';

const DOMAIN_AREA: Record<string, DiagnosticArea> = {
  foundations: 'virtualization', vsphere: 'vsphere', storage: 'storage', networking: 'networking', nsx: 'nsx',
  'vcf-architecture': 'vcf', deployment: 'vcf', 'workload-domains': 'vcf', lifecycle: 'vcf', operations: 'vcf',
  automation: 'vcf', security: 'vcf', troubleshooting: 'troubleshooting', design: 'vcf',
};

export const topicLinks: Map<string, TopicLinks> = new Map(meta.topics.map((t) => [t.id, {
  lessons: meta.lessons.filter((l) => l.topics.includes(t.id)).map((l) => l.id),
  labs: meta.labs.filter((l) => l.topics.includes(t.id)).map((l) => l.id),
  incidents: meta.incidents.filter((i) => i.topics.includes(t.id)).map((i) => i.id),
  diagnosticArea: t.id === 'esx-host' ? 'esxi' : t.id.startsWith('vcf-') ? 'vcf' : DOMAIN_AREA[t.domain],
}]));

export const questionTopics = new Map(meta.questionIndex.map((q) => [q.id, q.topics]));

/** Topics with any content behind them (lessons, questions, labs or incidents). */
export const activeTopics = meta.topics.filter((t) => {
  const l = topicLinks.get(t.id)!;
  return l.lessons.length || l.labs.length || l.incidents.length || meta.questionIndex.some((q) => q.topics.includes(t.id));
});

/** Exam weight of a topic = number of objective items of the objectives that list it. */
export const examTopicWeights = new Map<string, number>();
for (const o of meta.objectives) for (const t of o.topics) examTopicWeights.set(t, (examTopicWeights.get(t) ?? 0) + Math.max(1, o.items.length) / o.topics.length);

export function masteryAll(s: PersistedState, now = Date.now()): Map<string, TopicMastery> {
  const input = { now, attempts: s.attempts, lessons: s.lessons, labs: s.labs, incidents: s.incidents, review: s.review, questionTopics, diagnostic: s.profile.diagnostic };
  return new Map(activeTopics.map((t) => [t.id, computeTopicMastery(t.id, topicLinks.get(t.id)!, input)]));
}

export function useMastery(): Map<string, TopicMastery> {
  const attempts = useStore((s) => s.attempts);
  const lessons = useStore((s) => s.lessons);
  const labs = useStore((s) => s.labs);
  const incidents = useStore((s) => s.incidents);
  const review = useStore((s) => s.review);
  const profile = useStore((s) => s.profile);
  return useMemo(
    () => masteryAll({ attempts, lessons, labs, incidents, review, profile } as PersistedState),
    [attempts, lessons, labs, incidents, review, profile],
  );
}

export function useReadiness(): Readiness {
  const mastery = useMastery();
  const attempts = useStore((s) => s.attempts);
  const exams = useStore((s) => s.exams);
  const review = useStore((s) => s.review);
  const lessons = useStore((s) => s.lessons);
  const incidents = useStore((s) => s.incidents);
  return useMemo(() => {
    const solved = meta.incidents.filter((i) => (incidents[i.id] ?? []).some((r) => r.solved)).length;
    return computeReadiness({
      now: Date.now(),
      lessonsCompleted: orderedLessons.filter((l) => lessons[l.id]?.status === 'completed').length,
      lessonsTotal: orderedLessons.length,
      examTopics: [...examTopicWeights].filter(([t]) => mastery.has(t)).map(([t, weight]) => ({ mastery: mastery.get(t)!, weight })),
      attempts, exams, review,
      incidentsSolvedRatio: meta.incidents.length ? solved / meta.incidents.length : 0,
    });
  }, [mastery, attempts, exams, review, lessons, incidents]);
}

export function useDueCount(): number {
  const review = useStore((s) => s.review);
  return useMemo(() => dueItems(review, Date.now()).length, [review]);
}

export interface Recommendation { kind: 'continue' | 'review-topic' | 'confusion' | 'improved' | 'lab' | 'incident' | 'review-queue' | 'mock' | 'onboard'; text: string; url: string; cta: string }

export function nextLesson(s: Pick<PersistedState, 'lessons'>) {
  const inProgress = orderedLessons
    .filter((l) => s.lessons[l.id]?.status === 'in-progress')
    .sort((a, b) => (s.lessons[b.id]!.lastAt) - (s.lessons[a.id]!.lastAt))[0];
  return inProgress ?? orderedLessons.find((l) => s.lessons[l.id]?.status !== 'completed') ?? null;
}

export const topicTitle = (id: string) => topicsById.get(id)?.title ?? id;

export function useRecommendations(): Recommendation[] {
  const mastery = useMastery();
  const s = useStore();
  const due = useDueCount();
  return useMemo(() => {
    const out: Recommendation[] = [];
    const next = nextLesson(s);

    // 1. Weak topic in material already studied → review before continuing.
    const studiedWeak = [...mastery.values()]
      .filter((m) => m.coverage > 0 && m.attempts >= 3 && m.score < 45)
      .sort((a, b) => a.score - b.score)[0];
    if (studiedWeak) {
      const lesson = topicLinks.get(studiedWeak.topic)!.lessons.find((l) => s.lessons[l]?.status === 'completed');
      out.push({ kind: 'review-topic', text: `Recapitulează „${topicTitle(studiedWeak.topic)}” înainte să continui (stăpânire ${studiedWeak.score}%).`, url: lesson ? `/learn/${lesson}` : `/exam?topic=${studiedWeak.topic}`, cta: 'Recapitulează' });
    }
    if (next) out.push({ kind: 'continue', text: `${s.lessons[next.id] ? 'Continuă' : 'Următoarea lecție'}: ${next.title}`, url: `/learn/${next.id}`, cta: s.lessons[next.id] ? 'Continuă' : 'Începe' });
    if (due > 0) out.push({ kind: 'review-queue', text: `Ai ${due} întrebări de recapitulat azi.`, url: '/review/session', cta: 'Începe recapitularea' });

    // 2. Repeated confusions.
    const conf = topConfusions([...mastery.values()])[0];
    if (conf) out.push({ kind: 'confusion', text: `Confunzi în mod repetat „${topicTitle(conf.a)}” cu „${topicTitle(conf.b)}” (${conf.count} greșeli).`, url: `/exam?topics=${conf.a},${conf.b}`, cta: 'Exersează diferența' });

    // 3. Improvement over the last two weeks.
    const since = Date.now() - 14 * 86_400_000;
    let best: { topic: string; from: number; to: number } | null = null;
    for (const [topic, hist] of Object.entries(s.masteryHistory)) {
      const old = hist.find((h) => h.at >= since) ?? null;
      const cur = mastery.get(topic)?.score;
      if (old && cur != null && cur - old.v >= 8 && (!best || cur - old.v > best.to - best.from)) best = { topic, from: old.v, to: cur };
    }
    if (best) out.push({ kind: 'improved', text: `Scorul tău la „${topicTitle(best.topic)}” a crescut de la ${best.from}% la ${best.to}%.`, url: '/progress', cta: 'Vezi progresul' });

    // 4. Practical work linked to completed lessons.
    const doneLessons = new Set(Object.entries(s.lessons).filter(([, v]) => v.status === 'completed').map(([k]) => k));
    const lab = meta.labs.find((l) => s.labs[l.id]?.status !== 'completed' && l.lessons.some((x) => doneLessons.has(x)));
    if (lab) out.push({ kind: 'lab', text: `Ghid practic recomandat: ${lab.title}`, url: `/labs/${lab.id}`, cta: 'Deschide ghidul' });
    const inc = meta.incidents.find((i) => !(s.incidents[i.id] ?? []).some((r) => r.solved) && i.lessons.some((x) => doneLessons.has(x)));
    if (inc) out.push({ kind: 'incident', text: `Incident de investigat: ${inc.title}`, url: `/troubleshoot/${inc.id}`, cta: 'Investighează' });

    if (doneLessons.size >= Math.min(10, orderedLessons.length / 2) && !s.exams.some((e) => e.kind === 'mock'))
      out.push({ kind: 'mock', text: 'Ai acoperit destul material pentru primul examen simulat.', url: '/exam/mock', cta: 'Începe simularea' });
    return out;
  }, [mastery, s, due]);
}

export function lessonStatus(s: PersistedState, lessonId: string, mastery: Map<string, TopicMastery>) {
  const st = s.lessons[lessonId];
  if (!st) return 'not-started' as const;
  if (st.status === 'in-progress') return 'in-progress' as const;
  const topics = lessonsById.get(lessonId)?.topics ?? [];
  const ms = topics.map((t) => mastery.get(t)).filter(Boolean) as TopicMastery[];
  if (ms.some((m) => m.state === 'needs-review')) return 'needs-review' as const;
  if (ms.length && ms.every((m) => m.state === 'mastered')) return 'mastered' as const;
  return 'completed' as const;
}

export { labsById, incidentsById };
