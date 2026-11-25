import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/types';
import { getAuthUser } from '@/lib/auth-claims';

export interface Me {
  id: string;
  name: string;
  role: Role;
}

/** Lấy người dùng hiện tại và hồ sơ; chưa đăng nhập thì chuyển về /login. */
export async function requireUser() {
  const supabase = createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name,role').eq('id', user.id).single();
  const me: Me = {
    id: user.id,
    name: profile?.full_name || user.email || 'Bạn',
    role: (profile?.role as Role) || 'student',
  };
  return { supabase, me };
}

export function fmtDate(t: string | null | undefined) {
  if (!t) return '';
  try {
    return new Date(t).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return '';
  }
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m} phút ${r} giây` : `${r} giây`;
}