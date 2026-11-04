-- MALIXA Business Hub: subscription foundation and seven-day trial policy.
create table if not exists public.business_subscriptions (
  workspace_id uuid primary key references public.business_workspaces(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','active','suspended','expired')),
  trial_started_at timestamptz,
  expires_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('cash','airtel_money','tnm_mpamba')),
  payment_reference text,
  activated_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text
);
alter table public.business_subscriptions enable row level security;
revoke all on table public.business_subscriptions from anon,authenticated;
grant all on table public.business_subscriptions to service_role;

-- Existing workspaces retain their previous access; no existing customer is unexpectedly expired.
insert into public.business_subscriptions(workspace_id,status,trial_started_at,expires_at)
select id,'active',null,null from public.business_workspaces
on conflict(workspace_id) do nothing;

create or replace function public.business_subscription_is_current(target_workspace uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.business_subscriptions s
 where s.workspace_id=target_workspace and s.status in ('trial','active')
 and (s.expires_at is null or s.expires_at>now()));
$$;
revoke all on function public.business_subscription_is_current(uuid) from public,anon;
grant execute on function public.business_subscription_is_current(uuid) to authenticated,service_role;

create or replace function public.is_business_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select public.business_subscription_is_current(target_workspace) and exists(
 select 1 from public.business_members m where m.workspace_id=target_workspace
 and m.user_id=(select auth.uid())
 and not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
$$;
create or replace function public.is_business_employer(target_workspace uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select public.business_subscription_is_current(target_workspace) and exists(
 select 1 from public.business_members m where m.workspace_id=target_workspace
 and m.user_id=(select auth.uid()) and m.role='employer'
 and not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
$$;

do $$
declare p record; using_expr text; check_expr text; scope_column text;
begin
 for p in select schemaname,tablename,policyname,qual,with_check
 from pg_policies where schemaname='public' and tablename like 'business_%'
 and (qual is not null or with_check is not null)
 loop
   scope_column:=case when p.tablename='business_workspaces' then 'id' else 'workspace_id' end;
   using_expr:=case when p.qual is null then null else format('(%s) and public.business_subscription_is_current(%I)',p.qual,scope_column) end;
   check_expr:=case when p.with_check is null then null else format('(%s) and public.business_subscription_is_current(%I)',p.with_check,scope_column) end;
   if using_expr is not null and check_expr is not null then
     execute format('alter policy %I on %I.%I using (%s) with check (%s)',p.policyname,p.schemaname,p.tablename,using_expr,check_expr);
   elsif using_expr is not null then
     execute format('alter policy %I on %I.%I using (%s)',p.policyname,p.schemaname,p.tablename,using_expr);
   elsif check_expr is not null then
     execute format('alter policy %I on %I.%I with check (%s)',p.policyname,p.schemaname,p.tablename,check_expr);
   end if;
 end loop;
end $$;

create or replace function public.admin_create_business_workspace(workspace_name text,workspace_slug text)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare wid uuid; normalized_slug text;
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then raise exception 'Administrator access required'; end if;
 if length(trim(coalesce(workspace_name,'')))<2 or length(trim(workspace_name))>120 then raise exception 'Business name must be 2-120 characters'; end if;
 normalized_slug:=trim(both '-' from lower(regexp_replace(trim(workspace_slug),'[^a-zA-Z0-9]+','-','g')));
 if length(normalized_slug)<3 or length(normalized_slug)>60 then raise exception 'Business link name must be 3-60 valid characters'; end if;
 if exists(select 1 from public.business_workspaces where slug=normalized_slug) then raise exception 'That business link name is already in use'; end if;
 insert into public.business_workspaces(owner_id,name,slug) values((select auth.uid()),trim(workspace_name),normalized_slug) returning id into wid;
 insert into public.business_subscriptions(workspace_id,status,trial_started_at,expires_at) values(wid,'trial',now(),now()+interval '7 days');
 return wid;
end;
$function$;

create or replace function public.admin_business_subscriptions()
returns table(workspace_id uuid,business_name text,business_slug text,status text,trial_started_at timestamptz,expires_at timestamptz,payment_method text,payment_reference text,activated_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=''
as $function$
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then raise exception 'Administrator access required'; end if;
 return query select w.id,w.name,w.slug,
 case when s.status='trial' and s.expires_at is not null and s.expires_at<=now() then 'expired' else s.status end,
 s.trial_started_at,s.expires_at,s.payment_method,s.payment_reference,s.activated_at,s.updated_at
 from public.business_workspaces w join public.business_subscriptions s on s.workspace_id=w.id order by w.created_at desc;
end;
$function$;

create or replace function public.admin_set_business_subscription(target_workspace uuid,target_status text,target_payment_method text default null,target_payment_reference text default null,trial_days integer default 7,admin_notes text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare result public.business_subscriptions%rowtype;
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then raise exception 'Administrator access required'; end if;
 if target_status not in ('trial','active','suspended') then raise exception 'Status must be trial, active or suspended'; end if;
 if not exists(select 1 from public.business_workspaces w where w.id=target_workspace) then raise exception 'Business workspace not found'; end if;
 if target_status='active' and (target_payment_method is null or target_payment_method not in ('cash','airtel_money','tnm_mpamba')) then raise exception 'Select cash, Airtel Money or TNM Mpamba after confirming payment'; end if;
 if target_status='trial' and (trial_days<1 or trial_days>30) then raise exception 'Trial duration must be between 1 and 30 days'; end if;
 insert into public.business_subscriptions(workspace_id,status,trial_started_at,expires_at,payment_method,payment_reference,activated_at,activated_by,updated_at,notes)
 values(target_workspace,target_status,case when target_status='trial' then now() else null end,
 case when target_status='trial' then now()+make_interval(days=>trial_days) else null end,
 case when target_status='active' then target_payment_method else null end,
 case when target_status='active' then nullif(trim(coalesce(target_payment_reference,'')),'') else null end,
 case when target_status='active' then now() else null end,
 case when target_status='active' then (select auth.uid()) else null end,now(),nullif(trim(coalesce(admin_notes,'')),''))
 on conflict(workspace_id) do update set status=excluded.status,trial_started_at=excluded.trial_started_at,expires_at=excluded.expires_at,
 payment_method=excluded.payment_method,payment_reference=excluded.payment_reference,activated_at=excluded.activated_at,
 activated_by=excluded.activated_by,updated_at=now(),notes=coalesce(excluded.notes,public.business_subscriptions.notes)
 returning * into result;
 insert into public.business_audit_log(workspace_id,actor_user_id,action,object_type,object_id,metadata)
 values(target_workspace,(select auth.uid()),case when target_status='active' then 'subscription_activated' when target_status='trial' then 'trial_started' else 'subscription_suspended' end,
 'business_subscription',target_workspace,jsonb_build_object('status',target_status,'payment_method',target_payment_method,'payment_reference',target_payment_reference,'expires_at',result.expires_at));
 return jsonb_build_object('workspace_id',result.workspace_id,'status',result.status,'expires_at',result.expires_at,'payment_method',result.payment_method);
end;
$function$;

revoke all on function public.admin_business_subscriptions() from public,anon;
revoke all on function public.admin_set_business_subscription(uuid,text,text,text,integer,text) from public,anon;
grant execute on function public.admin_business_subscriptions() to authenticated;
grant execute on function public.admin_set_business_subscription(uuid,text,text,text,integer,text) to authenticated;
