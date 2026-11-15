import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import StartReview from '@/components/StartReview';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  subject_id: string;
  misses: number;
  last_missed: string;
  question: { q?: string; topic?: string } | null;
  subjects: { name: string } | null;
}

// Ôn lại: các câu trắc nghiệm / đúng sai bạn từng làm sai, gom theo môn
export default async function ReviewPage() {
  const { supabase, me } = await requireUser();
  const { data } = await supabase
    .from('wrong_questions')
    .select('id,subject_id,misses,last_missed,question,subjects(name)')
    .eq('user_id', me.id)
    .order('misses', { ascending: false })
    .limit(500);

  const rows = (data ?? []) as unknown as Row[];

  const groups = new Map<string, { id: string; name: string; count: number; misses: number; top: Row[] }>();
  for (const r of rows) {
    const g = groups.get(r.subject_id) ?? { id: r.subject_id, name: r.subjects?.name ?? 'Môn học', count: 0, misses: 0, top: [] };
    g.count++;
    g.misses += r.misses;
    if (g.top.length < 3) g.top.push(r); // rows đã xếp theo số lần sai giảm dần
    groups.set(r.subject_id, g);
  }
  const list = Array.from(groups.values()).sort((a, b) => b.misses - a.misses);

  return (
    <main className="main">
      <div className="head">
        <h1>Ôn lại câu sai</h1>
        <p className="muted">
          Câu bạn làm sai được lưu ở đây. Làm đúng một lần thì câu đó tự biến mất khỏi danh sách. Câu tự luận không nằm trong mục này.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <strong>Chưa có câu sai nào</strong>
          Làm một đề trắc nghiệm ở <Link href="/">mục Môn học</Link>, các câu sai sẽ được lưu lại để bạn ôn.
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono lab">{rows.length} câu cần ôn · {list.length} môn</span>
            <StartReview label="Ôn tất cả (tối đa 10 câu hay sai nhất)" count={rows.length} />
          </div>
          <div className="list">
            {list.map((g) => (
              <div key={g.id} className="item" style={{ alignItems: 'flex-start' }}>
                <div className="item-main">
                  <div className="item-title">{g.name}</div>
                  <div className="small muted">{g.count} câu · tổng {g.misses} lần sai</div>
                  <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {g.top.map((r) => (
                      <li key={r.id}>
                        {String(r.question?.q ?? '').slice(0, 140)}
                        <span className="muted"> · sai {r.misses} lần</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <StartReview subjectId={g.id} label={`Ôn ${Math.min(g.count, 10)} câu`} count={g.count} />
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
