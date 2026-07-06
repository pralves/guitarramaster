-- ============================================================================
-- LEARNING PLATFORM SCHEMA
-- Guitarra Master - Plataforma de Ensino Online
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. USERS & PROFILES
-- ============================================================================

-- Users table (uses Supabase Auth native table)
-- Users are managed via Supabase Auth, but we create a profiles table for custom fields

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null check (user_type in ('student', 'admin')),
  full_name text not null,
  email text not null unique,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users_can_read_own_profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

create policy "admins_can_read_all_profiles"
  on public.user_profiles
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_profiles"
  on public.user_profiles
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_profiles"
  on public.user_profiles
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 2. MODULES (Módulos de aprendizado)
-- ============================================================================

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modules enable row level security;

-- ============================================================================
-- 8. CLASS GROUPS (Turmas)
-- ============================================================================

create table if not exists public.class_groups (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_groups enable row level security;

create policy "admins_can_read_all_classes"
  on public.class_groups
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_classes"
  on public.class_groups
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_classes"
  on public.class_groups
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 9. STUDENT CLASS MEMBERSHIP (Alunos em turmas)
-- ============================================================================

create table if not exists public.student_class_membership (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.class_groups(id) on delete cascade,
  student_id uuid not null references public.user_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(class_id, student_id)
);

alter table public.student_class_membership enable row level security;

create policy "admins_can_read_memberships"
  on public.student_class_membership
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_memberships"
  on public.student_class_membership
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_memberships"
  on public.student_class_membership
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 10. STUDENT MODULE ACCESS (Acesso de alunos a módulos)
-- ============================================================================

create table if not exists public.student_module_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.user_profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique(student_id, module_id)
);

alter table public.student_module_access enable row level security;

create policy "admins_can_read_access"
  on public.student_module_access
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_access"
  on public.student_module_access
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_access"
  on public.student_module_access
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 11. CLASS MODULE ACCESS (Módulos liberados para turmas)
-- ============================================================================

create table if not exists public.class_module_access (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.class_groups(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique(class_id, module_id)
);

alter table public.class_module_access enable row level security;

create policy "admins_can_read_class_access"
  on public.class_module_access
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_class_access"
  on public.class_module_access
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_class_access"
  on public.class_module_access
  for all
  to service_role
  using (true)
  with check (true);


create policy "students_can_read_assigned_modules"
  on public.modules
  for select
  using (
    active = true and (
      exists (select 1 from public.student_module_access where module_id = modules.id and student_id = auth.uid())
      or
      exists (select 1 from public.class_module_access cma
              join public.student_class_membership scm on cma.class_id = scm.class_id
              where cma.module_id = modules.id and scm.student_id = auth.uid())
    )
  );

create policy "admins_can_read_all_modules"
  on public.modules
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_modules"
  on public.modules
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_modules"
  on public.modules
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 3. LESSONS (Aulas)
-- ============================================================================

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  admin_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

create policy "students_can_read_lessons_in_assigned_modules"
  on public.lessons
  for select
  using (
    active = true and (
      exists (select 1 from public.modules m 
              where m.id = lessons.module_id and m.active = true and (
                exists (select 1 from public.student_module_access where module_id = m.id and student_id = auth.uid())
                or
                exists (select 1 from public.class_module_access cma
                        join public.student_class_membership scm on cma.class_id = scm.class_id
                        where cma.module_id = m.id and scm.student_id = auth.uid())
              ))
    )
  );

create policy "admins_can_read_all_lessons"
  on public.lessons
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_lessons"
  on public.lessons
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_lessons"
  on public.lessons
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 4. LESSON VIDEOS
-- ============================================================================

create table if not exists public.lesson_videos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  file_path text not null,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.lesson_videos enable row level security;

create policy "students_can_read_videos_in_lessons"
  on public.lesson_videos
  for select
  using (
    exists (select 1 from public.lessons l
            where l.id = lesson_videos.lesson_id and l.active = true and (
              exists (select 1 from public.modules m 
                      where m.id = l.module_id and m.active = true and (
                        exists (select 1 from public.student_module_access where module_id = m.id and student_id = auth.uid())
                        or
                        exists (select 1 from public.class_module_access cma
                                join public.student_class_membership scm on cma.class_id = scm.class_id
                                where cma.module_id = m.id and scm.student_id = auth.uid())
                      ))
            ))
  );

create policy "admins_can_read_all_videos"
  on public.lesson_videos
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_videos"
  on public.lesson_videos
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_videos"
  on public.lesson_videos
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 5. LESSON MATERIALS (PDFs e outros arquivos)
-- ============================================================================

create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  file_name text not null,
  file_size bigint not null,
  file_path text not null,
  material_type text not null default 'pdf' check (material_type in ('pdf', 'document', 'archive', 'other')),
  created_at timestamptz not null default now()
);

alter table public.lesson_materials enable row level security;

create policy "students_can_read_materials_in_lessons"
  on public.lesson_materials
  for select
  using (
    exists (select 1 from public.lessons l
            where l.id = lesson_materials.lesson_id and l.active = true and (
              exists (select 1 from public.modules m 
                      where m.id = l.module_id and m.active = true and (
                        exists (select 1 from public.student_module_access where module_id = m.id and student_id = auth.uid())
                        or
                        exists (select 1 from public.class_module_access cma
                                join public.student_class_membership scm on cma.class_id = scm.class_id
                                where cma.module_id = m.id and scm.student_id = auth.uid())
                      ))
            ))
  );

