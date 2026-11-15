'use server';

import { requireUser } from '@/lib/auth';

const COLORS = ['yellow', 'green', 'pink', 'blue'];

export interface Ann {
  id: string;
  start: number;
  end: number;
  color: string;
  note: string;
  quote: string;
}

function toAnn(r: any): Ann {
  return { id: r.id, start: r.start_offset, end: r.end_offset, color: r.color, note: r.note, quote: r.quote };
}

type Res<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function createAnnotation(input: {
  docId: string;
  start: number;
  end: number;
  color: string;
  quote: string;
}): Promise<Res<{ a: Ann }>> {
  const { supabase, me } = await requireUser();
  const { docId, start, end, color } = input;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
    return { ok: false, error: 'Đoạn chọn không hợp lệ.' };
  }
  if (end - start > 5000) return { ok: false, error: 'Đoạn chọn quá dài (tối đa 5.000 ký tự).' };
  if (!COLORS.includes(color)) return { ok: false, error: 'Màu không hợp lệ.' };

  const { data, error } = await supabase
    .from('doc_annotations')
    .insert({
      user_id: me.id,
      document_id: docId,
      start_offset: start,
      end_offset: end,
      color,
      quote: String(input.quote || '').slice(0, 300),
    })
    .select('id,start_offset,end_offset,color,note,quote')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message.includes('tối đa') ? error.message : 'Không lưu được đánh dấu.' };
  }
  return { ok: true, a: toAnn(data) };
}

export async function updateAnnotation(
  id: string,
  patch: { color?: string; note?: string },
): Promise<Res<{ a: Ann }>> {
  const { supabase, me } = await requireUser();
  const upd: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.color !== undefined) {
    if (!COLORS.includes(patch.color)) return { ok: false, error: 'Màu không hợp lệ.' };
    upd.color = patch.color;
  }
  if (patch.note !== undefined) upd.note = String(patch.note).slice(0, 2000);
  const { data, error } = await supabase
    .from('doc_annotations')
    .update(upd)
    .eq('id', id)
    .eq('user_id', me.id)
    .select('id,start_offset,end_offset,color,note,quote')
    .single();
  if (error || !data) return { ok: false, error: 'Không lưu được thay đổi.' };
  return { ok: true, a: toAnn(data) };
}

export async function deleteAnnotation(id: string): Promise<Res<object>> {
  const { supabase, me } = await requireUser();
  const { error } = await supabase.from('doc_annotations').delete().eq('id', id).eq('user_id', me.id);
  if (error) return { ok: false, error: 'Không xóa được.' };
  return { ok: true };
}
