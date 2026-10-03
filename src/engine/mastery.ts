/**
 * Topic mastery model.
 *
 * Mastery is not a raw percentage of correct answers. For each topic we combine:
 *  - knowledge: a recency- and difficulty-weighted accuracy with a Bayesian prior (so 1/1 correct is not "100%"),
 *  - evidence: how much weighted evidence we have (confidence),
 *  - coverage: share of the topic's lessons completed,
 *  - practice: labs completed and incidents solved for the topic,
 *  - retention: penalty when review items for the topic are overdue or keep lapsing,
 *  - misconceptions: repeated confusions with another topic.
 * The result is a 0–100 score plus a qualitative state used throughout the UI.
 */
import type { Attempt, LessonState, LabState, IncidentRun, ReviewItem, Difficulty, DiagnosticArea } from '../state/types';

export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { foundation: 0.6, intermediate: 1, advanced: 1.4, expert: 1.8 };
const MODE_WEIGHT: Record<Attempt['mode'], number> = { lesson: 0.9, quiz: 1, exam: 1.2, review: 1.1, diagnostic: 0.7 };
const HALF_LIFE_DAYS = 21;
const DAY = 86_400_000;

export type MasteryState = 'not-started' | 'in-progress' | 'completed' | 'mastered' | 'needs-review';

export interface TopicLinks { lessons: string[]; labs: string[]; incidents: string[]; diagnosticArea?: DiagnosticArea }

export interface MasteryInput {
  now: number;
  attempts: Attempt[];
  lessons: Record<string, LessonState>;
  labs: Record<string, LabState>;
  incidents: Record<string, IncidentRun[]>;
  review: Record<string, ReviewItem>;
  /** question id → topics, to attribute review items to topics */
  questionTopics: Map<string, string[]>;
  diagnostic?: Partial<Record<DiagnosticArea, number>>;
}

export interface TopicMastery {
  topic: string;
  score: number;
  knowledge: number;
  confidence: number;
  coverage: number;
  practice: number;
  attempts: number;
  recentAccuracy: number | null;
  hardAccuracy: number | null;
  dueReviews: number;
  lapses: number;
  confusions: Record<string, number>;
  lastActivity: number | null;
  state: MasteryState;
}

export function computeTopicMastery(topic: string, links: TopicLinks, input: MasteryInput): TopicMastery {
  const { now } = input;
  const relevant = input.attempts.filter((a) => a.topics.includes(topic));

  let wSum = 0;
  let wScore = 0;
  const confusions: Record<string, number> = {};
  for (const a of relevant) {
    const age = Math.max(0, (now - a.at) / DAY);
    const w = DIFFICULTY_WEIGHT[a.difficulty] * MODE_WEIGHT[a.mode] * Math.pow(0.5, age / HALF_LIFE_DAYS);
    wSum += w;
    wScore += w * a.score;
    for (const c of a.confusions ?? []) if (c !== topic) confusions[c] = (confusions[c] ?? 0) + 1;
  }
  // Prior: diagnostic result for the topic's area, otherwise a pessimistic 0.25.
  const prior = links.diagnosticArea && input.diagnostic?.[links.diagnosticArea] != null ? input.diagnostic[links.diagnosticArea]! / 100 : 0.25;
  const K = 2;
  const knowledge = (wScore + prior * K) / (wSum + K);
  const confidence = 1 - Math.exp(-wSum / 4);

  const recent = relevant.slice(-10);
  const recentAccuracy = recent.length ? recent.reduce((n, a) => n + a.score, 0) / recent.length : null;
  const hard = relevant.filter((a) => a.difficulty === 'advanced' || a.difficulty === 'expert');
  const hardAccuracy = hard.length ? hard.reduce((n, a) => n + a.score, 0) / hard.length : null;

  const doneLessons = links.lessons.filter((l) => input.lessons[l]?.status === 'completed').length;
  const startedLessons = links.lessons.filter((l) => input.lessons[l]).length;
  const coverage = links.lessons.length ? doneLessons / links.lessons.length : 0;

  const labsDone = links.labs.filter((l) => input.labs[l]?.status === 'completed').length;
  const incSolved = links.incidents.filter((i) => (input.incidents[i] ?? []).some((r) => r.solved)).length;
  const practiceTotal = links.labs.length + links.incidents.length;
  const practice = practiceTotal ? (labsDone + incSolved) / practiceTotal : coverage;

  let dueReviews = 0;
  let lapses = 0;
  for (const r of Object.values(input.review)) {
    if (!(input.questionTopics.get(r.qid) ?? []).includes(topic)) continue;
    if (r.due <= now) dueReviews++;
    lapses += r.lapses;
  }
  const retentionPenalty = Math.min(0.2, dueReviews * 0.03 + Math.max(0, lapses - 2) * 0.02);
  const confusionPenalty = Math.min(0.15, Object.values(confusions).filter((n) => n >= 2).reduce((n, c) => n + c * 0.025, 0));

  const raw = 0.6 * knowledge * (0.35 + 0.65 * confidence) + 0.25 * coverage + 0.15 * practice;
  const score = Math.round(100 * Math.max(0, Math.min(1, raw - retentionPenalty - confusionPenalty)));

  const lastActivity = Math.max(
    relevant.length ? relevant[relevant.length - 1].at : 0,
    ...links.lessons.map((l) => input.lessons[l]?.lastAt ?? 0),
  ) || null;

  let state: MasteryState = 'not-started';
  if (relevant.length || startedLessons) state = 'in-progress';
  if (links.lessons.length && doneLessons === links.lessons.length) state = 'completed';
  if (score >= 80 && confidence >= 0.6 && (hardAccuracy ?? 0) >= 0.7) state = 'mastered';
  const decayed = lastActivity != null && now - lastActivity > 30 * DAY && relevant.length > 0;
  if ((state !== 'not-started' && (dueReviews >= 3 || (recentAccuracy != null && recent.length >= 4 && recentAccuracy < 0.5))) || (state === 'mastered' && decayed)) state = 'needs-review';

  return { topic, score, knowledge, confidence, coverage, practice, attempts: relevant.length, recentAccuracy, hardAccuracy, dueReviews, lapses, confusions, lastActivity, state };
}

/** Pairs of topics the learner repeatedly confuses, strongest first. */
export function topConfusions(all: TopicMastery[], min = 2): { a: string; b: string; count: number }[] {
  const pairs = new Map<string, { a: string; b: string; count: number }>();
  for (const m of all) for (const [other, n] of Object.entries(m.confusions)) {
    const [a, b] = [m.topic, other].sort();
    const key = `${a}|${b}`;
    const p = pairs.get(key) ?? { a, b, count: 0 };
    p.count += n;
    pairs.set(key, p);
  }
  return [...pairs.values()].filter((p) => p.count >= min).sort((x, y) => y.count - x.count);
}
