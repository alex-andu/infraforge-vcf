import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { meta, termsById, lessonsById, labsById } from '../content';
import { useStore } from '../state/store';
import { Md } from '../components/RichContent';
import { VersionChip, useDocumentTitle, Empty } from '../components/ui';

export default function Glossary() {
  const { id } = useParams();
  const [filter, setFilter] = useState('');
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const bookmarks = useStore((s) => s.bookmarks);
  const term = id ? termsById.get(id) : undefined;
  useDocumentTitle(term ? `${term.term} · Glosar` : 'Glosar');

  const sorted = useMemo(() => [...meta.glossary].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })), []);
  const f = filter.trim().toLowerCase();
  const list = f ? sorted.filter((t) => t.term.toLowerCase().includes(f) || (t.expansion ?? '').toLowerCase().includes(f) || t.definition.toLowerCase().includes(f)) : sorted;
  const letters = [...new Set(list.map((t) => t.term[0].toUpperCase()))];

  return (
    <div className="page wide">
      <div className="page-head">
        <div><h1>Glosar VCF</h1><p>{meta.glossary.length} termeni și acronime, fiecare cu definiție, de ce contează și legături către lecții și laboratoare.</p></div>
      </div>
      <div className="explorer" style={{ gridTemplateColumns: '320px minmax(0,1fr)' }}>
        <nav className="panel" aria-label="Termeni" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', position: 'sticky', top: 'calc(var(--topbar) + 16px)' }}>
          <input type="search" placeholder="Filtrează termenii…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrează glosarul" style={{ marginBottom: 10 }} />
          {letters.map((L) => (
            <div key={L}>
              <div className="section-label" style={{ marginTop: 8 }}>{L}</div>
              <div className="tree">
                {list.filter((t) => t.term[0].toUpperCase() === L).map((t) => (
                  <Link key={t.id} to={`/glossary/${t.id}`} className={t.id === id ? 'active' : ''}>{t.term}{t.expansion && <span className="faint tiny"> {t.expansion}</span>}</Link>
                ))}
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="small faint">Niciun termen pentru „{filter}”.</p>}
        </nav>
        <div>
          {!term ? (
            id ? <Empty title="Termenul nu există în glosar." /> : (
              <div className="grid grid-2">
                {list.slice(0, 40).map((t) => (
                  <Link key={t.id} to={`/glossary/${t.id}`} className="panel" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                    <strong>{t.term}</strong>{t.expansion && <span className="faint small"> · {t.expansion}</span>}
                    <div className="small muted" style={{ marginTop: 4 }}>{t.definition.replace(/[*_`[\]]/g, '').slice(0, 150)}{t.definition.length > 150 ? '…' : ''}</div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <article className="panel stack">
              <div className="row between">
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{term.term}</h2>
                  {term.expansion && <div className="muted">{term.expansion}</div>}
                </div>
                <div className="row">
                  <VersionChip v={term.version} />
                  <button className="btn sm" aria-pressed={bookmarks.some((b) => b.key === `term:${term.id}`)} onClick={() => toggleBookmark({ key: `term:${term.id}`, kind: 'term', ref: term.id, title: term.term, url: `/glossary/${term.id}` })}>☆ Salvează</button>
                </div>
              </div>
              <div><div className="section-label">Definiție</div><Md src={term.definition} /></div>
              <div><div className="section-label">De ce contează</div><Md src={term.whyItMatters} /></div>
              {term.related.length > 0 && <div><div className="section-label">Concepte conexe</div><div className="row" style={{ gap: 5 }}>{term.related.map((r) => termsById.has(r) ? <Link key={r} className="chip" to={`/glossary/${r}`}>{termsById.get(r)!.term}</Link> : null)}</div></div>}
              {term.lessons.some((l) => lessonsById.has(l)) && <div><div className="section-label">Lecții</div><ul className="list small">{term.lessons.filter((l) => lessonsById.has(l)).map((l) => <li key={l}><Link to={`/learn/${l}`}>{lessonsById.get(l)!.title}</Link></li>)}</ul></div>}
              {term.labs.some((l) => labsById.has(l)) && <div><div className="section-label">Laboratoare</div><ul className="list small">{term.labs.filter((l) => labsById.has(l)).map((l) => <li key={l}><Link to={`/labs/${l}`}>{labsById.get(l)!.title}</Link></li>)}</ul></div>}
              <div className="small"><Link to={`/search?q=${encodeURIComponent(term.term)}`}>Caută „{term.term}” în tot conținutul →</Link></div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
