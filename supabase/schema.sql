-- =====================================================================
-- ONTAP AI - cấu trúc cơ sở dữ liệu
-- Cách dùng: Supabase > SQL Editor > New query > dán toàn bộ file này > Run
-- Chạy file này TRƯỚC, sau đó chạy seed.sql
-- =====================================================================

-- ---------- Bảng ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  sort int not null default 0
);

-- Tài liệu: owner_id trống = tài liệu của hệ thống (do bạn thêm bằng SQL)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  owner_id uuid references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  level text,
  kind text,
  source text not null default 'ai',          -- ai | review
  questions jsonb not null,                   -- mảng câu hỏi (có đáp án)
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  join_code text unique not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  assignment_id uuid references assignments(id) on delete set null,
  answers jsonb not null,                     -- mảng số, -1 = bỏ trống
  score int not null,
  total int not null,
  duration_seconds int not null default 0,
  topic_stats jsonb not null default '[]',    -- [{topic,total,correct}]
  created_at timestamptz not null default now()
);

create table if not exists wrong_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  qkey text not null,
  question jsonb not null,
  misses int not null default 1,
  last_missed timestamptz not null default now(),
  unique (user_id, qkey)
);

create index if not exists idx_documents_subject on documents(subject_id);
create index if not exists idx_quizzes_owner on quizzes(owner_id, created_at desc);
create index if not exists idx_attempts_user on attempts(user_id, created_at desc);
create index if not exists idx_attempts_assignment on attempts(assignment_id);
create index if not exists idx_wrong_user on wrong_questions(user_id, misses desc);

-- ---------- Tự tạo hồ sơ khi có người đăng ký ----------

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Hàm hỗ trợ phân quyền ----------

create or replace function is_teacher() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
$$;

create or replace function is_class_teacher(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from classes where id = cid and teacher_id = auth.uid())
$$;

create or replace function is_class_member(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from class_members where class_id = cid and user_id = auth.uid())
$$;

create or replace function teaches_user(uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from class_members m join classes c on c.id = m.class_id
    where m.user_id = uid and c.teacher_id = auth.uid()
  )
$$;

create or replace function can_view_quiz(qid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select
    exists (select 1 from quizzes q where q.id = qid and q.owner_id = auth.uid())
    or exists (
      select 1 from assignments a join class_members m on m.class_id = a.class_id
      where a.quiz_id = qid and m.user_id = auth.uid()
    )
$$;

-- Học sinh vào lớp bằng mã lớp
create or replace function join_class(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select id into cid from classes where join_code = upper(trim(code));
  if cid is null then raise exception 'Mã lớp không đúng'; end if;
  insert into class_members (class_id, user_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

revoke all on function join_class(text) from public;
grant execute on function join_class(text) to authenticated;

-- ---------- Phân quyền theo dòng (RLS) ----------

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table documents enable row level security;
alter table quizzes enable row level security;
alter table classes enable row level security;
alter table class_members enable row level security;
alter table assignments enable row level security;
alter table attempts enable row level security;
alter table wrong_questions enable row level security;

-- profiles: xem hồ sơ của mình, giáo viên xem học sinh trong lớp mình
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select to authenticated
  using (id = auth.uid() or teaches_user(id));

-- subjects: ai cũng xem được
drop policy if exists "subjects_select" on subjects;
create policy "subjects_select" on subjects for select to anon, authenticated using (true);

-- documents
drop policy if exists "documents_select" on documents;
create policy "documents_select" on documents for select to authenticated
  using (is_public or owner_id = auth.uid());
drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents for insert to authenticated
  with check (owner_id = auth.uid() and (is_public = false or is_teacher()));
drop policy if exists "documents_delete" on documents;
create policy "documents_delete" on documents for delete to authenticated
  using (owner_id = auth.uid());

-- quizzes
drop policy if exists "quizzes_select" on quizzes;
create policy "quizzes_select" on quizzes for select to authenticated
  using (can_view_quiz(id));
drop policy if exists "quizzes_insert" on quizzes;
create policy "quizzes_insert" on quizzes for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists "quizzes_delete" on quizzes;
create policy "quizzes_delete" on quizzes for delete to authenticated
  using (owner_id = auth.uid());

-- classes
drop policy if exists "classes_select" on classes;
create policy "classes_select" on classes for select to authenticated
  using (teacher_id = auth.uid() or is_class_member(id));
drop policy if exists "classes_insert" on classes;
create policy "classes_insert" on classes for insert to authenticated
  with check (teacher_id = auth.uid() and is_teacher());
drop policy if exists "classes_delete" on classes;
create policy "classes_delete" on classes for delete to authenticated
  using (teacher_id = auth.uid());

-- class_members (thêm thành viên chỉ qua hàm join_class)
drop policy if exists "members_select" on class_members;
create policy "members_select" on class_members for select to authenticated
  using (user_id = auth.uid() or is_class_teacher(class_id));
drop policy if exists "members_delete" on class_members;
create policy "members_delete" on class_members for delete to authenticated
  using (user_id = auth.uid() or is_class_teacher(class_id));

-- assignments
drop policy if exists "assignments_select" on assignments;
create policy "assignments_select" on assignments for select to authenticated
  using (is_class_teacher(class_id) or is_class_member(class_id));
drop policy if exists "assignments_insert" on assignments;
create policy "assignments_insert" on assignments for insert to authenticated
  with check (is_class_teacher(class_id) and can_view_quiz(quiz_id));
drop policy if exists "assignments_delete" on assignments;
create policy "assignments_delete" on assignments for delete to authenticated
  using (is_class_teacher(class_id));

-- attempts: học sinh xem bài của mình; giáo viên xem bài thuộc bài giao của lớp mình
drop policy if exists "attempts_select" on attempts;
create policy "attempts_select" on attempts for select to authenticated
  using (
    user_id = auth.uid()
    or (assignment_id is not null and exists (
      select 1 from assignments a where a.id = attempts.assignment_id and is_class_teacher(a.class_id)
    ))
  );
drop policy if exists "attempts_insert" on attempts;
create policy "attempts_insert" on attempts for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "attempts_delete" on attempts;
create policy "attempts_delete" on attempts for delete to authenticated
  using (user_id = auth.uid());

-- wrong_questions: chỉ của mình
drop policy if exists "wrong_all" on wrong_questions;
create policy "wrong_all" on wrong_questions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
