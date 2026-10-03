import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getIncident, lessonsById, type TIncident } from '../content';
import { useStore } from '../state/store';
import { Md } from '../components/RichContent';
import { useAsync, Loading, NotFound, DifficultyChip, VersionChip, useDocumentTitle } from '../components/ui';
import { scoreIncident } from '../engine/incident';

const CAT_RO: Record<string, string> = { logs: 'Loguri', network: 'Rețea', dns: 'DNS', ntp: 'NTP', services: 'Servicii', certificates: 'Certificate', hosts: 'Hosturi', storage: 'Storage', nsx: 'NSX' };
const STAGES = ['Investighează', 'Cauza', 'Pasul următor', 'Remediere', 'Validare', 'Debrief'] as const;
const NO_RUNS: never[] = [];
type Stage = 0 | 1 | 2 | 3 | 4 | 5;
type ChoiceKey = 'rootCause' | 'nextStep' | 'remediation' | 'validation';

function ChoiceStage({ inc, k, prompt, picks, onPick, onNext }: { inc: TIncident; k: ChoiceKey; prompt: string; picks: string[]; onPick: (id: string) => void; onNext: () => void }) {
  const solved = picks.some((p) => inc[k].find((c) => c.id === p)?.correct);
  return (
    <div className="stack">
      <h3 style={{ margin: 0 }}>{prompt}</h3>
      <div className="options">
        {inc[k].map((c, i) => {
          const picked = picks.includes(c.id);
          const cls = picked ? (c.correct ? 'correct' : 'wrong') : '';
          return (
            <button key={c.id} type="button" className={`option ${cls}`} disabled={solved || picked} onClick={() => onPick(c.id)} aria-pressed={picked}>
              <span className="key">{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1 }}><Md src={c.text} inline />{picked && <span className="why"><strong>{c.correct ? '✓ ' : '✕ '}</strong><Md src={c.why} inline /></span>}</span>
            </button>
          );
        })}
      </div>
      {picks.length > 0 && !solved && <div className="small" style={{ color: 'var(--warn)' }}>Nu este alegerea potrivită. Recitește dovezile și încearcă din nou (doar prima încercare se punctează).</div>}
      {solved && <div><button className="btn primary" onClick={onNext}>Continuă →</button></div>}
    </div>
  );
}

