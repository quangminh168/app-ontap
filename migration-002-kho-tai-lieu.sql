-- =====================================================================
-- MIGRATION 002: kho môn học công khai, thả tim / không thích, admin
-- Cách dùng: Supabase > SQL Editor > New query > dán toàn bộ > Run
-- Chạy được nhiều lần. Chạy SAU schema.sql, seed.sql và migration 001.
-- =====================================================================

-- ---------- 0. Tìm kiếm không dấu ----------
create extension if not exists unaccent;

create or replace function vn_norm(t text) returns text
language sql immutable parallel safe strict set search_path = public as $$
  select lower(public.unaccent('public.unaccent', t))
$$;

-- ---------- 1. Vai trò admin ----------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- 2. Môn học: công khai, người tạo ----------
alter table subjects add column if not exists is_public boolean not null default false;
alter table subjects add column if not exists owner_name text;
alter table subjects add column if not exists created_at timestamptz not null default now();
update subjects set is_public = true where owner_id is null and is_public = false;  -- môn hệ thống luôn công khai
update subjects s set owner_name = nullif(trim(p.full_name), '')
  from profiles p where p.id = s.owner_id and s.owner_name is null;
alter table subjects add column if not exists search_text text
  generated always as (vn_norm(name || ' ' || description || ' ' || coalesce(owner_name, ''))) stored;
create index if not exists idx_subjects_public on subjects(is_public, sort, name);

-- Ghi tên đầy đủ của người tạo môn
create or replace function subjects_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    select nullif(trim(full_name), '') into new.owner_name from profiles where id = new.owner_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_subjects_before_insert on subjects;
create trigger trg_subjects_before_insert before insert on subjects
  for each row execute function subjects_before_insert();

