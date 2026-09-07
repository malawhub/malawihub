-- MalawiHub teacher role management
-- Run once in Supabase SQL Editor.

-- Admin-only RPC: promote or demote a user without exposing a client-side role update policy.
create or replace function public.set_teacher_role(target_user_id uuid, make_teacher boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_online_class_admin() then
    raise exception 'Administrator access required';
  end if;

  if target_user_id = auth.uid() and not make_teacher then
    raise exception 'You cannot remove your own administrator account through teacher management';
  end if;

  update public.profiles
  set role = case when make_teacher then 'teacher' else 'student' end
  where id = target_user_id;

  return found;
end;
$$;

revoke all on function public.set_teacher_role(uuid, boolean) from public;
grant execute on function public.set_teacher_role(uuid, boolean) to authenticated;

-- Admin-only user list for the teacher-management screen.
create or replace function public.list_teacher_candidates()
returns table (id uuid, email text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, u.email::text, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_online_class_admin()
  order by lower(coalesce(u.email,''));
$$;

revoke all on function public.list_teacher_candidates() from public;
grant execute on function public.list_teacher_candidates() to authenticated;
