import Link from 'next/link';
import { requireUser, fmtDate, fmtDuration } from '@/lib/auth';
import { deleteAttempt } from './actions';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { supabase, me } = await requireUser();
  const { data: attempts } = await supabase
    .from('attempts')
    .select('id,score,total,duration_seconds,created_at,assignment_id,quizzes(title)')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const list = (attempts ?? []) as any[];
  const avg = list.length
    ? Math.round((list.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / list.length) * 100)
    : 0;

  return (
    <main className="main">
      <div className="head">
        <h1>Lịch sử làm bài</h1>
        <p className="muted">Mở một bài để xem lại đáp án đúng và giải thích.</p>
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <strong>Chưa có bài nào</strong>
          Làm một đề ở <Link href="/">mục Môn học</Link>, kết quả sẽ được lưu ở đây.
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><span className="lab">Bài đã làm</span><div className="num">{list.length}</div></div>
            <div className="stat"><span className="lab">Điểm trung bình</span><div className="num">{avg}%</div></div>
            <div className="stat"><span className="lab">Bài giao của lớp</span><div className="num">{list.filter((a) => a.assignment_id).length}</div></div>
          </div>
          <div className="list">
            {list.map((a) => (
              <div key={a.id} className="item">
                <div className="item-main">
                  <div className="item-title">{a.quizzes?.title ?? 'Bài làm'}</div>
                  <div className="small muted">
                    {fmtDate(a.created_at)} · {fmtDuration(a.duration_seconds)}
                    {a.assignment_id ? ' · Bài giao của lớp' : ''}
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 600 }}>
                  {a.score}/{a.total} · {a.total ? Math.round((a.score / a.total) * 100) : 0}%
                </div>
                <div className="row">
                  <Link href={`/history/${a.id}`} className="btn sm">Xem lại</Link>
                  <form action={deleteAttempt}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn ghost sm" type="submit">Xóa</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
