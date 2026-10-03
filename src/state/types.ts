import type { TQuestion } from '../content/schema';

export type Difficulty = TQuestion['difficulty'];
export type AttemptMode = 'lesson' | 'quiz' | 'exam' | 'review' | 'diagnostic';
export type DiagnosticArea = 'virtualization' | 'esxi' | 'vsphere' | 'networking' | 'storage' | 'nsx' | 'vcf' | 'troubleshooting';

export interface Attempt {
  qid: string;
  at: number;
  /** 0..1 — partial credit for multi/ordering/matching. */
  score: number;
  difficulty: Difficulty;
  topics: string[];
  mode: AttemptMode;
  kind?: string;
  /** Topics of distractors the learner picked (from `confusedWith`). */
  confusions?: string[];
  ms?: number;
}

export interface LessonState { status: 'in-progress' | 'completed'; firstAt: number; lastAt: number; completedAt?: number; seen: string[] }

export interface ReviewItem {
  qid: string;
  box: number;
  due: number;
  added: number;
  lapses: number;
  reviews: number;
}

export interface LabState { status: 'in-progress' | 'completed'; done: string[]; startedAt: number; completedAt?: number }

export interface IncidentRun {
  at: number;
  score: number;
  solved: boolean;
  hints: number;
  actions: string[];
}

export interface ExamResult {
  id: string;
  at: number;
  kind: 'mock' | 'timed' | 'topic' | 'mixed' | 'weak' | 'review';
  total: number;
  /** Sum of per-question scores (partial credit). */
  correct: number;
  pct: number;
  scaled?: number;
  passed?: boolean;
  durationMs: number;
  byObjective: Record<string, { c: number; t: number }>;
  byTopic: Record<string, { c: number; t: number }>;
  questions: { qid: string; score: number; answer: unknown; flagged?: boolean }[];
}

export interface Bookmark { key: string; kind: 'lesson' | 'section' | 'question' | 'lab' | 'incident' | 'term'; ref: string; title: string; url: string; at: number }
export interface Note { key: string; title: string; url: string; text: string; updatedAt: number }

export interface Profile {
  onboarded: boolean;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'learn' | 'cert' | 'hands-on' | 'all';
  hardware: 'none' | 'workstation' | 'single-server' | 'multi-host';
  diagnostic?: Partial<Record<DiagnosticArea, number>>;
  examDate?: string;
  createdAt: number;
}

export interface StudyPlanConfig { days: number; start: string; hoursPerDay: number }

export interface Settings { theme: 'dark' | 'light'; showLegacy: boolean; leftPanel: boolean; rightPanel: boolean }

export interface PersistedState {
  version: 1;
  profile: Profile;
  settings: Settings;
  lessons: Record<string, LessonState>;
  attempts: Attempt[];
  review: Record<string, ReviewItem>;
  labs: Record<string, LabState>;
  incidents: Record<string, IncidentRun[]>;
  exams: ExamResult[];
  scenarios: Record<string, { at: number; score: number; answers: Record<string, string> }>;
  bookmarks: Bookmark[];
  notes: Record<string, Note>;
  savedQuestions: string[];
  homelabChecks: Record<string, boolean>;
  activity: Record<string, number>;
  xp: number;
  badges: Record<string, number>;
  masteryHistory: Record<string, { at: number; v: number }[]>;
  plan?: StudyPlanConfig;
}
