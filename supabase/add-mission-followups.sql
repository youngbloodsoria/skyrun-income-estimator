begin;

-- Source is recorded at creation, so later employee/owner role changes do not
-- silently move submissions into or out of Mission's owner inquiry queue.
alter table public.estimator_estimates add column if not exists created_by_staff boolean;
update public.estimator_estimates e
set created_by_staff = p.role in ('employee', 'admin')
from public.estimator_profiles p
where p.id = e.created_by and e.created_by_staff is null;

create or replace function public.estimator_set_submission_source()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    select role in ('employee', 'admin') into NEW.created_by_staff
    from public.estimator_profiles where id = NEW.created_by;
  else
    NEW.created_by_staff := OLD.created_by_staff;
  end if;
  return NEW;
end;
$$;
drop trigger if exists estimator_submission_source on public.estimator_estimates;
create trigger estimator_submission_source before insert or update on public.estimator_estimates
for each row execute function public.estimator_set_submission_source();

-- Separate staff-only state prevents owners from dismissing their own leads
-- through the estimate editing policy.
create table if not exists public.estimator_followups (
  estimate_id uuid primary key references public.estimator_estimates(id) on delete cascade,
  handled_at timestamptz not null default now(),
  handled_by uuid not null default auth.uid() references auth.users(id)
);
alter table public.estimator_followups enable row level security;
drop policy if exists "Staff read followups" on public.estimator_followups;
create policy "Staff read followups" on public.estimator_followups for select to authenticated
using (public.estimator_is_staff());
drop policy if exists "Staff handle inquiries" on public.estimator_followups;
create policy "Staff handle inquiries" on public.estimator_followups for insert to authenticated
with check (public.estimator_is_staff() and handled_by = auth.uid());
drop policy if exists "Staff reopen inquiries" on public.estimator_followups;
create policy "Staff reopen inquiries" on public.estimator_followups for delete to authenticated
using (public.estimator_is_staff());
grant select, insert, delete on public.estimator_followups to authenticated;
grant all on public.estimator_followups to service_role;
commit;
