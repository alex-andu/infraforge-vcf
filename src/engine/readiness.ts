/**
 * Exam readiness. Deliberately multi-signal: one good quiz must not make you "ready".
 */
import type { Attempt, ExamResult, ReviewItem } from '../state/types';
import type { TopicMastery } from './mastery';

export interface ReadinessInput {
  now: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  /** Mastery of topics that map to exam objectives, weighted by how many objective items they cover. */
  examTopics: { mastery: TopicMastery; weight: number }[];
  attempts: Attempt[];
  exams: ExamResult[];
  review: Record<string, ReviewItem>;
  incidentsSolvedRatio: number;
}

export interface ReadinessSignal { key: string; label: string; value: number; weight: number }
export interface Readiness { score: number; signals: ReadinessSignal[]; weakTopics: string[]; strongTopics: string[]; enoughData: boolean }

const DAY = 86_400_000;

export function computeReadiness(i: ReadinessInput): Readiness {
  const totalW = i.examTopics.reduce((n, t) => n + t.weight, 0) || 1;
  const mastery = i.examTopics.reduce((n, t) => n + (t.mastery.score / 100) * t.weight, 0) / totalW;

  const recent = i.attempts.filter((a) => a.mode !== 'diagnostic').slice(-60);
  const recentAcc = recent.length ? recent.reduce((n, a) => n + a.score, 0) / recent.length : 0;
  const hard = recent.filter((a) => a.difficulty === 'advanced' || a.difficulty === 'expert');
  const hardAcc = hard.length ? hard.reduce((n, a) => n + a.score, 0) / hard.length : 0;

  const mocks = i.exams.filter((e) => e.kind === 'mock').slice(-3);
  const mockScore = mocks.length ? mocks.reduce((n, e) => n + e.pct, 0) / mocks.length : 0;

  const weak = i.examTopics.filter((t) => t.mastery.score < 50).map((t) => t.mastery.topic);
  const weakRatio = i.examTopics.length ? 1 - weak.length / i.examTopics.length : 0;

  const reviewed = Object.values(i.review).filter((r) => r.reviews > 0);
  const retention = reviewed.length ? reviewed.reduce((n, r) => n + Math.min(1, r.box / 4), 0) / reviewed.length : (recent.length ? recentAcc : 0);

  const scenarioAttempts = i.attempts.slice(-200).filter((a) => a.mode !== 'diagnostic' && ['scenario', 'troubleshooting', 'log', 'design'].includes(a.kind ?? ''));
  const scenarioScore = 0.5 * i.incidentsSolvedRatio + 0.5 * (scenarioAttempts.length ? scenarioAttempts.reduce((n, a) => n + a.score, 0) / scenarioAttempts.length : 0);

  const signals: ReadinessSignal[] = [
    { key: 'curriculum', label: 'Curriculum parcurs', value: i.lessonsTotal ? i.lessonsCompleted / i.lessonsTotal : 0, weight: 0.15 },
    { key: 'mastery', label: 'Stăpânirea topicurilor de examen', value: mastery, weight: 0.3 },
    { key: 'recent', label: 'Acuratețe recentă', value: recentAcc, weight: 0.12 },
    { key: 'hard', label: 'Întrebări dificile', value: hardAcc, weight: 0.1 },
    { key: 'mock', label: 'Examene simulate', value: mockScore, weight: 0.15 },
    { key: 'weak', label: 'Topicuri slabe rămase', value: weakRatio, weight: 0.06 },
    { key: 'retention', label: 'Retenție (spaced repetition)', value: retention, weight: 0.06 },
    { key: 'scenario', label: 'Scenarii și troubleshooting', value: scenarioScore, weight: 0.06 },
  ];
  // Without a mock exam the score is capped: you have not been tested under exam conditions.
  let score = signals.reduce((n, s) => n + s.value * s.weight, 0);
  if (!mocks.length) score = Math.min(score, 0.6);
  const lastMock = mocks[mocks.length - 1];
  if (lastMock && i.now - lastMock.at > 21 * DAY) score *= 0.95;

  const sorted = [...i.examTopics].filter((t) => t.mastery.attempts > 0 || t.mastery.coverage > 0).sort((a, b) => b.mastery.score - a.mastery.score);
  return {
    score: Math.round(score * 100),
    signals,
    weakTopics: weak,
    strongTopics: sorted.filter((t) => t.mastery.score >= 70).slice(0, 5).map((t) => t.mastery.topic),
    enoughData: recent.length >= 20,
  };
}

/**
 * Broadcom reports a scaled score (pass = 300) and does not publish the raw cut score.
 * For practice we use a 70% raw threshold mapped onto a 100–500 scale. This is an estimate.
 */
export function estimateScaled(pct: number): number {
  const p = Math.max(0, Math.min(1, pct));
  return Math.round(p < 0.7 ? 100 + 200 * (p / 0.7) : 300 + 200 * ((p - 0.7) / 0.3));
}
export const PASS_PCT = 0.7;
