import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClass, joinClass } from './actions';

export const dynamic = 'force-dynamic';

export default async function ClassesPage({ searchParams }: { searchParams: { error?: string } }) {
  const { supabase, me } = await requireUser();
  const isTeacher = me.role === 'teacher';

  const { data: classes } = await supabase
    .from('classes')
    .select('id,name,join_code,teacher_id,created_at')
    .order('created_at', { ascending: false });

  const mine = (classes ?? []) as any[];

  return (
    <main className="main">
      <div className="head">
        <h1>Lớp học</h1>
        <p className="muted">
          {isTeacher
            ? 'Tạo lớp, gửi mã lớp cho học sinh, giao đề và xem kết quả cả lớp.'
            : 'Nhập mã lớp do giáo viên cung cấp để nhận bài được giao.'}
        </p>
      </div>

      {searchParams.error && <div className="msg err" role="alert">{searchParams.error}</div>}

      {isTeacher ? (
        <form action={createClass} className="card stack">
          <h2>Tạo lớp mới</h2>
          <div className="field">
            <label className="lab" htmlFor="cname">Tên lớp</label>
            <input id="cname" name="name" type="text" required maxLength={120} placeholder="Ví dụ: Kinh tế lượng K65 - Nhóm 2" />
          </div>
          <div><button className="btn" type="submit">Tạo lớp</button></div>
        </form>
      ) : (
        <form action={joinClass} className="card stack">
          <h2>Vào lớp bằng mã</h2>
          <div className="field">
            <label className="lab" htmlFor="code">Mã lớp (6 ký tự)</label>
            <input id="code" name="code" type="text" required maxLength={12} autoCapitalize="characters" placeholder="Ví dụ: A1B2C3" style={{ maxWidth: 240 }} />
          </div>
          <div><button className="btn" type="submit">Vào lớp</button></div>
        </form>
      )}

      <section className="stack">
        <h2>{isTeacher ? 'Lớp của bạn' : 'Lớp bạn đã tham gia'}</h2>
        {mine.length === 0 ? (
          <div className="card empty">
            <strong>Chưa có lớp nào</strong>
            {isTeacher ? 'Tạo lớp đầu tiên ở khung phía trên.' : 'Nhập mã lớp ở khung phía trên.'}
          </div>
        ) : (
          <div className="list">
            {mine.map((c) => (
              <Link key={c.id} href={`/classes/${c.id}`} className="item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="item-main">
                  <div className="item-title">{c.name}</div>
                  {c.teacher_id === me.id && <div className="small muted">Mã lớp: <span className="mono">{c.join_code}</span></div>}
                </div>
                <span className="btn ghost sm">Mở</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
