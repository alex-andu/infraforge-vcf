/** Question selection for quizzes and mock exams. */
import type { QuestionIndexEntry } from '../content';

export const MOCK = { questions: 60, minutes: 135 };

export type Rng = () => number;
export const mathRng: Rng = Math.random;

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Prefer questions the learner has not seen, then ones answered wrongly, then the rest.
 * `seen` maps question id → last score.
 */
function prioritized(pool: QuestionIndexEntry[], seen: Map<string, number>, rng: Rng): QuestionIndexEntry[] {
  const fresh = shuffle(pool.filter((q) => !seen.has(q.id)), rng);
  const missed = shuffle(pool.filter((q) => seen.has(q.id) && seen.get(q.id)! < 1), rng);
  const rest = shuffle(pool.filter((q) => seen.get(q.id) === 1), rng);
  return [...fresh, ...missed, ...rest];
}

/**
 * Mock exam: questions distributed over exam objectives proportionally to the number of
 * items each objective lists in the official exam guide.
 */
export function buildMockExam(index: QuestionIndexEntry[], objectiveWeights: Record<string, number>, seen: Map<string, number>, rng: Rng, total = MOCK.questions): string[] {
  const eligible = index.filter((q) => q.objective);
  const objectives = Object.keys(objectiveWeights).filter((o) => eligible.some((q) => q.objective === o));
  const wSum = objectives.reduce((n, o) => n + objectiveWeights[o], 0) || 1;
  const picked: string[] = [];
  const quota = objectives.map((o) => ({ o, n: Math.round((objectiveWeights[o] / wSum) * total) }));
  for (const { o, n } of quota) {
    const pool = prioritized(eligible.filter((q) => q.objective === o), seen, rng);
    picked.push(...pool.slice(0, n).map((q) => q.id));
  }
  // Fill (or trim) to the exact total from whatever is left.
  if (picked.length < total) {
    const rest = prioritized(index.filter((q) => !picked.includes(q.id)), seen, rng);
    picked.push(...rest.slice(0, total - picked.length).map((q) => q.id));
  }
  return shuffle(picked.slice(0, total), rng);
}

export function buildTopicQuiz(index: QuestionIndexEntry[], topics: string[], n: number, seen: Map<string, number>, rng: Rng): string[] {
  const pool = index.filter((q) => q.topics.some((t) => topics.includes(t)));
  return prioritized(pool, seen, rng).slice(0, n).map((q) => q.id);
}

export function buildMixedQuiz(index: QuestionIndexEntry[], n: number, seen: Map<string, number>, rng: Rng, difficulties?: string[]): string[] {
  const pool = difficulties?.length ? index.filter((q) => difficulties.includes(q.difficulty)) : index;
  return prioritized(pool, seen, rng).slice(0, n).map((q) => q.id);
}

/** Weak-topic exam: questions from the weakest topics, missed questions first. */
export function buildWeakQuiz(index: QuestionIndexEntry[], weakTopics: string[], n: number, seen: Map<string, number>, rng: Rng): string[] {
  const pool = index.filter((q) => q.topics.some((t) => weakTopics.includes(t)));
  const missed = shuffle(pool.filter((q) => seen.has(q.id) && seen.get(q.id)! < 1), rng);
  const others = prioritized(pool.filter((q) => !missed.includes(q)), seen, rng);
  return [...missed, ...others].slice(0, n).map((q) => q.id);
}

/** Diagnostic: up to `perArea` foundation questions per diagnostic area. */
export function buildDiagnostic(index: QuestionIndexEntry[], perArea: number, rng: Rng): string[] {
  const areas = [...new Set(index.map((q) => q.diagnostic).filter(Boolean))] as string[];
  return areas.flatMap((a) => shuffle(index.filter((q) => q.diagnostic === a), rng).slice(0, perArea).map((q) => q.id));
}
