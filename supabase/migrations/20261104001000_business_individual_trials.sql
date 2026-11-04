create or replace function public.business_create_trial_workspace(workspace_name text)
returns table(workspace_id uuid,business_name text,expires_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare uid uuid := (select auth.uid()); wid uuid; mid uuid;
clean_name text := trim(coalesce(workspace_name,'')); new_slug text;
new_expiry timestamptz := now()+interval '7 days';
begin
if uid is null then raise exception 'Sign in or verify your email before starting a trial'; end if;
if length(clean_name)<2 or length(clean_name)>120 then raise exception 'Business name must be between 2 and 120 characters'; end if;
if exists(select 1 from public.profiles p where p.id=uid and p.role='admin') then raise exception 'Administrator accounts cannot start a customer trial'; end if;
if exists(select 1 from public.business_members m where m.user_id=uid) then raise exception 'This account already has Business access or has used its trial'; end if;
new_slug:=trim(both '-' from lower(regexp_replace(clean_name,'[^a-zA-Z0-9]+','-','g'))) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
insert into public.business_workspaces(owner_id,name,slug) values(uid,clean_name,new_slug) returning id into wid;
insert into public.business_subscriptions(workspace_id,status,trial_started_at,expires_at,notes) values(wid,'trial',now(),new_expiry,'Self-registered individual seven-day free trial');
insert into public.business_members(workspace_id,user_id,role,display_name,login_username)
values(wid,uid,'employee',coalesce(nullif(trim((select u.raw_user_meta_data->>'full_name' from auth.users u where u.id=uid)),''),'Business owner'),'trial_' || substr(replace(gen_random_uuid()::text,'-',''),1,12))
returning id into mid;
insert into public.business_wallet_balances(workspace_id,member_id,provider,balance,currency,status)
values(wid,mid,'airtel_money',0,'MWK','pending'),(wid,mid,'mpamba',0,'MWK','pending');
insert into public.business_audit_log(workspace_id,actor_user_id,action,object_type,object_id,metadata)
values(wid,uid,'trial_started','business_subscription',wid,jsonb_build_object('status','trial','trial_days',7,'expires_at',new_expiry,'registration','self_service'));
return query select wid,clean_name,new_expiry;
end $$;
revoke all on function public.business_create_trial_workspace(text) from public,anon;
grant execute on function public.business_create_trial_workspace(text) to authenticated;