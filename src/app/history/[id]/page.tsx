import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, fmtDate, fmtDuration } from '@/lib/auth';
import { AnswerReview, ScoreSummary } from '@/components/AttemptReview';
import type { Question, TopicStat } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AttemptPage({ params }: { params: { id: string } }) {
  const { supabase, me } = await requireUser();
  const { data: attempt } = await supabase
    .from('attempts')
    .select('id,user_id,quiz_id,score,total,duration_seconds,answers,topic_stats,created_at,assignment_id')
    .eq('id', params.id)
    .single();
  if (!attempt) notFound();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id,subject_id,title,questions')
    .eq('id', attempt.quiz_id)
    .single();
  if (!quiz) notFound();

  const wrong = attempt.total - attempt.score;
  const mine = attempt.user_id === me.id;

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

      <h2>Xem lại từng câu</h2>
      <AnswerReview questions={quiz.questions as Question[]} answers={attempt.answers as number[]} />
    </main>
  );
}
