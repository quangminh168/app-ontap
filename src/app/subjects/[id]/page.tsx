import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, fmtDate } from '@/lib/auth';
import GenerateForm from '@/components/GenerateForm';
import AddDocument from '@/components/AddDocument';
import DeleteSubject from '@/components/DeleteSubject';
import { deleteDocument, deleteQuiz } from './actions';
import { KINDS, LEVELS } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; doc?: string };
}) {
  const { supabase, me } = await requireUser();
  const { data: subject } = await supabase.from('subjects').select('id,name,description,owner_id').eq('id', params.id).single();
  if (!subject) notFound();

  const [{ data: docs }, { data: quizzes }, { data: reacts }] = await Promise.all([
    supabase
      .from('documents')
      .select('id,title,is_public,hidden,owner_id,owner_name,likes,dislikes,size,created_at')
      .eq('subject_id', subject.id)
      .order('likes', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('quizzes')
      .select('id,title,level,kind,source,questions,created_at')
      .eq('subject_id', subject.id)
      .eq('owner_id', me.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('doc_reactions').select('document_id,kind').eq('user_id', me.id),
  ]);

  const mineMap = new Map<string, 'like' | 'dislike'>(
    (reacts ?? []).map((r: any) => [r.document_id as string, r.kind as 'like' | 'dislike']),
  );

  const docList = (docs ?? [])
    .filter((d: any) => !d.hidden || d.owner_id === me.id)
    .map((d: any) => ({
      id: d.id as string,
      title: d.title as string,
      is_public: d.is_public as boolean,
      owner_id: d.owner_id as string | null,
      owner_name: d.owner_name as string | null,
      size: d.size as number,
      likes: d.likes as number,
      dislikes: d.dislikes as number,
      mine: mineMap.get(d.id) ?? null,
      reactable: !!d.is_public && d.owner_id !== null && d.owner_id !== me.id,
    }));

  // Người dùng xóa được tài liệu của mình; admin xóa được mọi tài liệu
  const manageList = docList.filter((d) => d.owner_id === me.id || me.role === 'admin');

  return (
    <main className="main">
      <div className="head">
        <Link href="/" className="crumb">← Kho tài liệu</Link>
        <h1>{subject.name}</h1>
        <p className="muted">{subject.description}</p>
      </div>

      {searchParams.error && <div className="msg err" role="alert">{searchParams.error}</div>}

      <GenerateForm
        subjectId={subject.id}
        docs={docList}
        initialPicked={docList.some((d) => d.id === searchParams.doc) ? [searchParams.doc as string] : undefined}
      />

      <AddDocument subjectId={subject.id} />

      {manageList.length > 0 && (
        <section className="stack">
          <h2>{me.role === 'admin' ? 'Quản lý tài liệu (quản trị)' : 'Tài liệu bạn đã thêm'}</h2>
          <div className="list">
            {manageList.map((d) => (
              <div key={d.id} className="item">
                <div className="item-main">
                  <div className="item-title">{d.title}</div>
                  <div className="small muted">
                    {d.owner_id === null ? 'Hệ thống' : d.owner_id === me.id ? 'Của bạn' : `Đăng bởi ${d.owner_name ?? 'thành viên'}`}
                    {' · '}
                    {d.is_public ? `Công khai · ♥ ${d.likes} · 👎 ${d.dislikes}` : 'Riêng tư'} · {d.size.toLocaleString('vi-VN')} ký tự
                  </div>
                </div>
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <button className="btn ghost sm" type="submit">Xóa tài liệu</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>Đề của bạn trong môn này</h2>
        {quizzes && quizzes.length > 0 ? (
          <div className="list">
            {quizzes.map((q: any) => (
              <div key={q.id} className="item">
                <div className="item-main">
                  <div className="item-title">{q.title}</div>
                  <div className="small muted">
                    {[q.level ? LEVELS[q.level as keyof typeof LEVELS] : '', q.kind ? KINDS[q.kind as keyof typeof KINDS] : '', `${(q.questions as unknown[]).length} câu`, fmtDate(q.created_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="row">
                  <Link href={`/quiz/${q.id}`} className="btn sm">Làm bài</Link>
                  <form action={deleteQuiz}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="subjectId" value={subject.id} />
                    <button className="btn ghost sm" type="submit">Xóa</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card empty"><strong>Chưa có đề nào</strong>Tạo đề đầu tiên ở khung phía trên.</div>
        )}
      </section>

      {(me.role === 'admin' || subject.owner_id === me.id) && (
        <section className="card stack">
          <h2>Quản lý môn học</h2>
          <p className="small muted">
            Xóa cả môn học này
            {subject.owner_id === null ? ' (môn của hệ thống, chỉ quản trị viên làm được)' : ''}. Tài liệu và đề trong môn
            có thể bị xóa theo.
          </p>
          <div><DeleteSubject subjectId={subject.id} name={subject.name} /></div>
        </section>
      )}
    </main>
  );
}
