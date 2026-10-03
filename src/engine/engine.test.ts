import { describe, it, expect } from 'vitest';
import { grade, seededShuffle, isAnswered } from './grading';
import { computeTopicMastery, topConfusions } from './mastery';
import { addToReview, applyResult, dueItems, RETIRED_BOX } from './srs';
import { computeReadiness, estimateScaled } from './readiness';
import { buildMockExam, buildDiagnostic } from './exam';
import { buildPlan } from './plan';
import { levelFor, streak, dayKey } from './gamification';
import { scoreIncident, lcs } from './incident';
import type { TQuestion, TIncident } from '../content/schema';
import type { Attempt } from '../state/types';

const base = { kind: 'concept', difficulty: 'intermediate', version: 'vcf9', topics: ['t1'], lesson: 'l1', stem: 's', explanation: { correct: 'c', concept: 'x' }, sources: [] };
const opt = (id: string, correct = false, confusedWith?: string) => ({ id, text: id, correct, why: 'w', confusedWith });

describe('grading', () => {
  const single = { ...base, id: 'q1', type: 'single', options: [opt('a', true), opt('b', false, 't2'), opt('c')] } as unknown as TQuestion;
  const multi = { ...base, id: 'q2', type: 'multi', options: [opt('a', true), opt('b', true), opt('c'), opt('d')] } as unknown as TQuestion;
  const ordering = { ...base, id: 'q3', type: 'ordering', items: [{ id: '1', text: '1' }, { id: '2', text: '2' }, { id: '3', text: '3' }, { id: '4', text: '4' }] } as unknown as TQuestion;
  const matching = { ...base, id: 'q4', type: 'matching', pairs: [{ id: 'x', left: 'l', right: 'r' }, { id: 'y', left: 'l2', right: 'r2' }, { id: 'z', left: 'l3', right: 'r3' }] } as unknown as TQuestion;
  const cli = { ...base, id: 'q5', type: 'cli', answers: ['esxcli network ip interface list'] } as unknown as TQuestion;

  it('grades single answers and records confusions', () => {
    expect(grade(single, 'a')).toMatchObject({ correct: true, partial: 1 });
    expect(grade(single, 'b')).toMatchObject({ correct: false, confusions: ['t2'], wrongPicks: ['b'] });
  });
  it('requires every correct option for multi, with partial credit', () => {
    expect(grade(multi, ['a', 'b']).correct).toBe(true);
    expect(grade(multi, ['a']).partial).toBe(0.5);
    expect(grade(multi, ['a', 'b', 'c'])).toMatchObject({ correct: false, partial: 0.5 });
  });
  it('gives partial credit for nearly-correct ordering', () => {
    expect(grade(ordering, ['1', '2', '3', '4']).correct).toBe(true);
    const g = grade(ordering, ['1', '2', '4', '3']);
    expect(g.correct).toBe(false);
    expect(g.partial).toBeGreaterThan(0.5);
  });
  it('grades matching and cli with whitespace normalisation', () => {
    expect(grade(matching, { x: 'x', y: 'y', z: 'z' }).correct).toBe(true);
    expect(grade(matching, { x: 'y', y: 'x', z: 'z' }).partial).toBeCloseTo(1 / 3);
    expect(grade(cli, '  esxcli  network ip   interface list ').correct).toBe(true);
    expect(grade(cli, 'esxcli network ip interface').correct).toBe(false);
  });
  it('treats incomplete answers as unanswered', () => {
    expect(isAnswered(matching, { x: 'x' })).toBe(false);
    expect(isAnswered(cli, '   ')).toBe(false);
  });
  it('shuffles deterministically', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 'a')).toEqual(seededShuffle([1, 2, 3, 4, 5], 'a'));
    expect(seededShuffle([1, 2, 3, 4, 5], 'a').sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

const now = Date.UTC(2026, 9, 3, 12);
const att = (score: number, difficulty: Attempt['difficulty'] = 'intermediate', daysAgo = 0, confusions?: string[]): Attempt =>
  ({ qid: `q${Math.random()}`, at: now - daysAgo * 86_400_000, score, difficulty, topics: ['t1'], mode: 'quiz', confusions });
const links = { lessons: ['l1', 'l2'], labs: ['lab1'], incidents: [] };
const input = (attempts: Attempt[], extra = {}) => ({ now, attempts, lessons: {}, labs: {}, incidents: {}, review: {}, questionTopics: new Map(), ...extra });

describe('mastery', () => {
  it('is low with no evidence and does not jump to 100 after one correct answer', () => {
    expect(computeTopicMastery('t1', links, input([])).score).toBeLessThan(15);
    const one = computeTopicMastery('t1', links, input([att(1)]));
    expect(one.score).toBeLessThan(40);
    expect(one.state).toBe('in-progress');
  });
  it('rewards sustained, hard, recent performance plus lessons and labs', () => {
    const attempts = Array.from({ length: 20 }, () => att(1, 'advanced'));
    const lessons = { l1: { status: 'completed', firstAt: now, lastAt: now, seen: [] }, l2: { status: 'completed', firstAt: now, lastAt: now, seen: [] } };
    const labs = { lab1: { status: 'completed', done: [], startedAt: now } };
    const m = computeTopicMastery('t1', links, input(attempts, { lessons, labs }));
    expect(m.score).toBeGreaterThanOrEqual(80);
    expect(m.state).toBe('mastered');
  });
  it('weights old attempts less than recent ones', () => {
    const recentGood = computeTopicMastery('t1', links, input([...Array(8).fill(0).map(() => att(0, 'intermediate', 60)), ...Array(8).fill(0).map(() => att(1))]));
    const recentBad = computeTopicMastery('t1', links, input([...Array(8).fill(0).map(() => att(1, 'intermediate', 60)), ...Array(8).fill(0).map(() => att(0))]));
    expect(recentGood.score).toBeGreaterThan(recentBad.score);
  });
  it('flags needs-review on poor recent accuracy and tracks confusions', () => {
    const m = computeTopicMastery('t1', links, input([att(1), att(0, 'intermediate', 0, ['t2']), att(0, 'intermediate', 0, ['t2']), att(0), att(0)]));
    expect(m.state).toBe('needs-review');
    expect(topConfusions([m])).toEqual([{ a: 't1', b: 't2', count: 2 }]);
  });
  it('uses the diagnostic result as a prior', () => {
    const withDiag = computeTopicMastery('t1', { ...links, diagnosticArea: 'nsx' }, input([], { diagnostic: { nsx: 90 } }));
    const without = computeTopicMastery('t1', links, input([]));
    expect(withDiag.knowledge).toBeGreaterThan(without.knowledge);
  });
});

describe('spaced repetition', () => {
  it('adds wrong answers, promotes on correct review, demotes on lapse', () => {
    let items = applyResult({}, 'q', 0, now, false);
    expect(items.q.box).toBe(1);
    expect(dueItems(items, now)).toHaveLength(0);
    const tomorrow = now + 2 * 86_400_000;
    expect(dueItems(items, tomorrow)).toHaveLength(1);
    items = applyResult(items, 'q', 1, tomorrow, true);
    expect(items.q.box).toBe(2);
    items = applyResult(items, 'q', 0, tomorrow, true);
    expect(items.q).toMatchObject({ box: 1, lapses: 1 });
  });
  it('ignores early correct answers outside review sessions and retires mastered items', () => {
    let items = addToReview({}, 'q', now);
    expect(applyResult(items, 'q', 1, now, false)).toBe(items);
    for (let i = 0; i < 10; i++) items = applyResult(items, 'q', 1, now + i * 100 * 86_400_000, true);
    expect(items.q.box).toBe(RETIRED_BOX);
    expect(dueItems(items, now + 10_000 * 86_400_000)).toHaveLength(0);
  });
});

describe('readiness', () => {
  it('caps readiness without a mock exam and maps scaled scores', () => {
    const mastery = computeTopicMastery('t1', links, input(Array.from({ length: 30 }, () => att(1, 'expert'))));
    const r = computeReadiness({ now, lessonsCompleted: 10, lessonsTotal: 10, examTopics: [{ mastery, weight: 1 }], attempts: Array.from({ length: 30 }, () => att(1, 'expert')), exams: [], review: {}, incidentsSolvedRatio: 1 });
    expect(r.score).toBeLessThanOrEqual(60);
    expect(estimateScaled(0.7)).toBe(300);
    expect(estimateScaled(1)).toBe(500);
    expect(estimateScaled(0)).toBe(100);
  });
});

describe('exam builder', () => {
  const index = Array.from({ length: 200 }, (_, i) => ({ id: `q${i}`, lesson: 'l', topics: ['t'], difficulty: 'intermediate' as const, objective: ['2.1', '2.4', '4.1', '4.3'][i % 4], kind: 'concept' as const, type: 'single' as const, diagnostic: i < 8 ? 'nsx' : null }));
  it('builds a 60-question mock exam distributed by objective weight, without duplicates', () => {
    const ids = buildMockExam(index, { '2.1': 3, '2.4': 4, '4.1': 9, '4.3': 14 }, new Map(), Math.random);
    expect(ids).toHaveLength(60);
    expect(new Set(ids).size).toBe(60);
    const byObj = (o: string) => ids.filter((id) => index.find((q) => q.id === id)!.objective === o).length;
    expect(byObj('4.3')).toBeGreaterThan(byObj('2.1'));
  });
  it('prefers unseen questions', () => {
    const seen = new Map(index.slice(0, 150).map((q) => [q.id, 1]));
    const ids = buildMockExam(index, { '2.1': 1, '2.4': 1, '4.1': 1, '4.3': 1 }, seen, Math.random, 40);
    expect(ids.filter((id) => !seen.has(id)).length).toBe(40);
  });
  it('builds a diagnostic from tagged questions', () => {
    expect(buildDiagnostic(index, 2, Math.random)).toHaveLength(2);
  });
});

describe('study plan', () => {
  const lessons = Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, title: `L${i}`, minutes: 40, module: `m${Math.floor(i / 4)}`, moduleTitle: 'M', labs: i === 3 ? ['lab1'] : [] }));
  it('schedules every remaining lesson, module quizzes, labs and final mock exams', () => {
    const p = buildPlan({ today: new Date(2026, 9, 3), endDate: new Date(2026, 9, 16), minutesPerDay: 120, remainingLessons: lessons, labs: new Map([['lab1', { id: 'lab1', title: 'Lab', minutes: 90 }]]), completedLabs: new Set(), weakTopics: [], reviewDue: 3, includeLabs: true });
    expect(p.days).toHaveLength(14);
    const items = p.days.flatMap((d) => d.items);
    expect(items.filter((i) => i.type === 'lesson')).toHaveLength(12);
    expect(items.filter((i) => i.type === 'quiz')).toHaveLength(3);
    expect(items.some((i) => i.type === 'lab')).toBe(true);
    expect(p.days[13].items.some((i) => i.type === 'mock')).toBe(true);
    expect(p.overloaded).toBe(false);
  });
  it('flags an overloaded plan without dropping work', () => {
    const p = buildPlan({ today: new Date(2026, 9, 3), endDate: new Date(2026, 9, 4), minutesPerDay: 60, remainingLessons: lessons, labs: new Map(), completedLabs: new Set(), weakTopics: [], reviewDue: 0, includeLabs: false });
    expect(p.overloaded).toBe(true);
    expect(p.days.flatMap((d) => d.items).filter((i) => i.type === 'lesson')).toHaveLength(12);
  });
});

