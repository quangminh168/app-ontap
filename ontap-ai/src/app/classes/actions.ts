'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export async function createClass(formData: FormData) {
  const { supabase, me } = await requireUser();
  const name = String(formData.get('name') || '').trim();
  if (!name || me.role !== 'teacher') redirect('/classes?error=' + encodeURIComponent('Chỉ giáo viên mới tạo được lớp, và tên lớp không được trống.'));
  const { data, error } = await supabase
    .from('classes')
    .insert({ teacher_id: me.id, name: name.slice(0, 120) })
    .select('id')
    .single();
  if (error || !data) redirect('/classes?error=' + encodeURIComponent('Không tạo được lớp.'));
  redirect(`/classes/${data.id}`);
}

export async function joinClass(formData: FormData) {
  const { supabase } = await requireUser();
  const code = String(formData.get('code') || '').trim();
  const { data, error } = await supabase.rpc('join_class', { code });
  if (error || !data) redirect('/classes?error=' + encodeURIComponent('Mã lớp không đúng.'));
  redirect(`/classes/${data}`);
}

export async function assignQuiz(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get('classId') || '');
  const quizId = String(formData.get('quizId') || '');
  const due = String(formData.get('dueAt') || '');
  const back = `/classes/${classId}`;
  if (!quizId) redirect(`${back}?error=${encodeURIComponent('Hãy chọn một đề để giao.')}`);

  const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', quizId).single();
  const title = String(formData.get('title') || '').trim() || quiz?.title || 'Bài giao';
  const { error } = await supabase.from('assignments').insert({
    class_id: classId,
    quiz_id: quizId,
    title: title.slice(0, 200),
    due_at: due ? new Date(due + '+07:00').toISOString() : null,
  });
  if (error) redirect(`${back}?error=${encodeURIComponent('Không giao được bài.')}`);
  revalidatePath(back);
  redirect(back);
}

export async function deleteAssignment(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get('classId') || '');
  await supabase.from('assignments').delete().eq('id', String(formData.get('id') || ''));
  revalidatePath(`/classes/${classId}`);
  redirect(`/classes/${classId}`);
}

export async function removeMember(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get('classId') || '');
  await supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('user_id', String(formData.get('userId') || ''));
  revalidatePath(`/classes/${classId}`);
  redirect(`/classes/${classId}`);
}
