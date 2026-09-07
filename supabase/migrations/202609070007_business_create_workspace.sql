create or replace function public.create_business_workspace(workspace_name text, workspace_slug text, employer_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  wid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.business_workspaces(owner_id, name, slug)
  values(auth.uid(), left(trim(workspace_name), 120), lower(regexp_replace(trim(workspace_slug), '[^a-zA-Z0-9-]+', '-', 'g')))
  returning id into wid;
  insert into public.business_members(workspace_id, user_id, role, display_name)
  values(wid, auth.uid(), 'employer', left(trim(employer_name), 120));
  return wid;
end;
$$;

revoke all on function public.create_business_workspace(text, text, text) from public;
grant execute on function public.create_business_workspace(text, text, text) to authenticated;
