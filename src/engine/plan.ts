/**
 * Study plan generator. The plan is recomputed from *today* and the learner's actual
 * progress every time it is shown, so it adapts automatically when they fall behind or
 * move ahead: unfinished work rolls forward, weak topics get extra review slots.
 */
export interface PlanLesson { id: string; title: string; minutes: number; module: string; moduleTitle: string; labs: string[] }
export interface PlanLab { id: string; title: string; minutes: number }
export type PlanItemType = 'lesson' | 'review' | 'quiz' | 'lab' | 'mock' | 'weak';
export interface PlanItem { type: PlanItemType; ref: string; title: string; minutes: number }
export interface PlanDay { date: string; items: PlanItem[]; minutes: number }

export interface PlanInput {
  today: Date;
  endDate: Date;
  minutesPerDay: number;
  remainingLessons: PlanLesson[];
  labs: Map<string, PlanLab>;
  completedLabs: Set<string>;
  weakTopics: { id: string; title: string }[];
  reviewDue: number;
  includeLabs: boolean;
}

export interface Plan { days: PlanDay[]; overloaded: boolean; totalMinutes: number }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function buildPlan(p: PlanInput): Plan {
  const DAY = 86_400_000;
  const start = new Date(p.today.getFullYear(), p.today.getMonth(), p.today.getDate());
  const end = new Date(p.endDate.getFullYear(), p.endDate.getMonth(), p.endDate.getDate());
  const nDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1);

  // Work queue in curriculum order: lessons, a module quiz when a module ends, labs after their lesson.
  const queue: PlanItem[] = [];
  const scheduledLabs = new Set<string>();
  p.remainingLessons.forEach((l, i) => {
    queue.push({ type: 'lesson', ref: l.id, title: l.title, minutes: l.minutes });
    if (p.includeLabs) for (const lab of l.labs) {
      const info = p.labs.get(lab);
      if (info && !p.completedLabs.has(lab) && !scheduledLabs.has(lab)) {
        scheduledLabs.add(lab);
        queue.push({ type: 'lab', ref: lab, title: info.title, minutes: Math.min(info.minutes, 180) });
      }
    }
    const next = p.remainingLessons[i + 1];
    if (!next || next.module !== l.module) queue.push({ type: 'quiz', ref: l.module, title: `Quiz: ${l.moduleTitle}`, minutes: 20 });
  });

  // Reserve the final days for exam simulation when the plan is long enough.
  const finalDays = nDays >= 7 ? 2 : nDays >= 3 ? 1 : 0;
  const learningDays = nDays - finalDays;
  const totalMinutes = queue.reduce((n, x) => n + x.minutes, 0);
  const capacity = learningDays * Math.max(30, p.minutesPerDay - 15);
  const overloaded = totalMinutes > capacity;
  // Spread evenly instead of front-loading: target minutes per learning day.
  const target = learningDays > 0 ? Math.max(30, Math.ceil(totalMinutes / learningDays)) : 0;

  const days: PlanDay[] = [];
  let qi = 0;
  for (let d = 0; d < nDays; d++) {
    const date = iso(new Date(start.getTime() + d * DAY));
    const items: PlanItem[] = [];
    const isFinal = d >= learningDays;
    if (d === 0 && p.reviewDue > 0) items.push({ type: 'review', ref: 'due', title: `Recapitulare: ${p.reviewDue} întrebări scadente`, minutes: Math.min(30, 2 * p.reviewDue) });
    else items.push({ type: 'review', ref: 'daily', title: 'Recapitulare zilnică (spaced repetition)', minutes: 15 });

    if (isFinal) {
      items.push({ type: 'mock', ref: 'mock', title: 'Examen simulat complet (60 întrebări, 135 min)', minutes: 135 });
      if (p.weakTopics.length) items.push({ type: 'weak', ref: 'weak', title: `Topicuri slabe: ${p.weakTopics.slice(0, 3).map((t) => t.title).join(', ')}`, minutes: 30 });
    } else {
      let used = 0;
      const budget = overloaded ? Math.max(30, p.minutesPerDay - 15) : Math.min(target, Math.max(30, p.minutesPerDay - 15));
      while (qi < queue.length && (used === 0 || used + queue[qi].minutes <= budget * 1.15)) {
        items.push(queue[qi]);
        used += queue[qi].minutes;
        qi++;
      }
      // Midway checkpoint mock exam.
      if (nDays >= 10 && d === Math.floor(learningDays * 0.6)) items.push({ type: 'mock', ref: 'mock', title: 'Examen simulat de control', minutes: 135 });
      if (p.weakTopics.length && d % 3 === 2) items.push({ type: 'weak', ref: 'weak', title: `Întărește: ${p.weakTopics[d % p.weakTopics.length].title}`, minutes: 20 });
    }
    days.push({ date, items, minutes: items.reduce((n, x) => n + x.minutes, 0) });
  }
  // Anything left over (overloaded plan) is appended to the last learning day so nothing is silently dropped.
  if (qi < queue.length && learningDays > 0) {
    const last = days[learningDays - 1];
    last.items.push(...queue.slice(qi));
    last.minutes = last.items.reduce((n, x) => n + x.minutes, 0);
  }
  return { days, overloaded, totalMinutes };
}
