'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { PublicQuestion } from '@/lib/types';
import { MAX_ESSAY_ANSWER_CHARS } from '@/lib/quiz';

type Ans = number | string; // số: chỉ số đáp án (-1 = chưa chọn); chuỗi: bài làm tự luận

function isDone(q: PublicQuestion, a: Ans) {
  return q.type === 'essay' ? typeof a === 'string' && a.trim().length > 0 : typeof a === 'number' && a >= 0;
}

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
  const [answers, setAnswers] = useState<Ans[]>(() => questions.map((q) => (q.type === 'essay' ? '' : -1)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warned, setWarned] = useState(false);
  const started = useRef(Date.now());

  const answered = questions.filter((q, i) => isDone(q, answers[i])).length;
  const missing = questions.length - answered;
  const hasEssay = questions.some((q) => q.type === 'essay');

  function set(i: number, v: Ans) {
    setAnswers((a) => a.map((x, k) => (k === i ? v : x)));
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
            {q.type === 'essay' && <span className="chip">Tự luận</span>}
          </div>
          <p className="qtext" id={`qt${i}`}>{q.q}</p>

          {q.type === 'essay' ? (
            <div>
              <textarea
                className="essay"
                aria-labelledby={`qt${i}`}
                placeholder="Nhập câu trả lời của bạn…"
                maxLength={MAX_ESSAY_ANSWER_CHARS}
                value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                onChange={(e) => set(i, e.target.value)}
                disabled={busy}
                style={{
                  width: '100%',
                  minHeight: 150,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #d6dbe8',
                  font: 'inherit',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div className="small muted" style={{ textAlign: 'right' }}>
                {typeof answers[i] === 'string' ? (answers[i] as string).length : 0}/{MAX_ESSAY_ANSWER_CHARS}
              </div>
            </div>
          ) : (
            <div className="opts" role="radiogroup" aria-labelledby={`qt${i}`}>
              {q.options.map((text, o) => (
                <label key={o} className={'opt' + (answers[i] === o ? ' picked' : '')}>
                  <input type="radio" name={`q${i}`} checked={answers[i] === o} onChange={() => set(i, o)} />
                  <span className="mark">{q.type === 'tf' ? (o === 0 ? 'Đ' : 'S') : 'ABCDEF'.charAt(o)}</span>
                  <span className="otext">{text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {error && <div className="msg err" role="alert">{error}</div>}
      {warned && missing > 0 && (
        <p className="warn" role="status">Còn {missing} câu chưa trả lời. Bấm Nộp bài lần nữa nếu muốn nộp luôn.</p>
      )}
      <div>
        <button className="btn" type="button" onClick={submit} disabled={busy}>
          {busy ? (hasEssay ? 'Đang chấm bài, có thể mất vài chục giây…' : 'Đang chấm…') : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
}
