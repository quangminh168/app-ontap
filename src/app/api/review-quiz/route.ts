import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Question } from '@/lib/types';

// Tạo đề ôn lại từ các câu người dùng từng làm sai (không gọi AI, không tốn chi phí)
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subjectId = body.subjectId ? String(body.subjectId) : null;

  let query = supabase
    .from('wrong_questions')
    .select('subject_id,question')
    .eq('user_id', user.id)
    .order('misses', { ascending: false })
    .order('last_missed', { ascending: false })
    .limit(10);
  if (subjectId) query = query.eq('subject_id', subjectId);
  const { data: rows } = await query;
  if (!rows || !rows.length) {
    return NextResponse.json({ error: 'Chưa có câu nào cần ôn.' }, { status: 400 });
  }

  const questions = rows.map((r) => ({ ...(r.question as Question), id: crypto.randomUUID() }));
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({
      subject_id: rows[0].subject_id,
      owner_id: user.id,
      title: 'Ôn lại câu sai',
      source: 'review',
      questions,
    })
    .select('id')
    .single();
  if (error || !quiz) return NextResponse.json({ error: 'Không tạo được đề ôn.' }, { status: 500 });
  return NextResponse.json({ id: quiz.id });
}
