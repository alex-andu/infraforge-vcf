import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TQuestion } from '../content';
import { lessonsById, topicsById } from '../content';
import { seededShuffle, type Answer, type Grade } from '../engine/grading';
import { Md } from './RichContent';
import { Diagram } from './Diagram';
import { DifficultyChip, VersionChip } from './ui';
import { useStore } from '../state/store';

const KIND_RO: Record<string, string> = {
  concept: 'Concept', scenario: 'Scenariu', architecture: 'Arhitectură', command: 'Comandă', log: 'Interpretare log',
  troubleshooting: 'Troubleshooting', design: 'Design',
};
const TYPE_HINT: Record<string, string> = {
  single: 'Alege un singur răspuns.', truefalse: 'Adevărat sau fals?', ordering: 'Pune pașii în ordinea corectă.',
  matching: 'Asociază fiecare element din stânga cu cel corect din dreapta.', cli: 'Scrie comanda exactă.',
};

export function QuestionMeta({ q }: { q: TQuestion }) {
  return (
    <div className="q-meta">
      <span className="chip">{KIND_RO[q.kind]}</span>
      <DifficultyChip d={q.difficulty} />
      {q.version !== 'vcf9' && <VersionChip v={q.version} />}
      {q.objective && <span className="chip accent" title="Obiectiv din exam guide 2V0-17.25">Obiectiv {q.objective}</span>}
      {q.topics.slice(0, 2).map((t) => <span key={t} className="chip">{topicsById.get(t)?.title ?? t}</span>)}
    </div>
  );
}

interface Props {
  q: TQuestion;
  answer: Answer;
  onChange: (a: Answer) => void;
  /** Show correctness + per-option explanations. */
  reveal: boolean;
  grade?: Grade;
  seed: string;
}

