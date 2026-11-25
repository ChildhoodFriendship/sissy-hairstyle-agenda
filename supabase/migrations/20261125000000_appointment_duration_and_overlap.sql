-- Add appointment durations and exact one-write snapshots for explicit overlap confirmation.
-- Apply after all existing agenda, employee, and daily work-schedule migrations.
-- The old schema stored no end time: existing rows receive 30 minutes and longer bookings must be reviewed/edited.
begin;
set local lock_timeout = '5s';

do $$
declare
  old_assignee_index oid := to_regclass('public.appointments_owner_confirmed_assignee_idx');
begin
  if to_regclass('public.appointments') is null
    or to_regclass('public.employees') is null
    or to_regclass('public.daily_work_schedules') is null then
    raise exception 'Expected appointments, employees, and daily_work_schedules; apply preceding migrations first';
  end if;

  if exists (
    select 1
    from (values
      ('public.appointments'::regclass, 'owner_id', 'uuid'::regtype),
      ('public.appointments'::regclass, 'appointment_date', 'date'::regtype),
      ('public.appointments'::regclass, 'appointment_time', 'time'::regtype),
      ('public.appointments'::regclass, 'status', 'text'::regtype),
      ('public.appointments'::regclass, 'employee_id', 'uuid'::regtype),
      ('public.appointments'::regclass, 'employee_name', 'text'::regtype),
      ('public.employees'::regclass, 'owner_id', 'uuid'::regtype),
      ('public.employees'::regclass, 'is_active', 'boolean'::regtype),
      ('public.daily_work_schedules'::regclass, 'owner_id', 'uuid'::regtype),
      ('public.daily_work_schedules'::regclass, 'work_date', 'date'::regtype),
      ('public.daily_work_schedules'::regclass, 'employee_id', 'uuid'::regtype),
      ('public.daily_work_schedules'::regclass, 'slots', 'smallint[]'::regtype)
    ) expected(rel, col, typ)
    where not exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid = expected.rel and a.attname = expected.col
        and a.atttypid = expected.typ and not a.attisdropped
    )
  ) then
    raise exception 'Agenda schema differs from the expected owner-scoped column types';
  end if;

  if exists (
    select 1 from pg_catalog.pg_class c
    where c.oid in (
      'public.appointments'::regclass,
      'public.employees'::regclass,
      'public.daily_work_schedules'::regclass
    ) and not c.relrowsecurity
  ) then
    raise exception 'Row-level security must be enabled on appointments, employees, and daily_work_schedules';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments'
      and column_name in ('duration_minutes', 'overlap_acknowledgement')
  ) then
    raise exception 'Appointment feature columns already exist; inspect the schema before applying this one-time migration';
  end if;

  if old_assignee_index is not null and not exists (
    select 1 from pg_catalog.pg_index i
    where i.indexrelid = old_assignee_index
      and i.indrelid = 'public.appointments'::regclass
      and i.indisunique
      and i.indnkeyatts = 4
      and i.indkey[0] = (select a.attnum from pg_catalog.pg_attribute a where a.attrelid = i.indrelid and a.attname = 'owner_id')
      and i.indkey[1] = (select a.attnum from pg_catalog.pg_attribute a where a.attrelid = i.indrelid and a.attname = 'appointment_date')
      and i.indkey[2] = (select a.attnum from pg_catalog.pg_attribute a where a.attrelid = i.indrelid and a.attname = 'appointment_time')
      and i.indkey[3] = 0
      and pg_catalog.pg_get_expr(i.indpred, i.indrelid) ilike '%status%confirmed%'
      and pg_catalog.pg_get_indexdef(i.indexrelid) ilike '%employee_id%'
  ) then
    raise exception 'The named assignee index is not the expected partial unique index on appointments; inspect it before continuing';
  end if;
end;
$$;

alter table public.appointments
  add column duration_minutes integer not null default 30,
  add column overlap_acknowledgement jsonb not null default '[]'::jsonb,
  add constraint appointments_duration_minutes_check
    check (duration_minutes between 30 and 720 and duration_minutes % 30 = 0),
  add constraint appointments_duration_end_check
    check ((extract(hour from appointment_time)::integer * 60 +
            extract(minute from appointment_time)::integer + duration_minutes) <= 1440),
  add constraint appointments_overlap_acknowledgement_array_check
    check (pg_catalog.jsonb_typeof(overlap_acknowledgement) = 'array');

-- Remove only the old one-assignee-per-start rule; the trigger below still caps
-- each exact start time at three confirmed appointments, irrespective of assignee.
drop index if exists public.appointments_owner_confirmed_assignee_idx;

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

create or replace function public.enforce_appointment_overlap_confirmation()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  requested_start integer;
  requested_end integer;
  actual_overlaps jsonb;
  assignee_lock_key text;
