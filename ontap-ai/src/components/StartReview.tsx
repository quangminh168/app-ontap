'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function StartReview({ subjectId, label, count }: { subjectId?: string; label: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/review-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Không tạo được đề ôn.');
      router.push(`/quiz/${data.id}`);
    } catch (e: any) {
      setError(e?.message || 'Không tạo được đề ôn.');
      setBusy(false);
    }
  }

  return (
    <span>
      <button className="btn sm" type="button" onClick={start} disabled={busy || count === 0}>
        {busy ? 'Đang tạo…' : label}
      </button>
      {error && <span className="small warn"> {error}</span>}
    </span>
  );
}
