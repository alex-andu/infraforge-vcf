import { Suspense, useEffect, useState, createContext, useContext, useCallback } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../state/store';
import { useDueCount, useMastery } from '../state/derived';
import { levelFor, newlyEarned } from '../engine/gamification';
import { meta } from '../content';
import { SearchPalette } from './SearchPalette';
import { Loading } from './ui';

const NAV = [
  { to: '/', label: 'Acasă', end: true },
  { to: '/learn', label: 'Învață' },
  { to: '/labs', label: 'Ghiduri practice' },
  { to: '/troubleshoot', label: 'Troubleshooting' },
  { to: '/exam', label: 'Examen' },
  { to: '/architecture', label: 'Arhitectură' },
  { to: '/homelab', label: 'Home Lab' },
  { to: '/glossary', label: 'Glosar' },
  { to: '/reference', label: 'Referință' },
];

type Toast = { id: number; text: string };
const ToastCtx = createContext<(t: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Awards badges and records daily mastery snapshots whenever the learner state changes. */
function Watchers({ toast }: { toast: (t: string) => void }) {
  const mastery = useMastery();
  const xp = useStore((s) => s.xp);
  const awardBadges = useStore((s) => s.awardBadges);
  const snapshot = useStore((s) => s.snapshotMastery);
  useEffect(() => {
    const s = useStore.getState();
    const mastered = [...mastery.values()].filter((m) => m.state === 'mastered').length;
    const earned = newlyEarned(s, meta.badges, mastered, Date.now());
    if (earned.length) {
      awardBadges(earned.map((b) => b.id));
      for (const b of earned) toast(`${b.icon} Insignă nouă: ${b.name}`);
    }
    const values: Record<string, number> = {};
    for (const [t, m] of mastery) if (m.attempts > 0 || m.coverage > 0) values[t] = m.score;
    snapshot(values);
  }, [mastery, xp, awardBadges, snapshot, toast]);

  const [lastLevel, setLastLevel] = useState(() => levelFor(xp).level);
  useEffect(() => {
    const l = levelFor(xp);
    if (l.level > lastLevel) toast(`Nivel nou: ${l.level} · ${l.title}`);
    setLastLevel(l.level);
  }, [xp, lastLevel, toast]);
  return null;
}

export function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const xp = useStore((s) => s.xp);
  const due = useDueCount();
  const lvl = levelFor(xp);
  const loc = useLocation();

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement))) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => setPaletteOpen(false), [loc.pathname]);

  return (
    <ToastCtx.Provider value={toast}>
      <a href="#main" className="skip-link">Sari la conținut</a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="InfraForge VCF, acasă">
          <span className="brand-mark" aria-hidden="true">IF</span>
          <span>InfraForge <small>VCF</small></span>
        </Link>
        <nav className="mainnav" aria-label="Navigare principală">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
        </nav>
        <div className="topbar-right">
          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Caută (Ctrl+K)">
            <span aria-hidden="true">⌕</span> Caută <kbd>Ctrl K</kbd>
          </button>
          <Link to="/review" className="btn ghost sm" title="Recapitulare (spaced repetition)">
            Recapitulare{due > 0 && <span className="chip warn" style={{ marginLeft: 4 }}>{due}</span>}
          </Link>
          <Link to="/progress" className="xp-pill" title={`${xp} XP · ${lvl.next ? `${lvl.next - xp} XP până la nivelul următor` : 'nivel maxim'}`}>
            <span className="lvl">Nv. {lvl.level}</span><span className="lvl-title">{lvl.title}</span>
          </Link>
          <Link to="/settings" className="btn ghost icon" aria-label="Setări" title="Setări">⚙</Link>
        </div>
      </header>
      <main id="main">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      {paletteOpen && <SearchPalette onClose={() => setPaletteOpen(false)} />}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
      <Watchers toast={toast} />
    </ToastCtx.Provider>
  );
}