export function QuestionBody({ q, answer, onChange, reveal, seed }: Props) {
  const multiCount = q.type === 'multi' ? (q.select ?? q.options.filter((o) => o.correct).length) : 0;
  const options = useMemo(() => ('options' in q ? (q.type === 'truefalse' ? q.options : seededShuffle(q.options, seed + q.id)) : []), [q, seed]);
  const orderInit = useMemo(() => (q.type === 'ordering' ? seededShuffle(q.items.map((i) => i.id), seed + q.id) : []), [q, seed]);
  useEffect(() => {
    // An untouched ordering is still an answer (the shuffled order), so initialise it.
    if (q.type === 'ordering' && answer == null && !reveal) onChange(orderInit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);
  const rightOptions = useMemo(() => (q.type === 'matching' ? seededShuffle(q.pairs.map((p) => ({ id: p.id, text: p.right })), seed + q.id) : []), [q, seed]);

  return (
    <div className="question">
      <QuestionMeta q={q} />
      {q.context && <div className="q-context"><Md src={q.context} /></div>}
      {q.diagram && <Diagram id={q.diagram} compact />}
      <div className="q-stem"><Md src={q.stem} /></div>
      <div className="small faint">{q.type === 'multi' ? `Alege ${multiCount} răspunsuri.` : TYPE_HINT[q.type]}</div>

      {(q.type === 'single' || q.type === 'truefalse' || q.type === 'multi') && (
        <div className="options" role={q.type === 'multi' ? 'group' : 'radiogroup'} aria-label="Variante de răspuns">
          {options.map((o, idx) => {
            const isMulti = q.type === 'multi';
            const picked = isMulti ? ((answer as string[] | null) ?? []).includes(o.id) : answer === o.id;
            const cls = reveal ? (o.correct ? (picked ? 'correct' : 'missed') : picked ? 'wrong' : '') : '';
            return (
              <button key={o.id} type="button" className={`option ${isMulti ? 'multi' : ''} ${cls}`} disabled={reveal}
                role={isMulti ? 'checkbox' : 'radio'} aria-checked={picked}
                onClick={() => {
                  if (isMulti) {
                    const cur = new Set((answer as string[] | null) ?? []);
                    if (cur.has(o.id)) cur.delete(o.id); else cur.add(o.id);
                    onChange([...cur]);
                  } else onChange(o.id);
                }}>
                <span className="key" aria-hidden="true">{q.type === 'truefalse' ? (o.id === 'true' ? 'A' : 'F') : String.fromCharCode(65 + idx)}</span>
                <span className="opt-text" style={{ flex: 1 }}>
                  <Md src={o.text} inline />
                  {reveal && (
                    <span className="why">
                      <strong>{o.correct ? '✓ Corect: ' : picked ? '✕ Ai ales greșit: ' : 'Greșit: '}</strong>
                      <Md src={o.why} inline />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'ordering' && (() => {
        const order = (answer as string[] | null) ?? orderInit;
        const items = new Map(q.items.map((i) => [i.id, i.text]));
        const move = (i: number, d: number) => {
          const next = [...order];
          const j = i + d;
          if (j < 0 || j >= next.length) return;
          [next[i], next[j]] = [next[j], next[i]];
          onChange(next);
        };
        return (
          <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Ordinea pașilor">
            {order.map((id, i) => {
              const right = q.items[i].id === id;
              return (
                <li key={id} className="order-item" style={reveal ? { borderColor: right ? 'var(--ok)' : 'var(--bad)' } : undefined}>
                  <span className="num">{i + 1}</span>
                  <span style={{ flex: 1 }}><Md src={items.get(id)!} inline /></span>
                  {reveal ? (
                    !right && <span className="small faint">corect: poziția {q.items.findIndex((x) => x.id === id) + 1}</span>
                  ) : (
                    <>
                      <button type="button" className="btn icon sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Mută „${items.get(id)}” mai sus`}>↑</button>
                      <button type="button" className="btn icon sm" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Mută „${items.get(id)}” mai jos`}>↓</button>
                    </>
                  )}
                </li>
              );
            })}
            {!reveal && <li className="small faint">Folosește săgețile pentru a reordona. Ordinea inițială este aleatorie.</li>}
          </ol>
        );
      })()}

      {q.type === 'matching' && (
        <div>
          {q.pairs.map((p) => {
            const m = (answer as Record<string, string> | null) ?? {};
            const ok = m[p.id] === p.id;
            return (
              <div key={p.id} className="match-row">
                <div><Md src={p.left} inline /></div>
                <div>
                  <select aria-label={`Pereche pentru ${p.left}`} value={m[p.id] ?? ''} disabled={reveal}
                    onChange={(e) => onChange({ ...m, [p.id]: e.target.value })}
                    style={reveal ? { borderColor: ok ? 'var(--ok)' : 'var(--bad)' } : undefined}>
                    <option value="">— alege —</option>
                    {rightOptions.map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
                  </select>
                  {reveal && !ok && <div className="small" style={{ color: 'var(--ok)' }}>Corect: {p.right}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === 'cli' && (
        <div>
          <input type="text" className="mono" spellCheck={false} autoComplete="off" aria-label="Comanda ta" placeholder={q.placeholder ?? 'Scrie comanda…'}
            value={(answer as string | null) ?? ''} disabled={reveal} onChange={(e) => onChange(e.target.value)} />
          {reveal && <div className="small" style={{ marginTop: 6 }}>Răspunsuri acceptate: {q.answers.map((a) => <code key={a} style={{ marginRight: 6 }}>{a}</code>)}</div>}
        </div>
      )}
    </div>
  );
}

export function Explanation({ q, grade }: { q: TQuestion; grade?: Grade }) {
  const lesson = lessonsById.get(q.lesson);
  const saved = useStore((s) => s.savedQuestions.includes(q.id));
  const toggleSaved = useStore((s) => s.toggleSavedQuestion);
  return (
    <div className={`explain ${grade ? (grade.correct ? 'ok' : 'bad') : ''}`} aria-live="polite">
      {grade && (
        <h4 style={{ color: grade.correct ? 'var(--ok)' : 'var(--bad)' }}>
          {grade.correct ? 'Corect' : grade.partial > 0 ? `Parțial corect (${Math.round(grade.partial * 100)}%)` : 'Incorect'}
          {!grade.correct && <span className="small faint" style={{ fontWeight: 400 }}> · adăugată în coada de recapitulare</span>}
        </h4>
      )}
      <Md src={q.explanation.correct} />
      <dl>
        <dt>Concept testat</dt><dd>{q.explanation.concept}</dd>
        {q.explanation.architecture && <><dt>Context arhitectural</dt><dd><Md src={q.explanation.architecture} inline /></dd></>}
        {q.explanation.trap && <><dt>Capcană de examen</dt><dd><Md src={q.explanation.trap} inline /></dd></>}
        {lesson && <><dt>Lecția asociată</dt><dd><Link to={`/learn/${lesson.id}${q.section ? `#${q.section}` : ''}`}>{lesson.title}{q.section ? ` › ${lesson.toc.find((t) => t.id === q.section)?.title ?? q.section}` : ''}</Link></dd></>}
        {q.sources.length > 0 && <><dt>Surse</dt><dd>{q.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>{s.title}</a>)}</dd></>}
      </dl>
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="btn sm" aria-pressed={saved} onClick={() => toggleSaved(q.id)}>{saved ? '★ Salvată' : '☆ Salvează întrebarea'}</button>
      </div>
    </div>
  );
}
