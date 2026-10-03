/**
 * The single learner state, persisted locally in IndexedDB (no backend).
 * Every number shown in the UI is derived from this state; nothing is decorative.
 */
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { PersistedState, Attempt, ExamResult, IncidentRun, Bookmark, Profile, Settings, StudyPlanConfig, AttemptMode } from './types';
import type { TQuestion } from '../content/schema';
import type { Grade } from '../engine/grading';
import { applyResult, addToReview } from '../engine/srs';
import { XP, dayKey } from '../engine/gamification';

const MAX_ATTEMPTS = 8000;

export const initialState = (): PersistedState => ({
  version: 1,
  profile: { onboarded: false, level: 'beginner', goal: 'all', hardware: 'single-server', createdAt: Date.now() },
  settings: { theme: 'dark', showLegacy: true, leftPanel: true, rightPanel: true },
  lessons: {},
  attempts: [],
  review: {},
  labs: {},
  incidents: {},
  exams: [],
  scenarios: {},
  bookmarks: [],
  notes: {},
  savedQuestions: [],
  homelabChecks: {},
  activity: {},
  xp: 0,
  badges: {},
  masteryHistory: {},
});

interface Actions {
  hydrated: boolean;
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<Settings>) => void;
  visitLesson: (id: string) => void;
  markSeen: (id: string, anchor: string) => void;
  completeLesson: (id: string, done?: boolean) => void;
  recordAnswer: (q: TQuestion, g: Grade, mode: AttemptMode, ms?: number) => void;
  setLabStep: (lab: string, step: string, done: boolean, totalSteps: number) => void;
  resetLab: (lab: string) => void;
  recordIncident: (id: string, run: IncidentRun) => void;
  recordExam: (r: ExamResult) => void;
  recordScenario: (id: string, score: number, answers: Record<string, string>) => void;
  toggleBookmark: (b: Omit<Bookmark, 'at'>) => void;
  setNote: (key: string, title: string, url: string, text: string) => void;
  toggleSavedQuestion: (qid: string) => void;
  setHomelabCheck: (id: string, v: boolean) => void;
  setPlan: (p: StudyPlanConfig | undefined) => void;
  awardBadges: (ids: string[]) => void;
  snapshotMastery: (values: Record<string, number>) => void;
  importState: (s: PersistedState) => void;
  reset: () => void;
}

export type Store = PersistedState & Actions;

const idbStorage: StateStorage = {
  getItem: async (k) => (await idbGet<string>(k)) ?? null,
  setItem: (k, v) => idbSet(k, v),
  removeItem: (k) => idbDel(k),
};

