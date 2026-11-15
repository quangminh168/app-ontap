export type Role = 'student' | 'teacher';
export type Level = 'de' | 'vua' | 'kho';
export type Kind = 'mcq' | 'tf' | 'mix';

export interface Question {
  id: string;
  type: 'mcq' | 'tf';
  q: string;
  options: string[];
  answer: number; // chỉ số đáp án đúng, bắt đầu từ 0
  explain: string;
  topic: string;
}

// Câu hỏi gửi xuống trình duyệt khi làm bài (không có đáp án)
export type PublicQuestion = Omit<Question, 'answer' | 'explain'>;

export interface TopicStat {
  topic: string;
  total: number;
  correct: number;
}

export const LEVELS: Record<Level, string> = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };
export const KINDS: Record<Kind, string> = { mcq: 'Trắc nghiệm', tf: 'Đúng / Sai', mix: 'Hỗn hợp' };
export const SOURCES: Record<string, string> = { ai: 'Tạo bằng AI', review: 'Ôn lại câu sai' };
