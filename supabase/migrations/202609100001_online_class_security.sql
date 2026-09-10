-- MalawiHub Online Classroom security hardening
create table if not exists public.online_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.online_classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(class_id,student_id)
);
alter table public.online_class_enrollments enable row level security;

drop policy if exists "students view own enrollments" on public.online_class_enrollments;
create policy "students view own enrollments" on public.online_class_enrollments for select to authenticated using (student_id=auth.uid());
drop policy if exists "teachers view class enrollments" on public.online_class_enrollments;
create policy "teachers view class enrollments" on public.online_class_enrollments for select to authenticated using (exists(select 1 from public.online_classes c join public.profiles p on p.id=auth.uid() where c.id=online_class_enrollments.class_id and c.teacher_id=auth.uid() and p.role='teacher'));
drop policy if exists "class admins view enrollments" on public.online_class_enrollments;
create policy "class admins view enrollments" on public.online_class_enrollments for select to authenticated using (public.is_online_class_admin() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create or replace function public.join_online_class(p_join_code text)
returns table(id uuid,join_code text,title text,subject text,teacher_id uuid,duration_minutes integer,starts_at timestamptz,status text,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role text; v_class public.online_classes%rowtype;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select role into v_role from public.profiles where profiles.id=v_uid;
 if v_role <> 'student' then raise exception 'Student access required'; end if;
 select * into v_class from public.online_classes where upper(join_code)=upper(trim(p_join_code)) limit 1;
 if v_class.id is null then raise exception 'Class not found'; end if;
 insert into public.online_class_enrollments(class_id,student_id) values(v_class.id,v_uid) on conflict(class_id,student_id) do nothing;
 return query select v_class.id,v_class.join_code,v_class.title,v_class.subject,v_class.teacher_id,v_class.duration_minutes,v_class.starts_at,v_class.status,v_class.created_at;
end; $$;
revoke all on function public.join_online_class(text) from public;
grant execute on function public.join_online_class(text) to authenticated;

drop policy if exists "Authenticated users can read online classes" on public.online_classes;
drop policy if exists "Students enrolled, teachers own, admins read classes" on public.online_classes;
create policy "Students enrolled, teachers own, admins read classes" on public.online_classes for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
 or public.is_online_class_admin()
 or (teacher_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='teacher'))
 or exists(select 1 from public.online_class_enrollments e where e.class_id=online_classes.id and e.student_id=auth.uid())
);

drop policy if exists "Authenticated users can read class notes" on public.class_notes;
drop policy if exists "Students enrolled, teachers own, admins read notes" on public.class_notes;
create policy "Students enrolled, teachers own, admins read notes" on public.class_notes for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') or public.is_online_class_admin()
 or exists(select 1 from public.online_classes c join public.profiles p on p.id=auth.uid() where c.id=class_notes.class_id and c.teacher_id=auth.uid() and p.role='teacher')
 or exists(select 1 from public.online_class_enrollments e where e.class_id=class_notes.class_id and e.student_id=auth.uid())
);

drop policy if exists "Authenticated users can view class video resources" on public.class_video_resources;
drop policy if exists "Students enrolled, teachers own, admins read video resources" on public.class_video_resources;
create policy "Students enrolled, teachers own, admins read video resources" on public.class_video_resources for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') or public.is_online_class_admin()
 or exists(select 1 from public.online_classes c join public.profiles p on p.id=auth.uid() where c.id=class_video_resources.class_id and c.teacher_id=auth.uid() and p.role='teacher')
 or exists(select 1 from public.online_class_enrollments e where e.class_id=class_video_resources.class_id and e.student_id=auth.uid())
);

create or replace function public.prevent_profile_privilege_escalation() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' and not public.is_online_class_admin() then
   if tg_op='INSERT' and new.role in ('admin','teacher') then raise exception 'Privileged profile roles can only be assigned by the server'; end if;
   if tg_op='UPDATE' then
     if new.role <> old.role and new.role in ('admin','teacher') then raise exception 'Privileged profile roles can only be assigned by the server'; end if;
     if new.role <> old.role and old.role in ('admin','teacher') then raise exception 'Profile role cannot be changed from the client'; end if;
     if new.can_register_students <> old.can_register_students then raise exception 'Student registration permission can only be changed by the server'; end if;
   end if;
 end if;
 return new;
end; $$;
drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges before insert or update on public.profiles for each row execute function public.prevent_profile_privilege_escalation();