function bump(s: PersistedState, xp: number): Pick<PersistedState, 'xp' | 'activity'> {
  const key = dayKey(Date.now());
  return { xp: s.xp + xp, activity: { ...s.activity, [key]: (s.activity[key] ?? 0) + Math.max(1, xp) } };
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState(),
      hydrated: false,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setSettings: (x) => set((s) => ({ settings: { ...s.settings, ...x } })),

      visitLesson: (id) => set((s) => {
        const now = Date.now();
        const cur = s.lessons[id];
        return { lessons: { ...s.lessons, [id]: cur ? { ...cur, lastAt: now } : { status: 'in-progress', firstAt: now, lastAt: now, seen: [] } } };
      }),
      markSeen: (id, anchor) => set((s) => {
        const cur = s.lessons[id];
        if (!cur || cur.seen.includes(anchor)) return {};
        return { lessons: { ...s.lessons, [id]: { ...cur, seen: [...cur.seen, anchor] } } };
      }),
      completeLesson: (id, done = true) => set((s) => {
        const now = Date.now();
        const cur = s.lessons[id] ?? { status: 'in-progress' as const, firstAt: now, lastAt: now, seen: [] };
        if (done && cur.status === 'completed') return {};
        const next = { ...cur, status: done ? ('completed' as const) : ('in-progress' as const), completedAt: done ? now : undefined, lastAt: now };
        return { lessons: { ...s.lessons, [id]: next }, ...(done ? bump(s, XP.lessonComplete) : {}) };
      }),

      recordAnswer: (q, g, mode, ms) => set((s) => {
        const now = Date.now();
        const attempt: Attempt = { qid: q.id, at: now, score: g.partial, difficulty: q.difficulty, topics: q.topics, mode, kind: q.kind, confusions: g.confusions.length ? g.confusions : undefined, ms };
        const attempts = [...s.attempts, attempt].slice(-MAX_ATTEMPTS);
        const review = mode === 'diagnostic' ? s.review : applyResult(s.review, q.id, g.correct ? 1 : 0, now, mode === 'review');
        const xp = mode === 'diagnostic' ? 0 : g.correct ? (mode === 'review' ? XP.reviewCorrect : XP.answer[q.difficulty]) : 1;
        return { attempts, review, ...bump(s, xp) };
      }),

      setLabStep: (lab, step, done, totalSteps) => set((s) => {
        const now = Date.now();
        const cur = s.labs[lab] ?? { status: 'in-progress' as const, done: [], startedAt: now };
        const doneSet = new Set(cur.done);
        if (done) doneSet.add(step); else doneSet.delete(step);
        const complete = doneSet.size >= totalSteps;
        const wasComplete = cur.status === 'completed';
        const next = { ...cur, done: [...doneSet], status: complete ? ('completed' as const) : ('in-progress' as const), completedAt: complete ? (cur.completedAt ?? now) : undefined };
        const xp = (done ? XP.labStep : 0) + (complete && !wasComplete ? XP.labComplete : 0);
        return { labs: { ...s.labs, [lab]: next }, ...(xp ? bump(s, xp) : {}) };
      }),
      resetLab: (lab) => set((s) => {
        const labs = { ...s.labs };
        delete labs[lab];
        return { labs };
      }),

      recordIncident: (id, run) => set((s) => {
        const prevBest = Math.max(0, ...(s.incidents[id] ?? []).map((r) => r.score));
        const xp = run.solved ? Math.round(XP.incidentMax * Math.max(0, run.score - prevBest) / 100) + 10 : 5;
        return { incidents: { ...s.incidents, [id]: [...(s.incidents[id] ?? []), run] }, ...bump(s, xp) };
      }),

      recordExam: (r) => set((s) => ({ exams: [...s.exams, r].slice(-200), ...bump(s, r.kind === 'mock' ? XP.mockExam : 20) })),

      recordScenario: (id, score, answers) => set((s) => ({
        scenarios: { ...s.scenarios, [id]: { at: Date.now(), score, answers } },
        ...(s.scenarios[id] ? {} : bump(s, Math.round(XP.scenario * score))),
      })),

      toggleBookmark: (b) => set((s) => {
        const exists = s.bookmarks.some((x) => x.key === b.key);
        return { bookmarks: exists ? s.bookmarks.filter((x) => x.key !== b.key) : [...s.bookmarks, { ...b, at: Date.now() }] };
      }),
      setNote: (key, title, url, text) => set((s) => {
        const notes = { ...s.notes };
        if (!text.trim()) delete notes[key];
        else notes[key] = { key, title, url, text, updatedAt: Date.now() };
        return { notes };
      }),
      toggleSavedQuestion: (qid) => set((s) => {
        const saved = s.savedQuestions.includes(qid);
        return {
          savedQuestions: saved ? s.savedQuestions.filter((x) => x !== qid) : [...s.savedQuestions, qid],
          review: saved || s.review[qid] ? s.review : addToReview(s.review, qid, Date.now()),
        };
      }),
      setHomelabCheck: (id, v) => set((s) => ({ homelabChecks: { ...s.homelabChecks, [id]: v } })),
      setPlan: (plan) => set(() => ({ plan })),
      awardBadges: (ids) => set((s) => {
        const now = Date.now();
        const badges = { ...s.badges };
        for (const id of ids) badges[id] ??= now;
        return { badges };
      }),
      snapshotMastery: (values) => set((s) => {
        const now = Date.now();
        const today = dayKey(now);
        const hist = { ...s.masteryHistory };
        for (const [topic, v] of Object.entries(values)) {
          const arr = hist[topic] ?? [];
          const last = arr[arr.length - 1];
          if (last && dayKey(last.at) === today) { if (last.v !== v) hist[topic] = [...arr.slice(0, -1), { at: now, v }]; }
          else if (!last || last.v !== v) hist[topic] = [...arr, { at: now, v }].slice(-60);
        }
        return { masteryHistory: hist };
      }),
      importState: (imported) => set(() => ({ ...initialState(), ...imported })),
      reset: () => set(() => ({ ...initialState(), profile: { ...initialState().profile } })),
    }),
    {
      name: 'infraforge-vcf-v3',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => {
        const { hydrated: _h, ...rest } = s;
        void _h;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as unknown as Store;
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

/** Snapshot of only the persisted data (for export). */
export function exportable(): PersistedState {
  const s = useStore.getState();
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(initialState())) out[k] = (s as unknown as Record<string, unknown>)[k];
  if (s.plan) out.plan = s.plan;
  return out as unknown as PersistedState;
}
