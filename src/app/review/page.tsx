import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, fmtDate, fmtDuration } from '@/lib/auth';
import { AnswerReview, ScoreSummary } from '@/components/AttemptReview';
import EssayReview from '@/components/EssayReview';
import type { EssayGrade, Question, TopicStat } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AttemptPage({ params }: { params: { id: string } }) {
  const { supabase, me } = await requireUser();
  // select('*') để vẫn đọc được bài cũ kể cả khi cột essay_feedback chưa tồn tại
  const { data: attempt } = await supabase.from('attempts').select('*').eq('id', params.id).single();
  if (!attempt) notFound();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id,subject_id,title,questions')
    .eq('id', attempt.quiz_id)
    .single();
  if (!quiz) notFound();

  const questions = quiz.questions as Question[];
  const answers = (attempt.answers ?? []) as Array<number | string>;
  const grades = (attempt.essay_feedback ?? []) as EssayGrade[];

  // Tách phần trắc nghiệm / đúng sai (dùng component cũ) và phần tự luận (component mới)
  const choiceIdx = questions.map((_, i) => i).filter((i) => questions[i].type !== 'essay');
  const choiceQs = choiceIdx.map((i) => questions[i]);
  const choiceAns = choiceIdx.map((i) => (typeof answers[i] === 'number' ? (answers[i] as number) : -1));
  const essayItems = questions
    .map((q, i) => ({ q, i }))
    .filter((x) => x.q.type === 'essay')
    .map((x, k) => ({
      n: k + 1,
      q: x.q,
      answer: typeof answers[x.i] === 'string' ? (answers[x.i] as string) : '',
      grade: grades.find((g) => g.index === x.i),
    }));

  const wrong = choiceQs.filter((q, k) => choiceAns[k] !== q.answer).length;
  const mine = attempt.user_id === me.id;
  const both = choiceQs.length > 0 && essayItems.length > 0;

  return (
    <main className="main">
      <div className="head">
        <Link href={mine ? '/history' : '/classes'} className="crumb">← {mine ? 'Lịch sử' : 'Quay lại'}</Link>
        <h1>{quiz.title}</h1>
      </div>

      <ScoreSummary
        score={attempt.score}
        total={attempt.total}
        stats={attempt.topic_stats as TopicStat[]}
        caption={`${fmtDate(attempt.created_at)} · Thời gian làm: ${fmtDuration(attempt.duration_seconds)}`}
      />

      {mine && (
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <Link href={`/quiz/${quiz.id}${attempt.assignment_id ? `?a=${attempt.assignment_id}` : ''}`} className="btn">Làm lại đề này</Link>
          {wrong > 0 && <Link href="/review" className="btn ghost">Ôn {wrong} câu sai ({'ở mục Ôn lại'})</Link>}
          <Link href={`/subjects/${quiz.subject_id}`} className="btn ghost">Tạo đề mới</Link>
        </div>
      )}

      {choiceQs.length > 0 && (
        <>
          <h2>{both ? 'Phần trắc nghiệm' : 'Xem lại từng câu'}</h2>
          <AnswerReview questions={choiceQs} answers={choiceAns} />
        </>
      )}

      {essayItems.length > 0 && (
        <>
          <h2>{both ? 'Phần tự luận' : 'Xem lại từng câu'}</h2>
          <EssayReview items={essayItems} mine={mine} />
        </>
      )}
    </main>
  );
}
