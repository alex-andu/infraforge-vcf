import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { meta, topicsById } from '../content';
import { useStore } from '../state/store';
import { useMastery, useReadiness, useDueCount, topicTitle, examTopicWeights } from '../state/derived';
import { MOCK } from '../engine/exam';
import { estimateScaled } from '../engine/readiness';
import { Bar, Ring, toneFor, fmtDate, useDocumentTitle } from '../components/ui';

export default function ExamPrep() {
  useDocumentTitle('Exam Prep');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mastery = useMastery();
  const readiness = useReadiness();
  const due = useDueCount();
  const exams = useStore((s) => s.exams);
  const attempts = useStore((s) => s.attempts);
  const preObjective = params.get('objective');
  const preTopic = params.get('topic');
  const [topics, setTopics] = useState<string[]>(() => {
    if (preTopic) return [preTopic];
    if (preObjective) return meta.objectives.find((o) => o.id === preObjective)?.topics ?? [];
    return [];
  });
  const [n, setN] = useState(15);
  const [diff, setDiff] = useState<string[]>([]);
  const [timedN, setTimedN] = useState(30);
  const [timedMin, setTimedMin] = useState(60);

  const qCount = meta.questionIndex.length;
  const countFor = (ts: string[]) => meta.questionIndex.filter((q) => q.topics.some((t) => ts.includes(t))).length;

  const objStats = useMemo(() => meta.objectives.map((o) => {
    const qs = meta.questionIndex.filter((q) => q.objective === o.id);
    const ids = new Set(qs.map((q) => q.id));
    const at = attempts.filter((a) => ids.has(a.qid) && a.mode !== 'diagnostic');
    const acc = at.length ? at.reduce((n2, a) => n2 + a.score, 0) / at.length : null;
    const ms = o.topics.map((t) => mastery.get(t)?.score ?? 0);
    return { o, questions: qs.length, acc, mastery: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0 };
  }), [attempts, mastery]);

  const topicsByDomain = useMemo(() => {
    const m = new Map<string, typeof meta.topics>();
    for (const t of meta.topics) if (meta.questionIndex.some((q) => q.topics.includes(t.id))) m.set(t.domain, [...(m.get(t.domain) ?? []), t]);
    return m;
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Exam Prep · 2V0-17.25</h1>
          <p>VMware Cloud Foundation 9.0 Administrator: {MOCK.questions} de întrebări, {MOCK.minutes} de minute, scor de trecere 300 (scalat). {qCount} întrebări în banca de exersare.</p>
        </div>
        <Link className="btn primary" to="/exam/mock">Examen simulat complet</Link>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <section className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="section-label">Pregătire pentru examen</div>
          <div className="row" style={{ gap: 16, marginBottom: 10 }}>
            <Ring value={readiness.score} label="Pregătire" />
            <div className="small muted">Combină mai multe semnale, nu un singur quiz. Fără un examen simulat, scorul este plafonat la 60%.</div>
          </div>
          {readiness.signals.map((sig) => (
            <div key={sig.key} className="mastery-row" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px 40px' }}>
              <span className="small">{sig.label} <span className="faint tiny">×{Math.round(sig.weight * 100)}%</span></span>
              <Bar value={sig.value * 100} tone={toneFor(sig.value * 100)} /><span className="small">{Math.round(sig.value * 100)}%</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="section-label">Moduri de exersare</div>
          <ul className="list">
            <li className="row between"><div><strong>Examen simulat</strong><div className="small muted">{MOCK.questions} întrebări distribuite pe obiective, {MOCK.minutes} min, fără feedback până la final.</div></div><Link className="btn sm primary" to="/exam/mock">Start</Link></li>
            <li className="row between"><div><strong>Topicuri slabe</strong><div className="small muted">Întrebări din topicurile cu cea mai mică stăpânire, greșelile întâi.</div></div><button className="btn sm" onClick={() => navigate('/exam/session?kind=weak&n=20')}>Start</button></li>
            <li className="row between"><div><strong>Recapitulare</strong><div className="small muted">{due} întrebări scadente în spaced repetition.</div></div><Link className="btn sm" to={due ? '/review/session' : '/review'}>{due ? 'Start' : 'Vezi coada'}</Link></li>
            <li className="row between"><div><strong>Scenarii de design</strong><div className="small muted">Decizii de arhitectură comparate cu designul recomandat.</div></div><Link className="btn sm" to="/scenarios">Deschide</Link></li>
          </ul>
        </section>

        <section className="panel">
          <div className="section-label">Examen cronometrat personalizat</div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label className="field" style={{ width: 110 }}>Întrebări<input type="number" min={5} max={Math.max(5, qCount)} value={timedN} onChange={(e) => setTimedN(Number(e.target.value) || 10)} /></label>
            <label className="field" style={{ width: 110 }}>Minute<input type="number" min={5} max={240} value={timedMin} onChange={(e) => setTimedMin(Number(e.target.value) || 30)} /></label>
            <button className="btn" onClick={() => navigate(`/exam/session?kind=timed&n=${timedN}&min=${timedMin}`)}>Start</button>
          </div>
          <div className="section-label" style={{ marginTop: 16 }}>Quiz mixt (cu feedback imediat)</div>
          <div className="seg" role="group" aria-label="Dificultate" style={{ marginBottom: 8 }}>
            {['foundation', 'intermediate', 'advanced', 'expert'].map((d) => (
              <button key={d} type="button" aria-pressed={diff.includes(d)} onClick={() => setDiff((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}>
                {{ foundation: 'Fundamental', intermediate: 'Intermediar', advanced: 'Avansat', expert: 'Expert' }[d]}
              </button>
            ))}
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label className="field" style={{ width: 110 }}>Întrebări<input type="number" min={5} max={100} value={n} onChange={(e) => setN(Number(e.target.value) || 10)} /></label>
            <button className="btn" onClick={() => navigate(`/exam/session?kind=mixed&n=${n}${diff.length ? `&diff=${diff.join(',')}` : ''}`)}>Start</button>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="row between">
          <div className="section-label">Quiz pe topicuri</div>
          <div className="row">
            <span className="small faint">{topics.length ? `${countFor(topics)} întrebări disponibile` : 'Selectează unul sau mai multe topicuri'}</span>
            <button className="btn sm ghost" onClick={() => setTopics([])} disabled={!topics.length}>Golește</button>
            <button className="btn sm primary" disabled={!topics.length} onClick={() => navigate(`/exam/session?kind=topic&topics=${topics.join(',')}&n=${Math.min(20, countFor(topics))}`)}>Start quiz</button>
          </div>
        </div>
        <div className="grid grid-4" style={{ marginTop: 8 }}>
          {[...topicsByDomain].map(([domain, ts]) => (
            <div key={domain}>
              <div className="small faint" style={{ textTransform: 'capitalize', marginBottom: 4 }}>{domain.replace('-', ' ')}</div>
              {ts.map((t) => (
                <label key={t.id} className="check small" style={{ marginBottom: 3 }}>
                  <input type="checkbox" checked={topics.includes(t.id)} onChange={(e) => setTopics((x) => (e.target.checked ? [...x, t.id] : x.filter((y) => y !== t.id)))} />
                  <span>{t.title} <span className="faint">{mastery.get(t.id)?.score ?? 0}%</span></span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="section-label">Hartă obiective examen (exam guide oficial)</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Obiectiv</th><th>Itemi în exam guide</th><th>Întrebări</th><th>Acuratețea ta</th><th>Stăpânire topicuri</th><th /></tr></thead>
            <tbody>
              {objStats.map(({ o, questions, acc, mastery: m }) => (
                <tr key={o.id} style={preObjective === o.id ? { outline: '2px solid var(--accent)' } : undefined}>
                  <td><strong>{o.id}</strong> {o.title}<div className="tiny faint">{o.topics.map((t) => topicsById.get(t)?.title).filter(Boolean).slice(0, 5).join(' · ')}</div></td>
                  <td>{o.items.length}</td>
                  <td>{questions}</td>
                  <td>{acc == null ? <span className="faint">—</span> : `${Math.round(acc * 100)}%`}</td>
                  <td style={{ width: 160 }}><Bar value={m} tone={toneFor(m)} label={`Stăpânire ${o.title}`} /></td>
                  <td><button className="btn sm" disabled={!questions} onClick={() => navigate(`/exam/session?kind=objective&objective=${o.id}&n=${Math.min(20, questions)}`)}>Exersează</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>Vezi toți itemii din exam guide</summary>
          {meta.objectives.map((o) => (
            <div key={o.id} style={{ marginTop: 8 }}>
              <strong className="small">{o.id} {o.title}</strong>
              <ul className="small muted" style={{ margin: '4px 0' }}>{o.items.map((it) => <li key={it}>{it}</li>)}</ul>
            </div>
          ))}
          <p className="tiny faint">Sursă: <a href="https://docs.broadcom.com/doc/vmware-cloud-foundation-administrator-exam-guide" target="_blank" rel="noopener noreferrer">VMware Cloud Foundation Administrator Exam Guide (2V0-17.25)</a>. Secțiunile 1 și 3 nu au obiective testabile.</p>
        </details>
      </section>

      <section className="panel">
        <div className="section-label">Istoric examene și quiz-uri</div>
        {exams.length === 0 ? <p className="muted small">Încă niciun quiz sau examen finalizat.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Data</th><th>Tip</th><th>Scor</th><th>Scalat (estimare)</th><th>Durată</th><th /></tr></thead>
              <tbody>
                {[...exams].reverse().slice(0, 25).map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.at)}</td>
                    <td>{{ mock: 'Examen simulat', timed: 'Cronometrat', topic: 'Pe topicuri', mixed: 'Mixt', weak: 'Topicuri slabe', review: 'Recapitulare' }[e.kind]}</td>
                    <td>{Math.round(e.correct)}/{e.total} ({Math.round(e.pct * 100)}%){e.passed != null && <span className={`chip ${e.passed ? 'ok' : 'bad'}`} style={{ marginLeft: 6 }}>{e.passed ? 'Trecut' : 'Picat'}</span>}</td>
                    <td>{e.kind === 'mock' || e.kind === 'timed' ? estimateScaled(e.pct) : '—'}</td>
                    <td>{Math.round(e.durationMs / 60000)} min</td>
                    <td><Link to={`/exam/result/${e.id}`} className="small">Detalii</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="tiny faint" style={{ marginTop: 12 }}>Topicuri cu pondere mare la examen: {[...examTopicWeights].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => topicTitle(t)).join(', ')}.</p>
    </div>
  );
}
