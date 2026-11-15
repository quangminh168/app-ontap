import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Trang mà liên kết xác nhận trong email sẽ đưa người dùng về
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/`);
}
