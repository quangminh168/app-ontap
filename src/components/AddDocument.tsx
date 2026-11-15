'use client';

import { useRef, useState } from 'react';
import { addDocument } from '@/app/subjects/[id]/actions';

export default function AddDocument({ subjectId }: { subjectId: string; isTeacher?: boolean }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [fileErr, setFileErr] = useState('');
  const [reading, setReading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    setFileErr('');
    if (!f) return;
    const isText = /\.(txt|md)$/i.test(f.name);
    const isDoc = /\.(pdf|docx)$/i.test(f.name);
    if (!isText && !isDoc) {
      setFileErr('Chỉ đọc được tệp PDF, DOCX, TXT hoặc MD. Tệp .doc cũ hãy lưu lại thành .docx.');
      input.value = '';
      return;
    }
    try {
      let text = '';
      if (isText) {
        text = await f.text();
      } else {
        if (f.size > 4 * 1024 * 1024) throw new Error('Tệp quá lớn (tối đa 4 MB).');
        setReading(true);
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch('/api/extract', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Không đọc được tệp.');
        text = data.text;
      }
      setContent(text);
      if (titleRef.current && !titleRef.current.value) {
        titleRef.current.value = f.name.replace(/\.(txt|md|pdf|docx)$/i, '');
      }
    } catch (err: any) {
      setFileErr(err?.message || 'Không đọc được tệp.');
      input.value = '';
    } finally {
      setReading(false);
    }
  }

  return (
    <details className="card">
      <summary>Thêm tài liệu cho môn này</summary>
      <form action={addDocument} className="stack" style={{ marginTop: 14 }}>
        <input type="hidden" name="subjectId" value={subjectId} />
        <div className="field">
          <label className="lab" htmlFor="doc-title">Tiêu đề</label>
          <input id="doc-title" name="title" type="text" required maxLength={200} ref={titleRef} placeholder="Ví dụ: Chương 4 - Biến giả" />
        </div>
        <div className="field">
          <label className="lab" htmlFor="doc-file">Mở tệp PDF, DOCX, TXT hoặc MD (không bắt buộc)</label>
          <input id="doc-file" type="file" accept=".pdf,.docx,.txt,.md" onChange={onFile} disabled={reading} />
          {reading && <span className="small muted">Đang đọc tệp…</span>}
          {fileErr && <span className="small warn">{fileErr}</span>}
        </div>
        <div className="field">
          <label className="lab" htmlFor="doc-content">Nội dung</label>
          <textarea id="doc-content" name="content" required minLength={200} rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Dán nội dung giáo trình, slide hoặc đề cương vào đây (ít nhất 200 ký tự)." />
          <span className="small muted">{content.length.toLocaleString('vi-VN')} ký tự</span>
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="checkbox" name="isPublic" /> Chia sẻ công khai để mọi người dùng chung (có thể thả tim)
        </label>
        <p className="small muted">Mỗi người đăng tối đa 10 tài liệu trong 24 giờ.</p>
        <div><button className="btn" type="submit" disabled={reading}>Lưu tài liệu</button></div>
      </form>
    </details>
  );
}
