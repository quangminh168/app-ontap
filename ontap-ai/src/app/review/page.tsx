import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import StartReview from '@/components/StartReview';
import type { Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const { supabase, me } = await requireUser();
  const { data: rows } = await supabase
    .from('wrong_questions')
    .select('id,subject_id,question,misses,last_missed,subjects(name)')
    .eq('user_id', me.id)
    .order('misses', { ascending: false })
    .order('last_missed', { ascending: false });

  const list = (rows ?? []) as any[];

  // Gom theo môn để ôn riêng từng môn
  const bySubject = new Map<string, { name: string; count: number }>();
  for (const r of list) {
    const cur = bySubject.get(r.subject_id) ?? { name: r.subjects?.name ?? 'Môn học', count: 0 };
    cur.count++;
    bySubject.set(r.subject_id, cur);
  }

  return (
    <main className="main">
      <div className="head">
        <h1>Ôn lại câu sai</h1>
        <p className="muted">Câu làm sai hoặc bỏ trống tự vào đây. Làm đúng lần sau thì câu đó tự biến mất.</p>
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <strong>Chưa có câu nào cần ôn</strong>
          Làm một đề ở <Link href="/">mục Môn học</Link>, câu sai sẽ xuất hiện ở đây.
        </div>
      ) : (
        <>
          <section className="card stack">
            <div className="row">
              <h2>{list.length} câu cần ôn</h2>
              <StartReview label={`Ôn ${Math.min(10, list.length)} câu sai nhiều nhất`} count={list.length} />
            </div>
            {bySubject.size > 1 && (
              <div className="list">
                {Array.from(bySubject.entries()).map(([id, s]) => (
                  <div key={id} className="row">
                    <span>{s.name} <span className="muted small">· {s.count} câu</span></span>
                    <StartReview subjectId={id} label={`Ôn môn ${s.name}`} count={s.count} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="list">
            {list.map((r) => {
              const q = r.question as Question;
              return (
                <div key={r.id} className="qcard">
                  <div className="q-top">
                    <span className="chip">{r.subjects?.name}</span>
                    <span className="chip">{q.topic}</span>
                    <span className="mono lab">Sai {r.misses} lần</span>
                  </div>
                  <p className="qtext">{q.q}</p>
                  <details style={{ marginTop: 10 }}>
                    <summary>Xem đáp án</summary>
                    <div className="explain">
                      <span className="lab">Đáp án đúng</span>
                      {q.options[q.answer]}
                      {q.explain && <p style={{ marginTop: 8 }}>{q.explain}</p>}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
