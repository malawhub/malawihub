alter policy business_members_non_admin_read on public.business_members
using (
 not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
 and (user_id=(select auth.uid()) or public.is_business_employer(workspace_id))
);
alter policy business_workspace_member_read_non_admin on public.business_workspaces
using (
 not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
 and exists(select 1 from public.business_members m where m.workspace_id=business_workspaces.id and m.user_id=(select auth.uid()))
);
create or replace function public.business_my_subscription()
returns table(workspace_id uuid,business_name text,status text,trial_started_at timestamptz,expires_at timestamptz,payment_method text)
language sql stable security definer set search_path=''
as $$
 select w.id,w.name,
 case when s.status='trial' and s.expires_at is not null and s.expires_at<=now() then 'expired' else s.status end,
 s.trial_started_at,s.expires_at,s.payment_method
 from public.business_members m
 join public.business_workspaces w on w.id=m.workspace_id
 join public.business_subscriptions s on s.workspace_id=w.id
 where m.user_id=(select auth.uid())
 and not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
 order by m.created_at desc limit 1;
$$;
revoke all on function public.business_my_subscription() from public,anon;
grant execute on function public.business_my_subscription() to authenticated;