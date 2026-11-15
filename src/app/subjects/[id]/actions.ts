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
    is_public: wantPublic,
  });
  if (error) {
    // Trigger trong database báo lỗi giới hạn đăng bài bằng tiếng Việt
    const msg = error.message.includes('tối đa') ? error.message : 'Không lưu được tài liệu.';
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(back);
  revalidatePath('/my-docs');
  redirect(back);
}

export async function deleteDocument(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') || '');
  const subjectId = String(formData.get('subjectId') || '');
  await supabase.from('documents').delete().eq('id', id);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath('/my-docs');
  revalidatePath('/');
  const next = String(formData.get('next') || '');
  redirect(next === 'my-docs' ? '/my-docs' : next === 'home' ? '/' : `/subjects/${subjectId}`);
}

export async function deleteQuiz(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') || '');
  const subjectId = String(formData.get('subjectId') || '');
  await supabase.from('quizzes').delete().eq('id', id);
  revalidatePath(`/subjects/${subjectId}`);
  redirect(`/subjects/${subjectId}`);
}

/** Thả tim / không thích. Trả về lựa chọn hiện tại của người dùng (hoặc null nếu bỏ). */
export async function reactDoc(
  docId: string,
  kind: 'like' | 'dislike',
): Promise<{ ok: boolean; kind: 'like' | 'dislike' | null; error?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('set_reaction', { p_doc: docId, p_kind: kind });
  if (error) return { ok: false, kind: null, error: error.message };
  return { ok: true, kind: (data as 'like' | 'dislike' | null) ?? null };
}

/** Xóa cả môn học. Chủ môn hoặc admin mới xóa được (do chính sách trong database). */
export async function deleteSubject(formData: FormData) {
  const { supabase } = await requireUser();
  const subjectId = String(formData.get('subjectId') || '');
  const fromHome = formData.get('from') === 'home';
  const { data, error } = await supabase.from('subjects').delete().eq('id', subjectId).select('id');
  if (error || !data || data.length === 0) {
    const msg = error
      ? 'Không xóa được môn học (có thể còn dữ liệu liên quan).'
      : 'Bạn không có quyền xóa môn học này.';
    redirect(`${fromHome ? '/' : `/subjects/${subjectId}`}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/');
  redirect('/');
}
