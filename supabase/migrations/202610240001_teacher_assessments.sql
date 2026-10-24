-- Teacher assignments, exams, submissions and marking.
create table if not exists public.teacher_assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.online_classes(id) on delete cascade,
  title text not null,
  subject text not null default '',
  assessment_type text not null check (assessment_type in ('assignment','exam')),
  instructions text not null default '',
  questions jsonb not null default '[]'::jsonb,
  total_marks numeric not null default 0 check (total_marks >= 0),
  due_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 300),
  status text not null default 'published' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now()
);
create index if not exists teacher_assessments_class_idx on public.teacher_assessments(class_id, status, created_at desc);
create index if not exists teacher_assessments_teacher_idx on public.teacher_assessments(teacher_id, created_at desc);
create table if not exists public.teacher_assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.teacher_assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  marks_awarded numeric,
  question_marks jsonb,
  feedback text not null default '',
  graded_by uuid references auth.users(id) on delete set null,
  graded_at timestamptz,
  unique (assessment_id, student_id)
);
create index if not exists teacher_assessment_submissions_assessment_idx on public.teacher_assessment_submissions(assessment_id, submitted_at desc);
alter table public.teacher_assessments enable row level security;
alter table public.teacher_assessment_submissions enable row level security;
drop policy if exists "deny direct assessment access" on public.teacher_assessments;
create policy "deny direct assessment access" on public.teacher_assessments for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny direct assessment submission access" on public.teacher_assessment_submissions;
create policy "deny direct assessment submission access" on public.teacher_assessment_submissions for all to anon, authenticated using (false) with check (false);
