-- Secure teacher-issued student invitations.
-- Email verification is required before the invited identity receives a student role
-- or an active class membership. Invitation tokens are stored only as SHA-256 hashes.

create table if not exists public.online_class_student_invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.online_classes(id) on delete cascade,
  email text not null,
  full_name text not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint online_class_student_invitations_email_normalized
    check (email = lower(trim(email))),
  constraint online_class_student_invitations_token_hash_format
    check (token_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists online_class_student_invitations_class_email_idx
  on public.online_class_student_invitations(class_id, email, created_at desc);
create index if not exists online_class_student_invitations_pending_expiry_idx
  on public.online_class_student_invitations(expires_at)
  where status = 'pending';

alter table public.online_class_student_invitations enable row level security;
revoke all on public.online_class_student_invitations from public, anon, authenticated;
grant all on public.online_class_student_invitations to service_role;

comment on table public.online_class_student_invitations is
  'Private invitation ledger. Access is through the authenticated online-class-teacher-admin Edge Function only.';
