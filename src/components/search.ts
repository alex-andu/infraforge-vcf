import MiniSearch from 'minisearch';
import { getSearchDocs, type SearchDoc } from '../content';

export const GROUPS: { id: string; label: string }[] = [
  { id: 'lessons', label: 'Lecții' },
  { id: 'architecture', label: 'Arhitectură' },
  { id: 'labs', label: 'Ghiduri practice' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'glossary', label: 'Glosar' },
  { id: 'commands', label: 'Comenzi' },
  { id: 'questions', label: 'Explicații din quiz-uri' },
];

let engine: Promise<MiniSearch<SearchDoc>> | null = null;

export function getEngine() {
  engine ??= getSearchDocs().then((docs) => {
    const ms = new MiniSearch<SearchDoc>({
      fields: ['title', 'context', 'text'],
      storeFields: ['group', 'title', 'context', 'url', 'text'],
      searchOptions: { boost: { title: 4, context: 1.5 }, prefix: true, fuzzy: 0.15, combineWith: 'AND' },
      // Keep hyphenated VMware terms (Tier-0, vSAN-ESA) searchable as a whole and in parts.
      tokenize: (s) => {
        const base = s.toLowerCase().split(/[\s,.;:()[\]{}"'`/\\|<>!?=+*]+/).filter(Boolean);
        return [...base, ...base.flatMap((t) => (t.includes('-') ? t.split('-') : []))];
      },
    });
    ms.addAll(docs);
    return ms;
  });
  return engine;
}

export interface Hit { id: string; group: string; title: string; context: string; url: string; snippet: string; score: number }

function snippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let pos = -1;
  for (const t of terms) { pos = lower.indexOf(t.toLowerCase()); if (pos >= 0) break; }
  const start = Math.max(0, pos - 60);
  return (start > 0 ? '…' : '') + text.slice(start, start + 180) + (text.length > start + 180 ? '…' : '');
}

export async function search(q: string, limitPerGroup = 6): Promise<Map<string, Hit[]>> {
  const ms = await getEngine();
  const res = q.trim() ? ms.search(q.trim()) : [];
  const out = new Map<string, Hit[]>();
  for (const r of res) {
    const g = r.group as string;
    const arr = out.get(g) ?? [];
    if (arr.length >= limitPerGroup) continue;
    arr.push({ id: r.id, group: g, title: r.title, context: r.context, url: r.url, snippet: snippet(r.text as string, r.terms), score: r.score });
    out.set(g, arr);
  }
  return out;
}

export function highlight(text: string, q: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const terms = q.trim().split(/\s+/).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return esc;
  return esc.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark>$1</mark>');
}
