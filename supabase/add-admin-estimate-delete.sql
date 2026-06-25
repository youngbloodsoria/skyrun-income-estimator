-- Corrective admin migration for an existing SkyRun estimator installation.
-- Safe to run more than once.

-- 1. Allow only estimator admins to delete saved estimates.
drop policy if exists "Admins delete estimates" on public.estimator_estimates;

create policy "Admins delete estimates"
  on public.estimator_estimates for delete
  to authenticated
  using (public.estimator_is_admin());

grant delete on public.estimator_estimates to authenticated;

-- 2. Ensure the four initial access records exist with the intended roles.
insert into public.estimator_employee_access (email, role, active)
values
  ('matt.malpede@skyrun.com', 'employee', true),
  ('paula.soria@skyrun.com', 'admin', true),
  ('alex.soria@skyrun.com', 'admin', true),
  ('jonelle.rush@skyrun.com', 'employee', true)
on conflict (email) do update set
  role = excluded.role,
  active = true,
  updated_at = now();

-- 3. Explicitly synchronize profiles in case the earlier update trigger was absent.
update public.estimator_profiles
set role = case
  when email in ('paula.soria@skyrun.com', 'alex.soria@skyrun.com') then 'admin'
  when email in ('matt.malpede@skyrun.com', 'jonelle.rush@skyrun.com') then 'employee'
  else role
end,
updated_at = now()
where email in (
  'matt.malpede@skyrun.com',
  'paula.soria@skyrun.com',
  'alex.soria@skyrun.com',
  'jonelle.rush@skyrun.com'
);

-- 4. Removing an employee-access row immediately demotes the matching profile.
create or replace function public.estimator_sync_employee_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.estimator_profiles
    set role = 'owner', updated_at = now()
    where email = old.email;
    return old;
  end if;

  update public.estimator_profiles
  set
    role = case when new.active then new.role else 'owner' end,
    updated_at = now()
  where email = new.email;
  return new;
end;
$$;

drop trigger if exists estimator_on_employee_access_changed on public.estimator_employee_access;

create trigger estimator_on_employee_access_changed
  after insert or update or delete on public.estimator_employee_access
  for each row execute procedure public.estimator_sync_employee_profile();

grant delete on public.estimator_employee_access to authenticated;
