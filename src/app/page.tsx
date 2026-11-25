import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtDate } from '@/lib/auth';
import { getAuthUser } from '@/lib/auth-claims';
import DeleteDocument from '@/components/DeleteDocument';
import FilterSelect from '@/components/FilterSelect';
import LikeButtons from '@/components/LikeButtons';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;
const UUID = /^[0-9a-f-]{36}$/i;

function abbr(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

/** Bỏ dấu tiếng Việt để khớp cột search_text trong database */
function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[%_,()*\\]/g, ' ')
    .trim();
}

type SP = { q?: string; page?: string; tab?: string; sub?: string; src?: string; sort?: string; error?: string };

export default async function Home({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  const user = await getAuthUser(supabase);

  const fbBanner = (
    <a
      href="https://www.facebook.com/share/g/1E46yEaYb8/"
      target="_blank"
      rel="noopener noreferrer"
      className="fb-banner"
    >
      <span className="fb-icon" aria-hidden="true">f</span>
      <span className="fb-text">
        <strong>Tham gia cộng đồng Facebook</strong> của chúng tôi để nhận được những tài liệu học tập hữu ích,
        cập nhật công cụ AI mới nhất và cùng nhau trao đổi, học hỏi!
      </span>
      <span className="btn sm">Tham gia ngay →</span>
    </a>
  );
  const errBox = searchParams.error ? <div className="msg err" role="alert">{searchParams.error}</div> : null;

  /* ---------- Chưa đăng nhập: giới thiệu + danh sách môn ---------- */
  if (!user) {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id,name,description')
      .or('owner_id.is.null,is_public.eq.true')
      .order('sort')
      .order('name')
      .limit(30);
    return (
      <main className="main">
        {fbBanner}
        {errBox}
        <section className="hero">
          <div className="hero-text">
            <h1>Ôn thi bằng đề do <span className="hl">AI</span> tạo từ chính tài liệu của bạn</h1>
            <p>
              Chọn môn học, chọn tài liệu, AI soạn câu hỏi kèm đáp án và giải thích. Làm bài, xem điểm theo từng
              chủ đề, ôn lại đúng những câu hay sai. Giáo viên có thể tạo lớp và giao bài.
            </p>
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <Link href="/register" className="btn">▶ Bắt đầu miễn phí</Link>
              <Link href="/login" className="btn ghost">Đăng nhập</Link>
            </div>
          </div>
        </section>
        <h2>Các môn học hiện có</h2>
        <div className="grid">
          {(subjects ?? []).map((s: any) => (
            <div key={s.id} className="subject-wrap">
              <Link href="/login" className="subject">
                <div className="s-badge">{abbr(s.name)}</div>
                <div>
                  <div className="name">{s.name}</div>
                  <div className="desc">{s.description}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </main>
    );
  }

  /* ---------- Đã đăng nhập: kho tài liệu ---------- */
  const q = (searchParams.q ?? '').trim().slice(0, 80);
  const tab = searchParams.tab === 'mine' ? 'mine' : 'all';
  const sub = UUID.test(searchParams.sub ?? '') ? (searchParams.sub as string) : '';
  const src = searchParams.src === 'system' || searchParams.src === 'user' ? searchParams.src : '';
  const sort = searchParams.sort === 'likes' || searchParams.sort === 'title' ? searchParams.sort : 'new';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  // Truy vấn danh sách tài liệu (tab "Của tôi" gồm tài liệu mình đăng và tài liệu mình đã thả tim)
  const docsQuery = (likedIds: string[]) => {
    let query: any = supabase
    .from('documents')
    .select('id,title,subject_id,owner_id,owner_name,is_public,likes,dislikes,size,created_at,subjects(name)', {
      count: 'exact',
    });
    if (tab === 'mine') {
      query = likedIds.length
        ? query.or(`owner_id.eq.${user.id},id.in.(${likedIds.join(',')})`)
        : query.eq('owner_id', user.id);
    } else {
      query = query.eq('is_public', true).eq('hidden', false);
    }
    if (sub) query = query.eq('subject_id', sub);
    if (src === 'system') query = query.is('owner_id', null);
    if (src === 'user') query = query.not('owner_id', 'is', null);
    if (q) query = query.ilike('search_text', `%${norm(q)}%`);
    if (sort === 'likes') query = query.order('likes', { ascending: false }).order('created_at', { ascending: false });
    else if (sort === 'title') query = query.order('title', { ascending: true });
    else query = query.order('created_at', { ascending: false });
    return query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  };

  // Các truy vấn không phụ thuộc nhau chạy CÙNG LÚC (trước đây chạy lần lượt: hồ sơ, danh sách, rồi mới tới thả tim)
  const rest = Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('subjects').select('id,name').or('owner_id.is.null,is_public.eq.true,owner_id.eq.' + user.id).order('sort').order('name'),
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('wrong_questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('attempts')
      .select('id,score,total,created_at,quizzes(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    // trạng thái thả tim của bạn (RLS chỉ trả về của chính bạn); lấy luôn để khỏi chờ danh sách tài liệu xong
    supabase.from('doc_reactions').select('document_id,kind').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1000),
  ]);

  let docsRes: any;
  let restRes: any[];
  if (tab === 'mine') {
    const [r, lk] = await Promise.all([
      rest,
      supabase.from('doc_reactions').select('document_id').eq('user_id', user.id).eq('kind', 'like').limit(200),
    ]);
    restRes = r;
    const likedIds = ((lk as any).data ?? []).map((x: any) => x.document_id as string);
    docsRes = await docsQuery(likedIds);
  } else {
    [restRes, docsRes] = await Promise.all([rest, docsQuery([])]);
  }
  const [{ data: prof }, { data: subjectList }, { count: attemptCount }, { count: wrongCount }, { data: recent }, { data: reacts }] =
    restRes as any[];
  const { data: docs, count } = docsRes;
  const isAdmin = prof?.role === 'admin';
  const mineMap = new Map<string, 'like' | 'dislike'>((reacts ?? []).map((r: any) => [r.document_id, r.kind]));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number, over: Partial<SP> = {}) => {
    const v = { q, tab, sub, src, sort, ...over } as Record<string, string>;
    const u = new URLSearchParams();
    if (v.q) u.set('q', v.q);
    if (v.tab === 'mine') u.set('tab', 'mine');
    if (v.sub) u.set('sub', v.sub);
    if (v.src) u.set('src', v.src);
    if (v.sort && v.sort !== 'new') u.set('sort', v.sort);
    if (p > 1) u.set('page', String(p));
    const s = u.toString();
    return s ? `/?${s}` : '/';
  };
  const hasFilter = !!(q || sub || src || sort !== 'new');

  return (
    <main className="main">
      {fbBanner}
      {errBox}
      <div className="head">
        <h1>Kho tài liệu</h1>
        <p className="muted">Chọn một tài liệu, AI sẽ tạo đề ôn từ đó. Thả tim cho tài liệu hay.</p>
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

      <form action="/" method="get" className="filters">
        {tab === 'mine' && <input type="hidden" name="tab" value="mine" />}
        <div className="toolbar">
          <div className="tabs">
            <Link href={href(1, { tab: 'all' })} className={tab === 'all' ? 'on' : ''}>Kho công khai</Link>
            <Link href={href(1, { tab: 'mine' })} className={tab === 'mine' ? 'on' : ''}>Của tôi &amp; đã thích</Link>
          </div>
          <div className="search" role="search">
            <input type="text" name="q" defaultValue={q} placeholder="Tìm tài liệu hoặc người đăng (không cần gõ dấu)" aria-label="Tìm tài liệu" />
            <button className="btn sm" type="submit">Tìm</button>
          </div>
        </div>
        <div className="filter-row">
          <FilterSelect
            name="sub"
            label="Môn học"
            value={sub}
            options={[{ v: '', t: 'Tất cả môn' }, ...(subjectList ?? []).map((s: any) => ({ v: s.id as string, t: s.name as string }))]}
          />
          <FilterSelect
            name="src"
            label="Nguồn"
            value={src}
            options={[
              { v: '', t: 'Tất cả' },
              { v: 'system', t: 'Hệ thống' },
              { v: 'user', t: 'Thành viên đăng' },
            ]}
          />
          <FilterSelect
            name="sort"
            label="Sắp xếp"
            value={sort}
            options={[
              { v: 'new', t: 'Mới nhất' },
              { v: 'likes', t: 'Nhiều tim nhất' },
              { v: 'title', t: 'Tên A đến Z' },
            ]}
          />
          {hasFilter && <Link href={href(1, { q: '', sub: '', src: '', sort: 'new' })} className="small">Xóa bộ lọc</Link>}
          {sub && <Link href={`/subjects/${sub}`} className="small">Mở môn này để thêm tài liệu →</Link>}
        </div>
      </form>

      {docs && docs.length > 0 ? (
        <div className="grid">
          {docs.map((d: any) => {
            const subjName = d.subjects?.name ?? 'Môn học';
            const mine = d.owner_id === user.id;
            const reactable = d.is_public && d.owner_id !== null && !mine;
            return (
              <div key={d.id} className="subject-wrap doc">
                <Link href={`/docs/${d.id}`} className="subject">
                  <div className="s-badge">{abbr(subjName)}</div>
                  <div>
                    <div className="name">{d.title}</div>
                    <div className="desc">{subjName} · {d.size.toLocaleString('vi-VN')} ký tự</div>
                    <div className="by">
                      {d.owner_id === null ? 'Hệ thống' : mine ? 'Của bạn' : `Đăng bởi ${d.owner_name ?? 'thành viên'}`}
                      {!d.is_public ? ' · Riêng tư' : ''}
                      {mineMap.get(d.id) === 'like' ? ' · Đã thích' : ''}
                    </div>
                  </div>
                </Link>
                <div className="doc-foot">
                  {reactable ? (
                    <LikeButtons docId={d.id} likes={d.likes} dislikes={d.dislikes} mine={mineMap.get(d.id) ?? null} />
                  ) : (
                    <span className="react-static mono">♥ {d.likes} · 👎 {d.dislikes}</span>
                  )}
                  <Link href={`/subjects/${d.subject_id}?doc=${d.id}`} className="btn ghost sm">Tạo đề</Link>
                </div>
                {(isAdmin || mine) && <DeleteDocument docId={d.id} subjectId={d.subject_id} title={d.title} />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          <strong>{hasFilter ? 'Không có tài liệu phù hợp' : tab === 'mine' ? 'Bạn chưa đăng hoặc thả tim tài liệu nào' : 'Chưa có tài liệu công khai'}</strong>
          {hasFilter ? 'Thử đổi hoặc xóa bộ lọc.' : 'Vào một môn học rồi chọn "Thêm tài liệu cho môn này".'}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pager" aria-label="Phân trang">
          <Link href={href(page - 1)} className="btn ghost sm" aria-disabled={page <= 1}>← Trước</Link>
          <span className="small muted mono">{page}/{totalPages}</span>
          <Link href={href(page + 1)} className="btn ghost sm" aria-disabled={page >= totalPages}>Sau →</Link>
        </nav>
      )}

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