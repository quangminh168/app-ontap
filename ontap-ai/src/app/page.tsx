import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtDate } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subjects } = await supabase.from('subjects').select('id,name,description').order('sort');

  const grid = (
    <div className="grid">
      {(subjects ?? []).map((s) => (
        <Link key={s.id} href={user ? `/subjects/${s.id}` : '/login'} className="subject">
          <div className="name">{s.name}</div>
          <div className="desc">{s.description}</div>
        </Link>
      ))}
    </div>
  );

  if (!user) {
    return (
      <main className="main">
        <section className="hero">
          <h1>Ôn thi bằng đề do AI tạo từ chính tài liệu của bạn</h1>
          <p>
            Chọn môn học, chọn tài liệu, AI soạn câu hỏi kèm đáp án và giải thích. Làm bài, xem điểm theo từng
            chủ đề, ôn lại đúng những câu hay sai. Giáo viên có thể tạo lớp và giao bài.
          </p>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <Link href="/register" className="btn">Bắt đầu miễn phí</Link>
            <Link href="/login" className="btn ghost">Đăng nhập</Link>
          </div>
        </section>
        <h2>Các môn học hiện có</h2>
        {grid}
      </main>
    );
  }

  const [{ count: attemptCount }, { count: wrongCount }, { data: recent }] = await Promise.all([
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('wrong_questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('attempts')
      .select('id,score,total,created_at,quizzes(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return (
    <main className="main">
      <div className="head">
        <h1>Chọn môn để ôn</h1>
        <p className="muted">Mở một môn, chọn tài liệu và tạo đề bằng AI.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="lab">Bài đã làm</span><div className="num">{attemptCount ?? 0}</div></div>
        <div className="stat"><span className="lab">Câu cần ôn</span><div className="num">{wrongCount ?? 0}</div></div>
        <div className="stat">
          <span className="lab">Ôn lại</span>
          <div style={{ marginTop: 6 }}>
            <Link href="/review" className="btn sm ghost">Mở</Link>
          </div>
        </div>
      </div>

      {grid}

      {recent && recent.length > 0 && (
        <section className="stack">
          <h2>Bài làm gần đây</h2>
          <div className="list">
            {recent.map((a: any) => (
              <Link key={a.id} href={`/history/${a.id}`} className="item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="item-main">
                  <div className="item-title">{a.quizzes?.title ?? 'Bài làm'}</div>
                  <div className="small muted">{fmtDate(a.created_at)}</div>
                </div>
                <div className="mono">{a.score}/{a.total}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
