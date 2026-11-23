-- Run after add-mission-followups.sql. All changes are rolled back.
begin;
do $$
declare
  staff_id uuid;
  owner_id uuid;
  estimate_id uuid;
begin
  select id into staff_id from public.estimator_profiles where role in ('employee', 'admin') limit 1;
  select id into owner_id from public.estimator_profiles where role = 'owner' limit 1;
  select id into estimate_id from public.estimator_estimates limit 1;
  if staff_id is null or owner_id is null or estimate_id is null then
    raise exception 'Need existing staff, owner, and estimate fixtures';
  end if;
  perform set_config('test.staff_id', staff_id::text, true);
  perform set_config('test.owner_id', owner_id::text, true);
  perform set_config('test.estimate_id', estimate_id::text, true);
end $$;
-- Clear any fixture status only within this rolled-back transaction.
delete from public.estimator_followups where estimate_id = current_setting('test.estimate_id')::uuid;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_id'), 'role', 'authenticated')::text, true) is not null as staff_claims_set;
set local role authenticated;
insert into public.estimator_followups(estimate_id) values (current_setting('test.estimate_id')::uuid);
do $$ begin
  if not exists(select 1 from public.estimator_followups where estimate_id = current_setting('test.estimate_id')::uuid) then raise exception 'Staff handle failed'; end if;
end $$;
delete from public.estimator_followups where estimate_id = current_setting('test.estimate_id')::uuid;
do $$ begin
  if exists(select 1 from public.estimator_followups where estimate_id = current_setting('test.estimate_id')::uuid) then raise exception 'Staff reopen failed'; end if;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.owner_id'), 'role', 'authenticated')::text, true) is not null as owner_claims_set;
do $$ begin
  begin
    insert into public.estimator_followups(estimate_id) values (current_setting('test.estimate_id')::uuid);
    raise exception 'Owner unexpectedly handled an inquiry';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
