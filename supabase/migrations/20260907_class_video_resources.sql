-- MalawiHub: video resources attached to live classes
create table if not exists public.class_video_resources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.online_classes(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_url text not null,
  resource_type text not null default 'video' check (resource_type in ('video','youtube','vimeo','link')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.class_video_resources enable row level security;

create policy "class video resources are readable"
on public.class_video_resources for select
using (true);

create policy "teachers and admins manage class video resources"
on public.class_video_resources for all to authenticated
using (
  exists (
    select 1 from public.online_classes c
    where c.id = class_video_resources.class_id
      and (
        c.teacher_id = auth.uid()
        or public.is_online_class_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.online_classes c
    where c.id = class_video_resources.class_id
      and (
        c.teacher_id = auth.uid()
        or public.is_online_class_admin()
      )
  )
);

alter table public.class_video_resources replica identity full;

-- Realtime lets students see newly added resources without refreshing.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'class_video_resources'
  ) then
    alter publication supabase_realtime add table public.class_video_resources;
  end if;
end $$;
