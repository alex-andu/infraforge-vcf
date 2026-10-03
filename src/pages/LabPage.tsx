import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLab, lessonsById, labsById } from '../content';
import { useStore } from '../state/store';
import { Md } from '../components/RichContent';
import { Diagram } from '../components/Diagram';
import { useAsync, Loading, NotFound, DifficultyChip, VersionChip, Dots, Bar, fmtMinutes, useDocumentTitle } from '../components/ui';
import { topicTitle } from '../state/derived';

const VIEW_RO = { logical: 'Logic', physical: 'Fizic', network: 'Rețea', component: 'Componente VCF' } as const;

export default function LabPage() {
  const { id = '' } = useParams();
  const { data: lab, loading } = useAsync(() => getLab(id), [id]);
  const st = useStore((s) => s.labs[id]);
  const setStep = useStore((s) => s.setLabStep);
  const resetLab = useStore((s) => s.resetLab);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const bookmarked = useStore((s) => s.bookmarks.some((b) => b.key === `lab:${id}`));
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [view, setView] = useState<keyof typeof VIEW_RO | null>(null);
  useDocumentTitle(labsById.get(id)?.title ?? 'Laborator');

  if (loading) return <Loading what="laboratorul" />;
  if (!lab) return <NotFound what="Laboratorul" />;
  const views = (Object.keys(VIEW_RO) as (keyof typeof VIEW_RO)[]).filter((v) => lab.topology[v]);
  const curView = view && lab.topology[view] ? view : views[0];
  const done = new Set(st?.done ?? []);
  const pct = (done.size / lab.steps.length) * 100;

  return (
    <div className="page" style={{ maxWidth: 1060 }}>
      <div className="crumbs"><Link to="/labs">Laboratoare</Link><span>›</span><span>{lab.title}</span></div>
      <div className="page-head">
        <div>
          <h1>{lab.title}</h1>
          <div className="row"><DifficultyChip d={lab.level} /><VersionChip v={lab.version} /><span className="chip">Complexitate <Dots n={lab.complexity} /></span><span className="chip">{fmtMinutes(lab.minutes)}</span>{lab.topics.map((t) => <span key={t} className="chip">{topicTitle(t)}</span>)}</div>
        </div>
        <div className="row">
          <button className="btn sm" aria-pressed={bookmarked} onClick={() => toggleBookmark({ key: `lab:${id}`, kind: 'lab', ref: id, title: lab.title, url: `/labs/${id}` })}>{bookmarked ? '★ Salvat' : '☆ Salvează'}</button>
          {st && <button className="btn sm danger" onClick={() => { if (confirm('Resetezi progresul acestui laborator?')) resetLab(id); }}>Resetează progresul</button>}
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="row between"><strong>Progres: {done.size}/{lab.steps.length} pași</strong>{st?.status === 'completed' && <span className="chip ok">Finalizat</span>}</div>
        <div style={{ marginTop: 6 }}><Bar value={pct} tone={pct === 100 ? 'ok' : undefined} label="Progres laborator" /></div>
      </section>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <section className="panel">
          <h2>Obiective</h2>
          <ul>{lab.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
          <h3>Tehnologii</h3>
          <p className="small">{lab.technologies.join(' · ')}</p>
          {lab.lessons.length > 0 && (<><h3>Teorie recomandată înainte</h3><ul className="small">{lab.lessons.filter((l) => lessonsById.has(l)).map((l) => <li key={l}><Link to={`/learn/${l}`}>{lessonsById.get(l)!.title}</Link></li>)}</ul></>)}
        </section>
        <section className="panel">
          <h2>Cerințe preliminare</h2>
          <ul className="small">{lab.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul>
          <div className="grid grid-3" style={{ gap: 10 }}>
            <div><div className="section-label">Rețea</div><ul className="small" style={{ paddingLeft: 16 }}>{lab.requirements.network.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><div className="section-label">VM-uri</div><ul className="small" style={{ paddingLeft: 16 }}>{lab.requirements.vms.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><div className="section-label">Adrese IP</div><ul className="small" style={{ paddingLeft: 16 }}>{lab.requirements.ip.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </section>
      </div>

      {views.length > 0 && (
        <section style={{ marginBottom: 14 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Topologie</h2>
            {views.length > 1 && (
              <div className="seg" role="tablist" aria-label="Vizualizare topologie">
                {views.map((v) => <button key={v} type="button" role="tab" aria-selected={curView === v} onClick={() => setView(v)}>{VIEW_RO[v]}</button>)}
              </div>
            )}
          </div>
          {curView && <Diagram key={lab.topology[curView]} id={lab.topology[curView]!} />}
        </section>
      )}

      <section className="panel" style={{ marginBottom: 14 }}>
        <h2>Starea de pornire</h2>
        <Md src={lab.startingState} />
      </section>

      <h2>Pași</h2>
      {lab.steps.map((step, i) => {
        const isDone = done.has(step.id);
        return (
          <section key={step.id} id={step.id} className={`lab-step ${isDone ? 'done' : ''}`} aria-labelledby={`${step.id}-h`}>
            <header>
              <span className="chip">{i + 1}</span>
              <h3 id={`${step.id}-h`}>{step.title}</h3>
              <label className="check small">
                <input type="checkbox" checked={isDone} onChange={(e) => setStep(id, step.id, e.target.checked, lab.steps.length)} />
                <span>Validat</span>
              </label>
            </header>
            <div className="step-body">
              <div className="step-why">De ce: {step.why}</div>
              <Md src={step.instructions} />
              {step.hint && (hints.has(step.id) ? (
                <aside className="callout tip"><div className="callout-title">Indiciu</div><Md src={step.hint} /></aside>
              ) : <button className="btn sm ghost" onClick={() => setHints((h) => new Set(h).add(step.id))}>Arată un indiciu</button>)}
              <div className="grid grid-2" style={{ marginTop: 10 }}>
                <div className="callout note" style={{ margin: 0 }}><div className="callout-title">Cum validezi</div><Md src={step.validate} /></div>
                <div className="callout general" style={{ margin: 0 }}><div className="callout-title">Rezultat așteptat</div><Md src={step.expected} /></div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="panel" style={{ marginBottom: 14 }}>
        <h2>Troubleshooting</h2>
        <div className="table-wrap">
          <table className="table"><thead><tr><th style={{ width: '35%' }}>Simptom</th><th>Ce verifici / cum rezolvi</th></tr></thead>
            <tbody>{lab.troubleshooting.map((t) => <tr key={t.symptom}><td>{t.symptom}</td><td><Md src={t.fix} /></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className="grid grid-2">
        <section className="panel"><h2>Provocare suplimentară</h2><Md src={lab.challenge} /></section>
        <section className="panel"><h2>Cleanup / resetare</h2><Md src={lab.cleanup} /></section>
      </div>
      {lab.sources.length > 0 && (
        <section style={{ marginTop: 14 }} className="small">
          <div className="section-label">Surse</div>
          <ul>{lab.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul>
        </section>
      )}
    </div>
  );
}