create policy "admins_can_read_all_materials"
  on public.lesson_materials
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_materials"
  on public.lesson_materials
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_materials"
  on public.lesson_materials
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 6. EXERCISES
-- ============================================================================

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  content text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "students_can_read_exercises_in_lessons"
  on public.exercises
  for select
  using (
    exists (select 1 from public.lessons l
            where l.id = exercises.lesson_id and l.active = true and (
              exists (select 1 from public.modules m 
                      where m.id = l.module_id and m.active = true and (
                        exists (select 1 from public.student_module_access where module_id = m.id and student_id = auth.uid())
                        or
                        exists (select 1 from public.class_module_access cma
                                join public.student_class_membership scm on cma.class_id = scm.class_id
                                where cma.module_id = m.id and scm.student_id = auth.uid())
                      ))
            ))
  );

create policy "admins_can_read_all_exercises"
  on public.exercises
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_exercises"
  on public.exercises
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_exercises"
  on public.exercises
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 7. LESSON COMMENTS (Perguntas e comentários)
-- ============================================================================

create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.user_profiles(id) on delete cascade,
  parent_comment_id uuid references public.lesson_comments(id) on delete cascade,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lesson_comments enable row level security;

create policy "students_can_read_approved_comments"
  on public.lesson_comments
  for select
  using (
    (status = 'approved' or student_id = auth.uid()) and
    exists (select 1 from public.lessons l
            where l.id = lesson_comments.lesson_id and l.active = true and (
              exists (select 1 from public.modules m 
                      where m.id = l.module_id and m.active = true and (
                        exists (select 1 from public.student_module_access where module_id = m.id and student_id = auth.uid())
                        or
                        exists (select 1 from public.class_module_access cma
                                join public.student_class_membership scm on cma.class_id = scm.class_id
                                where cma.module_id = m.id and scm.student_id = auth.uid())
                      ))
            ))
  );

create policy "students_can_create_comments"
  on public.lesson_comments
  for insert
  with check (student_id = auth.uid());

create policy "students_can_update_own_comments"
  on public.lesson_comments
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "admins_can_read_all_comments"
  on public.lesson_comments
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "admins_can_manage_comments"
  on public.lesson_comments
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_comments"
  on public.lesson_comments
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 12. MESSAGES (Mensagens entre alunos e admins)
-- ============================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  subject text,
  body text not null,
  message_type text not null default 'direct' check (message_type in ('direct', 'class', 'module', 'broadcast')),
  sent_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create table if not exists public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  read boolean not null default false,
  read_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(message_id, recipient_id)
);

alter table public.message_recipients enable row level security;

create policy "admins_can_read_all_messages"
  on public.messages
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "students_can_read_messages_sent_to_them"
  on public.messages
  for select
  using (
    exists (select 1 from public.message_recipients where message_id = messages.id and recipient_id = auth.uid())
  );

create policy "admins_can_create_messages"
  on public.messages
  for insert
  with check (sender_id = auth.uid() and exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "students_can_create_messages_to_admin"
  on public.messages
  for insert
  with check (sender_id = auth.uid());

create policy "service_role_can_manage_messages"
  on public.messages
  for all
  to service_role
  using (true)
  with check (true);

create policy "admins_can_read_all_recipients"
  on public.message_recipients
  for select
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "users_can_read_own_message_status"
  on public.message_recipients
  for select
  using (recipient_id = auth.uid());

create policy "users_can_update_own_message_status"
  on public.message_recipients
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "admins_can_manage_recipients"
  on public.message_recipients
  for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and user_type = 'admin'));

create policy "service_role_can_manage_recipients"
  on public.message_recipients
  for all
  to service_role
  using (true)
  with check (true);
-- ============================================================================
-- INDEXES (Performance)
-- ============================================================================

create index if not exists idx_user_profiles_email on public.user_profiles(email);
create index if not exists idx_modules_admin_id on public.modules(admin_id);
create index if not exists idx_lessons_module_id on public.lessons(module_id);
create index if not exists idx_lessons_admin_id on public.lessons(admin_id);
create index if not exists idx_lesson_comments_lesson_id on public.lesson_comments(lesson_id);
create index if not exists idx_lesson_comments_student_id on public.lesson_comments(student_id);
create index if not exists idx_lesson_comments_status on public.lesson_comments(status);
create index if not exists idx_student_module_access_student_id on public.student_module_access(student_id);
create index if not exists idx_student_module_access_module_id on public.student_module_access(module_id);
create index if not exists idx_student_class_membership_student_id on public.student_class_membership(student_id);
create index if not exists idx_student_class_membership_class_id on public.student_class_membership(class_id);
create index if not exists idx_class_module_access_class_id on public.class_module_access(class_id);
create index if not exists idx_class_module_access_module_id on public.class_module_access(module_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_message_recipients_recipient_id on public.message_recipients(recipient_id);
create index if not exists idx_message_recipients_message_id on public.message_recipients(message_id);
