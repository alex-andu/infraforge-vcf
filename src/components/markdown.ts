/**
 * Markdown → segments. Plain markdown becomes HTML (marked); our extensions
 * (callouts, diagrams, figures, labs, incidents, quiz) become typed segments that
 * React renders as components.
 */
import { Marked, type Tokens } from 'marked';

export type Segment =
  | { type: 'html'; html: string }
  | { type: 'callout'; kind: string; title: string; html: string }
  | { type: 'details'; title: string; html: string }
  | { type: 'diagram'; id: string }
  | { type: 'lab'; id: string }
  | { type: 'incident'; id: string }
  | { type: 'figure'; src: string; caption: string; source: string }
  | { type: 'quiz' };

export const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function makeMarked(withAnchors: boolean) {
  const m = new Marked({ gfm: true });
  m.use({
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { tokens, depth, text }: Tokens.Heading) {
        const explicit = text.match(/\{#([^}]+)\}\s*$/);
        const inner = this.parser.parseInline(tokens).replace(/\s*\{#[^}]+\}\s*$/, '');
        const id = explicit ? explicit[1] : slugify(text.replace(/\s*\{#[^}]+\}\s*$/, ''));
        const btn = withAnchors && depth <= 3
          ? ` <button type="button" class="anchor-btn" data-anchor="${id}" aria-label="Salvează secțiunea în bookmark-uri" title="Bookmark secțiune">★</button>`
          : '';
        return `<h${depth} id="${id}">${inner}${btn}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = (this as any).parser.parseInline(tokens);
        let url = href;
        const lesson = href.match(/^lesson:([a-z0-9-]+)(#[a-z0-9-]+)?$/);
        if (lesson) url = `/learn/${lesson[1]}${lesson[2] ?? ''}`;
        const external = /^https?:/.test(url);
        return `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}${external ? '<span class="sr-only"> (se deschide într-un tab nou)</span>' : ''}</a>`;
      },
      code({ text, lang }: Tokens.Code) {
        const l = (lang ?? '').split(/\s/)[0];
        return `<pre data-lang="${escapeHtml(l)}"><button type="button" class="copy-btn" data-copy>Copiază</button><code class="language-${escapeHtml(l)}">${escapeHtml(text)}</code></pre>\n`;
      },
      table(token: Tokens.Table) {
        // Default table rendering, wrapped so wide tables scroll.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const self = this as any;
        const head = token.header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${self.parser.parseInline(c.tokens)}</th>`).join('');
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${self.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
        return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>\n`;
      },
    },
  });
  return m;
}

const mdAnchors = makeMarked(true);
const mdPlain = makeMarked(false);

/** Glossary links [[id]] / [[id|label]] → anchor with data-term (tooltip handled by React delegation). */
function glossaryLinks(src: string, termLabel: (id: string) => string | undefined): string {
  return src.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id: string, label?: string) => {
    const text = label ?? termLabel(id) ?? id;
    return `<a class="term-link" data-term="${id}" href="/glossary/${id}">${escapeHtml(text)}</a>`;
  });
}

export function renderInline(src: string, termLabel: (id: string) => string | undefined = () => undefined): string {
  return mdPlain.parseInline(glossaryLinks(src, termLabel)) as string;
}

export function renderBlock(src: string, termLabel: (id: string) => string | undefined = () => undefined, anchors = false): string {
  return (anchors ? mdAnchors : mdPlain).parse(glossaryLinks(src, termLabel)) as string;
}

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const CALLOUT_TITLES: Record<string, string> = {
  vcf9: 'Changed in VCF 9', legacy: 'VCF 5.x / Legacy Context', general: 'General concept', exam: 'Exam focus',
  trap: 'Exam trap', warning: 'Warning', tip: 'Tip', note: 'Note',
};

export function toSegments(body: string, termLabel: (id: string) => string | undefined, anchors = true): Segment[] {
  const out: Segment[] = [];
  const lines = body.split('\n');
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = buf.join('\n');
    if (text.trim()) out.push({ type: 'html', html: renderBlock(text, termLabel, anchors) });
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) { buf.push(line); continue; }

    const block = line.match(/^:::(\w+)\s*(.*)$/);
    if (block && block[1] !== '') {
      flush();
      const inner: string[] = [];
      let fence = false;
      i++;
      for (; i < lines.length; i++) {
        if (/^\s*(```|~~~)/.test(lines[i])) fence = !fence;
        if (!fence && /^:::\s*$/.test(lines[i])) break;
        inner.push(lines[i]);
      }
      const kind = block[1];
      const html = renderBlock(inner.join('\n'), termLabel, false);
      if (kind === 'details') out.push({ type: 'details', title: block[2] || 'Details', html });
      else out.push({ type: 'callout', kind, title: block[2] || CALLOUT_TITLES[kind] || kind, html });
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^::diagram\[([^\]]+)\]\s*$/))) { flush(); out.push({ type: 'diagram', id: m[1] }); continue; }
    if ((m = line.match(/^::lab\[([^\]]+)\]\s*$/))) { flush(); out.push({ type: 'lab', id: m[1] }); continue; }
    if ((m = line.match(/^::incident\[([^\]]+)\]\s*$/))) { flush(); out.push({ type: 'incident', id: m[1] }); continue; }
    if (/^::quiz\s*$/.test(line)) { flush(); out.push({ type: 'quiz' }); continue; }
    if ((m = line.match(/^::figure\{(.*)\}\s*$/))) {
      flush();
      const a = attrs(m[1]);
      if (a.src) out.push({ type: 'figure', src: a.src, caption: a.caption ?? '', source: a.source ?? a.src });
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}
