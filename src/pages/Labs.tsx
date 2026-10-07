import { useState } from 'react';
import { Link } from 'react-router-dom';
import { meta, lessonsById } from '../content';
import { useStore } from '../state/store';
import { DifficultyChip, VersionChip, Dots, StatusDot, fmtMinutes, useDocumentTitle, Empty } from '../components/ui';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'challenge'] as const;

export default function Labs() {
  useDocumentTitle('Ghiduri practice');
  const labsState = useStore((s) => s.labs);
  const lessons = useStore((s) => s.lessons);
  const [level, setLevel] = useState<string | null>(null);
  const list = meta.labs.filter((l) => !level || l.level === level);
  const done = meta.labs.filter((l) => labsState[l.id]?.status === 'completed').length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Ghiduri practice</h1>
          <p>Proceduri separate de teorie, aplicate pe infrastructura ta VCF. Fiecare ghid are context, cerințe, pași explicați, rezultate așteptate, dovezi și cleanup. {done}/{meta.labs.length} finalizate.</p>
        </div>
        <div className="row">
          <Link className="btn" to="/homelab">Construiește home lab-ul</Link>
          <Link className="btn" to="/scenarios">Scenarii de design</Link>
        </div>
      </div>
      <div className="seg" role="group" aria-label="Filtru nivel" style={{ marginBottom: 14 }}>
        <button type="button" aria-pressed={!level} onClick={() => setLevel(null)}>Toate ({meta.labs.length})</button>
        {LEVELS.map((l) => <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>{{ beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat', challenge: 'Provocare' }[l]} ({meta.labs.filter((x) => x.level === l).length})</button>)}
      </div>
      {list.length === 0 ? <Empty title="Niciun ghid pentru acest filtru." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Ghid practic</th><th>Nivel</th><th>Complexitate</th><th>Durată</th><th>Tehnologii</th><th>Teorie parcursă</th><th>Stare</th></tr></thead>
            <tbody>
              {list.map((l) => {
                const st = labsState[l.id];
                const prereqDone = l.lessons.filter((x) => lessons[x]?.status === 'completed').length;
                return (
                  <tr key={l.id}>
                    <td><Link to={`/labs/${l.id}`} style={{ fontWeight: 600 }}>{l.title}</Link><div className="tiny faint">{l.objectives[0]}</div></td>
                    <td><DifficultyChip d={l.level} /></td>
                    <td><Dots n={l.complexity} /></td>
                    <td className="nowrap">{fmtMinutes(l.minutes)}</td>
                    <td className="small">{l.technologies.slice(0, 3).join(', ')} <VersionChip v={l.version} /></td>
                    <td className="small">{l.lessons.length ? <span title={l.lessons.map((x) => lessonsById.get(x)?.title).join(', ')}>{prereqDone}/{l.lessons.length} lecții</span> : <span className="faint">—</span>}</td>
                    <td>{st ? <StatusDot state={st.status === 'completed' ? 'completed' : 'in-progress'} /> : <StatusDot state="not-started" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
