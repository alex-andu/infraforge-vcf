import { Link } from 'react-router-dom';
import { meta } from '../content';
import { useStore } from '../state/store';
import { DifficultyChip, VersionChip, useDocumentTitle, Empty } from '../components/ui';
import { topicTitle } from '../state/derived';

const STEPS = ['Observe', 'Scope', 'Hypothesize', 'Validate', 'Remediate', 'Verify'];

export default function Troubleshoot() {
  useDocumentTitle('Troubleshooting');
  const incidents = useStore((s) => s.incidents);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Troubleshooting</h1>
          <p>Simulator de incidente: primești simptome, nu instrucțiuni. Alegi ce dovezi colectezi, formulezi ipoteza, alegi remedierea și validarea. Ordinea diagnosticului contează.</p>
        </div>
        <Link className="btn" to="/learn/troubleshooting-methodology">Metodologia de troubleshooting</Link>
      </div>
      <div className="stepper" aria-label="Cadrul de troubleshooting">{STEPS.map((s) => <span key={s}>{s}</span>)}</div>
      {meta.incidents.length === 0 ? <Empty title="Nu există încă incidente." /> : (
        <div className="grid grid-2">
          {meta.incidents.map((i) => {
            const runs = incidents[i.id] ?? [];
            const best = runs.length ? Math.max(...runs.map((r) => r.score)) : null;
            const solved = runs.some((r) => r.solved);
            return (
              <section key={i.id} className="panel stack">
                <div className="row between">
                  <Link to={`/troubleshoot/${i.id}`}><h2 style={{ margin: 0, fontSize: '1.05rem' }}>{i.title}</h2></Link>
                  {solved ? <span className="chip ok">Rezolvat · {best}/100</span> : runs.length ? <span className="chip warn">Încercat</span> : <span className="chip">Nou</span>}
                </div>
                <div className="row"><DifficultyChip d={i.difficulty} /><VersionChip v={i.version} />{i.topics.slice(0, 3).map((t) => <span key={t} className="chip">{topicTitle(t)}</span>)}</div>
                <p className="small muted" style={{ margin: 0 }}>{i.summary}</p>
                <ul className="small symptoms" style={{ margin: 0 }}>{i.symptoms.slice(0, 3).map((s) => <li key={s}>{s}</li>)}</ul>
                <div><Link className="btn sm primary" to={`/troubleshoot/${i.id}`}>{runs.length ? 'Reia investigația' : 'Începe investigația'}</Link></div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
