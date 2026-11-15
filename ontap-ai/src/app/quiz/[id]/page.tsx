import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { stripAnswers } from '@/lib/quiz';
import QuizRunner from '@/components/QuizRunner';
import { KINDS, LEVELS, SOURCES, type Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { a?: string };
}) {
  const { supabase } = await requireUser();
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id,subject_id,title,level,kind,source,questions')
    .eq('id', params.id)
    .single();
  if (!quiz) notFound();

  const questions = quiz.questions as Question[];
  const meta = [
    quiz.level ? LEVELS[quiz.level as keyof typeof LEVELS] : '',
    quiz.kind ? KINDS[quiz.kind as keyof typeof KINDS] : '',
    `${questions.length} câu`,
    SOURCES[quiz.source] ?? '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="main">
      <div className="head">
        <Link href={searchParams.a ? '/classes' : `/subjects/${quiz.subject_id}`} className="crumb">← Quay lại</Link>
        <h1>{quiz.title}</h1>
        <p className="muted">{meta}</p>
      </div>
      <QuizRunner quizId={quiz.id} assignmentId={searchParams.a} questions={stripAnswers(questions)} />
    </main>
  );
}
