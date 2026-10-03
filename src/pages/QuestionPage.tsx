import { useParams, Link } from 'react-router-dom';
import { getQuestions } from '../content';
import { QuizRunner } from '../components/QuizRunner';
import { useAsync, Loading, NotFound, useDocumentTitle } from '../components/ui';
import { useState } from 'react';

/** A single question (linked from search results, saved questions and quiz summaries). */
export default function QuestionPage() {
  const { id = '' } = useParams();
  const { data: bank, loading } = useAsync(getQuestions, []);
  const [nonce, setNonce] = useState(0);
  useDocumentTitle('Întrebare');
  if (loading) return <Loading />;
  if (!bank?.get(id)) return <NotFound what="Întrebarea" />;
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="crumbs"><Link to="/exam">Exam Prep</Link><span>›</span><span>Întrebare</span></div>
      <QuizRunner key={nonce} qids={[id]} mode="quiz" onRestart={() => setNonce((n) => n + 1)} compact finishLabel="Încearcă din nou" />
    </div>
  );
}
