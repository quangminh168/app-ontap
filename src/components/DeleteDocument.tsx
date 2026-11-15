'use client';

import { deleteDocument } from '@/app/subjects/[id]/actions';

export default function DeleteDocument({ docId, subjectId, title }: { docId: string; subjectId: string; title: string }) {
  return (
    <form
      action={deleteDocument}
      className="del-subject"
      onSubmit={(e) => {
        if (!window.confirm(`Xóa tài liệu "${title}"?\n\nHành động này không hoàn tác được.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={docId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="next" value="home" />
      <button type="submit" aria-label={`Xóa tài liệu ${title}`}>Xóa</button>
    </form>
  );
}
