import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { search, GROUPS, highlight, type Hit } from '../components/search';
import { useDocumentTitle } from '../components/ui';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const [res, setRes] = useState<Map<string, Hit[]> | null>(null);
  useDocumentTitle(q ? `Căutare: ${q}` : 'Căutare');

  useEffect(() => {
    let alive = true;
    search(q, 50).then((r) => alive && setRes(r));
    return () => { alive = false; };
  }, [q]);

  const total = res ? [...res.values()].reduce((n, x) => n + x.length, 0) : 0;
  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <h1>Căutare</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setParams(input ? { q: input } : {}); }} role="search" style={{ marginBottom: 16 }}>
        <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tier-0, vSAN ESA, certificate, vmkping…" aria-label="Termen de căutare" style={{ flex: 1, width: 'auto' }} autoFocus />
        <button className="btn primary" type="submit">Caută</button>
      </form>
      {q && res && <p className="small muted">{total} rezultate pentru „{q}”</p>}
      {q && res && total === 0 && <p className="muted">Niciun rezultat. Încearcă un termen mai scurt sau un acronim (de ex. „TEP”, „SR”, „FTT”).</p>}
      {res && GROUPS.map((g) => {
        const hits = res.get(g.id);
        if (!hits?.length) return null;
        return (
          <section key={g.id} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1rem' }}>{g.label} <span className="faint small">({hits.length})</span></h2>
            <ul className="list panel" style={{ padding: '4px 14px' }}>
              {hits.map((h) => (
                <li key={h.id}>
                  <Link to={h.url} dangerouslySetInnerHTML={{ __html: highlight(h.title, q) }} />
                  <div className="small muted" dangerouslySetInnerHTML={{ __html: highlight(h.snippet || h.context, q) }} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
