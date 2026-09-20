-- Harden Online Class lifecycle and administrator-owned class resources

create or replace function public.join_online_class(p_join_code text)
returns table(id uuid,join_code text,title text,subject text,teacher_id uuid,duration_minutes integer,starts_at timestamptz,status text,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_class public.online_classes%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select p.role into v_role from public.profiles p where p.id=v_uid;
  if v_role <> 'student' then raise exception 'Student access required'; end if;
  select c.* into v_class
  from public.online_classes c
  where upper(c.join_code)=upper(trim(p_join_code))
  limit 1;
  if v_class.id is null then raise exception 'Class not found'; end if;
  if coalesce(v_class.status,'scheduled') <> 'live' then
    raise exception 'Class is not live yet';
  end if;
  insert into public.online_class_enrollments(class_id,student_id)
  values(v_class.id,v_uid)
  on conflict(class_id,student_id) do nothing;
  return query
  select v_class.id,v_class.join_code,v_class.title,v_class.subject,v_class.teacher_id,
         v_class.duration_minutes,v_class.starts_at,v_class.status,v_class.created_at;
end; $$;

drop policy if exists "registered teachers can add class video resources" on public.class_video_resources;
create policy "teachers and admins can add class video resources"
on public.class_video_resources for insert
to authenticated
with check (
  exists (
    select 1 from public.online_classes c
    join public.profiles p on p.id=auth.uid()
    where c.id=class_video_resources.class_id
      and c.teacher_id=auth.uid()
      and p.role in ('teacher','admin')
  )
);

drop policy if exists "registered teachers can delete class video resources" on public.class_video_resources;
create policy "teachers and admins can delete class video resources"
on public.class_video_resources for delete
to authenticated
using (
  exists (
    select 1 from public.online_classes c
    join public.profiles p on p.id=auth.uid()
    where c.id=class_video_resources.class_id
      and c.teacher_id=auth.uid()
      and p.role in ('teacher','admin')
  )
);

drop policy if exists "registered teachers can update class video resources" on public.class_video_resources;
create policy "teachers and admins can update class video resources"
on public.class_video_resources for update
to authenticated
using (
  exists (
    select 1 from public.online_classes c
    join public.profiles p on p.id=auth.uid()
    where c.id=class_video_resources.class_id
      and c.teacher_id=auth.uid()
      and p.role in ('teacher','admin')
  )
)
with check (
  exists (
    select 1 from public.online_classes c
    join public.profiles p on p.id=auth.uid()
    where c.id=class_video_resources.class_id
      and c.teacher_id=auth.uid()
      and p.role in ('teacher','admin')
  )
);