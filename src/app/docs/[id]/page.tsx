import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, fmtDate } from '@/lib/auth';
import DocReader from '@/components/DocReader';
import LikeButtons from '@/components/LikeButtons';

export const dynamic = 'force-dynamic';

export default async function DocPage({ params }: { params: { id: string } }) {
  const { supabase, me } = await requireUser();
  const { data: doc } = await supabase
    .from('documents')
    .select('id,title,content,subject_id,owner_id,owner_name,is_public,likes,dislikes,size,created_at,subjects(name)')
    .eq('id', params.id)
    .single();
  if (!doc) notFound();

  const [{ data: rows }, { data: react }] = await Promise.all([
    supabase
      .from('doc_annotations')
      .select('id,start_offset,end_offset,color,note,quote')
      .eq('document_id', doc.id)
      .eq('user_id', me.id)
      .order('created_at', { ascending: true }),
    supabase.from('doc_reactions').select('kind').eq('document_id', doc.id).eq('user_id', me.id).maybeSingle(),
  ]);
  const initial = (rows ?? []).map((r: any) => ({
    id: r.id as string,
    start: r.start_offset as number,
    end: r.end_offset as number,
    color: r.color as string,
    note: r.note as string,
    quote: r.quote as string,
  }));

  const subjName = (doc as any).subjects?.name ?? 'Môn học';
  const mine = doc.owner_id === me.id;
  const reactable = doc.is_public && doc.owner_id !== null && !mine;

  return (
    <main className="main wide">
      <div className="head">
        <Link href="/" className="crumb">← Kho tài liệu</Link>
        <h1>{doc.title}</h1>
        <p className="small muted">
          {subjName} · {doc.owner_id === null ? 'Hệ thống' : mine ? 'Của bạn' : `Đăng bởi ${doc.owner_name ?? 'thành viên'}`} ·{' '}
          {doc.size.toLocaleString('vi-VN')} ký tự · {fmtDate(doc.created_at).split(' ')[0]}
        </p>
      </div>

      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <Link href={`/subjects/${doc.subject_id}?doc=${doc.id}`} className="btn sm">Tạo đề từ tài liệu này</Link>
        {reactable ? (
          <LikeButtons docId={doc.id} likes={doc.likes} dislikes={doc.dislikes} mine={(react?.kind as 'like' | 'dislike' | undefined) ?? null} />
        ) : (
          <span className="react-static mono">♥ {doc.likes} · 👎 {doc.dislikes}</span>
        )}
      </div>

      <DocReader docId={doc.id} content={doc.content as string} initial={initial} />
    </main>
  );
}
