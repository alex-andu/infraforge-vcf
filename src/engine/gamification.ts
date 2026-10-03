/** XP, levels, streaks and badge evaluation. XP is awarded only for real learning actions. */
import type { PersistedState, Difficulty } from '../state/types';
import type { TBadge } from '../content/schema';

export const XP = {
  lessonComplete: 50,
  answer: { foundation: 4, intermediate: 6, advanced: 9, expert: 12 } as Record<Difficulty, number>,
  reviewCorrect: 5,
  labStep: 10,
  labComplete: 100,
  incidentMax: 150,
  mockExam: 120,
  scenario: 60,
};

export const LEVELS = [
  { min: 0, title: 'Novice' },
  { min: 300, title: 'Operator' },
  { min: 900, title: 'Administrator' },
  { min: 2000, title: 'Engineer' },
  { min: 3800, title: 'Senior Engineer' },
  { min: 6500, title: 'Architect' },
  { min: 10000, title: 'VCF Master' },
];

export function levelFor(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  return { level: idx + 1, title: cur.title, xp, floor: cur.min, next: next?.min ?? null, progress: next ? (xp - cur.min) / (next.min - cur.min) : 1 };
}

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Consecutive days with activity, ending today (or yesterday, so the streak survives until tonight). */
export function streak(activity: Record<string, number>, now: number): number {
  const DAY = 86_400_000;
  let n = 0;
  let t = now;
  if (!activity[dayKey(t)]) t -= DAY;
  while (activity[dayKey(t)]) { n++; t -= DAY; }
  return n;
}

export function badgeMetric(s: PersistedState, metric: TBadge['rule']['metric'], masteredTopics: number, now: number): number {
  switch (metric) {
    case 'lessons': return Object.values(s.lessons).filter((l) => l.status === 'completed').length;
    case 'correct': return s.attempts.filter((a) => a.score >= 1).length;
    case 'labs': return Object.values(s.labs).filter((l) => l.status === 'completed').length;
    case 'incidents': return Object.values(s.incidents).filter((runs) => runs.some((r) => r.solved)).length;
    case 'perfect-incident': return Object.values(s.incidents).filter((runs) => runs.some((r) => r.solved && r.score >= 90 && r.hints === 0)).length;
    case 'streak': return streak(s.activity, now);
    case 'mock-pass': return s.exams.filter((e) => e.kind === 'mock' && e.passed).length;
    case 'mastered-topics': return masteredTopics;
    case 'reviews': return Object.values(s.review).reduce((n, r) => n + r.reviews, 0);
    case 'xp': return s.xp;
  }
}

export function newlyEarned(s: PersistedState, badges: TBadge[], masteredTopics: number, now: number): TBadge[] {
  return badges.filter((b) => !s.badges[b.id] && badgeMetric(s, b.rule.metric, masteredTopics, now) >= b.rule.gte);
}
