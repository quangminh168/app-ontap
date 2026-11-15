import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, fmtDate } from '@/lib/auth';
import { assignQuiz, deleteAssignment, removeMember } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const { supabase, me } = await requireUser();
  const { data: cls } = await supabase
    .from('classes')
    .select('id,name,join_code,teacher_id')
    .eq('id', params.id)
    .single();
  if (!cls) notFound();
  const isOwner = cls.teacher_id === me.id;

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id,title,due_at,quiz_id,created_at')
    .eq('class_id', cls.id)
    .order('created_at', { ascending: false });
  const asg = (assignments ?? []) as any[];

  // ---------- Giáo viên ----------
  if (isOwner) {
    const [{ data: members }, { data: myQuizzes }, { data: attempts }] = await Promise.all([
      supabase.from('class_members').select('user_id,joined_at,profiles(full_name)').eq('class_id', cls.id),
      supabase.from('quizzes').select('id,title,created_at').eq('owner_id', me.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('attempts').select('assignment_id,user_id').in('assignment_id', asg.length ? asg.map((a) => a.id) : ['00000000-0000-0000-0000-000000000000']),
    ]);
    const memberList = (members ?? []) as any[];
    const submitted = new Map<string, Set<string>>();
    for (const a of (attempts ?? []) as any[]) {
      if (!submitted.has(a.assignment_id)) submitted.set(a.assignment_id, new Set());
      submitted.get(a.assignment_id)!.add(a.user_id);
    }

    return (
      <main className="main">
        <div className="head">
          <Link href="/classes" className="crumb">← Tất cả lớp</Link>
          <h1>{cls.name}</h1>
          <p className="muted">Mã lớp để gửi cho học sinh: <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{cls.join_code}</span></p>
        </div>

        {searchParams.error && <div className="msg err" role="alert">{searchParams.error}</div>}

        <form action={assignQuiz} className="card stack">
          <div>
            <h2>Giao đề cho lớp</h2>
            <p className="small muted">Chọn từ các đề bạn đã tạo. Chưa có đề thì hãy tạo ở mục Môn học trước.</p>
          </div>
          <input type="hidden" name="classId" value={cls.id} />
          <div className="fields">
            <div className="field">
              <label className="lab" htmlFor="quizId">Đề</label>
              <select id="quizId" name="quizId" required defaultValue="">
                <option value="" disabled>Chọn đề…</option>
                {(myQuizzes ?? []).map((q: any) => (
                  <option key={q.id} value={q.id}>{q.title} ({fmtDate(q.created_at)})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="lab" htmlFor="title">Tên bài giao (không bắt buộc)</label>
              <input id="title" name="title" type="text" maxLength={200} />
            </div>
            <div className="field">
              <label className="lab" htmlFor="dueAt">Hạn nộp (không bắt buộc)</label>
              <input id="dueAt" name="dueAt" type="datetime-local" />
            </div>
          </div>
          <div><button className="btn" type="submit">Giao bài</button></div>
        </form>

        <section className="stack">
          <h2>Bài đã giao</h2>
          {asg.length === 0 ? (
            <div className="card empty"><strong>Chưa giao bài nào</strong></div>
          ) : (
            <div className="list">
              {asg.map((a) => (
                <div key={a.id} className="item">
                  <div className="item-main">
                    <div className="item-title">{a.title}</div>
                    <div className="small muted">
                      {a.due_at ? `Hạn nộp ${fmtDate(a.due_at)}` : 'Không đặt hạn'} · Đã nộp {submitted.get(a.id)?.size ?? 0}/{memberList.length}
                    </div>
                  </div>
                  <div className="row">
                    <Link href={`/classes/${cls.id}/a/${a.id}`} className="btn sm">Xem kết quả</Link>
                    <form action={deleteAssignment}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="classId" value={cls.id} />
                      <button className="btn ghost sm" type="submit">Gỡ</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="stack">
          <h2>Học sinh trong lớp ({memberList.length})</h2>
          {memberList.length === 0 ? (
            <div className="card empty"><strong>Chưa có học sinh</strong>Gửi mã lớp cho học sinh để các em tham gia.</div>
          ) : (
            <div className="list">
              {memberList.map((m) => (
                <div key={m.user_id} className="item">
                  <div className="item-main">
                    <div className="item-title">{m.profiles?.full_name || 'Chưa đặt tên'}</div>
                    <div className="small muted">Tham gia {fmtDate(m.joined_at)}</div>
                  </div>
                  <form action={removeMember}>
                    <input type="hidden" name="classId" value={cls.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <button className="btn ghost sm" type="submit">Mời ra khỏi lớp</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  // ---------- Học sinh ----------
  const { data: mine } = await supabase
    .from('attempts')
    .select('id,assignment_id,score,total,created_at')
    .eq('user_id', me.id)
    .in('assignment_id', asg.length ? asg.map((a) => a.id) : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false });
  const best = new Map<string, any>();
  for (const a of (mine ?? []) as any[]) if (!best.has(a.assignment_id)) best.set(a.assignment_id, a);

  return (
    <main className="main">
      <div className="head">
        <Link href="/classes" className="crumb">← Tất cả lớp</Link>
        <h1>{cls.name}</h1>
        <p className="muted">Các bài giáo viên giao cho lớp.</p>
      </div>
      {asg.length === 0 ? (
        <div className="card empty"><strong>Chưa có bài nào được giao</strong></div>
      ) : (
        <div className="list">
          {asg.map((a) => {
            const done = best.get(a.id);
            const late = a.due_at && new Date(a.due_at) < new Date();
            return (
              <div key={a.id} className="item">
                <div className="item-main">
                  <div className="item-title">{a.title}</div>
                  <div className="small muted">
                    {a.due_at ? `Hạn nộp ${fmtDate(a.due_at)}${late && !done ? ' (đã quá hạn)' : ''}` : 'Không đặt hạn'}
                    {done ? ` · Lần làm gần nhất: ${done.score}/${done.total}` : ''}
                  </div>
                </div>
                <div className="row">
                  {done && <Link href={`/history/${done.id}`} className="btn ghost sm">Xem kết quả</Link>}
                  <Link href={`/quiz/${a.quiz_id}?a=${a.id}`} className="btn sm">{done ? 'Làm lại' : 'Làm bài'}</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
