/** Scoring for the troubleshooting simulator: rewards correct conclusions AND efficient, well-ordered diagnosis. */
import type { TIncident } from '../content/schema';

export interface IncidentAnswers {
  collected: string[];
  support: string[];
  picks: Record<'rootCause' | 'nextStep' | 'remediation' | 'validation', string[]>;
  hints: number;
}

export interface IncidentScore { total: number; parts: { label: string; points: number; max: number; note: string }[] }

/** Longest common subsequence length, used to compare diagnostic order with the ideal sequence. */
export function lcs(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

export function scoreIncident(inc: TIncident, a: IncidentAnswers): IncidentScore {
  const rel = new Map(inc.evidence.map((e) => [e.id, e.relevance]));
  const key = inc.evidence.filter((e) => e.relevance === 'key').map((e) => e.id);
  const firstTry = (k: keyof IncidentAnswers['picks']) => {
    const first = a.picks[k][0];
    return !!first && !!inc[k].find((c) => c.id === first)?.correct;
  };

  const keyFound = key.filter((k) => a.collected.includes(k)).length;
  const evidencePts = key.length ? Math.round((keyFound / key.length) * 15) : 15;

  const supportSet = new Set(a.support);
  const tp = key.filter((k) => supportSet.has(k)).length;
  const fp = a.support.filter((s) => rel.get(s) === 'noise').length;
  const supportPts = a.support.length ? Math.max(0, Math.round(10 * (tp / Math.max(1, key.length)) - 3 * fp)) : 0;

  const relevantOrder = a.collected.filter((c) => rel.get(c) !== 'noise');
  const seq = inc.idealSequence.length ? lcs(relevantOrder, inc.idealSequence) / inc.idealSequence.length : 1;
  const noise = a.collected.filter((c) => rel.get(c) === 'noise').length;
  const seqPts = Math.max(0, Math.round(15 * seq) - Math.min(15, noise * 3));

  const parts = [
    { label: 'Cauza identificată din prima', points: firstTry('rootCause') ? 30 : 0, max: 30, note: firstTry('rootCause') ? 'Corect din prima încercare.' : `${a.picks.rootCause.length} încercări.` },
    { label: 'Dovezi cheie colectate', points: evidencePts, max: 15, note: `${keyFound}/${key.length} dovezi cheie găsite.` },
    { label: 'Dovezi care susțin concluzia', points: supportPts, max: 10, note: `${tp} dovezi cheie selectate${fp ? `, ${fp} irelevante` : ''}.` },
    { label: 'Secvențierea diagnosticului', points: seqPts, max: 15, note: `${Math.round(seq * 100)}% potrivire cu ordinea ideală, ${noise} acțiuni irelevante.` },
    { label: 'Pasul următor de diagnostic', points: firstTry('nextStep') ? 10 : 0, max: 10, note: firstTry('nextStep') ? 'Corect din prima.' : 'Nu din prima încercare.' },
    { label: 'Remediere', points: firstTry('remediation') ? 10 : 0, max: 10, note: firstTry('remediation') ? 'Corect din prima.' : 'Nu din prima încercare.' },
    { label: 'Validare după remediere', points: firstTry('validation') ? 10 : 0, max: 10, note: firstTry('validation') ? 'Corect din prima.' : 'Nu din prima încercare.' },
  ];
  const hintPenalty = a.hints * 5;
  if (hintPenalty) parts.push({ label: 'Indicii folosite', points: -hintPenalty, max: 0, note: `${a.hints} × −5` });
  const total = Math.max(0, Math.min(100, parts.reduce((n, p) => n + p.points, 0)));
  return { total, parts };
}
