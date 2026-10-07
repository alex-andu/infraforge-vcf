import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { meta, componentsById, lessonsById, labsById, type TArchComponent, type TDiagram } from '../content';
import { DiagramView } from '../components/Diagram';
import { Md } from '../components/RichContent';
import { VersionChip, useDocumentTitle, Empty } from '../components/ui';

const CAT_KIND: Record<string, TDiagram['nodes'][number]['kind']> = {
  fleet: 'mgmt', management: 'mgmt', compute: 'compute', storage: 'storage', network: 'nsx', security: 'security', operations: 'ops', automation: 'ops', external: 'external',
};
const CAT_RO: Record<string, string> = { fleet: 'Fleet', management: 'Management', compute: 'Compute', storage: 'Storage', network: 'Rețea / NSX', security: 'Securitate', operations: 'Operations', automation: 'Automation', external: 'Dependențe externe' };
const CAT_ORDER = ['fleet', 'management', 'operations', 'automation', 'security', 'compute', 'storage', 'network', 'external'];

/** Everything that (transitively) depends on `id` — what breaks if `id` fails. */
export function impactOf(id: string): string[] {
  const out = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const c of meta.components) if (c.dependsOn.includes(cur) && !out.has(c.id) && c.id !== id) { out.add(c.id); queue.push(c.id); }
  }
  return [...out];
}

function focusDiagram(c: TArchComponent): TDiagram {
  const parentId = c.parent && componentsById.has(c.parent) ? c.parent : null;
  const deps = [...new Set(c.dependsOn)].filter((d) => componentsById.has(d) && d !== parentId && d !== c.id);
  const dependents = meta.components.filter((x) => x.dependsOn.includes(c.id) && x.id !== parentId && x.id !== c.id && !deps.includes(x.id)).map((x) => x.id);
  const comms = [...new Set(c.communicatesWith.map((x) => x.id))].filter((x) => componentsById.has(x) && x !== c.id && x !== parentId && !deps.includes(x) && !dependents.includes(x));
  const children = meta.components.filter((x) => x.parent === c.id).map((x) => x.id).filter((x) => !deps.includes(x) && !dependents.includes(x) && !comms.includes(x));
  const W = 1000;
  const nodes: TDiagram['nodes'] = [];
  const groups: TDiagram['groups'] = [];
  const edges: TDiagram['edges'] = [];
  const col = (ids: string[], x: number, label: string, kindEdge: TDiagram['edges'][number]['kind'], dir: 'in' | 'out') => {
    if (!ids.length) return;
    const h = 48;
    const gap = 12;
    const total = ids.length * (h + gap) - gap;
    const y0 = Math.max(70, 300 - total / 2);
    groups.push({ id: `g-${label}`, x: x - 12, y: y0 - 34, w: 224, h: total + 46, label, kind: 'zone' });
    ids.forEach((id, i) => {
      const comp = componentsById.get(id)!;
      nodes.push({ id, x, y: y0 + i * (h + gap), w: 200, h, label: comp.name, kind: CAT_KIND[comp.category] ?? 'compute', info: comp.summary, component: id });
      edges.push(dir === 'out' ? { from: c.id, to: id, kind: kindEdge, dashed: false, bidirectional: false } : { from: id, to: c.id, kind: kindEdge, dashed: false, bidirectional: false });
    });
  };
  nodes.push({ id: c.id, x: W / 2 - 110, y: 270, w: 220, h: 64, label: c.name, sublabel: CAT_RO[c.category], kind: CAT_KIND[c.category] ?? 'compute', info: c.summary });
  col(deps.slice(0, 8), 30, 'Depinde de', 'dependency', 'out');
  col(dependents.slice(0, 8), W - 230, 'Depind de el', 'dependency', 'in');
  if (c.parent && componentsById.has(c.parent)) {
    const p = componentsById.get(c.parent)!;
    nodes.push({ id: p.id, x: W / 2 - 100, y: 40, w: 200, h: 48, label: p.name, sublabel: 'face parte din', kind: CAT_KIND[p.category] ?? 'mgmt', info: p.summary, component: p.id });
    edges.push({ from: c.id, to: p.id, kind: 'mgmt', dashed: true, bidirectional: false });
  }
  const bottom = [...comms, ...children].slice(0, 4);
  bottom.forEach((id, i) => {
    const comp = componentsById.get(id)!;
    const x = W / 2 - (bottom.length * 210) / 2 + i * 210 + 5;
    nodes.push({ id, x, y: 480, w: 200, h: 48, label: comp.name, kind: CAT_KIND[comp.category] ?? 'compute', info: comp.summary, component: id });
    edges.push({ from: c.id, to: id, kind: children.includes(id) ? 'mgmt' : 'control', dashed: !children.includes(id), bidirectional: !children.includes(id), label: children.includes(id) ? 'conține' : 'comunică' });
  });
  return { id: `focus-${c.id}`, title: `Relațiile pentru ${c.name}`, description: `${c.name} depinde de: ${deps.map((d) => componentsById.get(d)?.name).join(', ') || 'nimic'}. Depind de el: ${dependents.map((d) => componentsById.get(d)?.name).join(', ') || 'nimic'}. Comunică și cu: ${comms.map((d) => componentsById.get(d)?.name).join(', ') || 'nimic'}.`, width: W, height: 560, groups, nodes, edges, steps: [] };
}

