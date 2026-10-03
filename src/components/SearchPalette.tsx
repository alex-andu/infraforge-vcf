import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { search, GROUPS, highlight, type Hit } from './search';

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Map<string, Hit[]>>(new Map());
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    let alive = true;
    search(q, 5).then((r) => { if (alive) { setRes(r); setActive(0); setLoading(false); } });
    return () => { alive = false; };
  }, [q]);

  const flat = GROUPS.flatMap((g) => res.get(g.id) ?? []);
  const go = (h: Hit | undefined) => { if (h) { navigate(h.url); onClose(); } };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Căutare globală">
        <input ref={inputRef} type="search" value={q} placeholder="Caută: Tier-0, vSAN ESA, certificate, vmkping…" aria-label="Termen de căutare"
          aria-controls="palette-results" aria-activedescendant={flat[active] ? `pr-${active}` : undefined}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (flat[active]) go(flat[active]); else if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q)}`); onClose(); } }
          }} />
        <div className="palette-results" id="palette-results" role="listbox">
          {!q.trim() && <div className="faint small" style={{ padding: 12 }}>Caută în lecții, arhitectură, laboratoare, incidente, glosar, comenzi și explicațiile din quiz-uri. <kbd>↑</kbd><kbd>↓</kbd> navighează, <kbd>Enter</kbd> deschide, <kbd>Esc</kbd> închide.</div>}
          {q.trim() && !loading && flat.length === 0 && <div className="faint small" style={{ padding: 12 }}>Niciun rezultat pentru „{q}”.</div>}
          {GROUPS.map((g) => {
            const hits = res.get(g.id);
            if (!hits?.length) return null;
            return (
              <div key={g.id}>
                <div className="palette-group">{g.label}</div>
                {hits.map((h) => {
                  const i = flat.indexOf(h);
                  return (
                    <a key={h.id} id={`pr-${i}`} role="option" aria-selected={i === active} href={h.url}
                      className={`palette-item ${i === active ? 'active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={(e) => { e.preventDefault(); go(h); }}>
                      <span dangerouslySetInnerHTML={{ __html: highlight(h.title, q) }} />
                      <span className="ctx" dangerouslySetInnerHTML={{ __html: highlight(h.snippet || h.context, q) }} />
                    </a>
                  );
                })}
              </div>
            );
          })}
          {q.trim() && flat.length > 0 && (
            <button type="button" className="btn ghost sm" style={{ margin: 6 }} onClick={() => { navigate(`/search?q=${encodeURIComponent(q)}`); onClose(); }}>Toate rezultatele pentru „{q}” →</button>
          )}
        </div>
      </div>
    </div>
  );
}
