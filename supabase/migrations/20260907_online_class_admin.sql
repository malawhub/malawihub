-- MalawiHub Online Class administration
-- Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists role text not null default 'student';

create table if not exists public.online_class_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.online_class_admins enable row level security;

create or replace function public.is_online_class_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.online_class_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_online_class_admin() from public;
grant execute on function public.is_online_class_admin() to authenticated;

-- Administrators may manage the administrator list.
drop policy if exists "online class admins read" on public.online_class_admins;
create policy "online class admins read"
on public.online_class_admins
for select to authenticated
using (user_id = auth.uid() or public.is_online_class_admin());

drop policy if exists "online class admins insert" on public.online_class_admins;
create policy "online class admins insert"
on public.online_class_admins
for insert to authenticated
with check (public.is_online_class_admin());

drop policy if exists "online class admins delete" on public.online_class_admins;
create policy "online class admins delete"
on public.online_class_admins
for delete to authenticated
using (public.is_online_class_admin());

-- Allow administrators and users explicitly marked teacher to create/update classes.
drop policy if exists "authenticated users create classes" on public.online_classes;
create policy "teachers and admins create classes"
on public.online_classes
for insert to authenticated
with check (
  teacher_id = auth.uid()
  and (
    public.is_online_class_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('teacher','admin')
    )
  )
);

drop policy if exists "teachers update own classes" on public.online_classes;
create policy "teachers and admins update own classes"
on public.online_classes
for update to authenticated
using (
  teacher_id = auth.uid()
  and (
    public.is_online_class_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('teacher','admin')
    )
  )
)
with check (teacher_id = auth.uid());

-- Make class notes manageable by the class owner or an administrator.
drop policy if exists "teachers manage notes" on public.class_notes;
create policy "teachers and admins manage notes"
on public.class_notes
for all to authenticated
using (
  public.is_online_class_admin()
  or exists (
    select 1 from public.online_classes c
    where c.id = class_notes.class_id
      and c.teacher_id = auth.uid()
  )
)
with check (
  public.is_online_class_admin()
  or exists (
    select 1 from public.online_classes c
    where c.id = class_notes.class_id
      and c.teacher_id = auth.uid()
  )
);
