'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export async function addDocument(formData: FormData) {
  const { supabase, me } = await requireUser();
  const subjectId = String(formData.get('subjectId') || '');
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const wantPublic = formData.get('isPublic') === 'on';

  const back = `/subjects/${subjectId}`;
  if (!title || content.length < 200) {
    redirect(`${back}?error=${encodeURIComponent('Cần có tiêu đề và nội dung từ 200 ký tự trở lên.')}`);
  }
  if (content.length > 200000) {
    redirect(`${back}?error=${encodeURIComponent('Nội dung quá dài (tối đa 200.000 ký tự).')}`);
  }

  const { error } = await supabase.from('documents').insert({
    subject_id: subjectId,
    owner_id: me.id,
    title: title.slice(0, 200),
    content,
    is_public: me.role === 'teacher' && wantPublic,
  });
  if (error) redirect(`${back}?error=${encodeURIComponent('Không lưu được tài liệu.')}`);
  revalidatePath(back);
  redirect(back);
}

export async function deleteDocument(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') || '');
  const subjectId = String(formData.get('subjectId') || '');
  await supabase.from('documents').delete().eq('id', id);
  revalidatePath(`/subjects/${subjectId}`);
  redirect(`/subjects/${subjectId}`);
}

export async function deleteQuiz(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') || '');
  const subjectId = String(formData.get('subjectId') || '');
  await supabase.from('quizzes').delete().eq('id', id);
  revalidatePath(`/subjects/${subjectId}`);
  redirect(`/subjects/${subjectId}`);
}
