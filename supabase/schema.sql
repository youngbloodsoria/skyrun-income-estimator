-- SkyRun Brian Head Income Estimator
-- Run this file in the Supabase SQL editor for the project used by the estimator.

create extension if not exists pgcrypto;

create table if not exists public.estimator_employee_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  role text not null default 'employee' check (role in ('employee', 'admin')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimator_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role text not null default 'owner' check (role in ('owner', 'employee', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimator_estimates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  owner_name text not null,
  owner_email text not null default '',
  phone text not null,
  property_address text not null,
  market text not null,
  bedrooms text not null,
  property_style text not null,
  base_rate numeric(10,2) not null,
  occupancy_pct numeric(5,2) not null,
  management_fee_pct numeric(5,2) not null,
  pets_allowed boolean not null default false,
  notes text not null default '',
  annual_gross numeric(12,2) not null,
  net_to_owner numeric(12,2) not null,
  average_nightly_rate numeric(10,2) not null,
  nights_booked integer not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  result_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimator_estimates_created_by_idx on public.estimator_estimates(created_by);
create index if not exists estimator_estimates_created_at_idx on public.estimator_estimates(created_at desc);
create index if not exists estimator_estimates_owner_email_idx on public.estimator_estimates(owner_email);

create or replace function public.estimator_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.estimator_profiles
    where id = auth.uid() and role in ('employee', 'admin')
  );
$$;

create or replace function public.estimator_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.estimator_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.estimator_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.estimator_profiles where id = auth.uid();
$$;

create or replace function public.estimator_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  access_role text;
begin
  select role into access_role
  from public.estimator_employee_access
  where email = lower(new.email) and active = true;

  insert into public.estimator_profiles (id, email, full_name, phone, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    coalesce(access_role, 'owner')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.estimator_profiles.full_name, excluded.full_name),
    phone = coalesce(public.estimator_profiles.phone, excluded.phone),
    role = coalesce(access_role, public.estimator_profiles.role),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists estimator_on_auth_user_created on auth.users;
create trigger estimator_on_auth_user_created
  after insert or update of email on auth.users
  for each row execute procedure public.estimator_handle_new_user();

create or replace function public.estimator_sync_employee_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  after insert or update on public.estimator_employee_access
  for each row execute procedure public.estimator_sync_employee_profile();

alter table public.estimator_profiles enable row level security;
alter table public.estimator_employee_access enable row level security;
alter table public.estimator_estimates enable row level security;

drop policy if exists "Profiles are visible to self and staff" on public.estimator_profiles;
create policy "Profiles are visible to self and staff"
  on public.estimator_profiles for select
  to authenticated
  using (id = auth.uid() or public.estimator_is_staff());

drop policy if exists "Users update safe profile fields" on public.estimator_profiles;
create policy "Users update safe profile fields"
  on public.estimator_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.estimator_current_user_role());

drop policy if exists "Admins manage employee access" on public.estimator_employee_access;
create policy "Admins manage employee access"
  on public.estimator_employee_access for all
  to authenticated
  using (public.estimator_is_admin())
  with check (public.estimator_is_admin());

drop policy if exists "Staff can read employee access" on public.estimator_employee_access;
create policy "Staff can read employee access"
  on public.estimator_employee_access for select
  to authenticated
  using (public.estimator_is_staff());

drop policy if exists "Users create their own estimates" on public.estimator_estimates;
create policy "Users create their own estimates"
  on public.estimator_estimates for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Owners read their estimates and staff read all" on public.estimator_estimates;
create policy "Owners read their estimates and staff read all"
  on public.estimator_estimates for select
  to authenticated
  using (
    created_by = auth.uid()
    or owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.estimator_is_staff()
  );

insert into public.estimator_employee_access (email, role, active)
values
  ('matt.malpede@skyrun.com', 'admin', true),
  ('paula.soria@skyrun.com', 'admin', true),
  ('alex.soria@skyrun.com', 'admin', true),
  ('jonelle.rush@skyrun.com', 'admin', true)
on conflict (email) do update set role = excluded.role, active = true, updated_at = now();

grant usage on schema public to authenticated;
grant select, update on public.estimator_profiles to authenticated;
grant select, insert on public.estimator_estimates to authenticated;
grant select, insert, update on public.estimator_employee_access to authenticated;
