-- MalawiHub Online Classroom
create table if not exists public.online_classes (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  title text not null default 'MalawiHub Live Class',
  subject text,
  teacher_id uuid references auth.users(id) on delete set null,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 240),
  starts_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.class_notes (
  class_id uuid primary key references public.online_classes(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.online_classes enable row level security;
alter table public.class_notes enable row level security;

-- MVP classroom access: students can find a class by its join code.
-- Teacher ownership is recorded when an authenticated teacher creates/starts a class.
drop policy if exists "online classes readable" on public.online_classes;
create policy "online classes readable" on public.online_classes for select using (true);

drop policy if exists "authenticated users create classes" on public.online_classes;
create policy "authenticated users create classes" on public.online_classes for insert to authenticated with check (teacher_id = auth.uid());

drop policy if exists "teachers update own classes" on public.online_classes;
create policy "teachers update own classes" on public.online_classes for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "class notes readable" on public.class_notes;
create policy "class notes readable" on public.class_notes for select using (true);

drop policy if exists "teachers manage notes" on public.class_notes;
create policy "teachers manage notes" on public.class_notes for all to authenticated using (
  exists (select 1 from public.online_classes c where c.id = class_notes.class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.online_classes c where c.id = class_notes.class_id and c.teacher_id = auth.uid())
);

-- Realtime is used by the classroom for live notes, presence, chat and WebRTC signaling.
alter table public.online_classes replica identity full;
alter table public.class_notes replica identity full;

insert into supabase_realtime.publication_tables (publication, table_name)
values ('supabase_realtime', 'online_classes'), ('supabase_realtime', 'class_notes')
on conflict do nothing;
