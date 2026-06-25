-- Run once in the Supabase SQL Editor for the existing estimator database.
-- This allows only estimator admins to permanently delete saved estimates.

drop policy if exists "Admins delete estimates" on public.estimator_estimates;

create policy "Admins delete estimates"
  on public.estimator_estimates for delete
  to authenticated
  using (public.estimator_is_admin());

grant delete on public.estimator_estimates to authenticated;

-- Keep estimate deletion and access management limited to Paula and Alex.
update public.estimator_employee_access
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