function fullMap(): TDiagram {
  const cats = CAT_ORDER.filter((cat) => meta.components.some((c) => c.category === cat));
  const colW = 1000 / cats.length;
  const nodes: TDiagram['nodes'] = [];
  let maxRows = 0;
  cats.forEach((cat, ci) => {
    const list = meta.components.filter((c) => c.category === cat);
    maxRows = Math.max(maxRows, list.length);
    list.forEach((c, i) => nodes.push({ id: c.id, x: ci * colW + 6, y: 40 + i * 62, w: colW - 12, h: 50, label: c.name, kind: CAT_KIND[cat] ?? 'compute', info: c.summary, component: c.id }));
  });
  const edges: TDiagram['edges'] = meta.components.flatMap((c) => c.dependsOn.filter((d) => componentsById.has(d)).map((d) => ({ from: c.id, to: d, kind: 'dependency' as const, dashed: false, bidirectional: false })));
  const groups = cats.map((cat, ci) => ({ id: `g-${cat}`, x: ci * colW + 2, y: 8, w: colW - 4, h: 40 + maxRows * 62, label: CAT_RO[cat], kind: CAT_KIND[cat] ?? 'zone' }));
  return { id: 'full', title: 'Harta componentelor VCF', description: 'Toate componentele grupate pe categorii; săgețile arată dependențele (A → B înseamnă că A depinde de B).', width: 1000, height: 60 + maxRows * 62, groups, nodes, edges, steps: [] };
}

