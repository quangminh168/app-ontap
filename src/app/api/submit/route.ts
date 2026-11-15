import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { questionKey, topicStats } from '@/lib/quiz';
import type { Question } from '@/lib/types';

// Chấm bài trên máy chủ, lưu lần làm bài và cập nhật ngân hàng câu sai
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const quizId = String(body.quizId || '');
  const assignmentId = body.assignmentId ? String(body.assignmentId) : null;
  const duration = Math.max(0, Math.min(86400, Math.round(Number(body.durationSeconds) || 0)));

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id,subject_id,questions')
    .eq('id', quizId)
    .single();
  if (!quiz) return NextResponse.json({ error: 'Không tìm thấy đề.' }, { status: 404 });

  const questions = quiz.questions as Question[];
  const raw: unknown[] = Array.isArray(body.answers) ? body.answers : [];
  const answers = questions.map((q, i) => {
    const v = Number(raw[i]);
    return Number.isInteger(v) && v >= 0 && v < q.options.length ? v : -1;
  });

  if (assignmentId) {
    const { data: a } = await supabase.from('assignments').select('id,quiz_id').eq('id', assignmentId).single();
    if (!a || a.quiz_id !== quizId) {
      return NextResponse.json({ error: 'Bài giao không hợp lệ.' }, { status: 400 });
    }
  }

  const score = questions.filter((q, i) => answers[i] === q.answer).length;
  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      assignment_id: assignmentId,
      answers,
      score,
      total: questions.length,
      duration_seconds: duration,
      topic_stats: topicStats(questions, answers),
    })
    .select('id')
    .single();
  if (error || !attempt) {
    console.error('Lỗi lưu bài làm:', error?.message);
    return NextResponse.json({ error: 'Không lưu được bài làm. Hãy thử lại.' }, { status: 500 });
  }

  // Ngân hàng câu sai: sai thì thêm (hoặc tăng số lần sai), đúng thì gỡ ra
  const keys = questions.map((q) => questionKey(q.q));
  const { data: existing } = await supabase
    .from('wrong_questions')
    .select('qkey,misses')
    .eq('user_id', user.id)
    .in('qkey', keys);
  const known = new Map((existing ?? []).map((r) => [r.qkey as string, r.misses as number]));

  const upserts: any[] = [];
  const removes: string[] = [];
  questions.forEach((q, i) => {
    const key = keys[i];
    if (answers[i] === q.answer) {
      if (known.has(key)) removes.push(key);
    } else {
      upserts.push({
        user_id: user.id,
        subject_id: quiz.subject_id,
        qkey: key,
        question: q,
        misses: (known.get(key) ?? 0) + 1,
        last_missed: new Date().toISOString(),
      });
    }
  });
  if (upserts.length) await supabase.from('wrong_questions').upsert(upserts, { onConflict: 'user_id,qkey' });
  if (removes.length) await supabase.from('wrong_questions').delete().eq('user_id', user.id).in('qkey', removes);

  return NextResponse.json({ attemptId: attempt.id });
}
