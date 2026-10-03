import { useMemo, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { getDiagram, componentsById, type TDiagram } from '../content';
import { useAsync } from './ui';
import { renderInline } from './markdown';

const KIND_LABEL: Record<string, string> = {
  mgmt: 'Management', compute: 'Compute', storage: 'Storage', network: 'Rețea fizică', nsx: 'NSX', ops: 'Operations',
  security: 'Securitate', external: 'Extern', vm: 'Workload',
};
const EDGE_COLOR: Record<string, string> = {
  mgmt: 'var(--k-mgmt)', data: 'var(--text-2)', overlay: 'var(--k-nsx)', control: 'var(--violet)', storage: 'var(--k-storage)',
  'north-south': 'var(--k-ops)', dependency: 'var(--text-3)',
};

type Box = { x: number; y: number; w: number; h: number };

/** Point where the segment from the box centre towards (tx, ty) leaves the box. */
function anchor(b: Box, tx: number, ty: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? (b.w / 2) / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? (b.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

function wrap(label: string, maxChars: number): string[] {
  const words = label.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export interface DiagramViewProps {
  d: TDiagram;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** Overrides step highlighting (used by the architecture explorer). */
  highlight?: string[] | null;
  failed?: Set<string>;
  compact?: boolean;
  showInfo?: boolean;
}

export function DiagramView({ d, selected: selProp, onSelect, highlight: hlProp, failed, compact, showInfo = true }: DiagramViewProps) {
  const [selLocal, setSelLocal] = useState<string | null>(null);
  const [step, setStep] = useState<number>(-1);
  const [showText, setShowText] = useState(false);
  const uid = useId().replace(/:/g, '');
  const selected = selProp !== undefined ? selProp : selLocal;
  const select = (id: string | null) => (onSelect ? onSelect(id) : setSelLocal(id));

  const boxes = useMemo(() => {
    const m = new Map<string, Box>();
    for (const g of d.groups) m.set(g.id, g);
    for (const n of d.nodes) m.set(n.id, n);
    return m;
  }, [d]);

  const highlight = hlProp ?? (step >= 0 ? d.steps[step]?.highlight ?? null : null);
  const hl = highlight ? new Set(highlight) : null;
  const isDim = (id: string) => !!hl && !hl.has(id);
  const node = d.nodes.find((n) => n.id === selected);
  const kinds = [...new Set(d.nodes.map((n) => n.kind))];

  return (
    <figure className="diagram" aria-labelledby={`${uid}-t`}>
      <div className="diagram-head">
        <h4 id={`${uid}-t`}>{d.title}</h4>
        <span className="spacer" />
        {!compact && <div className="legend" aria-hidden="true">{kinds.map((k) => <span key={k}><i style={{ background: `var(--k-${k})` }} />{KIND_LABEL[k]}</span>)}</div>}
        <button type="button" className="btn ghost sm" aria-pressed={showText} onClick={() => setShowText((v) => !v)}>Descriere text</button>
      </div>
      <svg viewBox={`0 0 ${d.width} ${d.height}`} role="group" aria-label={`${d.title}. Selectează o componentă pentru detalii.`}>
        <defs>
          {Object.entries(EDGE_COLOR).map(([k, c]) => (
            <marker key={k} id={`${uid}-arr-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" style={{ fill: c }} />
            </marker>
          ))}
        </defs>
        {d.groups.map((g) => (
          <g key={g.id} className={`d-group ${isDim(g.id) ? 'd-dim' : ''}`}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={10} style={{ stroke: `var(--k-${g.kind}, var(--border-strong))`, fill: `color-mix(in srgb, var(--k-${g.kind}, var(--text-3)) 5%, transparent)` }} />
            <text x={g.x + 10} y={g.y + 18} style={{ fill: `var(--k-${g.kind}, var(--text-3))` }}>{g.label}</text>
          </g>
        ))}
        {d.edges.map((e, i) => {
          const a = boxes.get(e.from);
          const b = boxes.get(e.to);
          if (!a || !b) return null;
          const p1 = anchor(a, b.x + b.w / 2, b.y + b.h / 2);
          const p2 = anchor(b, a.x + a.w / 2, a.y + a.h / 2);
          const dim = hl ? !(hl.has(e.from) && hl.has(e.to)) : false;
          const color = EDGE_COLOR[e.kind] ?? 'var(--text-2)';
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          return (
            <g key={i} className={dim ? 'd-dim' : ''}>
              <line className="d-edge" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} style={{ stroke: color }} strokeDasharray={e.dashed ? '6 4' : undefined}
                markerEnd={`url(#${uid}-arr-${e.kind})`} markerStart={e.bidirectional ? `url(#${uid}-arr-${e.kind})` : undefined} />
              {e.label && (
                <g>
                  <rect x={mx - e.label.length * 3.1 - 4} y={my - 9} width={e.label.length * 6.2 + 8} height={17} rx={4} style={{ fill: 'var(--bg-sunk)', opacity: 0.92 }} />
                  <text className="d-edge-label" x={mx} y={my + 4} textAnchor="middle" style={{ fill: color }}>{e.label}</text>
                </g>
              )}
            </g>
          );
        })}
        {d.nodes.map((n) => {
          const lines = wrap(n.label, Math.max(8, Math.floor(n.w / 8.2)));
          const isFailed = failed?.has(n.id);
          const color = isFailed ? 'var(--bad)' : `var(--k-${n.kind})`;
          const sel = selected === n.id;
          const total = lines.length + (n.sublabel ? 1 : 0);
          const startY = n.y + n.h / 2 - (total - 1) * 7.5 + 4;
          return (
            <g key={n.id} className={`d-node ${sel ? 'selected' : ''} ${isDim(n.id) ? 'd-dim' : ''}`} tabIndex={0} role="button"
              aria-pressed={sel} aria-label={`${n.label}${n.sublabel ? `, ${n.sublabel}` : ''}`}
              onClick={() => select(sel ? null : n.id)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(sel ? null : n.id); } }}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={7} style={{ stroke: color, fill: `color-mix(in srgb, ${color} ${isFailed ? 22 : 13}%, var(--panel))` }} />
              {lines.map((l, i) => (
                <text key={i} x={n.x + n.w / 2} y={startY + i * 15} textAnchor="middle" fontSize="13" fontWeight="600" style={{ fill: 'var(--text)' }}>{l}</text>
              ))}
              {n.sublabel && <text x={n.x + n.w / 2} y={startY + lines.length * 15} textAnchor="middle" fontSize="11" style={{ fill: 'var(--text-3)' }}>{n.sublabel}</text>}
              {isFailed && <text x={n.x + n.w - 8} y={n.y + 14} textAnchor="end" fontSize="12" style={{ fill: 'var(--bad)' }}>✕</text>}
            </g>
          );
        })}
      </svg>
      <div className="diagram-foot">
        {showText && <div className="diagram-info"><h5>Descriere</h5><div dangerouslySetInnerHTML={{ __html: renderInline(d.description) }} /></div>}
        {showInfo && (
          <div className="diagram-info" aria-live="polite">
            {node ? (
              <>
                <h5>{node.label}{node.sublabel ? <span className="faint"> · {node.sublabel}</span> : null}</h5>
                <div dangerouslySetInnerHTML={{ __html: renderInline(node.info) }} />
                {node.component && componentsById.has(node.component) && (
                  <div className="small" style={{ marginTop: 4 }}><Link to={`/architecture/${node.component}`}>Deschide „{componentsById.get(node.component)!.name}” în Architecture Explorer →</Link></div>
                )}
              </>
            ) : step >= 0 && d.steps[step] ? (
              <><h5>Pas {step + 1}: {d.steps[step].title}</h5><div dangerouslySetInnerHTML={{ __html: renderInline(d.steps[step].text) }} /></>
            ) : (
              <span className="faint small">Selectează o componentă din diagramă pentru a vedea ce face{d.steps.length ? ', sau parcurge fluxul pas cu pas' : ''}.</span>
            )}
          </div>
        )}
        {d.steps.length > 0 && (
          <div className="diagram-steps">
            <span className="small faint">Flux:</span>
            <button type="button" className="btn sm" onClick={() => { select(null); setStep((s) => Math.max(-1, s - 1)); }} disabled={step < 0}>← Înapoi</button>
            <span className="small" aria-live="polite">{step < 0 ? `${d.steps.length} pași` : `Pas ${step + 1} / ${d.steps.length}`}</span>
            <button type="button" className="btn sm primary" onClick={() => { select(null); setStep((s) => Math.min(d.steps.length - 1, s + 1)); }} disabled={step >= d.steps.length - 1}>{step < 0 ? 'Pornește fluxul' : 'Următorul →'}</button>
            {step >= 0 && <button type="button" className="btn ghost sm" onClick={() => setStep(-1)}>Arată tot</button>}
          </div>
        )}
      </div>
    </figure>
  );
}

export function Diagram({ id, compact }: { id: string; compact?: boolean }) {
  const { data, loading } = useAsync(() => getDiagram(id), [id]);
  if (loading) return <div className="diagram"><div className="diagram-info faint small">Se încarcă diagrama…</div></div>;
  if (!data) return null;
  return <DiagramView d={data} compact={compact} />;
}
