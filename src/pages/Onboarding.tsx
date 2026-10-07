import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { meta, orderedLessons, labsById } from '../content';
import { buildDiagnostic, mathRng } from '../engine/exam';
import { QuizRunner, type QuizSummary } from '../components/QuizRunner';
import { Bar, toneFor, useDocumentTitle } from '../components/ui';
import type { DiagnosticArea, Profile } from '../state/types';

const AREA_RO: Record<DiagnosticArea, string> = {
  virtualization: 'Fundamente virtualizare', esxi: 'ESX', vsphere: 'vSphere', networking: 'Rețelistică', storage: 'Storage / vSAN',
  nsx: 'NSX', vcf: 'Concepte VCF', troubleshooting: 'Troubleshooting',
};

export default function Onboarding() {
  useDocumentTitle('Bun venit');
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<Profile>>({ level: profile.level, goal: profile.goal, hardware: profile.hardware });
  const [diag, setDiag] = useState<Partial<Record<DiagnosticArea, number>> | null>(profile.diagnostic ?? null);
  const [inDiag, setInDiag] = useState(false);
  const diagQs = useMemo(() => buildDiagnostic(meta.questionIndex, 2, mathRng), []);

  const finish = (extra: Partial<Profile> = {}) => {
    setProfile({ ...draft, ...extra, diagnostic: diag ?? undefined, onboarded: true });
    navigate('/');
  };

  const onDiagDone = (s: QuizSummary) => {
    const by: Record<string, { c: number; t: number }> = {};
    for (const r of s.results) {
      const area = r.q.diagnostic;
      if (!area) continue;
      by[area] ??= { c: 0, t: 0 };
      by[area].t++;
      by[area].c += r.g.partial;
    }
    const out: Partial<Record<DiagnosticArea, number>> = {};
    for (const [a, v] of Object.entries(by)) out[a as DiagnosticArea] = Math.round((v.c / v.t) * 100);
    setDiag(out);
    setInDiag(false);
    // Suggest a level from the result; the learner can still override it.
    const avg = Object.values(out).reduce((n, x) => n + (x ?? 0), 0) / Math.max(1, Object.values(out).length);
    setDraft((d) => ({ ...d, level: avg >= 75 ? 'advanced' : avg >= 45 ? 'intermediate' : 'beginner' }));
    setStep(3);
  };

  const Choice = <K extends keyof Profile>({ k, v, title, text }: { k: K; v: Profile[K]; title: string; text: string }) => (
    <button type="button" className="choice" aria-pressed={draft[k] === v} onClick={() => setDraft((d) => ({ ...d, [k]: v }))}>
      <strong>{title}</strong><span>{text}</span>
    </button>
  );

  const first = orderedLessons.find((l) => draft.level !== 'advanced' || !/^p0[12]-/.test(l.phase)) ?? orderedLessons[0];
  const steps = ['Bun venit', 'Nivel', 'Diagnostic', 'Obiectiv', 'Hardware', 'Parcurs'];

  return (
    <div className="onboarding">
      <div className="row between" style={{ marginBottom: 18 }}>
        <div className="brand"><span className="brand-mark">IF</span><span>InfraForge <small>VCF</small></span></div>
        <button className="btn ghost sm" onClick={() => finish()}>Sari peste</button>
      </div>
      <div className="stepper" aria-label="Pași onboarding">{steps.map((s, i) => <span key={s} className={i === step ? 'active' : i < step ? 'done' : ''}>{s}</span>)}</div>

      {step === 0 && (
        <section className="panel stack">
          <h1>Bun venit în InfraForge VCF</h1>
          <p className="muted">Platforma te duce de la „știu virtualizare de bază” la „pot construi, opera și depana VMware Cloud Foundation 9” și la examenul <strong>2V0-17.25 VCF 9.0 Administrator</strong>.</p>
          <ul className="muted small">
            <li>Teorie înainte de laboratoare, cu diagrame interactive și surse oficiale.</li>
            <li>Ghiduri practice pe home lab-ul tău, simulator de incidente și examene simulate.</li>
            <li>Progresul și recomandările se adaptează la ce știi deja. Totul se salvează local.</li>
          </ul>
          <p className="small faint">Durează cam 5 minute (sau 1 minut fără testul de diagnostic).</p>
          <div><button className="btn primary" onClick={() => setStep(1)}>Începe</button></div>
        </section>
      )}

      {step === 1 && (
        <section className="panel stack">
          <h2>Ce experiență ai cu VMware?</h2>
          <div className="choice-grid">
            <Choice k="level" v="beginner" title="Începător" text="Am folosit puțin sau deloc vSphere." />
            <Choice k="level" v="intermediate" title="Intermediar" text="Administrez vSphere, dar sunt nou în VCF/NSX/vSAN." />
            <Choice k="level" v="advanced" title="Avansat" text="Am lucrat cu VCF 5.x sau NSX și vSAN în producție." />
          </div>
          <div className="row between"><button className="btn ghost" onClick={() => setStep(0)}>Înapoi</button><button className="btn primary" onClick={() => setStep(2)}>Continuă</button></div>
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          {!inDiag ? (
            <div className="panel stack">
              <h2>Test de diagnostic (opțional)</h2>
              <p className="muted">{diagQs.length} întrebări scurte din {new Set(meta.questionIndex.filter((q) => q.diagnostic).map((q) => q.diagnostic)).size} arii. Nu primești feedback pe parcurs; rezultatul estimează punctul de pornire pe fiecare arie și calibrează recomandările.</p>
              {diag && <p className="small">Ai deja un rezultat de diagnostic; îl poți reface.</p>}
              <div className="row">
                <button className="btn primary" disabled={!diagQs.length} onClick={() => setInDiag(true)}>Fă testul</button>
                <button className="btn" onClick={() => setStep(3)}>Sari peste test</button>
              </div>
              {!diagQs.length && <p className="small faint">Întrebările de diagnostic nu sunt încă disponibile.</p>}
            </div>
          ) : (
            <QuizRunner qids={diagQs} mode="diagnostic" feedback={false} onFinish={onDiagDone} />
          )}
        </section>
      )}

      {step === 3 && (
        <section className="panel stack">
          {diag && Object.keys(diag).length > 0 && (
            <div>
              <h2>Profilul tău de competențe</h2>
              {(Object.keys(AREA_RO) as DiagnosticArea[]).filter((a) => diag[a] != null).map((a) => (
                <div key={a} className="mastery-row"><span className="small">{AREA_RO[a]}</span><Bar value={diag[a]!} tone={toneFor(diag[a]!)} /><span className="small">{diag[a]}%</span></div>
              ))}
              <p className="small muted">Nivel sugerat: <strong>{{ beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' }[draft.level!]}</strong>. Îl poți schimba oricând din Setări.</p>
              <div className="seg" role="group" aria-label="Nivel">
                {(['beginner', 'intermediate', 'advanced'] as const).map((l) => <button key={l} type="button" aria-pressed={draft.level === l} onClick={() => setDraft((d) => ({ ...d, level: l }))}>{{ beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' }[l]}</button>)}
              </div>
              <hr />
            </div>
          )}
          <h2>Care este obiectivul tău principal?</h2>
          <div className="choice-grid">
            <Choice k="goal" v="learn" title="Să înțeleg VCF" text="Arhitectură și operare în profunzime." />
            <Choice k="goal" v="cert" title="Certificarea" text="Pregătire țintită pentru 2V0-17.25." />
            <Choice k="goal" v="hands-on" title="Practică" text="Ghiduri aplicate și troubleshooting." />
            <Choice k="goal" v="all" title="Toate" text="Teorie, practică și examen, echilibrat." />
          </div>
          <div className="row between"><button className="btn ghost" onClick={() => setStep(2)}>Înapoi</button><button className="btn primary" onClick={() => setStep(4)}>Continuă</button></div>
        </section>
      )}

      {step === 4 && (
        <section className="panel stack">
          <h2>Ce hardware ai pentru laborator?</h2>
          <div className="choice-grid">
            <Choice k="hardware" v="none" title="Nimic încă" text="Ghidurile care cer infrastructură vor rămâne în așteptare; simulatoarele rămân disponibile." />
            <Choice k="hardware" v="workstation" title="PC / laptop" text="VMware Workstation, resurse limitate." />
            <Choice k="hardware" v="single-server" title="Un server" text="Ex.: Proxmox sau ESX cu nested ESX (cazul tău)." />
            <Choice k="hardware" v="multi-host" title="Mai multe hosturi" text="ESX fizic, 3+ servere." />
          </div>
          <div className="row between"><button className="btn ghost" onClick={() => setStep(3)}>Înapoi</button><button className="btn primary" onClick={() => setStep(5)}>Generează parcursul</button></div>
        </section>
      )}

      {step === 5 && (
        <section className="panel stack">
          <h2>Parcursul tău recomandat</h2>
          <ol>
            <li>Începe cu <strong>{first?.title}</strong>{draft.level === 'advanced' ? ' (fazele 1–2 rămân disponibile ca recapitulare)' : ''}.</li>
            {draft.hardware !== 'none' && labsById.has('lab-homelab-proxmox-prep') && <li>În paralel, pregătește home lab-ul: <strong>{labsById.get('lab-homelab-proxmox-prep')!.title}</strong>.</li>}
            {diag && Object.entries(diag).filter(([, v]) => (v ?? 100) < 50).length > 0 && <li>Insistă pe: {Object.entries(diag).filter(([, v]) => (v ?? 100) < 50).map(([a]) => AREA_RO[a as DiagnosticArea]).join(', ')}.</li>}
            {(draft.goal === 'cert' || draft.goal === 'all') && <li>Creează un plan de studiu (7/14/30 zile sau până la data examenului) și fă primul examen simulat după jumătatea curriculumului.</li>}
            <li>Recapitulează zilnic întrebările scadente (spaced repetition).</li>
          </ol>
          <div className="row">
            <button className="btn primary" onClick={() => finish()}>Mergi la dashboard</button>
            {(draft.goal === 'cert' || draft.goal === 'all') && <button className="btn" onClick={() => { finish(); navigate('/plan'); }}>Creează planul de studiu</button>}
          </div>
        </section>
      )}
    </div>
  );
}
