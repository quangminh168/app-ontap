// src/lib/grade.ts
// Chấm các câu tự luận của một bài làm bằng MỘT lần gọi Gemini.
import { generateWithGemini } from './gemini';
import { buildGradePrompt, extractJson, normalizeGrades } from './quiz';
import type { EssayGrade, Question } from './types';

/**
 * questions: toàn bộ câu của đề (có đáp án); answers: bài làm theo vị trí câu
 * (số cho trắc nghiệm, chuỗi chữ cho tự luận). Chỉ chấm câu có type "essay".
 */
export async function gradeEssays(
  subject: string,
  questions: Question[],
  answers: Array<number | string>
): Promise<EssayGrade[]> {
  const results: EssayGrade[] = [];
  const toGrade: { index: number; q: string; sample: string; points: string[]; answer: string }[] = [];

  questions.forEach((q, index) => {
    if (q.type !== 'essay') return;
    const a = typeof answers[index] === 'string' ? (answers[index] as string).trim() : '';
    if (!a) results.push({ index, score: 0, feedback: 'Bạn chưa làm câu này.', graded: true });
    else toGrade.push({ index, q: q.q, sample: q.sample ?? '', points: q.points ?? [], answer: a });
  });

  if (toGrade.length) {
    let graded: ReturnType<typeof normalizeGrades>;
    try {
      const text = await generateWithGemini(buildGradePrompt(subject, toGrade));
      graded = normalizeGrades(extractJson(text).grades, toGrade.length);
    } catch (e) {
      console.error('Lỗi chấm tự luận:', (e as Error)?.message || e);
      graded = normalizeGrades([], toGrade.length); // tất cả "chưa chấm được", bài vẫn được lưu
    }
    toGrade.forEach((t, k) => results.push({ index: t.index, ...graded[k] }));
  }
  return results.sort((a, b) => a.index - b.index);
}
