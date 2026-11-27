-- MalawiHub Online Class: teacher-controlled student enrolment.
-- Additive migration. Existing active enrolments are preserved.
-- Class codes identify classes but never create or grant membership.

alter table public.online_class_enrollments
  add column if not exists status text not null default 'active',
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.online_class_enrollments'::regclass
      and conname = 'online_class_enrollments_status_check'
  ) then
    alter table public.online_class_enrollments
      add constraint online_class_enrollments_status_check
      check (status in ('active', 'suspended', 'removed'));
  end if;
end $$;

create index if not exists online_class_enrollments_class_status_idx
  on public.online_class_enrollments(class_id, status);
create index if not exists online_class_enrollments_student_status_idx
  on public.online_class_enrollments(student_id, status);

-- Enrollment history intentionally uses UUID values without cascading foreign
-- keys so that an audit record is not erased when a class/account is removed.
create table if not exists public.online_class_enrollment_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null,
  actor_id uuid,
  action text not null check (action in ('enrolled', 'reactivated', 'suspended', 'removed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists online_class_enrollment_events_class_created_idx
  on public.online_class_enrollment_events(class_id, created_at desc);
alter table public.online_class_enrollment_events enable row level security;
drop policy if exists "online class enrollment events admin read" on public.online_class_enrollment_events;
create policy "online class enrollment events admin read"
  on public.online_class_enrollment_events
  for select to authenticated
  using (
    public.is_online_class_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
revoke all on public.online_class_enrollment_events from anon, authenticated;

-- Internal trigger records membership changes atomically with the row write.
-- The private schema is not exposed through the Supabase Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- These private SECURITY DEFINER helpers avoid recursive RLS policy lookups.
-- The schema is not exposed through the Supabase Data API.
create or replace function private.is_online_class_teacher_owner(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.online_classes c
    where c.id = p_class_id
      and c.teacher_id = auth.uid()
      and (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin'))
        or exists (select 1 from public.user_area_roles r where r.user_id = auth.uid() and r.area = 'teacher')
      )
  );
$$;

create or replace function private.is_online_class_student_enrolled(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.online_class_enrollments e
    where e.class_id = p_class_id
      and e.student_id = auth.uid()
      and e.status = 'active'
  );
$$;

revoke all on function private.is_online_class_teacher_owner(uuid) from public, anon;
revoke all on function private.is_online_class_student_enrolled(uuid) from public, anon;
grant execute on function private.is_online_class_teacher_owner(uuid) to authenticated;
grant execute on function private.is_online_class_student_enrolled(uuid) to authenticated;

create or replace function private.log_online_class_enrollment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'enrolled';
  elsif new.status is distinct from old.status then
    v_action := case when new.status = 'active' then 'reactivated' else new.status end;
  else
    return new;
  end if;

  insert into public.online_class_enrollment_events (
    class_id, student_id, actor_id, action, details
  ) values (
    new.class_id,
    new.student_id,
    coalesce(new.updated_by, auth.uid()),
    v_action,
    jsonb_build_object('previous_status', case when tg_op = 'UPDATE' then old.status else null end)
  );

  return new;
end;
$$;

revoke all on function private.log_online_class_enrollment_change() from public, anon, authenticated;
drop trigger if exists log_online_class_enrollment_change on public.online_class_enrollments;
create trigger log_online_class_enrollment_change
  after insert or update of status on public.online_class_enrollments
  for each row execute function private.log_online_class_enrollment_change();

-- Preserve the existing classroom entry RPC for compatibility, but require
-- an already-active membership. Supplying a class code no longer enrols anyone.
create or replace function public.join_online_class(p_join_code text)
returns table(
  id uuid,
  join_code text,
  title text,
  subject text,
  teacher_id uuid,
  duration_minutes integer,
  starts_at timestamptz,
  status text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_class public.online_classes%rowtype;
  v_is_student boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.role = 'student'
  ) or exists (
    select 1 from public.user_area_roles r
    where r.user_id = v_uid and r.area = 'student'
  ) into v_is_student;

  if not v_is_student then
    raise exception 'Student access required';
  end if;

  select c.* into v_class
  from public.online_classes c
  where upper(c.join_code) = upper(trim(p_join_code))
  limit 1;

  if v_class.id is null then
    raise exception 'Class not found';
  end if;

  if coalesce(v_class.status, 'scheduled') <> 'live' then
    raise exception 'Class is not live yet';
  end if;

  if not exists (
    select 1 from public.online_class_enrollments e
    where e.class_id = v_class.id
      and e.student_id = v_uid
      and e.status = 'active'
  ) then
    raise exception 'You are not enrolled in this class. Ask your teacher to add you.';
  end if;

  return query
  select v_class.id, v_class.join_code, v_class.title, v_class.subject,
         v_class.teacher_id, v_class.duration_minutes, v_class.starts_at,
         v_class.status, v_class.created_at;
end;
$$;

revoke all on function public.join_online_class(text) from public, anon;
grant execute on function public.join_online_class(text) to authenticated;

-- Realtime access follows active membership, so suspended/removed students
-- cannot newly subscribe to a classroom channel.
-- Realtime access follows active membership, so suspended/removed students
-- cannot newly subscribe to a classroom channel.
create or replace function public.online_class_channel_access(p_topic text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.online_classes c
    where p_topic in (
      'malawihub-class-' || c.join_code,
      'malawihub-whiteboard-' || c.join_code,
      'malawihub-resources-' || c.join_code
    )
    and (
      public.is_online_class_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
      or c.teacher_id = auth.uid()
      or (
        c.status = 'live'
        and exists (
          select 1 from public.online_class_enrollments e
          where e.class_id = c.id
            and e.student_id = auth.uid()
            and e.status = 'active'
        )
      )
    )
  );
$$;

revoke all on function public.online_class_channel_access(text) from public, anon;
grant execute on function public.online_class_channel_access(text) to authenticated;

-- Remove legacy permissive SELECT policies. PostgreSQL combines permissive
-- policies with OR, so leaving an old USING (true) policy would bypass the
-- newer membership checks.
drop policy if exists "online classes readable" on public.online_classes;
drop policy if exists "Authenticated users can read online classes" on public.online_classes;
drop policy if exists "Students enrolled, teachers own, admins read classes" on public.online_classes;
create policy "class members and owners read online classes"
  on public.online_classes for select to authenticated
  using (
    public.is_online_class_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or private.is_online_class_teacher_owner(id)
    or private.is_online_class_student_enrolled(id)
  );

drop policy if exists "class notes readable" on public.class_notes;
drop policy if exists "Authenticated users can read class notes" on public.class_notes;
drop policy if exists "Students enrolled, teachers own, admins read notes" on public.class_notes;
drop policy if exists "class notes select by class membership" on public.class_notes;
create policy "class members and owners read class notes"
  on public.class_notes for select to authenticated
  using (
    public.is_online_class_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or private.is_online_class_teacher_owner(class_id)
    or private.is_online_class_student_enrolled(class_id)
  );

drop policy if exists "class video resources are readable" on public.class_video_resources;
drop policy if exists "Authenticated users can view class video resources" on public.class_video_resources;
drop policy if exists "Students enrolled, teachers own, admins read video resources" on public.class_video_resources;
drop policy if exists "class video resources select by class membership" on public.class_video_resources;
create policy "class members and owners read video resources"
  on public.class_video_resources for select to authenticated
  using (
    public.is_online_class_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or private.is_online_class_teacher_owner(class_id)
    or private.is_online_class_student_enrolled(class_id)
  );

-- Rebuild enrolment SELECT access and deliberately provide no direct client
-- INSERT/UPDATE/DELETE policies. All membership changes use the RPCs above.
drop policy if exists "students view own enrollments" on public.online_class_enrollments;
drop policy if exists "teachers view class enrollments" on public.online_class_enrollments;
drop policy if exists "class admins view enrollments" on public.online_class_enrollments;
drop policy if exists "class members can view enrollments" on public.online_class_enrollments;
create policy "students teachers and admins read enrolments"
  on public.online_class_enrollments for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_online_class_teacher_owner(class_id)
    or public.is_online_class_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
