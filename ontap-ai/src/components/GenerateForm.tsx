'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { KINDS, LEVELS } from '@/lib/types';

interface Doc {
  id: string;
  title: string;
  is_public: boolean;
  owner_id: string | null;
  size: number;
}

export default function GenerateForm({ subjectId, docs }: { subjectId: string; docs: Doc[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(docs.length ? [docs[0].id] : []);
  const [n, setN] = useState(10);
  const [level, setLevel] = useState('vua');
  const [kind, setKind] = useState('mcq');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ctl = useRef<AbortController | null>(null);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    ctl.current = new AbortController();
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctl.current.signal,
        body: JSON.stringify({ subjectId, documentIds: picked, extraText: extra, n, level, kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Không tạo được đề.');
      router.push(`/quiz/${data.id}`);
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Không tạo được đề.');
      setBusy(false);
    }
  }

  const seg = (name: string, opts: Record<string, string>, cur: string, set: (v: string) => void) => (
    <div className="seg" role="radiogroup" aria-label={name}>
      {Object.entries(opts).map(([v, label]) => (
        <label key={v}>
          <input type="radio" name={name} value={v} checked={cur === v} onChange={() => set(v)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <form className="card stack" onSubmit={submit}>
      <div>
        <h2>Tạo đề bằng AI</h2>
        <p className="small muted">Chọn một hoặc nhiều tài liệu, hoặc dán thêm nội dung bên dưới.</p>
      </div>

      {docs.length > 0 ? (
        <div className="docpick" role="group" aria-label="Chọn tài liệu">
          {docs.map((d) => (
            <label key={d.id}>
              <input type="checkbox" checked={picked.includes(d.id)} onChange={() => toggle(d.id)} />
              <span>
                {d.title}
                <span className="small muted">
                  {' '}· {d.owner_id === null ? 'Hệ thống' : d.is_public ? 'Công khai' : 'Của bạn'} · {d.size.toLocaleString('vi-VN')} ký tự
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="msg info">Môn này chưa có tài liệu. Hãy thêm tài liệu ở bên dưới hoặc dán nội dung vào ô "Dán thêm nội dung".</p>
      )}

      <div className="field">
        <label className="lab" htmlFor="extra">Dán thêm nội dung (không bắt buộc)</label>
        <textarea id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} rows={4} placeholder="Dán đoạn giáo trình, slide hoặc đề cương vào đây." />
      </div>

      <div className="fields">
        <div className="field">
          <label className="lab" htmlFor="n">Số câu</label>
          <select id="n" value={n} onChange={(e) => setN(Number(e.target.value))} style={{ maxWidth: 200 }}>
            {[5, 10, 15, 20].map((v) => <option key={v} value={v}>{v} câu</option>)}
          </select>
        </div>
        <div className="field"><span className="lab">Độ khó</span>{seg('level', LEVELS, level, setLevel)}</div>
        <div className="field"><span className="lab">Dạng câu hỏi</span>{seg('kind', KINDS, kind, setKind)}</div>
      </div>

      {error && <div className="msg err" role="alert">{error}</div>}
      {busy && <div className="msg info" role="status">Đang đọc tài liệu và soạn câu hỏi… thường mất 20 đến 60 giây.</div>}

      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <button className="btn" type="submit" disabled={busy || (picked.length === 0 && extra.trim().length < 200)}>
          {busy ? 'Đang tạo…' : 'Tạo đề'}
        </button>
        {busy && (
          <button className="btn ghost" type="button" onClick={() => ctl.current?.abort()}>Dừng</button>
        )}
      </div>
    </form>
  );
}
