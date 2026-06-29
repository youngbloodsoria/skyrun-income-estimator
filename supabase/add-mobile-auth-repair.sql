-- Mobile/auth hardening for the SkyRun estimator.
-- Run in Supabase SQL Editor for the estimator project.
--
-- This lets an authenticated @skyrun.com user safely sync their estimator profile
-- from estimator_employee_access after OTP verification. It is intentionally scoped
-- only to the estimator_* tables/functions and does not touch Guest Pass tables.

create or replace function public.estimator_claim_employee_access()
returns table(role text, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_role text;
  user_email text;
begin
  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null or user_email = '' then
    return query select 'owner'::text, false;
    return;
  end if;

  select employee.role into access_role
  from public.estimator_employee_access employee
  where employee.email = user_email
    and employee.active = true
  limit 1;

  if access_role is null then
    return query
      select coalesce(profile.role, 'owner')::text, false
      from public.estimator_profiles profile
      where profile.id = auth.uid();
    return;
  end if;

  insert into public.estimator_profiles (id, email, role)
  values (auth.uid(), user_email, access_role)
  on conflict (id) do update set
    email = excluded.email,
    role = access_role,
    updated_at = now();

  return query select access_role, true;
end;
$$;

grant execute on function public.estimator_claim_employee_access() to authenticated;

-- Backfill current estimator profiles from the access table, in case an employee
-- first signed in before they were added to Team Access.
update public.estimator_profiles profile
set role = employee.role,
    updated_at = now()
from public.estimator_employee_access employee
where profile.email = employee.email
  and employee.active = true
  and profile.role is distinct from employee.role;
