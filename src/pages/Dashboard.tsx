import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { useMastery, useReadiness, useRecommendations, useDueCount, nextLesson, topicTitle } from '../state/derived';
import { meta, phases, orderedLessons, phaseOf, labsById, incidentsById } from '../content';
import { streak, dayKey, levelFor } from '../engine/gamification';
import { Bar, Ring, toneFor, StatusDot, relTime, useDocumentTitle, DifficultyChip } from '../components/ui';
import { TodayPlan } from './StudyPlan';

export default function Dashboard() {
  useDocumentTitle('Acasă');
  const s = useStore();
  const mastery = useMastery();
  const readiness = useReadiness();
  const recs = useRecommendations();
  const due = useDueCount();
  const next = nextLesson(s);
  const phase = next ? phaseOf(next.id) : phases[phases.length - 1];
  const phaseLessons = phase ? phase.modules.flatMap((m) => m.lessons) : [];
  const phaseDone = phaseLessons.filter((l) => s.lessons[l]?.status === 'completed').length;
  const totalDone = orderedLessons.filter((l) => s.lessons[l.id]?.status === 'completed').length;
  const lvl = levelFor(s.xp);
  const st = streak(s.activity, Date.now());

  const studied = [...mastery.values()].filter((m) => m.attempts > 0 || m.coverage > 0);
  const weak = [...studied].sort((a, b) => a.score - b.score).slice(0, 5);
  const strong = [...studied].filter((m) => m.score >= 70).sort((a, b) => b.score - a.score).slice(0, 3);

  const labEntries = Object.entries(s.labs).sort((a, b) => (b[1].completedAt ?? b[1].startedAt) - (a[1].completedAt ?? a[1].startedAt)).slice(0, 4);
  const incRuns = Object.entries(s.incidents);
  const solved = incRuns.filter(([, r]) => r.some((x) => x.solved)).length;
  const bestScores = incRuns.map(([, r]) => Math.max(...r.map((x) => x.score)));
  const tsScore = bestScores.length ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length) : null;
  const days = Array.from({ length: 28 }, (_, i) => dayKey(Date.now() - (27 - i) * 86_400_000));
  const readinessRec = recs.find((r) => r.kind === 'lab' || r.kind === 'incident');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{totalDone === 0 && !s.attempts.length ? 'Bine ai venit în InfraForge VCF.' : 'Bine ai revenit.'}</h1>
          <p>Studiezi VMware Cloud Foundation 9 pentru examenul <strong>2V0-17.25</strong>. Ai parcurs {totalDone} din {orderedLessons.length} lecții.</p>
        </div>
        <div className="row small muted">
          <span title="Zile consecutive de studiu">🔥 {st} {st === 1 ? 'zi' : 'zile'} la rând</span>
          <span>·</span>
          <Link to="/progress">Nivel {lvl.level} · {lvl.title} · {s.xp} XP</Link>
        </div>
      </div>

      <div className="hero-line" style={{ marginBottom: 16 }}>
        <section className="panel continue-card" aria-labelledby="cont-h">
          <div className="section-label" id="cont-h">Continuă să înveți</div>
          {next && phase ? (
            <>
              <div className="row between">
                <div>
                  <div className="small faint">Faza {phase.number} · {phase.title}</div>
                  <h2 style={{ margin: '2px 0 6px' }}>{next.title}</h2>
                </div>
                <Ring value={phaseLessons.length ? (phaseDone / phaseLessons.length) * 100 : 0} label={`Progres în ${phase.title}`} />
              </div>
              <p className="muted small">{next.summary}</p>
              <div className="row">
                <Link className="btn primary" to={`/learn/${next.id}`}>{s.lessons[next.id] ? 'Continuă lecția' : 'Începe lecția'}</Link>
                <span className="small faint">{next.minutes} min · {phaseDone}/{phaseLessons.length} lecții în această fază</span>
              </div>
            </>
          ) : (
            <p className="muted">Ai terminat toate lecțiile disponibile. Concentrează-te pe recapitulare și examene simulate.</p>
          )}
        </section>

        <section className="panel" style={{ flex: '1 1 300px' }} aria-labelledby="ready-h">
          <div className="row between">
            <div className="section-label" id="ready-h">Pregătire pentru examen</div>
            <Link className="small" to="/exam">Exam Prep →</Link>
          </div>
          <div className="row" style={{ gap: 16 }}>
            <Ring value={readiness.score} label="Pregătire pentru examen" />
            <div className="small" style={{ flex: 1 }}>
              {strong.length > 0 && <div><span className="faint">Puncte forte:</span> {strong.map((m) => topicTitle(m.topic)).join(', ')}</div>}
              {readiness.weakTopics.length > 0 && studied.length > 0 && <div><span className="faint">De lucrat:</span> {weak.slice(0, 3).map((m) => topicTitle(m.topic)).join(', ')}</div>}
              {!readiness.enoughData && <div className="faint">Estimare preliminară: răspunde la cel puțin 20 de întrebări pentru un scor relevant.</div>}
            </div>
          </div>
          {readinessRec && <div className="small" style={{ marginTop: 8 }}>Recomandat: <Link to={readinessRec.url}>{readinessRec.text.replace(/^[^:]+: /, '')}</Link></div>}
        </section>
      </div>

      <div className="grid grid-3">
        <section className="panel" aria-labelledby="rec-h">
          <div className="section-label" id="rec-h">Ce să faci acum</div>
          {recs.length === 0 ? <p className="muted small">Începe prima lecție pentru a primi recomandări personalizate.</p> : (
            <ul className="list">
              {recs.slice(0, 6).map((r, i) => (
                <li key={i}>
                  <div className="small">{r.text}</div>
                  <Link className="small" to={r.url}>{r.cta} →</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="today-h">
          <div className="row between">
            <div className="section-label" id="today-h">Azi</div>
            <Link className="small" to="/plan">Plan de studiu →</Link>
          </div>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div>
              <div className="big-num">{due}</div>
              <div className="small faint">întrebări de recapitulat (spaced repetition)</div>
            </div>
            <Link className={`btn ${due ? 'primary' : ''}`} to={due ? '/review/session' : '/review'}>{due ? 'Recapitulează' : 'Coada de review'}</Link>
          </div>
          <TodayPlan />
        </section>

        <section className="panel" aria-labelledby="weak-h">
          <div className="row between">
            <div className="section-label" id="weak-h">Zone slabe</div>
            <Link className="small" to="/progress">Toate topicurile →</Link>
          </div>
          {weak.length === 0 ? <p className="muted small">Fără date încă. Zonele slabe apar după primele lecții și quiz-uri.</p> : weak.map((m) => (
            <div className="mastery-row" key={m.topic}>
              <Link to={`/exam/session?kind=topic&topics=${m.topic}`} className="small" title="Exersează acest topic">{topicTitle(m.topic)}</Link>
              <Bar value={m.score} tone={toneFor(m.score)} label={`Stăpânire ${topicTitle(m.topic)}`} />
              <span className="small">{m.score}%</span>
            </div>
          ))}
        </section>

        <section className="panel" aria-labelledby="mast-h">
          <div className="section-label" id="mast-h">Stăpânire pe faze</div>
          {phases.map((p) => {
            const ls = p.modules.flatMap((m) => m.lessons);
            const done = ls.filter((l) => s.lessons[l]?.status === 'completed').length;
            return (
              <div className="mastery-row" key={p.id}>
                <Link to={`/learn#${p.id}`} className="small">{p.number}. {p.title}</Link>
                <Bar value={(done / ls.length) * 100} label={`Progres ${p.title}`} />
                <span className="small">{done}/{ls.length}</span>
              </div>
            );
          })}
        </section>

        <section className="panel" aria-labelledby="labs-h">
          <div className="row between">
            <div className="section-label" id="labs-h">Laboratoare recente</div>
            <Link className="small" to="/labs">Toate →</Link>
          </div>
          <div className="small muted" style={{ marginBottom: 8 }}>{Object.values(s.labs).filter((l) => l.status === 'completed').length} din {meta.labs.length} laboratoare finalizate</div>
          {labEntries.length === 0 ? <p className="muted small">Niciun laborator început. Primul pas practic: <Link to="/labs">alege un laborator de început</Link>.</p> : (
            <ul className="list">
              {labEntries.map(([id, l]) => {
                const lab = labsById.get(id);
                if (!lab) return null;
                return (
                  <li key={id} className="row between">
                    <Link to={`/labs/${id}`} className="small">{lab.title}</Link>
                    <span className="row"><DifficultyChip d={lab.level} /><StatusDot state={l.status === 'completed' ? 'completed' : 'in-progress'} label={false} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="ts-h">
          <div className="row between">
            <div className="section-label" id="ts-h">Troubleshooting</div>
            <Link className="small" to="/troubleshoot">Incidente →</Link>
          </div>
          <div className="row" style={{ gap: 20, marginBottom: 8 }}>
            <div className="kpi"><span className="big-num">{solved}/{meta.incidents.length}</span><span className="label">incidente rezolvate</span></div>
            <div className="kpi"><span className="big-num">{tsScore ?? '—'}</span><span className="label">scor mediu de diagnostic</span></div>
          </div>
          {incRuns.length > 0 && (
            <ul className="list">
              {incRuns.slice(-3).reverse().map(([id, runs]) => (
                <li key={id} className="row between small">
                  <Link to={`/troubleshoot/${id}`}>{incidentsById.get(id)?.title ?? id}</Link>
                  <span className="faint">{relTime(runs[runs.length - 1].at)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="section-label" style={{ marginTop: 14 }}>Activitate (ultimele 4 săptămâni)</div>
          <div className="heat" aria-label="Activitate zilnică">
            {days.map((d) => {
              const v = s.activity[d] ?? 0;
              return <i key={d} title={`${d}: ${v} XP`} className={v === 0 ? '' : v < 40 ? 'l1' : v < 120 ? 'l2' : 'l3'} />;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
