-- =====================================================================
-- MIGRATION 003: đọc tài liệu + đánh dấu / ghi chú riêng của từng người
-- Cách dùng: Supabase > SQL Editor > New query > dán toàn bộ > Run
-- Chạy được nhiều lần. Chạy SAU migration 002.
-- Tài liệu gốc KHÔNG bị sửa: ghi chú nằm ở bảng riêng, mỗi người chỉ thấy của mình.
-- =====================================================================

create table if not exists doc_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  start_offset int not null check (start_offset >= 0),
  end_offset int not null,
  quote text not null default '',
  color text not null default 'yellow' check (color in ('yellow', 'green', 'pink', 'blue')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_offset > start_offset and end_offset - start_offset <= 5000)
);
create index if not exists idx_annotations_user_doc on doc_annotations(user_id, document_id, start_offset);

alter table doc_annotations enable row level security;

-- Chỉ chủ ghi chú mới đọc / sửa / xóa được. Thêm mới chỉ khi người đó xem được tài liệu.
drop policy if exists "annotations_select" on doc_annotations;
create policy "annotations_select" on doc_annotations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "annotations_insert" on doc_annotations;
create policy "annotations_insert" on doc_annotations for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from documents d where d.id = document_id));

drop policy if exists "annotations_update" on doc_annotations;
create policy "annotations_update" on doc_annotations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "annotations_delete" on doc_annotations;
create policy "annotations_delete" on doc_annotations for delete to authenticated
  using (user_id = auth.uid());

-- Giới hạn 500 đoạn đánh dấu mỗi người trên mỗi tài liệu
create or replace function annotations_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from doc_annotations where user_id = new.user_id and document_id = new.document_id;
  if n >= 500 then raise exception 'Bạn đã đánh dấu tối đa 500 đoạn cho mỗi tài liệu'; end if;
  return new;
end $$;
drop trigger if exists trg_annotations_before_insert on doc_annotations;
create trigger trg_annotations_before_insert before insert on doc_annotations
  for each row execute function annotations_before_insert();
