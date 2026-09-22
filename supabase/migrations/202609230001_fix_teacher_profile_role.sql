-- Ensure server-side Edge Functions using service_role can assign teacher profiles.
-- Normal browser clients remain forced to student on INSERT and cannot change protected roles.
create or replace function public.protect_profile_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  caller_role text;
begin
  if coalesce(auth.role(),'') = 'service_role' then
    return new;
  end if;

  select p.role into caller_role
  from public.profiles p
  where p.id = auth.uid();

  if caller_role is distinct from 'admin' then
    if tg_op = 'INSERT' then
      new.role := 'student';
      new.can_register_students := false;
    else
      new.role := old.role;
      new.can_register_students := old.can_register_students;
    end if;
  end if;

  return new;
end;
$function$;