export default function Architecture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<'focus' | 'map'>(id ? 'focus' : 'map');
  const [simulate, setSimulate] = useState(false);
  const c = id ? componentsById.get(id) : undefined;
  useDocumentTitle(c ? `${c.name} · Arhitectură` : 'Architecture Explorer');
  const impact = useMemo(() => (c ? impactOf(c.id) : []), [c]);
  const failed = useMemo(() => (simulate && c ? new Set([c.id, ...impact]) : undefined), [simulate, c, impact]);
  const diagram = useMemo(() => (view === 'focus' && c ? focusDiagram(c) : fullMap()), [view, c]);

  const roots = meta.components.filter((x) => !x.parent || !componentsById.has(x.parent));
  const renderTree = (list: TArchComponent[]): React.ReactNode => list.map((x) => {
    const kids = meta.components.filter((k) => k.parent === x.id);
    return (
      <div key={x.id}>
        <Link to={`/architecture/${x.id}`} className={x.id === id ? 'active' : ''} aria-current={x.id === id ? 'page' : undefined} onClick={() => { setView('focus'); setSimulate(false); }}>
          <span className="kind-sw" style={{ background: `var(--k-${CAT_KIND[x.category]})` }} />{x.name}
        </Link>
        {kids.length > 0 && <div className="indent">{renderTree(kids)}</div>}
      </div>
    );
  });

  if (!meta.components.length) return <div className="page"><Empty title="Exploratorul de arhitectură nu are încă date." /></div>;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Architecture Explorer</h1>
          <p>VCF ca sistem interconectat: selectează o componentă ca să vezi ce face, unde rulează, cine o gestionează, de ce depinde și ce se strică dacă pică.</p>
        </div>
        <div className="row">
          <div className="seg" role="tablist" aria-label="Vizualizare">
            <button type="button" role="tab" aria-selected={view === 'map'} onClick={() => setView('map')}>Hartă completă</button>
            <button type="button" role="tab" aria-selected={view === 'focus'} disabled={!c} onClick={() => setView('focus')}>Relații componentă</button>
          </div>
          <Link className="btn" to="/scenarios">Scenarii de design</Link>
        </div>
      </div>
      <div className="explorer">
        <nav className="panel tree" aria-label="Componente">{renderTree(roots)}</nav>
        <div>
          <DiagramView d={diagram} selected={c?.id ?? null} failed={failed} onSelect={(sel) => { if (sel && componentsById.has(sel)) navigate(`/architecture/${sel}`); }} showInfo={false} />
          {view === 'focus' && c && <p className="small faint">Click pe o componentă pentru a naviga la ea. Săgețile „Depinde de” arată dependențe; liniile punctate arată comunicare.</p>}
        </div>
        <aside className="panel detail" aria-live="polite">
          {!c ? <p className="muted small">Selectează o componentă din listă sau din hartă.</p> : (
            <div className="stack">
              <div>
                <div className="row"><span className="chip">{CAT_RO[c.category]}</span><VersionChip v={c.version} /></div>
                <h2 style={{ margin: '6px 0 4px' }}>{c.name}</h2>
                <p className="small muted" style={{ margin: 0 }}>{c.summary}</p>
              </div>
              <div><div className="section-label">Funcție</div><div className="small"><Md src={c.function} /></div></div>
              <div className="grid grid-2" style={{ gap: 8 }}>
                <div className="fact"><div className="k">Rulează pe</div><div className="small">{c.runsOn}</div></div>
                <div className="fact"><div className="k">Gestionat de</div><div className="small">{c.managedBy}</div></div>
              </div>
              {c.dependsOn.length > 0 && <div><div className="section-label">Depinde de</div><div className="row" style={{ gap: 5 }}>{c.dependsOn.map((d) => componentsById.has(d) ? <Link key={d} className="chip" to={`/architecture/${d}`}>{componentsById.get(d)!.name}</Link> : <span key={d} className="chip">{d}</span>)}</div></div>}
              {c.communicatesWith.length > 0 && (
                <div>
                  <div className="section-label">Comunică cu</div>
                  <table className="table"><tbody>{c.communicatesWith.map((x) => (
                    <tr key={x.id}><td className="small">{componentsById.has(x.id) ? <Link to={`/architecture/${x.id}`}>{componentsById.get(x.id)!.name}</Link> : x.id}</td><td className="small">{x.purpose}{x.protocol && <div className="tiny faint mono">{x.protocol}</div>}</td></tr>
                  ))}</tbody></table>
                </div>
              )}
              <div><div className="section-label">Impact la cădere</div><div className="small"><Md src={c.failureImpact} /></div></div>
              <div>
                <button className="btn sm" aria-pressed={simulate} onClick={() => { const on = !simulate; setSimulate(on); if (on) setView('map'); }}>{simulate ? 'Oprește simularea' : 'Simulează căderea'}</button>
                {simulate && <div className="small" style={{ marginTop: 6 }}>{impact.length ? <>Afectate în cascadă ({impact.length}): {impact.map((x) => componentsById.get(x)?.name).join(', ')}.</> : 'Nicio componentă din model nu depinde direct de aceasta.'}</div>}
              </div>
              <div><div className="section-label">Cum verifici că funcționează</div><div className="small"><Md src={c.verify} /></div></div>
              {(c.lessons.some((l) => lessonsById.has(l)) || c.labs.some((l) => labsById.has(l))) && (
                <div><div className="section-label">Învață și exersează</div>
                  <ul className="list small">
                    {c.lessons.filter((l) => lessonsById.has(l)).map((l) => <li key={l}>Lecție: <Link to={`/learn/${l}`}>{lessonsById.get(l)!.title}</Link></li>)}
                    {c.labs.filter((l) => labsById.has(l)).map((l) => <li key={l}>Ghid: <Link to={`/labs/${l}`}>{labsById.get(l)!.title}</Link></li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
