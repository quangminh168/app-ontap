'use client';

import { deleteSubject } from '@/app/subjects/[id]/actions';

export default function DeleteSubject({
  subjectId,
  name,
  corner,
}: {
  subjectId: string;
  name: string;
  corner?: boolean; // true: nút nhỏ ở góc thẻ môn học (trang chủ)
}) {
  return (
    <form
      action={deleteSubject}
      className={corner ? 'del-subject' : undefined}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Xóa môn "${name}"?\n\nTài liệu và đề trong môn này có thể bị xóa theo. Hành động này không hoàn tác được.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="subjectId" value={subjectId} />
      {corner && <input type="hidden" name="from" value="home" />}
      {corner ? (
        <button type="submit" aria-label={`Xóa môn ${name}`}>Xóa</button>
      ) : (
        <button className="btn ghost sm" type="submit" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>
          Xóa môn học này
        </button>
      )}
    </form>
  );
}
