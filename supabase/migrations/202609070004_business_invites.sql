-- Private employee invitation links for business workspaces.
create table if not exists public.business_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.business_invites enable row level security;

create or replace function public.create_business_invite(target_workspace uuid, raw_token text, hours_valid integer default 72)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_business_employer(target_workspace) then raise exception 'Employer access required'; end if;
  insert into public.business_invites(workspace_id, token_hash, expires_at)
  values(target_workspace, encode(digest(raw_token, 'sha256'), 'hex'), now() + make_interval(hours => greatest(1, least(hours_valid, 720))));
  return true;
end;
$$;

create or replace function public.accept_business_invite(raw_token text, employee_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  invite_row public.business_invites%rowtype;
  member_id uuid;
begin
  select * into invite_row from public.business_invites
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    and used_at is null and expires_at > now()
  limit 1;

  if invite_row.id is null then raise exception 'Invalid or expired invitation'; end if;
  if auth.uid() is null then raise exception 'Sign in required'; end if;

  insert into public.business_members(workspace_id, user_id, role, display_name)
  values(invite_row.workspace_id, auth.uid(), 'employee', left(trim(employee_name), 120))
  on conflict (workspace_id, user_id) do update set display_name = excluded.display_name
  returning id into member_id;

  update public.business_invites set used_at = now() where id = invite_row.id;
  return member_id;
end;
$$;

revoke all on function public.create_business_invite(uuid, text, integer) from public;
revoke all on function public.accept_business_invite(text, text) from public;
grant execute on function public.create_business_invite(uuid, text, integer) to authenticated;
grant execute on function public.accept_business_invite(text, text) to authenticated;

create policy business_invite_employer_manage on public.business_invites
  for all to authenticated
  using (public.is_business_employer(workspace_id))
  with check (public.is_business_employer(workspace_id));
