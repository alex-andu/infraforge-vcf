import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './state/store';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Learn = lazy(() => import('./pages/Learn'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Labs = lazy(() => import('./pages/Labs'));
const LabPage = lazy(() => import('./pages/LabPage'));
const Troubleshoot = lazy(() => import('./pages/Troubleshoot'));
const IncidentPage = lazy(() => import('./pages/IncidentPage'));
const ExamPrep = lazy(() => import('./pages/ExamPrep'));
const ExamSession = lazy(() => import('./pages/ExamSession'));
const QuestionPage = lazy(() => import('./pages/QuestionPage'));
const ExamResultPage = lazy(() => import('./pages/ExamResultPage'));
const Architecture = lazy(() => import('./pages/Architecture'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const ScenarioPage = lazy(() => import('./pages/ScenarioPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Reference = lazy(() => import('./pages/Reference'));
const HomeLab = lazy(() => import('./pages/HomeLab'));
const Progress = lazy(() => import('./pages/Progress'));
const StudyPlan = lazy(() => import('./pages/StudyPlan'));
const Review = lazy(() => import('./pages/Review'));
const ReviewSession = lazy(() => import('./pages/ReviewSession'));
const Settings = lazy(() => import('./pages/Settings'));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      // Content renders asynchronously; retry briefly until the anchor exists.
      let tries = 0;
      const t = setInterval(() => {
        const el = document.getElementById(id);
        if (el || ++tries > 30) { clearInterval(t); el?.scrollIntoView({ block: 'start' }); }
      }, 60);
      return () => clearInterval(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function Gate({ children }: { children: React.ReactNode }) {
  const onboarded = useStore((s) => s.profile.onboarded);
  const { pathname } = useLocation();
  if (!onboarded && pathname === '/') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export function App() {
  const hydrated = useStore((s) => s.hydrated);
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('ifc-theme', theme); } catch { /* storage may be unavailable */ }
  }, [theme]);

  if (!hydrated) return <Loading what="progresul tău" />;
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/onboarding" element={<Suspense fallback={<Loading />}><Onboarding /></Suspense>} />
        <Route element={<Layout />}>
          <Route path="/" element={<Gate><Dashboard /></Gate>} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:lessonId" element={<Lesson />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/labs/:id" element={<LabPage />} />
          <Route path="/troubleshoot" element={<Troubleshoot />} />
          <Route path="/troubleshoot/:id" element={<IncidentPage />} />
          <Route path="/exam" element={<ExamPrep />} />
          <Route path="/exam/session" element={<ExamSession />} />
          <Route path="/exam/mock" element={<ExamSession mock />} />
          <Route path="/exam/question/:id" element={<QuestionPage />} />
          <Route path="/exam/result/:id" element={<ExamResultPage />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/architecture/:id" element={<Architecture />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/scenarios/:id" element={<ScenarioPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/glossary/:id" element={<Glossary />} />
          <Route path="/reference" element={<Reference />} />
          <Route path="/homelab" element={<HomeLab />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/plan" element={<StudyPlan />} />
          <Route path="/review" element={<Review />} />
          <Route path="/review/session" element={<ReviewSession />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function NotFoundPage() {
  return (
    <div className="page">
      <h1>Pagina nu există</h1>
      <p className="muted">Linkul nu corespunde niciunei pagini. <a href="/">Înapoi la dashboard</a>.</p>
    </div>
  );
}
