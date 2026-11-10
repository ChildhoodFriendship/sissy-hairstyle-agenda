-- Add salon employees, appointment assignments and unique Auth usernames.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, id)
);

alter table public.employees enable row level security;
drop policy if exists "Employees are private to owner" on public.employees;
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

revoke all on public.employees from anon, authenticated;
grant select, insert, update on public.employees to authenticated;
create index if not exists employees_owner_name_idx
  on public.employees (owner_id, last_name, first_name);

alter table public.appointments
  add column if not exists employee_id uuid,
  add column if not exists employee_name text not null default 'Admin';

alter table public.appointments
  drop constraint if exists appointments_employee_owner_fk;
alter table public.appointments
  add constraint appointments_employee_owner_fk
  foreign key (owner_id, employee_id) references public.employees(owner_id, id)
  on delete set null (employee_id);

update public.appointments
set employee_name = 'Admin'
where employee_id is null and employee_name = '';

-- Keep one appointment per person and cap each confirmed time slot at three.
-- Legacy deleted-employee snapshots use the appointment ID as their distinct key;
-- the Admin sentinel remains unique across the slot.
drop index if exists public.appointments_owner_confirmed_slot_idx;
create unique index if not exists appointments_owner_confirmed_assignee_idx
  on public.appointments (owner_id, appointment_date, appointment_time,
    (coalesce(employee_id, case when employee_name = 'Admin' then '00000000-0000-0000-0000-000000000000'::uuid else id end)))
  where status = 'confirmed';

create or replace function public.enforce_appointment_capacity()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  slot_count integer;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    new.owner_id::text || ':' || new.appointment_date::text || ':' || new.appointment_time::text, 0
  ));

  select count(*) into slot_count
  from public.appointments a
  where a.owner_id = new.owner_id
    and a.appointment_date = new.appointment_date
    and a.appointment_time = new.appointment_time
    and a.status = 'confirmed'
    and a.id <> new.id;

  if slot_count >= 3 then
    raise exception 'appointment_slot_capacity_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_capacity_before_write on public.appointments;
create trigger appointments_capacity_before_write
before insert or update of owner_id, appointment_date, appointment_time, status, employee_id
on public.appointments
for each row execute function public.enforce_appointment_capacity();

-- Auth usernames are normalized and unique; email remains managed by Supabase Auth.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_.-]{3,30}$'),
  email text not null,
  created_at timestamptz not null default now()
);

-- Existing accounts use their Auth username when valid, otherwise the email local-part.
-- Retry with an id-based suffix until the unique username constraint accepts the row.
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
end;
$$;

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile" on public.user_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to authenticated;

create or replace function public.sync_auth_username_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text;
begin
  normalized_username := lower(trim(new.raw_user_meta_data ->> 'username'));
  if normalized_username is null or normalized_username !~ '^[a-z0-9_.-]{3,30}$' then
    raise exception 'username_must_be_3_to_30_lowercase_letters_numbers_dots_underscores_or_hyphens';
  end if;
  insert into public.user_profiles (user_id, username, email)
  values (new.id, normalized_username, new.email);
  return new;
end;
$$;

 drop trigger if exists on_auth_user_created_username on auth.users;
create trigger on_auth_user_created_username
after insert on auth.users
for each row execute function public.sync_auth_username_profile();
