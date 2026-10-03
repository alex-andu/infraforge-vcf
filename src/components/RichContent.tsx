import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toSegments, renderInline, type Segment } from './markdown';
import { Diagram } from './Diagram';
import { termsById, labsById, incidentsById } from '../content';
import { useStore } from '../state/store';
import { DifficultyChip } from './ui';

export const termLabel = (id: string) => termsById.get(id)?.term;

/** Handles clicks/hover inside rendered markdown: router links, copy buttons, glossary tooltips, section bookmarks. */
export function useProseBehaviour(ref: React.RefObject<HTMLElement | null>, opts: { lessonId?: string; lessonTitle?: string } = {}) {
  const navigate = useNavigate();
  const [tip, setTip] = useState<{ x: number; y: number; id: string } | null>(null);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const bookmarks = useStore((s) => s.bookmarks);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const copy = t.closest('[data-copy]') as HTMLElement | null;
      if (copy) {
        const code = copy.parentElement?.querySelector('code')?.textContent ?? '';
        navigator.clipboard?.writeText(code).then(() => { copy.textContent = 'Copiat'; setTimeout(() => (copy.textContent = 'Copiază'), 1200); }, () => { copy.textContent = 'Eroare'; });
        return;
      }
      const anchorBtn = t.closest('[data-anchor]') as HTMLElement | null;
      if (anchorBtn && opts.lessonId) {
        const id = anchorBtn.dataset.anchor!;
        const title = anchorBtn.parentElement?.textContent?.replace('★', '').trim() ?? id;
        toggleBookmark({ key: `section:${opts.lessonId}#${id}`, kind: 'section', ref: `${opts.lessonId}#${id}`, title: `${opts.lessonTitle} › ${title}`, url: `/learn/${opts.lessonId}#${id}` });
        return;
      }
      const a = t.closest('a') as HTMLAnchorElement | null;
      if (a && a.getAttribute('href')?.startsWith('/') && !e.metaKey && !e.ctrlKey && a.target !== '_blank') {
        e.preventDefault();
        navigate(a.getAttribute('href')!);
      }
    };
    const onOver = (e: Event) => {
      const a = (e.target as HTMLElement).closest('[data-term]') as HTMLElement | null;
      if (!a) return;
      const r = a.getBoundingClientRect();
      setTip({ x: Math.min(r.left, window.innerWidth - 360), y: r.bottom + 6, id: a.dataset.term! });
    };
    const onOut = (e: Event) => { if ((e.target as HTMLElement).closest('[data-term]')) setTip(null); };
    el.addEventListener('click', onClick);
    el.addEventListener('mouseover', onOver);
    el.addEventListener('focusin', onOver);
    el.addEventListener('mouseout', onOut);
    el.addEventListener('focusout', onOut);
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseover', onOver);
      el.removeEventListener('focusin', onOver);
      el.removeEventListener('mouseout', onOut);
      el.removeEventListener('focusout', onOut);
    };
  }, [ref, navigate, opts.lessonId, opts.lessonTitle, toggleBookmark]);

  // Reflect bookmarked sections on the ★ buttons.
  useEffect(() => {
    const el = ref.current;
    if (!el || !opts.lessonId) return;
    const keys = new Set(bookmarks.map((b) => b.key));
    el.querySelectorAll<HTMLElement>('[data-anchor]').forEach((b) => b.setAttribute('aria-pressed', String(keys.has(`section:${opts.lessonId}#${b.dataset.anchor}`))));
  });

  const term = tip ? termsById.get(tip.id) : null;
  const tooltip = term && tip ? (
    <div className="tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      <strong>{term.term}{term.expansion ? <span className="faint"> · {term.expansion}</span> : null}</strong>
      <span dangerouslySetInnerHTML={{ __html: renderInline(term.definition.split('\n')[0]) }} />
    </div>
  ) : null;
  return tooltip;
}

function SegmentView({ s, quiz }: { s: Segment; quiz?: ReactNode }) {
  switch (s.type) {
    case 'html': return <div dangerouslySetInnerHTML={{ __html: s.html }} />;
    case 'callout': return (
      <aside className={`callout ${s.kind}`}>
        <div className="callout-title">{s.title}</div>
        <div dangerouslySetInnerHTML={{ __html: s.html }} />
      </aside>
    );
    case 'details': return (
      <details className="deep"><summary>{s.title}</summary><div className="deep-body" dangerouslySetInnerHTML={{ __html: s.html }} /></details>
    );
    case 'diagram': return <Diagram id={s.id} />;
    case 'figure': return <OfficialFigure src={s.src} caption={s.caption} source={s.source} />;
    case 'lab': {
      const lab = labsById.get(s.id);
      if (!lab) return null;
      return (
        <div className="embed-card">
          <span className="ico" aria-hidden="true">L</span>
          <div style={{ flex: 1 }}>
            <div className="row"><strong>{lab.title}</strong><DifficultyChip d={lab.level} /></div>
            <div className="small muted">{lab.objectives[0]}</div>
          </div>
          <Link className="btn sm" to={`/labs/${lab.id}`}>Deschide laboratorul</Link>
        </div>
      );
    }
    case 'incident': {
      const inc = incidentsById.get(s.id);
      if (!inc) return null;
      return (
        <div className="embed-card">
          <span className="ico" aria-hidden="true" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>!</span>
          <div style={{ flex: 1 }}><strong>{inc.title}</strong><div className="small muted">{inc.summary}</div></div>
          <Link className="btn sm" to={`/troubleshoot/${inc.id}`}>Investighează</Link>
        </div>
      );
    }
    case 'quiz': return <>{quiz}</>;
  }
}

export function OfficialFigure({ src, caption, source }: { src: string; caption: string; source: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="official">
      {failed ? (
        <div className="img-fallback">Imaginea oficială nu s-a putut încărca (necesită acces la internet către techdocs.broadcom.com). <a href={source} target="_blank" rel="noopener noreferrer">Deschide pagina sursă</a>.</div>
      ) : (
        <img src={src} alt={caption || 'Diagramă din documentația oficială Broadcom'} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
      <figcaption>
        {caption && <>{caption} · </>}Sursă: <a href={source} target="_blank" rel="noopener noreferrer">documentația oficială Broadcom/VMware</a> (© Broadcom, folosit doar pentru studiu personal)
      </figcaption>
    </figure>
  );
}

/** Renders lesson-style markdown with all extensions. */
export function RichContent({ body, quiz, lessonId, lessonTitle, className = 'prose' }: { body: string; quiz?: ReactNode; lessonId?: string; lessonTitle?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => toSegments(body, termLabel, !!lessonId), [body, lessonId]);
  const tooltip = useProseBehaviour(ref, { lessonId, lessonTitle });
  return (
    <div ref={ref} className={className}>
      {segments.map((s, i) => <SegmentView key={i} s={s} quiz={quiz} />)}
      {tooltip}
    </div>
  );
}

/** Markdown snippets (lab instructions, explanations). Block snippets support all extensions. */
export function Md({ src, inline }: { src: string; inline?: boolean }) {
  if (!inline) return <RichContent body={src} />;
  return <InlineMd src={src} />;
}

function InlineMd({ src }: { src: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tooltip = useProseBehaviour(ref);
  const html = useMemo(() => renderInline(src, termLabel), [src]);
  return <span ref={ref}><span dangerouslySetInnerHTML={{ __html: html }} />{tooltip}</span>;
}
