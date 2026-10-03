import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, topicsById, type TQuestion } from '../content';
import { grade, isAnswered, type Answer, type Grade } from '../engine/grading';
import { useStore } from '../state/store';
import type { AttemptMode, ExamResult } from '../state/types';
import { QuestionBody, Explanation } from './Question';
import { useAsync, Loading, Bar, Empty } from './ui';

export interface QuizSummary { total: number; correct: number; pct: number; results: { q: TQuestion; g: Grade }[] }

interface Props {
  qids: string[];
  mode: AttemptMode;
  /** When set, the finished quiz is also stored in exam history under this kind. */
  historyKind?: ExamResult['kind'];
  feedback?: boolean;
  onFinish?: (s: QuizSummary) => void;
  onRestart?: (qids: string[]) => void;
  compact?: boolean;
  finishLabel?: string;
}

export function QuizRunner({ qids, mode, historyKind, feedback = true, onFinish, onRestart, compact, finishLabel }: Props) {
  const { data: bank, loading } = useAsync(getQuestions, []);
  const questions = useMemo(() => (bank ? qids.map((id) => bank.get(id)).filter(Boolean) as TQuestion[] : []), [bank, qids]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<Answer>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ q: TQuestion; g: Grade; answer: Answer }[]>([]);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());
  const qStart = useRef(Date.now());
  const seed = useRef(String(Math.random()));
  const recordAnswer = useStore((s) => s.recordAnswer);
  const recordExam = useStore((s) => s.recordExam);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIdx(0); setAnswer(null); setRevealed(false); setResults([]); setDone(false); started.current = Date.now(); }, [qids]);

  if (loading) return <Loading what="întrebările" />;
  if (!questions.length) return <Empty title="Nu există întrebări pentru această selecție." />;

  const q = questions[idx];

  const check = () => {
    if (!isAnswered(q, answer)) return;
    const g = grade(q, answer);
    recordAnswer(q, g, mode, Date.now() - qStart.current);
    setResults((r) => [...r, { q, g, answer }]);
    if (feedback) setRevealed(true); else next(g);
  };

  const finish = (all: { q: TQuestion; g: Grade; answer: Answer }[]) => {
    const correct = all.filter((r) => r.g.correct).length;
    const summary: QuizSummary = { total: all.length, correct, pct: all.length ? correct / all.length : 0, results: all };
    if (historyKind) {
      const byTopic: ExamResult['byTopic'] = {};
      const byObjective: ExamResult['byObjective'] = {};
      for (const r of all) {
        for (const t of r.q.topics) { byTopic[t] ??= { c: 0, t: 0 }; byTopic[t].t++; if (r.g.correct) byTopic[t].c++; }
        if (r.q.objective) { byObjective[r.q.objective] ??= { c: 0, t: 0 }; byObjective[r.q.objective].t++; if (r.g.correct) byObjective[r.q.objective].c++; }
      }
      recordExam({ id: `x${Date.now()}`, at: Date.now(), kind: historyKind, total: all.length, correct, pct: summary.pct, durationMs: Date.now() - started.current, byObjective, byTopic, questions: all.map((r) => ({ qid: r.q.id, score: r.g.partial, answer: r.answer })) });
    }
    setDone(true);
    onFinish?.(summary);
  };

  const next = (gNoFeedback?: Grade) => {
    const all = gNoFeedback ? [...results, { q, g: gNoFeedback, answer }] : results;
    if (idx + 1 >= questions.length) { finish(all); return; }
    setIdx(idx + 1);
    setAnswer(null);
    setRevealed(false);
    qStart.current = Date.now();
    topRef.current?.scrollIntoView({ block: 'nearest' });
  };

  if (done) {
    const correct = results.filter((r) => r.g.correct).length;
    const pct = Math.round((correct / results.length) * 100);
    const missed = results.filter((r) => !r.g.correct);
    const topicStats = new Map<string, { c: number; t: number }>();
    for (const r of results) for (const t of r.q.topics) { const s = topicStats.get(t) ?? { c: 0, t: 0 }; s.t++; if (r.g.correct) s.c++; topicStats.set(t, s); }
    return (
      <div className="panel stack" ref={topRef}>
        <div className="row between">
          <div>
            <div className="section-label">Rezultat</div>
            <div className="big-num">{correct} / {results.length} <span className="muted" style={{ fontSize: '1rem' }}>({pct}%)</span></div>
          </div>
          <div className="row">
            {missed.length > 0 && onRestart && <button className="btn" onClick={() => onRestart(missed.map((m) => m.q.id))}>Reia doar greșelile ({missed.length})</button>}
            {onRestart && <button className="btn primary" onClick={() => onRestart(qids)}>{finishLabel ?? 'Reia quiz-ul'}</button>}
          </div>
        </div>
        {!compact && topicStats.size > 1 && (
          <div>
            <div className="section-label">Pe topicuri</div>
            {[...topicStats].map(([t, s]) => (
              <div key={t} className="mastery-row"><span>{topicsById.get(t)?.title ?? t}</span><Bar value={(s.c / s.t) * 100} tone={s.c / s.t >= 0.75 ? 'ok' : s.c / s.t >= 0.5 ? undefined : 'bad'} /><span className="small">{s.c}/{s.t}</span></div>
            ))}
          </div>
        )}
        {missed.length > 0 && (
          <div>
            <div className="section-label">De revăzut</div>
            <ul className="list">
              {missed.map((m) => (
                <li key={m.q.id}><Link to={`/exam/question/${m.q.id}`} className="list-link"><span className="status-dot needs-review" />{m.q.stem.replace(/[*_`]/g, '').slice(0, 140)}</Link></li>
              ))}
            </ul>
            <p className="small faint" style={{ marginTop: 8 }}>Întrebările greșite au fost adăugate în <Link to="/review">coada de recapitulare</Link> (spaced repetition).</p>
          </div>
        )}
      </div>
    );
  }

  const last = results[results.length - 1];
  return (
    <div className="panel stack" ref={topRef}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
          if (!revealed && isAnswered(q, answer)) { e.preventDefault(); check(); } else if (revealed) { e.preventDefault(); next(); }
        }
      }}>
      <div className="row between">
        <span className="small faint">Întrebarea {idx + 1} din {questions.length}</span>
        <div style={{ width: 160 }}><Bar value={(idx / questions.length) * 100} label="Progres quiz" /></div>
      </div>
      <QuestionBody key={q.id} q={q} answer={answer} onChange={setAnswer} reveal={revealed} grade={last?.q.id === q.id ? last.g : undefined} seed={seed.current} />
      {revealed && last?.q.id === q.id && <Explanation q={q} grade={last.g} />}
      <div className="row between">
        <span className="tiny faint">Enter = {revealed ? 'următoarea' : 'verifică'}</span>
        {!revealed ? (
          <button className="btn primary" onClick={check} disabled={!isAnswered(q, answer)}>{feedback ? 'Verifică răspunsul' : idx + 1 >= questions.length ? 'Termină' : 'Următoarea'}</button>
        ) : (
          <button className="btn primary" onClick={() => next()}>{idx + 1 >= questions.length ? 'Vezi rezultatul' : 'Următoarea întrebare →'}</button>
        )}
      </div>
    </div>
  );
}