-- Xem được môn: môn hệ thống, môn công khai, môn của mình, hoặc môn có đề được giao cho mình
create or replace function can_view_subject(sid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select
    exists (select 1 from subjects s where s.id = sid and (s.owner_id is null or s.is_public or s.owner_id = auth.uid()))
    or exists (select 1 from quizzes q where q.subject_id = sid and can_view_quiz(q.id))
$$;

drop policy if exists "subjects_select" on subjects;
create policy "subjects_select" on subjects for select to anon, authenticated
  using (owner_id is null or is_public or owner_id = auth.uid() or can_view_subject(id));

drop policy if exists "subjects_delete" on subjects;
create policy "subjects_delete" on subjects for delete to authenticated
  using (owner_id = auth.uid() or is_admin());

-- Tạo môn qua hàm này (tự sinh mã slug, giới hạn số môn mỗi người, có thể công khai ngay)
drop function if exists create_subject(text, text);
create or replace function create_subject(p_name text, p_description text default '', p_public boolean default false)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
  n int;
  nm text := trim(coalesce(p_name, ''));
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if char_length(nm) < 2 or char_length(nm) > 80 then
    raise exception 'Tên môn học phải từ 2 đến 80 ký tự';
  end if;
  select count(*) into n from subjects where owner_id = auth.uid();
  if n >= 30 then raise exception 'Bạn đã tạo tối đa 30 môn học'; end if;
  insert into subjects (slug, name, description, sort, owner_id, is_public)
  values (
    'u-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
    nm,
    left(trim(coalesce(p_description, '')), 300),
    1000,
    auth.uid(),
    coalesce(p_public, false)
  )
  returning id into sid;
  return sid;
end $$;

revoke all on function create_subject(text, text, boolean) from public;
grant execute on function create_subject(text, text, boolean) to authenticated;

-- ---------- 3. Tài liệu: người gửi, ẩn, tim, không thích ----------
alter table documents add column if not exists owner_name text;
alter table documents add column if not exists hidden boolean not null default false;
alter table documents add column if not exists likes int not null default 0;
alter table documents add column if not exists dislikes int not null default 0;
alter table documents add column if not exists size int generated always as (char_length(content)) stored;
update documents d set owner_name = nullif(trim(p.full_name), '')
  from profiles p where p.id = d.owner_id and d.owner_name is null;
alter table documents add column if not exists search_text text
  generated always as (vn_norm(title || ' ' || coalesce(owner_name, ''))) stored;
create index if not exists idx_documents_listing on documents(subject_id, is_public, created_at desc);
create index if not exists idx_documents_likes on documents(subject_id, likes desc);

-- Khi thêm tài liệu: ghi tên người gửi, đặt lại tim/ẩn (không cho tự đặt), giới hạn 10 tài liệu / 24 giờ
create or replace function documents_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  new.likes := 0;
  new.dislikes := 0;
  new.hidden := false;
  if new.owner_id is not null then
    select nullif(trim(full_name), '') into new.owner_name from profiles where id = new.owner_id;
    if not exists (select 1 from profiles where id = new.owner_id and role = 'admin') then
      select count(*) into n from documents
        where owner_id = new.owner_id and created_at > now() - interval '24 hours';
      if n >= 10 then raise exception 'Bạn đã đăng tối đa 10 tài liệu trong 24 giờ. Hãy quay lại sau.'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_documents_before_insert on documents;
create trigger trg_documents_before_insert before insert on documents
  for each row execute function documents_before_insert();

-- Quyền: thấy tài liệu công khai (chưa bị ẩn) trong môn mình xem được, tài liệu của mình, admin thấy tất cả
drop policy if exists "documents_select" on documents;
create policy "documents_select" on documents for select to authenticated
  using ((is_public and not hidden and can_view_subject(subject_id)) or owner_id = auth.uid() or is_admin());

drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents for insert to authenticated
  with check (owner_id = auth.uid() and can_view_subject(subject_id));

drop policy if exists "documents_update" on documents;
create policy "documents_update" on documents for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "documents_delete" on documents;
create policy "documents_delete" on documents for delete to authenticated
  using (owner_id = auth.uid() or is_admin());

-- ---------- 4. Thả tim / không thích (mỗi người một lựa chọn cho mỗi tài liệu) ----------
create table if not exists doc_reactions (
  user_id uuid not null references profiles(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  kind text not null check (kind in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (user_id, document_id)
);
create index if not exists idx_reactions_user on doc_reactions(user_id, kind, created_at desc);
alter table doc_reactions enable row level security;

drop policy if exists "reactions_select" on doc_reactions;
create policy "reactions_select" on doc_reactions for select to authenticated using (user_id = auth.uid());
-- Không có chính sách ghi: chỉ thay đổi được qua hàm set_reaction

create or replace function recount_reactions() returns trigger
language plpgsql security definer set search_path = public as $$
declare d uuid := coalesce(new.document_id, old.document_id);
begin
  update documents set
    likes = (select count(*) from doc_reactions where document_id = d and kind = 'like'),
    dislikes = (select count(*) from doc_reactions where document_id = d and kind = 'dislike')
  where id = d;
  return null;
end $$;
drop trigger if exists trg_recount_reactions on doc_reactions;
create trigger trg_recount_reactions after insert or update or delete on doc_reactions
  for each row execute function recount_reactions();

-- Bấm lần đầu: đặt; bấm lại cùng nút: bỏ; bấm nút kia: đổi. Trả về lựa chọn hiện tại (hoặc null).
create or replace function set_reaction(p_doc uuid, p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  d record;
  cur text;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_kind not in ('like', 'dislike') then raise exception 'Loại đánh giá không hợp lệ'; end if;
  select id, owner_id, is_public, hidden, subject_id into d from documents where id = p_doc;
  if not found or d.hidden or not d.is_public or not can_view_subject(d.subject_id) then
    raise exception 'Không tìm thấy tài liệu';
  end if;
  if d.owner_id = uid then raise exception 'Bạn không thể đánh giá tài liệu của chính mình'; end if;
  select kind into cur from doc_reactions where user_id = uid and document_id = p_doc;
  if cur = p_kind then
    delete from doc_reactions where user_id = uid and document_id = p_doc;
    return null;
  elsif cur is null then
    insert into doc_reactions (user_id, document_id, kind) values (uid, p_doc, p_kind);
  else
    update doc_reactions set kind = p_kind, created_at = now() where user_id = uid and document_id = p_doc;
  end if;
  return p_kind;
end $$;

revoke all on function set_reaction(uuid, text) from public;
grant execute on function set_reaction(uuid, text) to authenticated;

-- ---------- 5. Cấp quyền admin cho tài khoản của bạn (sửa email rồi chạy riêng dòng này) ----------
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'email-cua-ban@gmail.com');
