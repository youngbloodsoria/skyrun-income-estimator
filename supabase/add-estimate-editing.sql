alter table public.estimator_estimates
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists "Owners read their estimates and staff read all" on public.estimator_estimates;
create policy "Owners read their estimates and staff read all"
  on public.estimator_estimates for select
  to authenticated
  using (
    created_by = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.estimator_is_staff()
  );

drop policy if exists "Owners and staff update accessible estimates" on public.estimator_estimates;
create policy "Owners and staff update accessible estimates"
  on public.estimator_estimates for update
  to authenticated
  using (
    created_by = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.estimator_is_staff()
  )
  with check (
    created_by = auth.uid()
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.estimator_is_staff()
  );

grant update on public.estimator_estimates to authenticated;
