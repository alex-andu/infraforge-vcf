import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, exportable } from '../state/store';
import type { PersistedState } from '../state/types';
import { useDocumentTitle } from '../components/ui';

export default function Settings() {
  useDocumentTitle('Setări');
  const s = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportable(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `infraforge-progres-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as PersistedState;
      if (data.version !== 1 || !data.profile) throw new Error('format necunoscut');
      s.importState(data);
      setMsg('Progresul a fost importat.');
    } catch (e) {
      setMsg(`Importul a eșuat: ${(e as Error).message}`);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <h1>Setări</h1>
      <section className="panel stack" style={{ marginBottom: 14 }}>
        <h2>Aspect</h2>
        <div className="row"><span style={{ width: 160 }}>Temă</span>
          <div className="seg" role="group" aria-label="Temă">
            <button type="button" aria-pressed={s.settings.theme === 'dark'} onClick={() => s.setSettings({ theme: 'dark' })}>Întunecată</button>
            <button type="button" aria-pressed={s.settings.theme === 'light'} onClick={() => s.setSettings({ theme: 'light' })}>Luminoasă</button>
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={s.settings.showLegacy} onChange={(e) => s.setSettings({ showLegacy: e.target.checked })} /><span>Afișează casetele „VCF 5.x / Legacy Context” în lecții<span className="small muted" style={{ display: 'block' }}>Recomandat activ: explică ce s-a schimbat față de versiunile anterioare. Le poți ascunde pentru o lectură strict VCF 9.</span></span></label>
        <label className="check"><input type="checkbox" checked={s.settings.leftPanel} onChange={(e) => s.setSettings({ leftPanel: e.target.checked })} /><span>Panoul de navigare din lecții</span></label>
        <label className="check"><input type="checkbox" checked={s.settings.rightPanel} onChange={(e) => s.setSettings({ rightPanel: e.target.checked })} /><span>Panoul de context din lecții</span></label>
      </section>

      <section className="panel stack" style={{ marginBottom: 14 }}>
        <h2>Profil de învățare</h2>
        <div className="row"><span style={{ width: 160 }}>Nivel</span>
          <div className="seg" role="group" aria-label="Nivel">
            {(['beginner', 'intermediate', 'advanced'] as const).map((l) => <button key={l} type="button" aria-pressed={s.profile.level === l} onClick={() => s.setProfile({ level: l })}>{{ beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' }[l]}</button>)}
          </div>
        </div>
        <label className="field" style={{ maxWidth: 240 }}>Data examenului (opțional)<input type="date" value={s.profile.examDate ?? ''} onChange={(e) => s.setProfile({ examDate: e.target.value || undefined })} /></label>
        <div><Link className="btn sm" to="/onboarding">Refă onboarding-ul și testul de diagnostic</Link></div>
      </section>

      <section className="panel stack">
        <h2>Date și backup</h2>
        <p className="small muted" style={{ margin: 0 }}>Tot progresul este salvat local, în IndexedDB-ul acestui browser. Fă export periodic dacă schimbi browserul sau calculatorul.</p>
        <div className="row">
          <button className="btn" onClick={doExport}>Exportă progresul (JSON)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importă progres</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <button className="btn danger" onClick={() => { if (confirm('Ștergi tot progresul? Acțiunea nu poate fi anulată (fă întâi un export).')) { s.reset(); setMsg('Progresul a fost șters.'); } }}>Șterge tot progresul</button>
        </div>
        {msg && <div className="small" role="status">{msg}</div>}
        <div className="small faint">{s.attempts.length} răspunsuri · {Object.keys(s.lessons).length} lecții începute · {s.exams.length} quiz-uri/examene · {s.bookmarks.length} bookmark-uri · {Object.keys(s.notes).length} notițe</div>
      </section>
    </div>
  );
}
