import type { TQuestion } from '../content/schema';

export type Answer = string | string[] | Record<string, string> | null;

export interface Grade {
  /** All-or-nothing, as on the real exam. */
  correct: boolean;
  /** 0..1 partial credit, used for mastery. */
  partial: number;
  /** Topics of chosen distractors that carry `confusedWith`. */
  confusions: string[];
  /** Option ids the learner picked that are wrong (for per-option feedback). */
  wrongPicks: string[];
}

export const normalizeCli = (s: string) => s.trim().replace(/\s+/g, ' ');

export function isAnswered(q: TQuestion, a: Answer): boolean {
  if (a == null) return false;
  switch (q.type) {
    case 'single': case 'truefalse': return typeof a === 'string' && a.length > 0;
    case 'multi': return Array.isArray(a) && a.length > 0;
    case 'ordering': return Array.isArray(a) && a.length === q.items.length;
    case 'matching': return typeof a === 'object' && !Array.isArray(a) && Object.keys(a).length === q.pairs.length;
    case 'cli': return typeof a === 'string' && a.trim().length > 0;
  }
}

export function grade(q: TQuestion, a: Answer): Grade {
  const none: Grade = { correct: false, partial: 0, confusions: [], wrongPicks: [] };
  if (!isAnswered(q, a)) return none;
  switch (q.type) {
    case 'single':
    case 'truefalse': {
      const opt = q.options.find((o) => o.id === a);
      const ok = !!opt?.correct;
      return { correct: ok, partial: ok ? 1 : 0, confusions: !ok && opt?.confusedWith ? [opt.confusedWith] : [], wrongPicks: ok ? [] : [a as string] };
    }
    case 'multi': {
      const picked = new Set(a as string[]);
      const right = q.options.filter((o) => o.correct);
      const hits = right.filter((o) => picked.has(o.id)).length;
      const wrong = q.options.filter((o) => !o.correct && picked.has(o.id));
      const ok = hits === right.length && wrong.length === 0;
      return {
        correct: ok,
        partial: Math.max(0, (hits - wrong.length) / right.length),
        confusions: wrong.map((o) => o.confusedWith).filter((x): x is string => !!x),
        wrongPicks: wrong.map((o) => o.id),
      };
    }
    case 'ordering': {
      const order = a as string[];
      const correctOrder = q.items.map((i) => i.id);
      const inPlace = order.filter((id, idx) => correctOrder[idx] === id).length;
      // Credit for correct relative order of adjacent items too, so one misplaced item is not a zero.
      let pairs = 0;
      for (let i = 0; i < order.length - 1; i++) if (correctOrder.indexOf(order[i]) < correctOrder.indexOf(order[i + 1])) pairs++;
      const ok = inPlace === correctOrder.length;
      return { correct: ok, partial: ok ? 1 : (inPlace / order.length + pairs / (order.length - 1)) / 2, confusions: [], wrongPicks: [] };
    }
    case 'matching': {
      const m = a as Record<string, string>;
      const hits = q.pairs.filter((p) => m[p.id] === p.id).length;
      return { correct: hits === q.pairs.length, partial: hits / q.pairs.length, confusions: [], wrongPicks: q.pairs.filter((p) => m[p.id] !== p.id).map((p) => p.id) };
    }
    case 'cli': {
      const given = normalizeCli(a as string);
      const ok = q.answers.some((x) => normalizeCli(x) === given);
      return { correct: ok, partial: ok ? 1 : 0, confusions: [], wrongPicks: [] };
    }
  }
}

/** Deterministic shuffle so a question keeps the same option order while it is on screen. */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
