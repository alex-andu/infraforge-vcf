/**
 * Exposes /content to the app as virtual modules. The light metadata module is eager;
 * lesson bodies, questions, labs, incidents, diagrams, scenarios, the home lab and the
 * search corpus are separate lazy chunks so the initial bundle stays small.
 */
import type { Plugin, ViteDevServer } from 'vite';
import path from 'node:path';
import { loadContent, CONTENT_DIR, type ContentBundle } from './content-loader.ts';
import { buildSearchDocs } from './search-docs.ts';

const PREFIX = 'virtual:ifc/';
const RESOLVED = '\0' + PREFIX;

export default function contentPlugin(): Plugin {
  let cache: ContentBundle | null = null;
  let server: ViteDevServer | null = null;
  const get = () => (cache ??= loadContent());

  return {
    name: 'infraforge-content',
    configureServer(s) {
      server = s;
      s.watcher.add(CONTENT_DIR);
      const onChange = (file: string) => {
        if (!path.resolve(file).startsWith(CONTENT_DIR)) return;
        cache = null;
        for (const m of s.moduleGraph.idToModuleMap.values()) if (m.id?.startsWith(RESOLVED)) s.moduleGraph.invalidateModule(m);
        s.ws.send({ type: 'full-reload' });
      };
      s.watcher.on('change', onChange).on('add', onChange).on('unlink', onChange);
    },
    buildStart() {
      const c = get();
      const errors = c.issues.filter((i) => i.level === 'error');
      if (errors.length && !server) this.error(`content has ${errors.length} errors; run npm run content:check`);
    },
    resolveId(id) {
      if (id.startsWith(PREFIX)) return '\0' + id;
    },
    load(id) {
      if (!id.startsWith(RESOLVED)) return;
      const key = id.slice(RESOLVED.length);
      const c = get();
      const json = (v: unknown) => `export default ${JSON.stringify(v)};`;
      const byId = <T extends { id: string }>(list: T[], wanted: string) => list.find((x) => x.id === wanted) ?? null;

      if (key === 'meta') {
        const lessonMeta = c.lessons.map((l) => ({
          ...l.meta,
          words: l.words,
          toc: [...l.body.matchAll(/^(#{2,3}) (.+)$/gm)].map((h) => {
            const explicit = h[2].match(/\{#([^}]+)\}\s*$/);
            const title = h[2].replace(/\s*\{#[^}]+\}\s*$/, '');
            return { depth: h[1].length, title, id: explicit ? explicit[1] : slug(title) };
          }),
        }));
        const loaders = (kind: string, ids: string[]) =>
          `{${ids.map((x) => `${JSON.stringify(x)}: () => import(${JSON.stringify(PREFIX + kind + '/' + x)})`).join(',\n')}}`;
        return [
          `export const meta = ${JSON.stringify({
            curriculum: c.curriculum,
            topics: c.topics,
            objectives: c.objectives,
            lessons: lessonMeta,
            glossary: c.glossary,
            commands: c.commands,
            components: c.components,
            badges: c.badges,
            labs: c.labs.map(({ id, title, level, complexity, minutes, version, technologies, topics, lessons, objectives }) =>
              ({ id, title, level, complexity, minutes, version, technologies, topics, lessons, objectives })),
            incidents: c.incidents.map(({ id, title, difficulty, version, topics, lessons, summary, symptoms }) =>
              ({ id, title, difficulty, version, topics, lessons, summary, symptoms })),
            scenarios: c.scenarios.map(({ id, title, topics, lessons, brief }) => ({ id, title, topics, lessons, brief })),
            diagramIds: c.diagrams.map((d) => d.id),
            questionIndex: c.questions.map((q) => ({ id: q.id, lesson: q.lesson, topics: q.topics, difficulty: q.difficulty, objective: q.objective ?? null, objectiveItem: q.objectiveItem ?? null, kind: q.kind, type: q.type, diagnostic: q.diagnostic ?? null })),
            hasHomelab: !!c.homelab,
          })};`,
          `export const lessonLoaders = ${loaders('lesson', c.lessons.map((l) => l.meta.id))};`,
          `export const labLoaders = ${loaders('lab', c.labs.map((l) => l.id))};`,
          `export const incidentLoaders = ${loaders('incident', c.incidents.map((l) => l.id))};`,
          `export const scenarioLoaders = ${loaders('scenario', c.scenarios.map((l) => l.id))};`,
          `export const diagramLoaders = ${loaders('diagram', c.diagrams.map((l) => l.id))};`,
          `export const loadQuestions = () => import(${JSON.stringify(PREFIX + 'questions')});`,
          `export const loadHomelab = () => import(${JSON.stringify(PREFIX + 'homelab')});`,
          `export const loadSearchDocs = () => import(${JSON.stringify(PREFIX + 'search')});`,
        ].join('\n');
      }
      if (key === 'questions') return json(c.questions);
      if (key === 'homelab') return json(c.homelab);
      if (key === 'search') return json(buildSearchDocs(c));
      const [kind, wanted] = key.split('/');
      if (kind === 'lesson') return json(c.lessons.find((l) => l.meta.id === wanted)?.body ?? '');
      if (kind === 'lab') return json(byId(c.labs, wanted));
      if (kind === 'incident') return json(byId(c.incidents, wanted));
      if (kind === 'scenario') return json(byId(c.scenarios, wanted));
      if (kind === 'diagram') return json(byId(c.diagrams, wanted));
      return json(null);
    },
  };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[`*_]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
