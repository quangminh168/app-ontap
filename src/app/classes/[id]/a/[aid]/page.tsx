import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, fmtDate, fmtDuration } from '@/lib/auth';
import type { Question, TopicStat } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Báo cáo kết quả của một bài giao (chỉ giáo viên của lớp xem được)
export default async function AssignmentReport({ params }: { params: { id: string; aid: string } }) {
  const { supabase, me } = await requireUser();

  const { data: cls } = await supabase.from('classes').select('id,name,teacher_id').eq('id', params.id).single();
  if (!cls || cls.teacher_id !== me.id) notFound();

  const { data: asg } = await supabase
    .from('assignments')
    .select('id,title,due_at,quiz_id')
    .eq('id', params.aid)
    .eq('class_id', cls.id)
    .single();
  if (!asg) notFound();

  const [{ data: quiz }, { data: members }, { data: attempts }] = await Promise.all([
    supabase.from('quizzes').select('questions').eq('id', asg.quiz_id).single(),
    supabase.from('class_members').select('user_id,profiles(full_name)').eq('class_id', cls.id),
    supabase
      .from('attempts')
      .select('id,user_id,score,total,duration_seconds,created_at,answers,topic_stats')
      .eq('assignment_id', asg.id)
      .order('created_at', { ascending: false }),
  ]);

  const questions = (quiz?.questions ?? []) as Question[];
  const att = (attempts ?? []) as any[];

  // Mỗi học sinh: lấy lần làm điểm cao nhất
  const bestBy = new Map<string, any>();
  const countBy = new Map<string, number>();
  for (const a of att) {
    countBy.set(a.user_id, (countBy.get(a.user_id) ?? 0) + 1);
    const cur = bestBy.get(a.user_id);
    if (!cur || a.score > cur.score) bestBy.set(a.user_id, a);
  }
  const rows = ((members ?? []) as any[]).map((m) => ({
    id: m.user_id as string,
    name: (m.profiles?.full_name as string) || 'Chưa đặt tên',
    best: bestBy.get(m.user_id),
    tries: countBy.get(m.user_id) ?? 0,
  }));
  rows.sort((a, b) => (b.best?.score ?? -1) - (a.best?.score ?? -1));

  const done = rows.filter((r) => r.best);
  const avg = done.length ? Math.round((done.reduce((s, r) => s + r.best.score / r.best.total, 0) / done.length) * 100) : 0;

  // Câu cả lớp hay sai: tính trên lần làm tốt nhất của từng học sinh
  const wrongRate = questions.map((q, i) => {
    let wrong = 0;
    for (const r of done) if (r.best.answers[i] !== q.answer) wrong++;
    return { i, q, wrong, rate: done.length ? wrong / done.length : 0 };
  });
  const hardest = wrongRate.filter((w) => w.wrong > 0).sort((a, b) => b.rate - a.rate).slice(0, 5);

  // Chủ đề yếu của lớp
  const topics = new Map<string, TopicStat>();
  for (const r of done) {
    for (const t of (r.best.topic_stats ?? []) as TopicStat[]) {
      const cur = topics.get(t.topic) ?? { topic: t.topic, total: 0, correct: 0 };
      cur.total += t.total;
      cur.correct += t.correct;
      topics.set(t.topic, cur);
    }
  }
  const topicList = Array.from(topics.values()).sort((a, b) => a.correct / a.total - b.correct / b.total);

  return (
    <main className="main">
      <div className="head">
        <Link href={`/classes/${cls.id}`} className="crumb">← {cls.name}</Link>
        <h1>{asg.title}</h1>
        <p className="muted">{asg.due_at ? `Hạn nộp ${fmtDate(asg.due_at)}` : 'Không đặt hạn'}</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="lab">Đã nộp</span><div className="num">{done.length}/{rows.length}</div></div>
        <div className="stat"><span className="lab">Điểm trung bình</span><div className="num">{avg}%</div></div>
        <div className="stat"><span className="lab">Số câu</span><div className="num">{questions.length}</div></div>
      </div>

      <section className="card stack">
        <h2>Điểm từng học sinh (lần làm tốt nhất)</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Học sinh</th><th>Điểm</th><th>Thời gian</th><th>Số lần làm</th><th>Nộp lúc</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="mono">{r.best ? `${r.best.score}/${r.best.total}` : 'Chưa nộp'}</td>
                  <td>{r.best ? fmtDuration(r.best.duration_seconds) : ''}</td>
                  <td className="mono">{r.tries}</td>
                  <td>{r.best ? fmtDate(r.best.created_at) : ''}</td>
                  <td>{r.best && <Link href={`/history/${r.best.id}`}>Xem bài</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {topicList.length > 0 && (
        <section className="card stack">
          <h2>Chủ đề lớp làm yếu nhất</h2>
          <div className="bars" style={{ border: 0, padding: 0 }}>
            {topicList.map((t) => (
              <div className="brow" key={t.topic}>
                <span className="name">{t.topic}</span>
                <div className="track"><div className="fill" style={{ width: `${Math.round((t.correct / t.total) * 100)}%` }} /></div>
                <span className="mono val">{Math.round((t.correct / t.total) * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {hardest.length > 0 && (
        <section className="card stack">
          <h2>Câu cả lớp hay sai</h2>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Câu</th><th>Nội dung</th><th>Tỷ lệ sai</th></tr></thead>
              <tbody>
                {hardest.map((w) => (
                  <tr key={w.i}>
                    <td className="mono">{w.i + 1}</td>
                    <td className="wrap">{w.q.q}</td>
                    <td className="mono">{Math.round(w.rate * 100)}% ({w.wrong}/{done.length})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
