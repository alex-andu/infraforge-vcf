import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getScenario, lessonsById } from '../content';
import { useStore } from '../state/store';
import { Md } from '../components/RichContent';
import { useAsync, Loading, NotFound, useDocumentTitle } from '../components/ui';

export default function ScenarioPage() {
  const { id = '' } = useParams();
  const { data: s, loading } = useAsync(() => getScenario(id), [id]);
  const record = useStore((st) => st.recordScenario);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  useDocumentTitle(s?.title ?? 'Scenariu');
  if (loading) return <Loading what="scenariul" />;
  if (!s) return <NotFound what="Scenariul" />;
  const complete = s.decisions.every((d) => answers[d.id]);
  const score = s.decisions.filter((d) => d.options.find((o) => o.id === answers[d.id])?.correct).length / s.decisions.length;

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="crumbs"><Link to="/scenarios">Scenarii de design</Link><span>›</span><span>{s.title}</span></div>
      <h1>{s.title}</h1>
      <section className="panel" style={{ marginBottom: 14 }}><Md src={s.brief} /></section>
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <section className="panel"><h2>Cerințe</h2><ul className="small">{s.requirements.map((r) => <li key={r}>{r}</li>)}</ul></section>
        <section className="panel"><h2>Constrângeri</h2><ul className="small">{s.constraints.map((r) => <li key={r}>{r}</li>)}</ul></section>
      </div>
      <section className="panel" style={{ marginBottom: 14 }}><h2>Infrastructura existentă</h2><Md src={s.existing} /></section>
      <h2>Deciziile tale</h2>
      {s.decisions.map((d, i) => (
        <section key={d.id} className="panel stack" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{i + 1}. {d.question}</h3>
          <div className="options" role="radiogroup" aria-label={d.question}>
            {d.options.map((o, k) => {
              const picked = answers[d.id] === o.id;
              const cls = submitted ? (o.correct ? (picked ? 'correct' : 'missed') : picked ? 'wrong' : '') : '';
              return (
                <button key={o.id} type="button" role="radio" aria-checked={picked} className={`option ${cls}`} disabled={submitted} onClick={() => setAnswers((a) => ({ ...a, [d.id]: o.id }))}>
                  <span className="key">{String.fromCharCode(65 + k)}</span>
                  <span style={{ flex: 1 }}><Md src={o.text} inline />{submitted && (picked || o.correct) && <span className="why"><Md src={o.why} inline /></span>}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {!submitted ? (
        <button className="btn primary" disabled={!complete} onClick={() => { setSubmitted(true); record(id, score, answers); }}>Compară cu designul recomandat</button>
      ) : (
        <section className="panel stack">
          <div className="row between"><h2 style={{ margin: 0 }}>Designul recomandat</h2><span className="chip ok">{Math.round(score * 100)}% potrivire cu recomandarea</span></div>
          <Md src={s.recommended} />
          {s.lessons.length > 0 && <div className="small">Lecții de revăzut: {s.lessons.filter((l) => lessonsById.has(l)).map((l) => <Link key={l} to={`/learn/${l}`} style={{ marginRight: 10 }}>{lessonsById.get(l)!.title}</Link>)}</div>}
          <div><button className="btn" onClick={() => { setSubmitted(false); setAnswers({}); }}>Reia scenariul</button></div>
        </section>
      )}
    </div>
  );
}
