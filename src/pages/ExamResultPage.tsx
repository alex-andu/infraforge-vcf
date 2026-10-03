import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { getQuestions, objectivesById } from '../content';
import { topicTitle } from '../state/derived';
import { estimateScaled } from '../engine/readiness';
import { grade, type Answer } from '../engine/grading';
import { QuestionBody, Explanation } from '../components/Question';
import { useAsync, Bar, toneFor, NotFound, fmtDate, useDocumentTitle, Loading } from '../components/ui';

export default function ExamResultPage() {
  const { id } = useParams();
  const exam = useStore((s) => s.exams.find((e) => e.id === id));
  const { data: bank, loading } = useAsync(getQuestions, []);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'flagged'>('wrong');
  useDocumentTitle('Rezultat examen');
  if (!exam) return <NotFound what="Rezultatul" />;
  const scaled = exam.scaled ?? estimateScaled(exam.pct);
  const isExam = exam.kind === 'mock' || exam.kind === 'timed';
  const list = exam.questions.filter((q) => filter === 'all' || (filter === 'wrong' ? q.score < 1 : q.flagged));
  const topics = Object.entries(exam.byTopic).sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t);

  return (
    <div className="page">
      <div className="crumbs"><Link to="/exam">Exam Prep</Link><span>›</span><span>Rezultat din {fmtDate(exam.at)}</span></div>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="section-label">Rezultat</div>
          <div className="big-num">{Math.round(exam.pct * 100)}%</div>
          <div className="muted">{Math.round(exam.correct)} din {exam.total} corecte · {Math.round(exam.durationMs / 60000)} min</div>
          {isExam && (
            <div style={{ marginTop: 10 }}>
              <span className={`chip ${exam.passed ? 'ok' : 'bad'}`}>{exam.passed ? 'Trecut' : 'Sub prag'}</span>
              <div className="small" style={{ marginTop: 6 }}>Scor scalat estimat: <strong>{scaled}</strong> / 500 (prag 300)</div>
              <div className="tiny faint">Estimare: Broadcom nu publică pragul brut; folosim 70%.</div>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-label">Pe obiective</div>
          {Object.entries(exam.byObjective).sort().map(([o, v]) => (
            <div key={o} className="mastery-row"><span className="small">{o} {objectivesById.get(o)?.title}</span><Bar value={(v.c / v.t) * 100} tone={toneFor((v.c / v.t) * 100)} /><span className="small">{v.c}/{v.t}</span></div>
          ))}
        </section>
        <section className="panel">
          <div className="section-label">Topicuri cele mai slabe</div>
          {topics.slice(0, 7).map(([t, v]) => (
            <div key={t} className="mastery-row"><Link className="small" to={`/exam/session?kind=topic&topics=${t}`}>{topicTitle(t)}</Link><Bar value={(v.c / v.t) * 100} tone={toneFor((v.c / v.t) * 100)} /><span className="small">{v.c}/{v.t}</span></div>
          ))}
        </section>
      </div>
      <section className="stack">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Revizuire întrebări</h2>
          <div className="seg" role="group" aria-label="Filtru">
            <button type="button" aria-pressed={filter === 'wrong'} onClick={() => setFilter('wrong')}>Greșite</button>
            <button type="button" aria-pressed={filter === 'flagged'} onClick={() => setFilter('flagged')}>Marcate</button>
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Toate</button>
          </div>
        </div>
        {loading ? <Loading /> : list.length === 0 ? <p className="muted">Nimic de afișat pentru acest filtru.</p> : list.map((r, i) => {
          const q = bank?.get(r.qid);
          if (!q) return null;
          const g = grade(q, r.answer as Answer);
          return (
            <div key={r.qid + i} className="panel stack">
              <QuestionBody q={q} answer={r.answer as Answer} onChange={() => {}} reveal grade={g} seed={exam.id} />
              <Explanation q={q} grade={g} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
