'use client';

import { useState } from 'react';
import { reactDoc } from '@/app/subjects/[id]/actions';

type Kind = 'like' | 'dislike' | null;

export default function LikeButtons({
  docId,
  likes,
  dislikes,
  mine,
  disabled,
}: {
  docId: string;
  likes: number;
  dislikes: number;
  mine?: Kind;
  disabled?: boolean;
}) {
  const [s, setS] = useState({ likes, dislikes, mine: mine ?? null as Kind });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function click(kind: 'like' | 'dislike') {
    if (busy || disabled) return;
    setBusy(true);
    setErr('');
    const r = await reactDoc(docId, kind);
    if (!r.ok) {
      setErr(r.error || 'Không gửi được đánh giá.');
    } else {
      setS((p) => {
        let l = p.likes, d = p.dislikes;
        if (p.mine === 'like') l--;
        if (p.mine === 'dislike') d--;
        if (r.kind === 'like') l++;
        if (r.kind === 'dislike') d++;
        return { likes: l, dislikes: d, mine: r.kind };
      });
    }
    setBusy(false);
  }

  return (
    <span className="react">
      <button type="button" className={'rbtn' + (s.mine === 'like' ? ' on' : '')} onClick={() => click('like')}
        disabled={busy || disabled} aria-pressed={s.mine === 'like'} aria-label="Thích tài liệu">
        ♥ <span className="mono">{s.likes}</span>
      </button>
      <button type="button" className={'rbtn' + (s.mine === 'dislike' ? ' on bad' : '')} onClick={() => click('dislike')}
        disabled={busy || disabled} aria-pressed={s.mine === 'dislike'} aria-label="Không thích tài liệu">
        👎 <span className="mono">{s.dislikes}</span>
      </button>
      {err && <span className="small warn">{err}</span>}
    </span>
  );
}
