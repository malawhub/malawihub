-- MalawiHub private business workspaces
-- Customer data is tenant-isolated with RLS. Platform administrators are not granted
-- application-level access to business balances, messages, or transactions.

create extension if not exists pgcrypto;

create table if not exists public.business_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  currency text not null default 'MWK',
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('employer','employee')),
  display_name text not null,
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table if not exists public.business_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  employee_id uuid references public.business_members(id) on delete set null,
  provider text not null check (provider in ('airtel_money','mpamba','cash','other')),
  transaction_type text not null check (transaction_type in ('cash_in','cash_out','transfer','payment','adjustment','other')),
  amount_encrypted text not null,
  payload_encrypted text not null,
  external_reference text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(workspace_id, provider, external_reference)
);

create table if not exists public.business_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  transaction_id uuid references public.business_transactions(id) on delete cascade,
  recipient_id uuid references public.business_members(id) on delete cascade,
  encrypted_message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.business_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.business_workspaces(id) on delete cascade,
  provider text not null check (provider in ('airtel_money','mpamba')),
  public_key text not null,
  status text not null default 'pending' check (status in ('pending','connected','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_members_workspace_idx on public.business_members(workspace_id);
create index if not exists business_transactions_workspace_idx on public.business_transactions(workspace_id, occurred_at desc);
create index if not exists business_notifications_recipient_idx on public.business_notifications(recipient_id, created_at desc);

alter table public.business_workspaces enable row level security;
alter table public.business_members enable row level security;
alter table public.business_transactions enable row level security;
alter table public.business_notifications enable row level security;
alter table public.business_integrations enable row level security;

create or replace function public.is_business_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

create or replace function public.is_business_employer(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where workspace_id = target_workspace and user_id = auth.uid() and role = 'employer'
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.is_business_employer(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.is_business_employer(uuid) to authenticated;

create policy business_workspace_owner on public.business_workspaces
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy business_workspace_member_read on public.business_workspaces
  for select to authenticated using (public.is_business_member(id));

create policy business_members_private on public.business_members
  for select to authenticated using (public.is_business_member(workspace_id));

create policy business_member_insert_employer on public.business_members
  for insert to authenticated
  with check (public.is_business_employer(workspace_id));

create policy business_transaction_private on public.business_transactions
  for select to authenticated using (public.is_business_member(workspace_id));

create policy business_transaction_employee_insert on public.business_transactions
  for insert to authenticated
  with check (
    public.is_business_member(workspace_id)
    and exists (
      select 1 from public.business_members m
      where m.id = employee_id and m.user_id = auth.uid() and m.role = 'employee'
    )
  );

create policy business_notification_private on public.business_notifications
  for select to authenticated using (
    exists (
      select 1 from public.business_members m
      where m.id = recipient_id and m.user_id = auth.uid()
    )
  );

create policy business_notification_mark_read on public.business_notifications
  for update to authenticated using (
    exists (
      select 1 from public.business_members m
      where m.id = recipient_id and m.user_id = auth.uid()
    )
  ) with check (is_read = true);

create policy business_integration_owner on public.business_integrations
  for select to authenticated using (public.is_business_employer(workspace_id));

create policy business_integration_create on public.business_integrations
  for insert to authenticated with check (public.is_business_employer(workspace_id));

create policy business_integration_update on public.business_integrations
  for update to authenticated using (public.is_business_employer(workspace_id))
  with check (public.is_business_employer(workspace_id));

-- Never expose encrypted business data to the platform's normal admin role through RLS.
-- Service-side integrations should write only through the dedicated webhook function.

alter publication supabase_realtime add table public.business_notifications;
