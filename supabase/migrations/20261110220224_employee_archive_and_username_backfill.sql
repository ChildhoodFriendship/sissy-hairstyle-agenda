-- Repair profile gaps left by non-unique username candidates and preserve employee history on removal.

alter table public.employees
  add column if not exists is_active boolean not null default true;

-- Keep employee removal archival-only and make legacy deleted assignments distinct from Admin.
drop policy if exists "Employees are private to owner" on public.employees;
drop policy if exists "Employees can be read by owner" on public.employees;
drop policy if exists "Employees can be added by owner" on public.employees;
drop policy if exists "Employees can be updated by owner" on public.employees;
create policy "Employees can be read by owner" on public.employees
  for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Employees can be added by owner" on public.employees
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Employees can be updated by owner" on public.employees
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
revoke delete on public.employees from authenticated;
grant select, insert, update on public.employees to authenticated;

drop index if exists public.appointments_owner_confirmed_assignee_idx;
create unique index appointments_owner_confirmed_assignee_idx
  on public.appointments (owner_id, appointment_date, appointment_time,
    (coalesce(employee_id, case when employee_name = 'Admin' then '00000000-0000-0000-0000-000000000000'::uuid else id end)))
  where status = 'confirmed';

alter function public.enforce_appointment_capacity() volatile;

-- Backfill any email-based Auth accounts without a profile. A collision is retried
-- with a deterministic id suffix instead of silently dropping the profile row.
do $$
declare
  auth_user record;
  base_username text;
  candidate_username text;
  suffix text;
  suffix_number integer;
begin
  for auth_user in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    where u.email is not null
    order by u.id
  loop
    if exists (select 1 from public.user_profiles p where p.user_id = auth_user.id) then
      continue;
    end if;

    base_username := case
      when lower(trim(coalesce(auth_user.raw_user_meta_data ->> 'username', ''))) ~ '^[a-z0-9_.-]{3,30}$'
        then lower(trim(auth_user.raw_user_meta_data ->> 'username'))
      when lower(split_part(coalesce(auth_user.email, ''), '@', 1)) ~ '^[a-z0-9_.-]{3,30}$'
        then lower(split_part(auth_user.email, '@', 1))
      else 'user_' || left(replace(auth_user.id::text, '-', ''), 16)
    end;
    suffix_number := 0;

    loop
      if suffix_number = 0 then
        candidate_username := base_username;
      else
        suffix := '_' || left(replace(auth_user.id::text, '-', ''), 7) ||
          case when suffix_number > 1 then '_' || suffix_number::text else '' end;
        candidate_username := left(base_username, 30 - char_length(suffix)) || suffix;
      end if;

      begin
        insert into public.user_profiles (user_id, username, email)
        values (auth_user.id, candidate_username, auth_user.email);
        exit;
      exception when unique_violation then
        if exists (select 1 from public.user_profiles p where p.user_id = auth_user.id) then
          exit;
        end if;
        suffix_number := suffix_number + 1;
      end;
    end loop;
  end loop;

  if exists (
    select 1
    from auth.users u
    where u.email is not null
      and not exists (select 1 from public.user_profiles p where p.user_id = u.id)
  ) then
    raise exception 'username_profile_backfill_incomplete';
  end if;
end;
$$;
