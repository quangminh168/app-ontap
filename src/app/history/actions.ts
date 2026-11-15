'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

export async function deleteAttempt(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from('attempts').delete().eq('id', String(formData.get('id') || ''));
  revalidatePath('/history');
}
