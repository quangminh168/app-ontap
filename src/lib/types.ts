export type Role = 'student' | 'teacher' | 'admin';
export type Level = 'de' | 'vua' | 'kho';
// mcq: trắc nghiệm | tf: đúng/sai | mix: trắc nghiệm + đúng/sai | essay: tự luận | full: trắc nghiệm + tự luận
export type Kind = 'mcq' | 'tf' | 'mix' | 'essay' | 'full';
export type QType = 'mcq' | 'tf' | 'essay';

export interface Question {
  id: string;
  type: QType;
  q: string;
  options: string[]; // câu tự luận: mảng rỗng
  answer: number; // chỉ số đáp án đúng, bắt đầu từ 0; câu tự luận: -1
  explain: string;
  topic: string;
  sample?: string; // chỉ câu tự luận: đáp án mẫu
  points?: string[]; // chỉ câu tự luận: các ý chấm điểm
}

// Câu hỏi gửi xuống trình duyệt khi làm bài (không có đáp án)
export type PublicQuestion = Omit<Question, 'answer' | 'explain' | 'sample' | 'points'>;

export interface TopicStat {
  topic: string;
  total: number;
  correct: number; // câu tự luận có thể cộng điểm lẻ
}

// Kết quả chấm một câu tự luận
export interface EssayGrade {
  index: number; // vị trí câu trong đề
  score: number; // từ 0 đến 1
  feedback: string;
  graded: boolean; // false nếu AI chưa chấm được câu này
}

export const LEVELS: Record<Level, string> = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };
export const KINDS: Record<Kind, string> = {
  mcq: 'Trắc nghiệm',
  tf: 'Đúng / Sai',
  mix: 'Hỗn hợp',
  essay: 'Tự luận',
  full: 'Trắc nghiệm + Tự luận',
};
export const SOURCES: Record<string, string> = { ai: 'Tạo bằng AI', review: 'Ôn lại câu sai' };