begin
  if new.status <> 'confirmed' then
    new.overlap_acknowledgement := '[]'::jsonb;
    return new;
  end if;

  requested_start := extract(hour from new.appointment_time)::integer * 60 +
    extract(minute from new.appointment_time)::integer;
  requested_end := requested_start + new.duration_minutes;
  assignee_lock_key := case
    when new.employee_id is not null then 'employee:' || new.employee_id::text
    when new.employee_name = 'Admin' then 'admin'
    else 'legacy:' || new.id::text
  end;

  -- Serialize concurrent writes for one assignee/day before reading overlaps.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    new.owner_id::text || ':' || new.appointment_date::text || ':' || assignee_lock_key, 0
  ));

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', a.id::text,
    'date', pg_catalog.to_char(a.appointment_date, 'YYYY-MM-DD'),
    'time', pg_catalog.to_char(a.appointment_time, 'HH24:MI'),
    'durationMinutes', a.duration_minutes,
    'employeeId', a.employee_id,
    'employeeName', a.employee_name,
    'clientName', a.client_name
  ) order by a.id), '[]'::jsonb)
  into actual_overlaps
  from public.appointments a
  where a.owner_id = new.owner_id
    and a.appointment_date = new.appointment_date
    and a.status = 'confirmed'
    and a.id <> new.id
    and (
      (new.employee_id is not null and a.employee_id = new.employee_id)
      or (new.employee_id is null and new.employee_name = 'Admin'
          and a.employee_id is null and a.employee_name = 'Admin')
    )
    and (extract(hour from a.appointment_time)::integer * 60 +
         extract(minute from a.appointment_time)::integer) < requested_end
    and requested_start <
        (extract(hour from a.appointment_time)::integer * 60 +
         extract(minute from a.appointment_time)::integer + a.duration_minutes);

  if actual_overlaps <> coalesce(new.overlap_acknowledgement, '[]'::jsonb) then
    raise exception 'appointment_overlap_confirmation_required' using errcode = '23514';
  end if;

  -- This exact snapshot is a one-write acknowledgement, never a lasting booking state.
  new.overlap_acknowledgement := '[]'::jsonb;
  return new;
end;
$$;

revoke all on function public.enforce_appointment_overlap_confirmation() from public, anon, authenticated;
drop trigger if exists appointments_overlap_confirmation_before_write on public.appointments;
create trigger appointments_overlap_confirmation_before_write
before insert or update
on public.appointments
for each row execute function public.enforce_appointment_overlap_confirmation();

create or replace function public.check_confirmed_work_slot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  slot_index smallint;
  duration_slots smallint;
  slot_offset smallint;
begin
  -- Preserve unchanged confirmed history when schedules shrink or the assignee is archived.
  if tg_op = 'UPDATE' and old.status = 'confirmed' and old.owner_id = new.owner_id
    and old.appointment_date = new.appointment_date and old.appointment_time = new.appointment_time
    and old.duration_minutes = new.duration_minutes then
    if old.employee_id is not distinct from new.employee_id
      and (new.employee_id is not null or old.employee_name = new.employee_name) then
      return null;
    end if;
    if old.employee_id is not null and new.employee_id is null
      and new.employee_name = old.employee_name and new.employee_name <> 'Admin'
      and not exists (select 1 from public.employees e where e.id = old.employee_id and e.owner_id = old.owner_id) then
      return null;
    end if;
    if old.employee_id is null and new.employee_id is null
      and old.employee_name = new.employee_name and new.employee_name <> 'Admin' then
      return null;
    end if;
  end if;

  if new.employee_id is null then
    if new.employee_name <> 'Admin' then
      raise exception 'appointment_assignee_unavailable' using errcode = '23514';
    end if;
  else
    perform 1 from public.employees e
      where e.owner_id = new.owner_id and e.id = new.employee_id and e.is_active for share;
    if not found then
      raise exception 'appointment_assignee_unavailable' using errcode = '23514';
    end if;
  end if;

  if extract(second from new.appointment_time) <> 0
    or extract(minute from new.appointment_time) not in (0, 30) then
    raise exception 'appointment_outside_work_schedule' using errcode = '23514';
  end if;

  slot_index := (extract(epoch from new.appointment_time) / 1800)::smallint;
  duration_slots := (new.duration_minutes / 30)::smallint;
  for slot_offset in 0..(duration_slots - 1) loop
    perform 1 from public.daily_work_schedules s
      where s.owner_id = new.owner_id and s.work_date = new.appointment_date
        and s.employee_id is not distinct from new.employee_id
        and (slot_index + slot_offset)::smallint = any(s.slots) for share;
    if not found then
      raise exception 'appointment_outside_work_schedule' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function public.check_confirmed_work_slot() from public, anon, authenticated;

drop trigger if exists appointments_confirmed_work_slot on public.appointments;
create trigger appointments_confirmed_work_slot
after insert or update on public.appointments
for each row when (new.status = 'confirmed') execute function public.check_confirmed_work_slot();

commit;