export default function IncidentPage() {
  const { id = '' } = useParams();
  const { data: inc, loading } = useAsync(() => getIncident(id), [id]);
  const record = useStore((s) => s.recordIncident);
  const runs = useStore((s) => s.incidents[id]) ?? NO_RUNS;
  const [stage, setStage] = useState<Stage>(0);
  const [collected, setCollected] = useState<string[]>([]);
  const [support, setSupport] = useState<Set<string>>(new Set());
  const [picks, setPicks] = useState<Record<ChoiceKey, string[]>>({ rootCause: [], nextStep: [], remediation: [], validation: [] });
  const [hints, setHints] = useState(0);
  const [cat, setCat] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useDocumentTitle(inc?.title ?? 'Incident');

  const result = useMemo(() => (inc ? scoreIncident(inc, { collected, support: [...support], picks, hints }) : null), [inc, collected, support, picks, hints]);

  if (loading) return <Loading what="incidentul" />;
  if (!inc || !result) return <NotFound what="Incidentul" />;

  const categories = [...new Set(inc.evidence.map((e) => e.category))];
  const activeCat = cat ?? categories[0];
  const restart = () => { setStage(0); setCollected([]); setSupport(new Set()); setPicks({ rootCause: [], nextStep: [], remediation: [], validation: [] }); setHints(0); setSaved(false); };
  const pick = (k: ChoiceKey, cid: string) => setPicks((p) => ({ ...p, [k]: [...p[k], cid] }));
  const finish = () => {
    setStage(5);
    if (!saved) { record(id, { at: Date.now(), score: result.total, solved: true, hints, actions: collected }); setSaved(true); }
  };

  return (
    <div className="page wide">
      <div className="crumbs"><Link to="/troubleshoot">Troubleshooting</Link><span>›</span><span>{inc.title}</span></div>
      <div className="page-head">
        <div>
          <h1>{inc.title}</h1>
          <div className="row"><DifficultyChip d={inc.difficulty} /><VersionChip v={inc.version} /><span className="chip bad">Simulator de incident</span>{runs.length > 0 && <span className="small faint">Cel mai bun scor: {Math.max(...runs.map((r) => r.score))}/100</span>}</div>
        </div>
        <button className="btn ghost" onClick={restart}>Reia de la zero</button>
      </div>
      <div className="stepper" aria-label="Etape">{STAGES.map((s, i) => <span key={s} className={i === stage ? 'active' : i < stage ? 'done' : ''}>{i + 1}. {s}</span>)}</div>

      <div className="incident-grid">
        <aside className="stack">
          <section className="panel">
            <div className="section-label">Raport incident</div>
            <p className="small">{inc.summary}</p>
            <div className="section-label">Simptome</div>
            <ul className="small symptoms" style={{ paddingLeft: 18 }}>{inc.symptoms.map((s) => <li key={s}>{s}</li>)}</ul>
            <details><summary className="small" style={{ cursor: 'pointer' }}>Mediul afectat</summary><div className="small"><Md src={inc.environment} /></div></details>
          </section>
          {stage === 0 && (
            <section className="panel">
              <div className="section-label">Acțiuni de diagnostic</div>
              <div className="tabs" role="tablist" aria-label="Categorii de dovezi" style={{ flexWrap: 'wrap' }}>
                {categories.map((c) => <button key={c} type="button" role="tab" aria-selected={activeCat === c} onClick={() => setCat(c)}>{CAT_RO[c]}</button>)}
              </div>
              <div className="evidence-actions" role="tabpanel">
                {inc.evidence.filter((e) => e.category === activeCat).map((e) => (
                  <button key={e.id} type="button" className="evidence-action" disabled={collected.includes(e.id)} onClick={() => setCollected((c) => [...c, e.id])}>
                    <span aria-hidden="true">{collected.includes(e.id) ? '✓' : '▸'}</span><span>{e.action}</span>
                  </button>
                ))}
              </div>
              <div className="small faint" style={{ marginTop: 8 }}>Fiecare acțiune costă timp. Acțiunile irelevante scad scorul de secvențiere.</div>
            </section>
          )}
          <section className="panel">
            <div className="row between"><div className="section-label" style={{ margin: 0 }}>Indicii ({hints}/{inc.hints.length})</div>
              <button className="btn sm" disabled={hints >= inc.hints.length || stage === 5} onClick={() => setHints((h) => h + 1)}>Cere un indiciu (−5)</button></div>
            {inc.hints.slice(0, hints).map((h, i) => <p key={i} className="small" style={{ marginTop: 8, marginBottom: 0 }}><strong>{i + 1}.</strong> {h}</p>)}
          </section>
        </aside>

        <div className="stack">
          {stage === 0 && (
            <>
              <div className="row between">
                <h2 style={{ margin: 0 }}>Dovezi colectate ({collected.length})</h2>
                <button className="btn primary" disabled={collected.length < 2} onClick={() => setStage(1)}>Am destule dovezi: formulez diagnosticul →</button>
              </div>
              {collected.length === 0 && <div className="empty"><strong>Încă nu ai colectat dovezi.</strong>Începe cu Observe și Scope: ce componentă e afectată și ce funcționează încă? Alege acțiuni din panoul din stânga.</div>}
              <div className="evidence-log">
                {[...collected].reverse().map((cid) => {
                  const e = inc.evidence.find((x) => x.id === cid)!;
                  return (
                    <article key={cid} className="evidence-entry">
                      <header><span className="chip">{CAT_RO[e.category]}</span><strong>{e.action}</strong></header>
                      <div className="body"><Md src={e.output} /></div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {stage === 1 && (
            <section className="panel stack">
              <ChoiceStage inc={inc} k="rootCause" prompt="Care este cea mai probabilă cauză?" picks={picks.rootCause} onPick={(c) => pick('rootCause', c)} onNext={() => setStage(2)} />
              <div>
                <h3>Ce dovezi susțin această concluzie?</h3>
                <p className="small muted">Selectează dovezile colectate care demonstrează cauza (nu cele doar interesante).</p>
                <div className="evidence-log">
                  {collected.map((cid) => {
                    const e = inc.evidence.find((x) => x.id === cid)!;
                    const sel = support.has(cid);
                    return (
                      <label key={cid} className={`evidence-entry check ${sel ? 'selected' : ''}`} style={{ padding: 10 }}>
                        <input type="checkbox" checked={sel} onChange={(ev) => setSupport((s) => { const n = new Set(s); if (ev.target.checked) n.add(cid); else n.delete(cid); return n; })} />
                        <span className="small"><span className="chip">{CAT_RO[e.category]}</span> {e.action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
          {stage === 2 && <section className="panel"><ChoiceStage inc={inc} k="nextStep" prompt="Care este următorul pas de diagnostic, înainte de a schimba ceva?" picks={picks.nextStep} onPick={(c) => pick('nextStep', c)} onNext={() => setStage(3)} /></section>}
          {stage === 3 && <section className="panel"><ChoiceStage inc={inc} k="remediation" prompt="Ce remediere aplici?" picks={picks.remediation} onPick={(c) => pick('remediation', c)} onNext={() => setStage(4)} /></section>}
          {stage === 4 && <section className="panel"><ChoiceStage inc={inc} k="validation" prompt="Cum validezi că problema este rezolvată?" picks={picks.validation} onPick={(c) => pick('validation', c)} onNext={finish} /></section>}

          {stage === 5 && (
            <section className="panel stack">
              <div className="row between">
                <div><div className="section-label">Scor de diagnostic</div><div className="big-num">{result.total}/100</div></div>
                <button className="btn" onClick={restart}>Încearcă din nou</button>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Criteriu</th><th>Puncte</th><th>Detalii</th></tr></thead>
                  <tbody>{result.parts.map((p) => <tr key={p.label}><td>{p.label}</td><td>{p.points}/{p.max}</td><td className="small">{p.note}</td></tr>)}</tbody>
                </table>
              </div>
              <div>
                <h3>Debrief</h3>
                <Md src={inc.debrief} />
              </div>
              <div>
                <h3>Toate dovezile și ce înseamnă</h3>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Acțiune</th><th>Relevanță</th><th>Ce îi spune unui expert</th></tr></thead>
                    <tbody>{inc.evidence.map((e) => (
                      <tr key={e.id}>
                        <td className="small">{collected.includes(e.id) ? '✓ ' : ''}{e.action}</td>
                        <td><span className={`chip ${e.relevance === 'key' ? 'ok' : e.relevance === 'useful' ? 'info' : ''}`}>{{ key: 'Cheie', useful: 'Utilă', noise: 'Zgomot' }[e.relevance]}</span></td>
                        <td className="small">{e.note}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="small muted">Secvența ideală: {inc.idealSequence.map((s) => inc.evidence.find((e) => e.id === s)?.action).join(' → ')}</p>
              </div>
              {inc.lessons.length > 0 && <div className="small">Lecții asociate: {inc.lessons.filter((l) => lessonsById.has(l)).map((l) => <Link key={l} to={`/learn/${l}`} style={{ marginRight: 10 }}>{lessonsById.get(l)!.title}</Link>)}</div>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
