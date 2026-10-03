import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { useMastery, topicTitle } from '../state/derived';
import { meta, phases, orderedLessons } from '../content';
import { levelFor, badgeMetric, streak, LEVELS } from '../engine/gamification';
import { topConfusions } from '../engine/mastery';
import { Bar, StatusDot, toneFor, useDocumentTitle, fmtDate } from '../components/ui';

function Spark({ hist }: { hist: { at: number; v: number }[] }) {
  if (hist.length < 2) return <span className="faint tiny">—</span>;
  const w = 80, h = 22;
  const pts = hist.map((p, i) => `${(i / (hist.length - 1)) * w},${h - (p.v / 100) * h}`).join(' ');
  const delta = hist[hist.length - 1].v - hist[0].v;
  return (
    <span className="row" style={{ gap: 6 }}>
      <svg width={w} height={h} aria-hidden="true"><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" /></svg>
      <span className="tiny" style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{delta >= 0 ? '+' : ''}{delta}</span>
    </span>
  );
}

export default function Progress() {
  useDocumentTitle('Progres');
  const s = useStore();
  const mastery = useMastery();
  const [domain, setDomain] = useState<string | null>(null);
  const lvl = levelFor(s.xp);
  const done = orderedLessons.filter((l) => s.lessons[l.id]?.status === 'completed').length;
  const mastered = [...mastery.values()].filter((m) => m.state === 'mastered').length;
  const confusions = topConfusions([...mastery.values()]);
  const domains = [...new Set(meta.topics.map((t) => t.domain))];
  const rows = [...mastery.values()].filter((m) => !domain || meta.topics.find((t) => t.id === m.topic)?.domain === domain);
  const answered = s.attempts.filter((a) => a.mode !== 'diagnostic');
  const accuracy = answered.length ? Math.round((answered.filter((a) => a.score >= 1).length / answered.length) * 100) : null;

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Progres</h1><p>Toate cifrele vin din activitatea ta reală, salvată local în browser.</p></div>
        <Link className="btn" to="/plan">Plan de studiu</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <section className="panel kpi"><span className="label">Curriculum</span><span className="big-num">{orderedLessons.length ? Math.round((done / orderedLessons.length) * 100) : 0}%</span><span className="small muted">{done}/{orderedLessons.length} lecții</span></section>
        <section className="panel kpi"><span className="label">Topicuri stăpânite</span><span className="big-num">{mastered}</span><span className="small muted">din {mastery.size} topicuri active</span></section>
        <section className="panel kpi"><span className="label">Întrebări</span><span className="big-num">{answered.length}</span><span className="small muted">{accuracy == null ? 'încă niciun răspuns' : `${accuracy}% corecte`}</span></section>
        <section className="panel kpi">
          <span className="label">Nivel {lvl.level} · {lvl.title}</span><span className="big-num">{s.xp} XP</span>
          <Bar value={lvl.progress * 100} label="Progres spre nivelul următor" />
          <span className="tiny faint">{lvl.next ? `${lvl.next - s.xp} XP până la ${LEVELS[lvl.level]?.title}` : 'Nivel maxim'} · 🔥 {streak(s.activity, Date.now())} zile</span>
        </section>
      </div>

      {confusions.length > 0 && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="section-label">Confuzii repetate</div>
          <ul className="list">{confusions.slice(0, 5).map((c) => (
            <li key={c.a + c.b} className="row between small"><span>Confunzi „{topicTitle(c.a)}” cu „{topicTitle(c.b)}” ({c.count} greșeli)</span><Link to={`/exam/session?kind=topic&topics=${c.a},${c.b}`}>Exersează diferența →</Link></li>
          ))}</ul>
        </section>
      )}

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="section-label" style={{ margin: 0 }}>Stăpânire pe topicuri</div>
          <div className="seg" role="group" aria-label="Domeniu">
            <button type="button" aria-pressed={!domain} onClick={() => setDomain(null)}>Toate</button>
            {domains.map((d) => <button key={d} type="button" aria-pressed={domain === d} onClick={() => setDomain(d)}>{d.replace('-', ' ')}</button>)}
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Topic</th><th>Stare</th><th>Stăpânire</th><th>Încredere</th><th>Lecții</th><th>Practică</th><th>Review scadent</th><th>Evoluție</th></tr></thead>
            <tbody>
              {rows.sort((a, b) => b.score - a.score).map((m) => (
                <tr key={m.topic}>
                  <td><Link to={`/exam/session?kind=topic&topics=${m.topic}`}>{topicTitle(m.topic)}</Link></td>
                  <td><StatusDot state={m.state} /></td>
                  <td style={{ width: 150 }}><div className="row" style={{ gap: 6 }}><div style={{ flex: 1 }}><Bar value={m.score} tone={toneFor(m.score)} /></div><span className="small">{m.score}%</span></div></td>
                  <td className="small">{Math.round(m.confidence * 100)}% <span className="faint">({m.attempts} răsp.)</span></td>
                  <td className="small">{Math.round(m.coverage * 100)}%</td>
                  <td className="small">{Math.round(m.practice * 100)}%</td>
                  <td className="small">{m.dueReviews || '—'}</td>
                  <td><Spark hist={s.masteryHistory[m.topic] ?? []} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>Cum se calculează stăpânirea?</summary>
          <p className="small muted" style={{ marginTop: 6 }}>
            Stăpânirea combină: acuratețea ponderată după dificultate și recență (cu o estimare inițială din testul de diagnostic), încrederea (câte dovezi există), lecțiile parcurse, laboratoarele și incidentele rezolvate. Scade când ai recapitulări scadente, greșeli repetate pe aceleași întrebări sau confuzii repetate între topicuri. „Stăpânit” cere ≥80%, încredere ≥60% și ≥70% la întrebările avansate. Detalii în docs/MASTERY.md.
          </p>
        </details>
      </section>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="section-label">Faze și module</div>
          {phases.map((p) => (
            <div key={p.id} style={{ marginBottom: 8 }}>
              <div className="small" style={{ fontWeight: 600 }}>{p.number}. {p.title}</div>
              {p.modules.map((m) => {
                const d = m.lessons.filter((l) => s.lessons[l]?.status === 'completed').length;
                return <div key={m.id} className="mastery-row"><span className="small muted">{m.title}</span><Bar value={(d / m.lessons.length) * 100} /><span className="small">{d}/{m.lessons.length}</span></div>;
              })}
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="section-label">Laboratoare și incidente</div>
          <ul className="list small">
            {meta.labs.map((l) => <li key={l.id} className="row between"><Link to={`/labs/${l.id}`}>{l.title}</Link><StatusDot state={s.labs[l.id]?.status === 'completed' ? 'completed' : s.labs[l.id] ? 'in-progress' : 'not-started'} /></li>)}
            {meta.incidents.map((i) => {
              const runs = s.incidents[i.id] ?? [];
              return <li key={i.id} className="row between"><Link to={`/troubleshoot/${i.id}`}>Incident: {i.title}</Link><span className="faint">{runs.length ? `${Math.max(...runs.map((r) => r.score))}/100` : '—'}</span></li>;
            })}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="section-label">Insigne ({Object.keys(s.badges).length}/{meta.badges.length})</div>
        <div className="grid grid-4">
          {meta.badges.map((b) => {
            const earned = s.badges[b.id];
            const cur = badgeMetric(s, b.rule.metric, mastered, Date.now());
            return (
              <div key={b.id} className={`badge-tile ${earned ? '' : 'locked'}`}>
                <span className="icon" aria-hidden="true">{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div className="tiny muted">{b.description}</div>
                  <div className="tiny faint">{earned ? `Obținută ${fmtDate(earned)}` : `${Math.min(cur, b.rule.gte)}/${b.rule.gte}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
