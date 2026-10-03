import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { dueItems } from '../engine/srs';
import { QuizRunner } from '../components/QuizRunner';
import { Empty, useDocumentTitle } from '../components/ui';

export default function ReviewSession() {
  useDocumentTitle('Recapitulare');
  // Freeze the due list when the session starts so answering does not reshuffle it.
  const [qids, setQids] = useState(() => dueItems(useStore.getState().review, Date.now()).slice(0, 30).map((r) => r.qid));
  const key = useMemo(() => qids.join(), [qids]);
  if (!qids.length) return <div className="page"><Empty title="Nicio întrebare scadentă azi." action={{ to: '/review', label: 'Vezi coada de recapitulare' }}>Revino mâine sau exersează un quiz din Exam Prep.</Empty></div>;
  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="crumbs"><Link to="/review">Revizia mea</Link><span>›</span><span>Sesiune de recapitulare</span></div>
      <h1>Recapitulare: {qids.length} întrebări</h1>
      <p className="small muted">Răspuns corect: întrebarea trece în cutia următoare și revine mai târziu. Greșit: revine mâine.</p>
      <QuizRunner key={key} qids={qids} mode="review" historyKind="review"
        onRestart={() => setQids(dueItems(useStore.getState().review, Date.now()).slice(0, 30).map((r) => r.qid))} finishLabel="Încarcă întrebările scadente rămase" />
    </div>
  );
}