describe('gamification', () => {
  it('computes levels and streaks', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(950).title).toBe('Administrator');
    const activity = { [dayKey(now)]: 10, [dayKey(now - 86_400_000)]: 5, [dayKey(now - 3 * 86_400_000)]: 5 };
    expect(streak(activity, now)).toBe(2);
  });
});

describe('incident scoring', () => {
  const inc = {
    id: 'inc-x', title: 'x', difficulty: 'intermediate', version: 'vcf9', topics: ['dns'], lessons: [], summary: 's', symptoms: ['a', 'b'], environment: 'e',
    evidence: [
      { id: 'e1', category: 'dns', action: 'a', output: 'o', relevance: 'key', note: 'n' },
      { id: 'e2', category: 'ntp', action: 'a', output: 'o', relevance: 'useful', note: 'n' },
      { id: 'e3', category: 'logs', action: 'a', output: 'o', relevance: 'key', note: 'n' },
      { id: 'e4', category: 'nsx', action: 'a', output: 'o', relevance: 'noise', note: 'n' },
    ],
    idealSequence: ['e3', 'e1'],
    rootCause: [{ id: 'r1', text: 't', correct: true, why: 'w' }, { id: 'r2', text: 't', correct: false, why: 'w' }, { id: 'r3', text: 't', correct: false, why: 'w' }],
    nextStep: [{ id: 'n1', text: 't', correct: true, why: 'w' }, { id: 'n2', text: 't', correct: false, why: 'w' }],
    remediation: [{ id: 'm1', text: 't', correct: true, why: 'w' }, { id: 'm2', text: 't', correct: false, why: 'w' }, { id: 'm3', text: 't', correct: false, why: 'w' }],
    validation: [{ id: 'v1', text: 't', correct: true, why: 'w' }, { id: 'v2', text: 't', correct: false, why: 'w' }],
    hints: ['h1', 'h2'], debrief: 'd', sources: [],
  } as unknown as TIncident;
  it('gives a perfect score for an efficient, correct investigation', () => {
    const s = scoreIncident(inc, { collected: ['e3', 'e1'], support: ['e1', 'e3'], picks: { rootCause: ['r1'], nextStep: ['n1'], remediation: ['m1'], validation: ['v1'] }, hints: 0 });
    expect(s.total).toBe(100);
  });
  it('penalises noise, wrong first picks and hints', () => {
    const s = scoreIncident(inc, { collected: ['e4', 'e1', 'e3'], support: ['e4'], picks: { rootCause: ['r2', 'r1'], nextStep: ['n1'], remediation: ['m1'], validation: ['v1'] }, hints: 2 });
    expect(s.total).toBeLessThan(50);
  });
  it('lcs', () => expect(lcs(['a', 'b', 'c'], ['a', 'c'])).toBe(2));
});
