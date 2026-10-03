import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { MasteryState } from '../engine/mastery';

export const VERSION_LABEL = { vcf9: 'VCF 9.x', legacy: 'Legacy / VCF 5.x', general: 'Concept general' } as const;

export function VersionChip({ v }: { v: 'vcf9' | 'legacy' | 'general' }) {
  return <span className={`chip ${v}`} title={v === 'vcf9' ? 'Comportament curent în VCF 9.x' : v === 'legacy' ? 'Comportament din versiuni anterioare' : 'Cunoștințe conceptuale, independente de versiune'}>{VERSION_LABEL[v]}</span>;
}

export const DIFFICULTY_RO: Record<string, string> = { foundation: 'Fundamental', intermediate: 'Intermediar', advanced: 'Avansat', expert: 'Expert', beginner: 'Începător', challenge: 'Provocare' };

export function DifficultyChip({ d }: { d: string }) {
  const cls = d === 'foundation' || d === 'beginner' ? 'ok' : d === 'intermediate' ? 'info' : d === 'advanced' ? 'warn' : 'bad';
  return <span className={`chip ${cls}`}>{DIFFICULTY_RO[d] ?? d}</span>;
}

export const STATE_RO: Record<MasteryState | 'not-started', string> = {
  'not-started': 'Neînceput', 'in-progress': 'În curs', completed: 'Finalizat', mastered: 'Stăpânit', 'needs-review': 'De recapitulat',
};

export function StatusDot({ state, label = true }: { state: MasteryState; label?: boolean }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={`status-dot ${state}`} aria-hidden="true" />
      {label ? <span className="small muted">{STATE_RO[state]}</span> : <span className="sr-only">{STATE_RO[state]}</span>}
    </span>
  );
}

export function Bar({ value, tone, label }: { value: number; tone?: 'ok' | 'warn' | 'bad'; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`bar ${tone ?? ''}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export const toneFor = (v: number): 'ok' | 'warn' | 'bad' | undefined => (v >= 75 ? 'ok' : v >= 50 ? undefined : v >= 30 ? 'warn' : 'bad');

export function Ring({ value, label }: { value: number; label: string }) {
  return (
    <div className="ring" style={{ ['--p' as string]: Math.round(value) }} role="img" aria-label={`${label}: ${Math.round(value)}%`}>
      <span>{Math.round(value)}%</span>
    </div>
  );
}

export function Dots({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span className="difficulty-dots" aria-label={`Complexitate ${n} din ${max}`}>
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
      {action && <div style={{ marginTop: 10 }}><Link className="btn sm" to={action.to}>{action.label}</Link></div>}
    </div>
  );
}

/** Small async loader hook for lazy content chunks. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; error: Error | null } {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: Error | null }>({ data: undefined, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => alive && setState({ data, loading: false, error: null }), (error) => alive && setState({ data: undefined, loading: false, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function Loading({ what = 'conținutul' }: { what?: string }) {
  return <div className="faint small" role="status" style={{ padding: 20 }}>Se încarcă {what}…</div>;
}

export function NotFound({ what }: { what: string }) {
  return (
    <div className="page">
      <Empty title={`${what} nu există`} action={{ to: '/', label: 'Înapoi la dashboard' }}>
        Linkul poate fi greșit sau conținutul a fost redenumit.
      </Empty>
    </div>
  );
}

export function fmtMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function fmtDate(t: number | string) {
  return new Date(t).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relTime(t: number) {
  const d = Date.now() - t;
  const m = Math.round(d / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return `acum ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `acum ${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? 'ieri' : `acum ${days} zile`;
}

export function useDocumentTitle(title: string) {
  useEffect(() => { document.title = title ? `${title} · InfraForge VCF` : 'InfraForge VCF'; }, [title]);
}
