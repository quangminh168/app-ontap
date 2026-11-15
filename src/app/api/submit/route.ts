import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { questionKey, topicStats, MAX_ESSAY_ANSWER_CHARS } from '@/lib/quiz';
import { gradeEssays } from '@/lib/grade';
import type { EssayGrade, Question } from '@/lib/types';

export const maxDuration = 60; // chấm tự luận bằng AI có thể mất vài chục giây

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
  // Câu trắc nghiệm / đúng sai: chỉ số đáp án (-1 = bỏ trống). Câu tự luận: đoạn chữ.
  const answers: Array<number | string> = questions.map((q, i) => {
    const v = raw[i];
    if (q.type === 'essay') return typeof v === 'string' ? v.trim().slice(0, MAX_ESSAY_ANSWER_CHARS) : '';
    const n = typeof v === 'number' ? v : NaN;
    return Number.isInteger(n) && n >= 0 && n < q.options.length ? n : -1;
  });

  if (assignmentId) {
    const { data: a } = await supabase.from('assignments').select('id,quiz_id').eq('id', assignmentId).single();
    if (!a || a.quiz_id !== quizId) {
      return NextResponse.json({ error: 'Bài giao không hợp lệ.' }, { status: 400 });
    }
  }

  // Chấm câu tự luận bằng AI (một lần gọi cho cả bài). Nếu AI lỗi, bài vẫn được lưu.
  let grades: EssayGrade[] = [];
  if (questions.some((q) => q.type === 'essay')) {
    const { data: subject } = await supabase.from('subjects').select('name').eq('id', quiz.subject_id).single();
    grades = await gradeEssays(subject?.name ?? 'môn học', questions, answers);
  }
  const essayScores: Record<number, number> = {};
  grades.forEach((g) => (essayScores[g.index] = g.score));

  const mcqCorrect = questions.filter((q, i) => q.type !== 'essay' && answers[i] === q.answer).length;
  const score = Math.round((mcqCorrect + grades.reduce((s, g) => s + g.score, 0)) * 100) / 100;

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
      topic_stats: topicStats(questions, answers, essayScores),
      // chỉ ghi cột này khi có câu tự luận, để đề trắc nghiệm vẫn chạy kể cả khi chưa chạy migration
      ...(grades.length ? { essay_feedback: grades } : {}),
    })
    .select('id')
    .single();
  if (error || !attempt) {
    console.error('Lỗi lưu bài làm:', error?.message);
    return NextResponse.json({ error: 'Không lưu được bài làm. Hãy thử lại.' }, { status: 500 });
  }

  // Ngân hàng câu sai (chỉ câu trắc nghiệm / đúng sai): sai thì thêm hoặc tăng số lần sai, đúng thì gỡ ra
  const keys = questions.map((q) => questionKey(q.q));
  const checkKeys = keys.filter((_, i) => questions[i].type !== 'essay');
  const { data: existing } = checkKeys.length
    ? await supabase.from('wrong_questions').select('qkey,misses').eq('user_id', user.id).in('qkey', checkKeys)
    : { data: [] as any[] };
  const known = new Map<string, number>((existing ?? []).map((r: any): [string, number] => [r.qkey, r.misses]));

  const upserts: any[] = [];
  const removes: string[] = [];
  questions.forEach((q, i) => {
    if (q.type === 'essay') return;
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

  return NextResponse.json({ attemptId: attempt.id, essayUngraded: grades.filter((g) => !g.graded).length });
}