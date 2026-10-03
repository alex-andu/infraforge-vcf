import { useState } from 'react';
import { Link } from 'react-router-dom';
import { meta, lessonsById } from '../content';
import { VersionChip, useDocumentTitle, Empty } from '../components/ui';

const TECH_RO: Record<string, string> = { esxi: 'ESX', vsphere: 'vSphere', vsan: 'vSAN', nsx: 'NSX', vcf: 'VCF', powercli: 'PowerCLI', api: 'API', network: 'Diagnostic rețea', linux: 'Linux / appliance' };

export default function Reference() {
  useDocumentTitle('Referință comenzi și API');
  const [tech, setTech] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const techs = Object.keys(TECH_RO).filter((t) => meta.commands.some((c) => c.technology === t));
  const f = q.trim().toLowerCase();
  const list = meta.commands.filter((c) => (!tech || c.technology === tech) && (!f || `${c.title} ${c.purpose} ${c.syntax} ${c.example}`.toLowerCase().includes(f)));

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Referință: comenzi și API</h1><p>{meta.commands.length} comenzi verificate, cu scop, sintaxă, exemplu, output așteptat și greșeala frecventă.</p></div>
        <input type="search" placeholder="Filtrează comenzile…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filtrează comenzile" style={{ width: 280 }} />
      </div>
      <div className="seg" role="group" aria-label="Tehnologie" style={{ marginBottom: 14 }}>
        <button type="button" aria-pressed={!tech} onClick={() => setTech(null)}>Toate</button>
        {techs.map((t) => <button key={t} type="button" aria-pressed={tech === t} onClick={() => setTech(t)}>{TECH_RO[t]} ({meta.commands.filter((c) => c.technology === t).length})</button>)}
      </div>
      {list.length === 0 ? <Empty title="Nicio comandă pentru acest filtru." /> : (
        <div className="stack">
          {list.map((c) => (
            <section key={c.id} id={c.id} className="panel" style={{ scrollMarginTop: 'calc(var(--topbar) + 12px)' }}>
              <div className="row between">
                <h2 style={{ margin: 0, fontSize: '1.02rem' }}>{c.title}</h2>
                <div className="row"><span className="chip">{TECH_RO[c.technology]}</span><VersionChip v={c.version} /></div>
              </div>
              <p className="small muted" style={{ margin: '4px 0 10px' }}>{c.purpose}</p>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="prose">
                  <div className="section-label">Sintaxă</div>
                  <pre><code>{c.syntax}</code></pre>
                  <div className="section-label">Exemplu</div>
                  <pre><code>{c.example}</code></pre>
                </div>
                <div className="prose">
                  <div className="section-label">Output așteptat</div>
                  <pre><code>{c.output}</code></pre>
                </div>
              </div>
              <div className="callout warning" style={{ margin: '8px 0 0' }}><div className="callout-title">Greșeală frecventă</div>{c.mistake}</div>
              <div className="row small" style={{ marginTop: 8 }}>
                {c.lesson && lessonsById.has(c.lesson) && <span>Lecție: <Link to={`/learn/${c.lesson}`}>{lessonsById.get(c.lesson)!.title}</Link></span>}
                {c.source && <span>Sursă: <a href={c.source.url} target="_blank" rel="noopener noreferrer">{c.source.title}</a></span>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
