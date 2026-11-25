-- =====================================================================
-- MIGRATION 004: tăng tốc tải trang môn học
-- Thêm cột tính sẵn để trang không phải tải cả mảng câu hỏi của các đề chỉ để đếm.
-- Chạy được nhiều lần, độc lập với các migration khác (kể cả migration 003 ghi chú tài liệu).
-- =====================================================================

-- Số câu của đề (thay cho việc tải cả mảng câu hỏi)
alter table quizzes add column if not exists question_count int generated always as (
  case when jsonb_typeof(questions) = 'array' then jsonb_array_length(questions) else 0 end
) stored;

-- Số ký tự của tài liệu (đã có nếu bạn chạy migration 002; thêm lại nếu thiếu)
alter table documents add column if not exists size int generated always as (char_length(content)) stored;

-- Chỉ mục cho các truy vấn của trang môn học
create index if not exists idx_quizzes_subject_owner on quizzes(subject_id, owner_id, created_at desc);
create index if not exists idx_documents_subject_created on documents(subject_id, created_at);
