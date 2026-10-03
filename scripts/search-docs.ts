/** Flattens all content into search documents (one per lesson subsection, lab step, term, etc.). */
import type { ContentBundle } from './content-loader.ts';
import { slugify } from './content-loader.ts';

export interface SearchDoc { id: string; group: string; title: string; context: string; text: string; url: string }

const strip = (md: string) => md
  .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ' '))
  .replace(/::figure\{[^}]*\}/g, ' ')
  .replace(/::\w+\[[^\]]*\]/g, ' ')
  .replace(/^:::\w*.*$/gm, ' ')
  .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([a-z0-9-]+)\]\]/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/[#*_>`|]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function buildSearchDocs(c: ContentBundle): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const l of c.lessons) {
    const parts = l.body.split(/^(?=## )/m);
    for (const p of parts) {
      const h = p.match(/^## (.+)$/m);
      if (!h) continue;
      const explicit = h[1].match(/\{#([^}]+)\}\s*$/);
      const title = h[1].replace(/\s*\{#[^}]+\}\s*$/, '');
      const anchor = explicit ? explicit[1] : slugify(title);
      const text = strip(p.replace(/^## .+$/m, ''));
      if (text.length < 20) continue;
      docs.push({ id: `lesson:${l.meta.id}#${anchor}`, group: 'lessons', title: `${l.meta.title} › ${title}`, context: l.meta.summary, text: text.slice(0, 4000), url: `/learn/${l.meta.id}#${anchor}` });
    }
  }
  for (const t of c.glossary) docs.push({ id: `term:${t.id}`, group: 'glossary', title: t.term, context: t.expansion ?? '', text: strip(`${t.definition} ${t.whyItMatters}`), url: `/glossary/${t.id}` });
  for (const x of c.commands) docs.push({ id: `cmd:${x.id}`, group: 'commands', title: x.title, context: x.syntax, text: `${x.purpose} ${x.syntax} ${x.example} ${x.mistake}`, url: `/reference#${x.id}` });
  for (const x of c.components) docs.push({ id: `arch:${x.id}`, group: 'architecture', title: x.name, context: x.summary, text: strip(`${x.function} ${x.runsOn} ${x.managedBy} ${x.failureImpact}`), url: `/architecture/${x.id}` });
  for (const lab of c.labs) {
    docs.push({ id: `lab:${lab.id}`, group: 'labs', title: lab.title, context: lab.objectives.join(' · '), text: strip(lab.startingState), url: `/labs/${lab.id}` });
    for (const s of lab.steps) docs.push({ id: `lab:${lab.id}:${s.id}`, group: 'labs', title: `${lab.title} › ${s.title}`, context: s.why, text: strip(s.instructions), url: `/labs/${lab.id}#${s.id}` });
  }
  for (const i of c.incidents) docs.push({ id: `inc:${i.id}`, group: 'troubleshooting', title: i.title, context: i.summary, text: strip(`${i.symptoms.join(' ')} ${i.environment}`), url: `/troubleshoot/${i.id}` });
  for (const q of c.questions) docs.push({ id: `q:${q.id}`, group: 'questions', title: strip(q.stem).slice(0, 140), context: q.explanation.concept, text: strip(`${q.explanation.correct} ${q.explanation.trap ?? ''}`), url: `/exam/question/${q.id}` });
  for (const s of c.scenarios) docs.push({ id: `scn:${s.id}`, group: 'architecture', title: s.title, context: 'Design scenario', text: strip(s.brief), url: `/scenarios/${s.id}` });
  return docs;
}
