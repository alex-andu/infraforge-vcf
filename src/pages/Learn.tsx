import { Link } from 'react-router-dom';
import { phases, lessonsById, objectivesById } from '../content';
import { useStore } from '../state/store';
import { useMastery, lessonStatus, nextLesson } from '../state/derived';
import { Bar, StatusDot, VersionChip, DifficultyChip, fmtMinutes, useDocumentTitle } from '../components/ui';

export default function Learn() {
  useDocumentTitle('Învață');
  const s = useStore();
  const mastery = useMastery();
  const next = nextLesson(s);
  const hideFoundations = s.profile.level === 'advanced';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Curriculum</h1>
          <p>Progresie tehnică, de la fundamente la operare și design. Fiecare lecție este mapată la obiectivele examenului 2V0-17.25.</p>
        </div>
        {next && <Link className="btn primary" to={`/learn/${next.id}`}>{s.lessons[next.id] ? 'Continuă' : 'Începe'}: {next.title}</Link>}
      </div>
      {hideFoundations && <p className="small muted">Ai ales nivelul avansat: fazele 1–2 rămân disponibile ca recapitulare, dar nu sunt obligatorii.</p>}
      <div className="stack" style={{ gap: 18 }}>
        {phases.map((p) => {
          const ls = p.modules.flatMap((m) => m.lessons);
          const done = ls.filter((l) => s.lessons[l]?.status === 'completed').length;
          const minutes = ls.reduce((n, l) => n + (lessonsById.get(l)?.minutes ?? 0), 0);
          return (
            <section key={p.id} id={p.id} className="panel" aria-labelledby={`${p.id}-h`}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="small faint">Faza {p.number}{hideFoundations && (p.number === 1 || p.number === 2) ? ' · opțională pentru nivelul tău' : ''}</div>
                  <h2 id={`${p.id}-h`} style={{ margin: 0 }}>{p.title}</h2>
                  <div className="small muted">{p.summary}</div>
                </div>
                <div style={{ width: 200 }}>
                  <div className="row between small"><span>{done}/{ls.length} lecții</span><span className="faint">{fmtMinutes(minutes)}</span></div>
                  <Bar value={(done / ls.length) * 100} label={`Progres ${p.title}`} />
                </div>
              </div>
              {p.modules.map((m) => (
                <div key={m.id} style={{ marginTop: 10 }}>
                  <div className="section-label">{m.title}</div>
                  <ul className="list">
                    {m.lessons.map((lid) => {
                      const l = lessonsById.get(lid)!;
                      const st = lessonStatus(s, lid, mastery);
                      return (
                        <li key={lid} className="row between">
                          <Link to={`/learn/${lid}`} className="list-link" style={{ flex: 1, minWidth: 0 }}>
                            <StatusDot state={st} label={false} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 550 }}>{l.title}</span>
                              <span className="small faint" style={{ display: 'block' }}>{l.summary}</span>
                            </span>
                          </Link>
                          <span className="row" style={{ flex: 'none' }}>
                            {l.objectives.slice(0, 2).map((o) => <span key={o} className="chip accent" title={objectivesById.get(o)?.title}>Obj {o}</span>)}
                            <VersionChip v={l.version} />
                            <DifficultyChip d={l.difficulty} />
                            <span className="small faint nowrap" style={{ width: 52, textAlign: 'right' }}>{l.minutes} min</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
