import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { useDueCount } from '../state/derived';
import { activeItems, INTERVAL_DAYS } from '../engine/srs';
import { getQuestions } from '../content';
import { useAsync, Empty, fmtDate, relTime, useDocumentTitle } from '../components/ui';

export default function Review() {
  useDocumentTitle('Revizia mea');
  const s = useStore();
  const due = useDueCount();
  const { data: bank } = useAsync(getQuestions, []);
  const [tab, setTab] = useState<'queue' | 'saved' | 'bookmarks' | 'notes'>('queue');
  const active = activeItems(s.review).sort((a, b) => a.due - b.due);
  const notes = Object.values(s.notes).sort((a, b) => b.updatedAt - a.updatedAt);
  const stem = (id: string) => (bank?.get(id)?.stem ?? id).replace(/[*_`]/g, '').slice(0, 150);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Revizia mea</h1><p>Coada de spaced repetition, întrebări salvate, bookmark-uri și notițe, într-un singur loc.</p></div>
        <Link className={`btn ${due ? 'primary' : ''}`} to="/review/session">{due ? `Recapitulează ${due} întrebări scadente` : 'Nicio întrebare scadentă'}</Link>
      </div>
      <div className="tabs" role="tablist">
        {([['queue', `Coadă (${active.length})`], ['saved', `Întrebări salvate (${s.savedQuestions.length})`], ['bookmarks', `Bookmark-uri (${s.bookmarks.length})`], ['notes', `Notițe (${notes.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'queue' && (active.length === 0 ? <Empty title="Coada este goală.">Întrebările greșite și cele salvate intră aici și revin la intervale crescătoare ({INTERVAL_DAYS.slice(1, -1).join(', ')} zile).</Empty> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Întrebare</th><th>Cutie</th><th>Scadentă</th><th>Greșeli</th></tr></thead>
          <tbody>{active.map((r) => (
            <tr key={r.qid}>
              <td><Link to={`/exam/question/${r.qid}`}>{stem(r.qid)}</Link></td>
              <td>{r.box}/{INTERVAL_DAYS.length - 1}</td>
              <td className="small">{r.due <= Date.now() ? <span className="chip warn">Azi</span> : fmtDate(r.due)}</td>
              <td>{r.lapses}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ))}

      {tab === 'saved' && (s.savedQuestions.length === 0 ? <Empty title="Nicio întrebare salvată.">Folosește „Salvează întrebarea” în explicațiile din quiz-uri.</Empty> : (
        <ul className="list panel" style={{ padding: '4px 14px' }}>
          {s.savedQuestions.map((q) => <li key={q} className="row between"><Link to={`/exam/question/${q}`}>{stem(q)}</Link><button className="btn sm ghost" onClick={() => s.toggleSavedQuestion(q)}>Elimină</button></li>)}
        </ul>
      ))}

      {tab === 'bookmarks' && (s.bookmarks.length === 0 ? <Empty title="Niciun bookmark.">Salvează lecții, secțiuni (★ lângă titluri), laboratoare sau termeni din glosar.</Empty> : (
        <ul className="list panel" style={{ padding: '4px 14px' }}>
          {[...s.bookmarks].reverse().map((b) => (
            <li key={b.key} className="row between">
              <span><span className="chip" style={{ marginRight: 8 }}>{{ lesson: 'Lecție', section: 'Secțiune', question: 'Întrebare', lab: 'Laborator', incident: 'Incident', term: 'Termen' }[b.kind]}</span><Link to={b.url}>{b.title}</Link></span>
              <span className="row"><span className="tiny faint">{relTime(b.at)}</span><button className="btn sm ghost" onClick={() => s.toggleBookmark(b)}>Elimină</button></span>
            </li>
          ))}
        </ul>
      ))}

      {tab === 'notes' && (notes.length === 0 ? <Empty title="Nicio notiță.">Scrie notițe în panoul din dreapta al oricărei lecții.</Empty> : (
        <div className="grid grid-2">
          {notes.map((n) => (
            <section key={n.key} className="panel">
              <div className="row between"><Link to={n.url} style={{ fontWeight: 600 }}>{n.title}</Link><span className="tiny faint">{relTime(n.updatedAt)}</span></div>
              <p className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{n.text}</p>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
