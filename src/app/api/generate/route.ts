import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildPrompt, extractJson, normalizeQuestions } from '@/lib/quiz';
import { generateWithGemini, friendlyMessage, GeminiError } from '@/lib/gemini';
import type { Kind, Level } from '@/lib/types';

export const maxDuration = 60;

const MAX_MATERIAL_CHARS = 24000;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Máy chủ chưa có GEMINI_API_KEY.' }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const subjectId = String(body.subjectId || '');
  const documentIds: string[] = Array.isArray(body.documentIds) ? body.documentIds.map(String) : [];
  const extraText = String(body.extraText || '').trim();
  const n = [5, 10, 15, 20].includes(Number(body.n)) ? Number(body.n) : 10;
  const level: Level = ['de', 'vua', 'kho'].includes(body.level) ? body.level : 'vua';
  const kind: Kind = ['mcq', 'tf', 'mix', 'essay', 'full'].includes(body.kind) ? body.kind : 'mcq';

  // Giới hạn số lần tạo đề mỗi ngày để không cạn hạn mức miễn phí của Gemini.
  // Chỉ đề đã lưu thành công mới được tính, nên lỗi AI không làm mất lượt của người dùng.
  const limit = Number(process.env.DAILY_AI_LIMIT || 3);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('quizzes')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('source', 'ai')
    .gte('created_at', dayStart.toISOString());
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Bạn đã dùng hết ${limit} lượt tạo đề hôm nay. Hãy làm lại các đề đã tạo hoặc quay lại ngày mai.` },
      { status: 429 }
    );
  }

  const { data: subject } = await supabase.from('subjects').select('id,name').eq('id', subjectId).single();
  if (!subject) return NextResponse.json({ error: 'Không tìm thấy môn học.' }, { status: 404 });

  // Gom tài liệu đã chọn (chỉ lấy được tài liệu mà người dùng có quyền xem) và đoạn dán thêm
  let material = '';
  let firstTitle = '';
  if (documentIds.length) {
    const { data: docs } = await supabase
      .from('documents')
      .select('id,title,content')
      .eq('subject_id', subjectId)
      .in('id', documentIds);
    for (const d of docs ?? []) {
      if (!firstTitle) firstTitle = d.title;
      material += `# ${d.title}\n${d.content}\n\n`;
    }
  }
  if (extraText) material += `# Nội dung dán thêm\n${extraText}\n`;
  material = material.trim().slice(0, MAX_MATERIAL_CHARS);
  if (material.length < 200) {
    return NextResponse.json(
      { error: 'Cần chọn ít nhất một tài liệu hoặc dán thêm nội dung (từ 200 ký tự).' },
      { status: 400 }
    );
  }

  let text = '';
  try {
    text = await generateWithGemini(buildPrompt({ subject: subject.name, material, n, level, kind }));
  } catch (e: any) {
    console.error('Lỗi gọi AI:', e?.message || e);
    const status = e instanceof GeminiError && e.status === 429 ? 429 : 502;
    return NextResponse.json({ error: friendlyMessage(e) }, { status });
  }

  let questions;
  try {
    questions = normalizeQuestions(extractJson(text).questions, n);
  } catch {
    return NextResponse.json({ error: 'AI trả về nội dung không đọc được. Hãy bấm tạo đề lại.' }, { status: 502 });
  }
  if (!questions.length) {
    return NextResponse.json({ error: 'AI chưa tạo được câu hỏi hợp lệ. Hãy bấm tạo đề lại.' }, { status: 502 });
  }

  const title =
    documentIds.length > 1
      ? `${subject.name}: ${documentIds.length} tài liệu`
      : firstTitle
      ? `${subject.name}: ${firstTitle}`
      : `${subject.name}: tài liệu dán thêm`;

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({ subject_id: subject.id, owner_id: user.id, title, level, kind, source: 'ai', questions })
    .select('id')
    .single();
  if (error || !quiz) {
    console.error('Lỗi lưu đề:', error?.message);
    return NextResponse.json({ error: 'Không lưu được đề. Hãy thử lại.' }, { status: 500 });
  }

  return NextResponse.json({ id: quiz.id, count: questions.length, requested: n });
}