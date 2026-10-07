import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  lessonsById, getLessonBody, phases, orderedLessons, phaseOf, moduleOf, termsById, componentsById, labsById,
  incidentsById, objectivesById, questionsByLesson,
} from '../content';
import { useStore } from '../state/store';
import { useMastery, lessonStatus, topicTitle } from '../state/derived';
import { RichContent } from '../components/RichContent';
import { QuizRunner } from '../components/QuizRunner';
import { useAsync, NotFound, StatusDot, VersionChip, DifficultyChip, Bar, toneFor, useDocumentTitle } from '../components/ui';

function LessonQuiz({ lessonId }: { lessonId: string }) {
  const qs = questionsByLesson.get(lessonId) ?? [];
  const [run, setRun] = useState<string[] | null>(null);
  const attempts = useStore((s) => s.attempts);
  const answered = new Set(attempts.filter((a) => qs.some((q) => q.id === a.qid)).map((a) => a.qid));
  if (!qs.length) return <p className="muted">Pentru această lecție nu există încă întrebări de verificare.</p>;
  if (!run) {
    return (
      <div className="panel row between" style={{ fontSize: '0.95rem' }}>
        <div>
          <strong>{qs.length} întrebări de verificare</strong>
          <div className="small muted">{answered.size ? `Ai răspuns la ${answered.size} din ele până acum.` : 'Răspunsurile greșite intră automat în coada de recapitulare.'}</div>
        </div>
        <button type="button" className="btn primary" onClick={() => setRun(qs.map((q) => q.id))}>{answered.size ? 'Reia verificarea' : 'Începe verificarea'}</button>
      </div>
    );
  }
  return <div style={{ fontSize: '0.95rem' }}><QuizRunner qids={run} mode="lesson" onRestart={(ids) => setRun([...ids])} compact /></div>;
}

function useSectionTracking(lessonId: string, ready: boolean) {
  const markSeen = useStore((s) => s.markSeen);
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const heads = [...document.querySelectorAll<HTMLElement>('.lesson-body .prose h2[id], .lesson-body .prose h3[id]')];
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { setCurrent(e.target.id); markSeen(lessonId, e.target.id); }
    }, { rootMargin: '-60px 0px -70% 0px' });
    heads.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [lessonId, ready, markSeen]);
  return current;
}

