import { Link } from 'react-router-dom';
import { meta } from '../content';
import { useStore } from '../state/store';
import { topicTitle } from '../state/derived';
import { useDocumentTitle, Empty } from '../components/ui';
import { Md } from '../components/RichContent';

export default function Scenarios() {
  useDocumentTitle('Scenarii de design');
  const done = useStore((s) => s.scenarios);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Scenarii de design</h1>
          <p>Primești cerințe, constrângeri și infrastructura existentă. Iei deciziile de arhitectură, apoi le compari cu designul recomandat.</p>
        </div>
      </div>
      {meta.scenarios.length === 0 ? <Empty title="Nu există încă scenarii." /> : (
        <div className="grid grid-2">
          {meta.scenarios.map((s) => (
            <section key={s.id} className="panel stack">
              <div className="row between">
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}><Link to={`/scenarios/${s.id}`}>{s.title}</Link></h2>
                {done[s.id] ? <span className="chip ok">{Math.round(done[s.id].score * 100)}% potrivire</span> : <span className="chip">Nou</span>}
              </div>
              <div className="row">{s.topics.map((t) => <span key={t} className="chip">{topicTitle(t)}</span>)}</div>
              <div className="small muted"><Md src={s.brief.split('\n')[0]} inline /></div>
              <div><Link className="btn sm primary" to={`/scenarios/${s.id}`}>{done[s.id] ? 'Reia' : 'Începe'}</Link></div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
