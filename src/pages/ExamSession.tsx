import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { meta, getQuestions, phases, type TQuestion } from '../content';
import { useStore } from '../state/store';
import { useMastery, topicTitle } from '../state/derived';
import { buildMockExam, buildTopicQuiz, buildMixedQuiz, buildWeakQuiz, MOCK, mathRng } from '../engine/exam';
import { grade, isAnswered, type Answer } from '../engine/grading';
import { estimateScaled, PASS_PCT } from '../engine/readiness';
import type { ExamResult } from '../state/types';
import { QuizRunner } from '../components/QuizRunner';
import { QuestionBody } from '../components/Question';
import { useAsync, Loading, Empty, useDocumentTitle } from '../components/ui';

function useSeen() {
  const attempts = useStore((s) => s.attempts);
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const a of attempts) if (a.mode !== 'diagnostic') m.set(a.qid, a.score);
    return m;
  }, [attempts]);
}

export default function ExamSession({ mock }: { mock?: boolean }) {
  const [params] = useSearchParams();
  const kind = mock ? 'mock' : (params.get('kind') ?? 'mixed');
  const seen = useSeen();
  const mastery = useMastery();
  const [nonce, setNonce] = useState(0);
  const [restartIds, setRestartIds] = useState<string[] | null>(null);
  useDocumentTitle(mock ? 'Examen simulat' : 'Quiz');

  const { qids, title, historyKind, timed, minutes } = useMemo(() => {
    void nonce;
    const n = Number(params.get('n') ?? 15);
    const idx = meta.questionIndex;
    switch (kind) {
      case 'mock': {
        const weights = Object.fromEntries(meta.objectives.map((o) => [o.id, Math.max(1, o.items.length)]));
        return { qids: buildMockExam(idx, weights, seen, mathRng), title: 'Examen simulat 2V0-17.25', historyKind: 'mock' as const, timed: true, minutes: MOCK.minutes };
      }
      case 'timed':
        return { qids: buildMixedQuiz(idx, n, seen, mathRng), title: `Examen cronometrat · ${n} întrebări`, historyKind: 'timed' as const, timed: true, minutes: Number(params.get('min') ?? 60) };
      case 'topic': {
        const topics = (params.get('topics') ?? '').split(',').filter(Boolean);
        return { qids: buildTopicQuiz(idx, topics, n, seen, mathRng), title: `Quiz: ${topics.map(topicTitle).join(', ')}`, historyKind: 'topic' as const, timed: false, minutes: 0 };
      }
      case 'objective': {
        const o = params.get('objective');
        const pool = idx.filter((q) => q.objective === o);
        return { qids: buildMixedQuiz(pool, n, seen, mathRng), title: `Quiz: obiectivul ${o}`, historyKind: 'topic' as const, timed: false, minutes: 0 };
      }
      case 'module': {
        const mid = params.get('module');
        const mod = phases.flatMap((p) => p.modules).find((m) => m.id === mid);
        const pool = idx.filter((q) => mod?.lessons.includes(q.lesson));
        return { qids: buildMixedQuiz(pool, Math.min(15, pool.length), seen, mathRng), title: `Quiz: ${mod?.title ?? 'modul'}`, historyKind: 'topic' as const, timed: false, minutes: 0 };
      }
      case 'weak': {
        const studied = [...mastery.values()].filter((m) => m.attempts > 0 || m.coverage > 0);
        const pool = (studied.length ? studied : [...mastery.values()]).sort((a, b) => a.score - b.score).slice(0, 6).map((m) => m.topic);
        return { qids: buildWeakQuiz(idx, pool, n, seen, mathRng), title: `Topicuri slabe: ${pool.slice(0, 3).map(topicTitle).join(', ')}`, historyKind: 'weak' as const, timed: false, minutes: 0 };
      }
      default: {
        const diff = (params.get('diff') ?? '').split(',').filter(Boolean);
        return { qids: buildMixedQuiz(idx, n, seen, mathRng, diff), title: `Quiz mixt · ${n} întrebări`, historyKind: 'mixed' as const, timed: false, minutes: 0 };
      }
    }
    // Selection is fixed for the session; only an explicit restart (nonce) rebuilds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, params, nonce]);

  const ids = restartIds ?? qids;
  if (!ids.length) return <div className="page"><Empty title="Nu există întrebări pentru această selecție." action={{ to: '/exam', label: 'Înapoi la Exam Prep' }} /></div>;

  return (
    <div className="page">
      <div className="crumbs"><Link to="/exam">Exam Prep</Link><span>›</span><span>{title}</span></div>
      {timed ? (
        <ExamRunner key={nonce} qids={ids} minutes={minutes} kind={historyKind} title={title} />
      ) : (
        <>
          <h1>{title}</h1>
          <QuizRunner key={`${nonce}-${ids.join()}`} qids={ids} mode="quiz" historyKind={historyKind}
            onRestart={(r) => { if (r.length === ids.length && r.every((x, i) => x === ids[i])) { setRestartIds(null); setNonce((v) => v + 1); } else setRestartIds(r); }}
            finishLabel="Quiz nou" />
        </>
      )}
    </div>
  );
}

function ExamRunner({ qids, minutes, kind, title }: { qids: string[]; minutes: number; kind: ExamResult['kind']; title: string }) {
  const { data: bank, loading } = useAsync(getQuestions, []);
  const questions = useMemo(() => (bank ? qids.map((id) => bank.get(id)).filter(Boolean) as TQuestion[] : []), [bank, qids]);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [left, setLeft] = useState(minutes * 60);
  const [confirm, setConfirm] = useState(false);
  const startAt = useRef(0);
  const seed = useRef(String(Math.random()));
  const recordAnswer = useStore((s) => s.recordAnswer);
  const recordExam = useStore((s) => s.recordExam);
  const navigate = useNavigate();
  const submitted = useRef(false);

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    const res: ExamResult['questions'] = [];
    const byObjective: ExamResult['byObjective'] = {};
    const byTopic: ExamResult['byTopic'] = {};
    let correct = 0;
    for (const q of questions) {
      const a = answers[q.id] ?? null;
      const g = grade(q, a);
      if (isAnswered(q, a)) recordAnswer(q, g, 'exam');
      if (g.correct) correct++;
      res.push({ qid: q.id, score: g.correct ? 1 : 0, answer: a, flagged: flags.has(q.id) });
      if (q.objective) { byObjective[q.objective] ??= { c: 0, t: 0 }; byObjective[q.objective].t++; if (g.correct) byObjective[q.objective].c++; }
      for (const t of q.topics) { byTopic[t] ??= { c: 0, t: 0 }; byTopic[t].t++; if (g.correct) byTopic[t].c++; }
    }
    const pct = questions.length ? correct / questions.length : 0;
    const id = `x${Date.now()}`;
    recordExam({ id, at: Date.now(), kind, total: questions.length, correct, pct, scaled: estimateScaled(pct), passed: pct >= PASS_PCT, durationMs: Date.now() - startAt.current, byObjective, byTopic, questions: res });
    navigate(`/exam/result/${id}`, { replace: true });
  };

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [started]);
  useEffect(() => { if (started && left <= 0) submit(); });
  useEffect(() => {
    if (!started) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [started]);

  if (loading) return <Loading what="examenul" />;
  if (!started) {
    return (
      <div className="panel stack" style={{ maxWidth: 720 }}>
        <h1>{title}</h1>
        <ul className="muted">
          <li>{questions.length} întrebări, {minutes} minute. Timpul pornește când apeși Start.</li>
          <li>Nu primești feedback până la final, ca la examenul real. Poți marca întrebări pentru revizuire și reveni la ele.</li>
          <li>Întrebările cu mai multe răspunsuri se punctează doar dacă sunt complet corecte, ca la examen.</li>
          <li>Scorul scalat afișat este o estimare (pragul de 300 corespunde aici la {Math.round(PASS_PCT * 100)}% răspunsuri corecte; Broadcom nu publică pragul brut).</li>
        </ul>
        <div><button className="btn primary" onClick={() => { startAt.current = Date.now(); setStarted(true); }}>Start examen</button></div>
      </div>
    );
  }

  const q = questions[idx];
  const answered = questions.filter((x) => isAnswered(x, answers[x.id] ?? null)).length;
  const mm = Math.floor(Math.max(0, left) / 60);
  const ss = Math.max(0, left) % 60;

  return (
    <div className="exam-shell">
      <div className="panel stack">
        <div className="row between">
          <strong>Întrebarea {idx + 1} din {questions.length}</strong>
          <button className="btn sm" aria-pressed={flags.has(q.id)} onClick={() => setFlags((f) => { const n = new Set(f); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}>⚑ {flags.has(q.id) ? 'Marcată' : 'Marchează pentru revizuire'}</button>
        </div>
        <QuestionBody key={q.id} q={q} answer={answers[q.id] ?? null} onChange={(a) => setAnswers((x) => ({ ...x, [q.id]: a }))} reveal={false} seed={seed.current} />
        <div className="row between">
          <button className="btn" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← Anterioara</button>
          {idx < questions.length - 1 ? <button className="btn primary" onClick={() => setIdx((i) => i + 1)}>Următoarea →</button> : <button className="btn primary" onClick={() => setConfirm(true)}>Finalizează</button>}
        </div>
      </div>
      <aside className="panel stack" aria-label="Navigator examen" style={{ position: 'sticky', top: 'calc(var(--topbar) + 16px)' }}>
        <div className={`timer ${left < 300 ? 'low' : ''}`} role="timer" aria-label="Timp rămas">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</div>
        <div className="small muted">{answered}/{questions.length} răspunse · {flags.size} marcate</div>
        <div className="navigator">
          {questions.map((x, i) => (
            <button key={x.id} type="button" className={`${isAnswered(x, answers[x.id] ?? null) ? 'answered' : ''} ${i === idx ? 'current' : ''} ${flags.has(x.id) ? 'flagged' : ''}`}
              onClick={() => setIdx(i)} aria-label={`Întrebarea ${i + 1}${flags.has(x.id) ? ', marcată' : ''}`}>{i + 1}</button>
          ))}
        </div>
        {confirm ? (
          <div className="stack">
            <div className="small">{questions.length - answered > 0 ? `Ai ${questions.length - answered} întrebări fără răspuns.` : 'Toate întrebările au răspuns.'} Trimiți examenul?</div>
            <div className="row"><button className="btn primary" onClick={submit}>Da, trimite</button><button className="btn ghost" onClick={() => setConfirm(false)}>Înapoi</button></div>
          </div>
        ) : <button className="btn" onClick={() => setConfirm(true)}>Trimite examenul</button>}
      </aside>
    </div>
  );
}
