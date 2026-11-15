'use client';

import { useRef, useState } from 'react';
import { addDocument } from '@/app/subjects/[id]/actions';

export default function AddDocument({ subjectId, isTeacher }: { subjectId: string; isTeacher: boolean }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [fileErr, setFileErr] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileErr('');
    if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name)) {
      setFileErr('Hiện chỉ đọc được tệp .txt hoặc .md. Với PDF hoặc Word, hãy mở tệp, sao chép nội dung và dán vào ô bên dưới.');
      e.target.value = '';
      return;
    }
    const text = await f.text();
    setContent(text);
    if (titleRef.current && !titleRef.current.value) titleRef.current.value = f.name.replace(/\.(txt|md)$/i, '');
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
          <label className="lab" htmlFor="doc-file">Mở tệp .txt hoặc .md (không bắt buộc)</label>
          <input id="doc-file" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onFile} />
          {fileErr && <span className="small warn">{fileErr}</span>}
        </div>
        <div className="field">
          <label className="lab" htmlFor="doc-content">Nội dung</label>
          <textarea id="doc-content" name="content" required minLength={200} rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Dán nội dung giáo trình, slide hoặc đề cương vào đây (ít nhất 200 ký tự)." />
          <span className="small muted">{content.length.toLocaleString('vi-VN')} ký tự</span>
        </div>
        {isTeacher && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" name="isPublic" /> Chia sẻ công khai cho mọi người dùng thấy
          </label>
        )}
        <div><button className="btn" type="submit">Lưu tài liệu</button></div>
      </form>
    </details>
  );
}
