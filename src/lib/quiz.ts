import type { Kind, Level, PublicQuestion, Question, TopicStat } from './types';

export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function cleanOption(s: unknown): string {
  return String(s).replace(/^\s*[A-Da-d][.):]\s+/, '').trim();
}

function parseTF(a: unknown): number {
  if (typeof a === 'boolean') return a ? 0 : 1;
  if (a === 0 || a === 1) return a as number;
  if (typeof a === 'string') {
    const s = a.trim().toLowerCase();
    if (/^(đúng|dung|true)/.test(s)) return 0;
    if (/^(sai|false)/.test(s)) return 1;
  }
  return -1;
}

/** Chuyển dữ liệu AI trả về thành danh sách câu hỏi sạch; bỏ các câu sai định dạng. */
export function normalizeQuestions(raw: unknown, limit: number): Question[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: Question[] = [];
  for (const r of list) {
    if (!r || typeof r.question !== 'string' || !r.question.trim()) continue;
    const isTF = r.type === 'tf';
    let options: string[];
    let answer: number;
    if (isTF) {
      options = ['Đúng', 'Sai'];
      answer = parseTF(r.answer);
    } else {
      options = Array.isArray(r.options) ? r.options.map(cleanOption).filter(Boolean) : [];
      if (options.length < 2 || options.length > 6) continue;
      let ans = r.answer;
      if (typeof ans === 'string') {
        const m = ans.trim().match(/^[A-Da-d]/);
        ans = m ? 'abcd'.indexOf(m[0].toLowerCase()) : -1;
      }
      answer = typeof ans === 'number' && isFinite(ans) ? Math.floor(ans) : -1;
    }
    if (!(answer >= 0 && answer < options.length)) continue;

    // Xáo trộn đáp án, trừ khi có đáp án kiểu "tất cả các đáp án trên"
    const positional = options.some((o) => /(tất cả|cả [A-D]|các đáp án|đáp án [A-D]|không có đáp án)/i.test(o));
    if (!isTF && !positional) {
      const order = shuffle(options.map((_, i) => i));
      options = order.map((i) => options[i]);
      answer = order.indexOf(answer);
    }

    out.push({
      id: crypto.randomUUID(),
      type: isTF ? 'tf' : 'mcq',
      q: r.question.trim(),
      options,
      answer,
      explain: String(r.explanation || '').trim(),
      topic: String(r.topic || 'Chung').trim().slice(0, 40) || 'Chung',
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Tìm đối tượng JSON trong câu trả lời của AI (chấp nhận có lời dẫn hoặc khối ```json). */
export function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Không tìm thấy JSON');
  return JSON.parse(body.slice(start, end + 1));
}

/** Băm ngắn của nội dung câu hỏi, dùng để nhận ra cùng một câu ở các lần làm khác nhau. */
export function questionKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return 'k' + (h >>> 0).toString(36);
}

export function stripAnswers(questions: Question[]): PublicQuestion[] {
  return questions.map(({ answer: _a, explain: _e, ...rest }) => rest);
}

export function topicStats(questions: Question[], answers: number[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  questions.forEach((q, i) => {
    const t = map.get(q.topic) ?? { topic: q.topic, total: 0, correct: 0 };
    t.total++;
    if (answers[i] === q.answer) t.correct++;
    map.set(q.topic, t);
  });
  return Array.from(map.values()).sort(
    (a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total
  );
}

const KIND_TEXT: Record<Kind, string> = {
  mcq: 'tất cả là câu trắc nghiệm 4 đáp án (type "mcq")',
  tf: 'tất cả là nhận định Đúng/Sai (type "tf")',
  mix: 'khoảng 70% là trắc nghiệm 4 đáp án (type "mcq") và 30% là nhận định Đúng/Sai (type "tf")',
};

const LEVEL_TEXT: Record<Level, string> = {
  de: 'Dễ: nhớ khái niệm, định nghĩa, công thức.',
  vua: 'Vừa: hiểu và áp dụng, diễn giải, phân biệt khái niệm.',
  kho: 'Khó: tính toán nhiều bước với số liệu cho trước, tình huống thực tế, phân biệt các khái niệm dễ nhầm.',
};

export function buildPrompt(opts: {
  subject: string;
  material: string;
  n: number;
  level: Level;
  kind: Kind;
}): string {
  return (
    `Bạn là giảng viên môn "${opts.subject}" bậc đại học ở Việt Nam, đang ra đề ôn tập cho sinh viên.\n\n` +
    `TÀI LIỆU:\n"""\n${opts.material}\n"""\n\n` +
    `YÊU CẦU:\n` +
    `- Ra đúng ${opts.n} câu, ${KIND_TEXT[opts.kind]}.\n` +
    `- Độ khó: ${LEVEL_TEXT[opts.level]}\n` +
    `- Chỉ dựa trên nội dung tài liệu ở trên. Bao quát nhiều ý khác nhau, không lặp.\n` +
    `- Mỗi câu có đúng một đáp án đúng. Các đáp án sai phải hợp lý, dễ nhầm. Không dùng "tất cả các đáp án trên" hay "cả A và B".\n` +
    `- "options" không đánh số hay chữ A, B, C, D. "answer" là chỉ số bắt đầu từ 0 của đáp án đúng trong "options". Với "tf": không có "options", "answer" là 0 nếu nhận định Đúng, 1 nếu Sai.\n` +
    `- "topic" là tên chủ đề ngắn, tối đa 4 từ. "explanation" dài 1-3 câu, nêu căn cứ trong tài liệu; với câu tính toán thì viết các bước tính.\n` +
    `- Viết tiếng Việt. Viết công thức bằng ký tự thường (β₁, R², ŷ, Σ), không dùng LaTeX hay markdown.\n\n` +
    `Chỉ trả về một đối tượng JSON, không thêm lời dẫn, theo mẫu:\n` +
    `{"questions":[{"type":"mcq","topic":"Tên chủ đề","question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."},{"type":"tf","topic":"Tên chủ đề","question":"Nhận định: ...","answer":1,"explanation":"..."}]}`
  );
}
