'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { PublicQuestion } from '@/lib/types';

export default function QuizRunner({
  quizId,
  assignmentId,
  questions,
}: {
  quizId: string;
  assignmentId?: string;
  questions: PublicQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warned, setWarned] = useState(false);
  const started = useRef(Date.now());

  const answered = answers.filter((a) => a >= 0).length;
  const missing = questions.length - answered;

  function pick(i: number, o: number) {
    setAnswers((a) => a.map((v, k) => (k === i ? o : v)));
    setWarned(false);
  }

  async function submit() {
    if (missing > 0 && !warned) {
      setWarned(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          assignmentId,
          answers,
          durationSeconds: Math.round((Date.now() - started.current) / 1000),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Không nộp được bài.');
      router.push(`/history/${data.attemptId}`);
    } catch (e: any) {
      setError(e?.message || 'Không nộp được bài.');
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="mono lab" aria-live="polite">Đã trả lời {answered}/{questions.length}</span>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="qcard">
          <div className="q-top">
            <span className="mono lab">Câu {i + 1}/{questions.length}</span>
            <span className="chip">{q.topic}</span>
          </div>
          <p className="qtext" id={`qt${i}`}>{q.q}</p>
          <div className="opts" role="radiogroup" aria-labelledby={`qt${i}`}>
            {q.options.map((text, o) => (
              <label key={o} className={'opt' + (answers[i] === o ? ' picked' : '')}>
                <input type="radio" name={`q${i}`} checked={answers[i] === o} onChange={() => pick(i, o)} />
                <span className="mark">{q.type === 'tf' ? (o === 0 ? 'Đ' : 'S') : 'ABCDEF'.charAt(o)}</span>
                <span className="otext">{text}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <div className="msg err" role="alert">{error}</div>}
      {warned && missing > 0 && (
        <p className="warn" role="status">Còn {missing} câu chưa trả lời. Bấm Nộp bài lần nữa nếu muốn nộp luôn.</p>
      )}
      <div>
        <button className="btn" type="button" onClick={submit} disabled={busy}>
          {busy ? 'Đang chấm…' : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
}
