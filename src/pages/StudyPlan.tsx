import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { useMastery, useDueCount, topicTitle } from '../state/derived';
import { meta, orderedLessons, moduleOf, labsById } from '../content';
import { buildPlan, type PlanItem, type Plan } from '../engine/plan';
import { dayKey } from '../engine/gamification';
import { fmtMinutes, useDocumentTitle, Empty } from '../components/ui';

const TYPE_RO: Record<PlanItem['type'], string> = { lesson: 'Lecție', review: 'Recapitulare', quiz: 'Quiz', lab: 'Laborator', mock: 'Examen simulat', weak: 'Topic slab' };

function itemUrl(i: PlanItem) {
  switch (i.type) {
    case 'lesson': return `/learn/${i.ref}`;
    case 'lab': return `/labs/${i.ref}`;
    case 'review': return '/review/session';
    case 'quiz': return `/exam/session?kind=module&module=${i.ref}`;
    case 'mock': return '/exam/mock';
    case 'weak': return '/exam/session?kind=weak';
  }
}

export function usePlan(): Plan | null {
  const plan = useStore((s) => s.plan);
  const lessons = useStore((s) => s.lessons);
  const labs = useStore((s) => s.labs);
  const examDate = useStore((s) => s.profile.examDate);
  const mastery = useMastery();
  const due = useDueCount();
  return useMemo(() => {
    if (!plan) return null;
    const start = new Date(plan.start);
    const end = examDate && plan.days === 0 ? new Date(examDate) : new Date(start.getTime() + (plan.days - 1) * 86_400_000);
    const today = new Date();
    const remaining = orderedLessons.filter((l) => lessons[l.id]?.status !== 'completed').map((l) => {
      const m = moduleOf(l.id)!;
      return { id: l.id, title: l.title, minutes: l.minutes, module: m.id, moduleTitle: m.title, labs: l.labs };
    });
    const weak = [...mastery.values()].filter((m) => (m.attempts > 0 || m.coverage > 0) && m.score < 50).sort((a, b) => a.score - b.score).slice(0, 5).map((m) => ({ id: m.topic, title: topicTitle(m.topic) }));
    return buildPlan({
      today: today > end ? end : today,
      endDate: end,
      minutesPerDay: plan.hoursPerDay * 60,
      remainingLessons: remaining,
      labs: new Map(meta.labs.map((l) => [l.id, { id: l.id, title: l.title, minutes: l.minutes }])),
      completedLabs: new Set(Object.entries(labs).filter(([, v]) => v.status === 'completed').map(([k]) => k)),
      weakTopics: weak,
      reviewDue: due,
      includeLabs: true,
    });
  }, [plan, lessons, labs, examDate, mastery, due]);
}

export function TodayPlan() {
  const p = usePlan();
  const lessons = useStore((s) => s.lessons);
  if (!p) return <div className="small muted">Nu ai un plan de studiu. <Link to="/plan">Creează unul</Link> (7, 14, 30 de zile sau până la data examenului).</div>;
  const today = p.days[0];
  const doneToday = orderedLessons.filter((l) => lessons[l.id]?.completedAt && dayKey(lessons[l.id]!.completedAt!) === dayKey(Date.now()));
  return (
    <div>
      <div className="section-label">Planul de azi · {fmtMinutes(today.minutes)}</div>
      <ul className="list">
        {doneToday.map((l) => <li key={l.id} className="small"><span style={{ color: 'var(--ok)' }}>✓</span> <Link to={`/learn/${l.id}`}>{l.title}</Link></li>)}
        {today.items.slice(0, 5).map((i, k) => (
          <li key={k} className="small row between"><Link to={itemUrl(i)}>{i.title}</Link><span className="faint">{TYPE_RO[i.type]}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default function StudyPlan() {
  useDocumentTitle('Plan de studiu');
  const plan = useStore((s) => s.plan);
  const setPlan = useStore((s) => s.setPlan);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const lessons = useStore((s) => s.lessons);
  const p = usePlan();
  const [days, setDays] = useState<number>(plan?.days ?? 30);
  const [hours, setHours] = useState<number>(plan?.hoursPerDay ?? 2);
  const [examDate, setExamDate] = useState(profile.examDate ?? '');

  const create = (d: number) => {
    if (d === 0 && examDate) setProfile({ examDate });
    setPlan({ days: d, start: dayKey(Date.now()), hoursPerDay: hours });
  };

  // Behind / ahead indicator: compare lessons completed since the plan started with the linear expectation.
  let pace: string | null = null;
  if (plan && p) {
    const start = new Date(plan.start).getTime();
    const totalDays = p.days.length + Math.max(0, Math.round((Date.now() - start) / 86_400_000));
    const elapsed = Math.max(0, Math.round((Date.now() - start) / 86_400_000));
    const doneSince = Object.values(lessons).filter((l) => l.completedAt && l.completedAt >= start).length;
    const remainingNow = orderedLessons.filter((l) => lessons[l.id]?.status !== 'completed').length;
    const expected = Math.round(((doneSince + remainingNow) * elapsed) / Math.max(1, totalDays));
    if (elapsed > 0) pace = doneSince >= expected ? `Ești în grafic (${doneSince} lecții terminate, așteptat ~${expected}).` : `Ești în urmă cu ~${expected - doneSince} lecții; planul a fost redistribuit pe zilele rămase.`;
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Plan de studiu</h1>
          <p>Planul se recalculează automat din progresul tău real: ce nu ai terminat se mută în zilele următoare, iar topicurile slabe primesc sesiuni suplimentare.</p>
        </div>
      </div>
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div className="section-label">Durată</div>
            <div className="seg" role="group" aria-label="Durata planului">
              {[7, 14, 30].map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d} zile</button>)}
              <button type="button" aria-pressed={days === 0} onClick={() => setDays(0)}>Până la examen</button>
            </div>
          </div>
          {days === 0 && <label className="field" style={{ width: 180 }}>Data examenului<input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></label>}
          <label className="field" style={{ width: 150 }}>Ore pe zi<input type="number" min={0.5} max={10} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value) || 1)} /></label>
          <button className="btn primary" onClick={() => create(days)} disabled={days === 0 && !examDate}>{plan ? 'Regenerează planul' : 'Generează planul'}</button>
          {plan && <button className="btn ghost" onClick={() => setPlan(undefined)}>Șterge planul</button>}
        </div>
        {pace && <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>{pace}</p>}
        {p?.overloaded && <p className="small" style={{ color: 'var(--warn)', marginTop: 6, marginBottom: 0 }}>Materialul rămas ({fmtMinutes(p.totalMinutes)}) nu încape în {hours} h/zi. Mărește orele pe zi sau durata; altfel ultimele zile vor fi încărcate.</p>}
      </section>
      {!p ? <Empty title="Niciun plan activ">Alege durata și generează planul. Poți să-l regenerezi oricând.</Empty> : (
        <div className="grid grid-3">
          {p.days.map((d, i) => (
            <section key={d.date} className="panel">
              <div className="row between">
                <strong>{i === 0 ? 'Azi' : new Date(d.date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                <span className="small faint">{fmtMinutes(d.minutes)}</span>
              </div>
              <ul className="list">
                {d.items.map((it, k) => (
                  <li key={k} className="small">
                    <span className="chip" style={{ marginRight: 6 }}>{TYPE_RO[it.type]}</span>
                    <Link to={itemUrl(it)}>{it.type === 'lab' ? labsById.get(it.ref)?.title ?? it.title : it.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