export default function Lesson() {
  const { lessonId = '' } = useParams();
  const lesson = lessonsById.get(lessonId);
  const { data: body, loading } = useAsync(() => getLessonBody(lessonId), [lessonId]);
  const s = useStore();
  const mastery = useMastery();
  const visit = useStore((st) => st.visitLesson);
  const complete = useStore((st) => st.completeLesson);
  const toggleBookmark = useStore((st) => st.toggleBookmark);
  const setSettings = useStore((st) => st.setSettings);
  const setNote = useStore((st) => st.setNote);
  const current = useSectionTracking(lessonId, !!body);
  const noteKey = `lesson:${lessonId}`;
  const [noteDraft, setNoteDraft] = useState(s.notes[noteKey]?.text ?? '');
  const noteTimer = useRef<number | undefined>(undefined);
  useDocumentTitle(lesson?.title ?? 'Lecție');

  useEffect(() => { if (lesson) visit(lessonId); }, [lessonId, lesson, visit]);
  useEffect(() => { setNoteDraft(useStore.getState().notes[`lesson:${lessonId}`]?.text ?? ''); }, [lessonId]);

  const idx = orderedLessons.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? orderedLessons[idx - 1] : null;
  const next = idx >= 0 && idx < orderedLessons.length - 1 ? orderedLessons[idx + 1] : null;
  const phase = phaseOf(lessonId);
  const module = moduleOf(lessonId);
  const quiz = useMemo(() => <LessonQuiz lessonId={lessonId} />, [lessonId]);

  if (!lesson) return <NotFound what="Lecția" />;
  const st = s.lessons[lessonId];
  const seen = new Set(st?.seen ?? []);
  const h2s = lesson.toc.filter((t) => t.depth === 2);
  const seenPct = h2s.length ? (h2s.filter((t) => seen.has(t.id)).length / h2s.length) * 100 : 0;
  const bookmarked = s.bookmarks.some((b) => b.key === `lesson:${lessonId}`);
  const layoutCls = `learn-layout ${s.settings.leftPanel ? '' : 'no-left'} ${s.settings.rightPanel ? '' : 'no-right'} ${s.settings.showLegacy ? '' : 'hide-legacy'}`;

  return (
    <div className={layoutCls}>
      <nav className="side left" aria-label="Navigare curriculum">
        <div className="row between"><Link to="/learn" className="small">← Curriculum</Link><button type="button" className="btn ghost sm" onClick={() => setSettings({ leftPanel: false })} aria-label="Ascunde panoul de navigare">⟨</button></div>
        {phases.map((p) => (
          <details key={p.id} open={p.id === phase?.id}>
            <summary className="side-phase" style={{ cursor: 'pointer' }}>{p.number}. {p.title}</summary>
            {p.modules.map((m) => (
              <div key={m.id}>
                <div className="side-module">{m.title}</div>
                {m.lessons.map((lid) => (
                  <Link key={lid} to={`/learn/${lid}`} className={`side-lesson ${lid === lessonId ? 'active' : ''}`} aria-current={lid === lessonId ? 'page' : undefined}>
                    <StatusDot state={lessonStatus(s, lid, mastery)} label={false} />
                    <span>{lessonsById.get(lid)?.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </details>
        ))}
      </nav>

      <article className="lesson-main" aria-labelledby="lesson-title">
        <header className="lesson-head">
          <div className="crumbs">
            <Link to="/learn">Învață</Link><span>›</span>
            {phase && <Link to={`/learn#${phase.id}`}>Faza {phase.number}: {phase.title}</Link>}<span>›</span>
            <span>{module?.title}</span>
          </div>
          <h1 id="lesson-title">{lesson.title}</h1>
          <p className="summary">{lesson.summary}</p>
          <div className="row">
            <VersionChip v={lesson.version} />
            <DifficultyChip d={lesson.difficulty} />
            <span className="chip">{lesson.minutes} min</span>
            {lesson.objectives.map((o) => <span key={o} className="chip accent" title={objectivesById.get(o)?.title}>Obiectiv {o}</span>)}
            <span className="spacer" />
            <button type="button" className="btn sm" aria-pressed={bookmarked} onClick={() => toggleBookmark({ key: `lesson:${lessonId}`, kind: 'lesson', ref: lessonId, title: lesson.title, url: `/learn/${lessonId}` })}>{bookmarked ? '★ Salvată' : '☆ Bookmark'}</button>
            {!s.settings.leftPanel && <button type="button" className="btn ghost sm" onClick={() => setSettings({ leftPanel: true })}>Navigare</button>}
            {!s.settings.rightPanel && <button type="button" className="btn ghost sm" onClick={() => setSettings({ rightPanel: true })}>Context</button>}
          </div>
        </header>
        <div className="lesson-body">
          {loading ? <p className="faint">Se încarcă lecția…</p> : body ? <RichContent body={body} quiz={quiz} lessonId={lessonId} lessonTitle={lesson.title} /> : <p>Conținut indisponibil.</p>}
          {lesson.sources.length > 0 && (
            <section className="prose" aria-labelledby="src-h">
              <h2 id="src-h">Surse / lectură suplimentară</h2>
              <ul>{lesson.sources.map((src) => <li key={src.url}><a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a></li>)}</ul>
            </section>
          )}
        </div>
        <div className="lesson-actions">
          {prev ? <Link className="btn ghost sm" to={`/learn/${prev.id}`}>← {prev.title}</Link> : <span />}
          {st?.status === 'completed' ? (
            <button type="button" className="btn sm" onClick={() => complete(lessonId, false)} title="Marchează din nou ca în curs">✓ Finalizată</button>
          ) : (
            <button type="button" className="btn primary sm" onClick={() => complete(lessonId)}>Marchează ca finalizată</button>
          )}
          {next ? <Link className="btn ghost sm" to={`/learn/${next.id}`}>{next.title} →</Link> : <span />}
        </div>
      </article>

      <aside className="side right" aria-label="Context lecție">
        <div className="row between"><div className="section-label" style={{ margin: 0 }}>În această lecție</div><button type="button" className="btn ghost sm" onClick={() => setSettings({ rightPanel: false })} aria-label="Ascunde panoul de context">⟩</button></div>
        <div style={{ margin: '8px 0 4px' }}><Bar value={seenPct} label="Secțiuni parcurse" /></div>
        <div className="tiny faint" style={{ marginBottom: 8 }}>{Math.round(seenPct)}% din secțiuni parcurse</div>
        <nav className="toc" aria-label="Cuprins lecție">
          {lesson.toc.filter((t) => t.depth === 2).map((t) => (
            <a key={t.id} href={`#${t.id}`} className={`depth-${t.depth} ${current === t.id ? 'current' : ''} ${seen.has(t.id) ? 'seen' : ''}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ block: 'start' }); history.replaceState(null, '', `#${t.id}`); }}>{t.title}</a>
          ))}
        </nav>

        <div className="section-label" style={{ marginTop: 18 }}>Stăpânire topicuri</div>
        {lesson.topics.map((t) => {
          const m = mastery.get(t);
          return (
            <div key={t} className="mastery-row" style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 34px' }}>
              <span className="small">{topicTitle(t)}</span><Bar value={m?.score ?? 0} tone={toneFor(m?.score ?? 0)} /><span className="tiny">{m?.score ?? 0}%</span>
            </div>
          );
        })}

        {lesson.keyTerms.filter((k) => termsById.has(k)).length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Termeni cheie</div>
            <div className="row" style={{ gap: 5 }}>
              {lesson.keyTerms.filter((k) => termsById.has(k)).map((k) => <Link key={k} className="chip" to={`/glossary/${k}`} title={termsById.get(k)!.definition.slice(0, 160)}>{termsById.get(k)!.term}</Link>)}
            </div>
          </>
        )}

        {lesson.components.filter((c) => componentsById.has(c)).length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Arhitectură asociată</div>
            <ul className="list small">{lesson.components.filter((c) => componentsById.has(c)).map((c) => <li key={c}><Link to={`/architecture/${c}`}>{componentsById.get(c)!.name}</Link></li>)}</ul>
          </>
        )}

        {lesson.objectives.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Relevanță pentru examen</div>
            <ul className="list small">{lesson.objectives.map((o) => <li key={o}><Link to={`/exam?objective=${o}`}>{o} · {objectivesById.get(o)?.title}</Link></li>)}</ul>
          </>
        )}

        {(lesson.labs.some((l) => labsById.has(l)) || lesson.incidents.some((i) => incidentsById.has(i))) && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Practică</div>
            <ul className="list small">
              {lesson.labs.filter((l) => labsById.has(l)).map((l) => <li key={l}>Ghid practic: <Link to={`/labs/${l}`}>{labsById.get(l)!.title}</Link></li>)}
              {lesson.incidents.filter((i) => incidentsById.has(i)).map((i) => <li key={i}>Incident: <Link to={`/troubleshoot/${i}`}>{incidentsById.get(i)!.title}</Link></li>)}
            </ul>
          </>
        )}

        {lesson.related.filter((r) => lessonsById.has(r)).length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Lecții conectate</div>
            <ul className="list small">{lesson.related.filter((r) => lessonsById.has(r)).map((r) => <li key={r}><Link to={`/learn/${r}`}>{lessonsById.get(r)!.title}</Link></li>)}</ul>
          </>
        )}

        <div className="section-label" style={{ marginTop: 18 }}><label htmlFor="quick-note">Notițe rapide</label></div>
        <textarea id="quick-note" value={noteDraft} placeholder="Notițele tale pentru această lecție (salvate automat)…"
          onChange={(e) => {
            const v = e.target.value;
            setNoteDraft(v);
            window.clearTimeout(noteTimer.current);
            noteTimer.current = window.setTimeout(() => setNote(noteKey, lesson.title, `/learn/${lessonId}`, v), 400);
          }} />
        <div className="tiny faint" style={{ marginTop: 4 }}>Toate notițele apar în <Link to="/review">Revizia mea</Link>.</div>
      </aside>
    </div>
  );
}
