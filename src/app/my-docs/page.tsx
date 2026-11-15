import Link from 'next/link';
import { requireUser, fmtDate } from '@/lib/auth';
import { deleteDocument } from '@/app/subjects/[id]/actions';

export const dynamic = 'force-dynamic';

export default async function MyDocs() {
  const { supabase, me } = await requireUser();
  const { data: docs } = await supabase
    .from('documents')
    .select('id,title,is_public,hidden,likes,dislikes,size,created_at,subject_id,subjects(name)')
    .eq('owner_id', me.id)
    .order('created_at', { ascending: false });

  const { data: likedRows } = await supabase
    .from('doc_reactions')
    .select('created_at,documents(id,title,subject_id,owner_name,likes,dislikes,size,subjects(name))')
    .eq('user_id', me.id)
    .eq('kind', 'like')
    .order('created_at', { ascending: false })
    .limit(100);
  const liked = (likedRows ?? []).map((r: any) => r.documents).filter(Boolean);

  return (
    <main className="main">
      <div className="head">
        <h1>Tài liệu của tôi</h1>
        <p className="muted">Các tài liệu bạn đã đăng. Tài liệu công khai sẽ hiện cho mọi người trong môn đó.</p>
      </div>

      {!docs || docs.length === 0 ? (
        <div className="card empty">
          <strong>Bạn chưa đăng tài liệu nào</strong>
          Mở một môn học trong <Link href="/">Kho môn học</Link> rồi chọn "Thêm tài liệu cho môn này".
        </div>
      ) : (
        <div className="list">
          {docs.map((d: any) => (
            <div key={d.id} className="item">
              <div className="item-main">
                <div className="item-title"><Link href={`/docs/${d.id}`}>{d.title}</Link></div>
                <div className="small muted">
                  <Link href={`/subjects/${d.subject_id}`}>{d.subjects?.name ?? 'Môn học'}</Link>
                  {' '}· {fmtDate(d.created_at)} · {d.size.toLocaleString('vi-VN')} ký tự
                </div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span className="chip">{d.hidden ? 'Đã bị ẩn' : d.is_public ? 'Công khai' : 'Riêng tư'}</span>
                {d.is_public && <span className="small mono">♥ {d.likes} · 👎 {d.dislikes}</span>}
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="subjectId" value={d.subject_id} />
                  <input type="hidden" name="next" value="my-docs" />
                  <button className="btn ghost sm" type="submit">Xóa</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="stack">
        <h2>Tài liệu đã thả tim</h2>
        {liked.length === 0 ? (
          <div className="card empty">
            <strong>Bạn chưa thả tim tài liệu nào</strong>
            Bấm ♥ ở tài liệu hay trong <Link href="/">Kho tài liệu</Link> để lưu vào đây.
          </div>
        ) : (
          <div className="list">
            {liked.map((d: any) => (
              <Link key={d.id} href={`/docs/${d.id}`} className="item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="item-main">
                  <div className="item-title">{d.title}</div>
                  <div className="small muted">
                    {d.subjects?.name ?? 'Môn học'} · Đăng bởi {d.owner_name ?? 'thành viên'} · {d.size.toLocaleString('vi-VN')} ký tự
                  </div>
                </div>
                <span className="small mono">♥ {d.likes}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
