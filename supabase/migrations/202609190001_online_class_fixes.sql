-- MalawiHub Online Class fixes and Realtime authorization
-- Safe additive migration for existing deployments.

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
  insert into public.online_class_enrollments(class_id,student_id)
  values(v_class.id,v_uid)
  on conflict(class_id,student_id) do nothing;
  return query
  select v_class.id,v_class.join_code,v_class.title,v_class.subject,v_class.teacher_id,
         v_class.duration_minutes,v_class.starts_at,v_class.status,v_class.created_at;
end; $$;

revoke all on function public.join_online_class(text) from public;
grant execute on function public.join_online_class(text) to authenticated;

create or replace function public.online_class_channel_access(p_topic text)
returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.online_classes c
    where p_topic in (
      'malawihub-class-'||c.join_code,
      'malawihub-whiteboard-'||c.join_code,
      'malawihub-resources-'||c.join_code
    )
    and (
      exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
      or public.is_online_class_admin()
      or c.teacher_id=auth.uid()
      or exists(select 1 from public.online_class_enrollments e
                where e.class_id=c.id and e.student_id=auth.uid())
    )
  );
$$;

revoke all on function public.online_class_channel_access(text) from public;
grant execute on function public.online_class_channel_access(text) to authenticated;

drop policy if exists "online class realtime receive" on realtime.messages;
create policy "online class realtime receive"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension in ('broadcast','presence')
  and public.online_class_channel_access(realtime.topic())
);

drop policy if exists "online class realtime send" on realtime.messages;
create policy "online class realtime send"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension in ('broadcast','presence')
  and public.online_class_channel_access(realtime.topic())
);
