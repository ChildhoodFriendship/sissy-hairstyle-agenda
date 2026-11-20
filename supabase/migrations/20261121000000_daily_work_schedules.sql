-- PostgreSQL 15+ (UNIQUE NULLS NOT DISTINCT). Apply after the agenda/employee migrations.
-- No backfill: a missing schedule, like an empty schedule, has no bookable slots.
-- Use CREATE, not IF NOT EXISTS: abort rather than adopt an unrelated object or policy.
begin;
set local lock_timeout = '5s';

do $$
begin
  -- Check the columns used by the PL/pgSQL booking trigger before it can go live.
  if exists (
    select 1 from (values
      ('public.appointments'::regclass, 'owner_id', 'uuid'::regtype),
      ('public.appointments'::regclass, 'appointment_date', 'date'::regtype),
      ('public.appointments'::regclass, 'appointment_time', 'time'::regtype),
      ('public.appointments'::regclass, 'status', 'text'::regtype),
      ('public.appointments'::regclass, 'employee_id', 'uuid'::regtype),
      ('public.appointments'::regclass, 'employee_name', 'text'::regtype),
      ('public.employees'::regclass, 'is_active', 'boolean'::regtype)
    ) expected(rel, col, typ)
    where not exists (select 1 from pg_catalog.pg_attribute a
      where a.attrelid = expected.rel and a.attname = expected.col
        and a.atttypid = expected.typ and not a.attisdropped)
  ) or exists (select 1 from pg_catalog.pg_class
    where oid in ('public.employees'::regclass, 'public.appointments'::regclass) and not relrowsecurity)
  then
    raise exception 'Expected owner-scoped agenda and employee schema; check preceding migrations';
  end if;
end;
$$;

create function public.valid_daily_work_slots(smallint[])
returns boolean language sql immutable strict security invoker set search_path = '' as $$
  select coalesce(array_ndims($1), 1) = 1 and cardinality($1) <= 48
    and cardinality($1) = (select count(distinct slot) from unnest($1) as s(slot)
                           where slot between 0 and 47);
$$;
revoke all on function public.valid_daily_work_slots(smallint[]) from public, anon, authenticated;
grant execute on function public.valid_daily_work_slots(smallint[]) to authenticated;

create table public.daily_work_schedules (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  work_date date not null check (isfinite(work_date)),
  employee_id uuid, -- NULL identifies Sissy; never derive an employee identity from a display name.
  slots smallint[] not null check (public.valid_daily_work_slots(slots)),
  unique nulls not distinct (owner_id, work_date, employee_id),
  foreign key (owner_id, employee_id) references public.employees(owner_id, id) on delete cascade
);

alter table public.daily_work_schedules enable row level security;
create policy "Work schedules are private to owner" on public.daily_work_schedules
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
revoke all on public.daily_work_schedules from public, anon, authenticated;
grant select, insert (work_date, employee_id, slots), update (work_date, employee_id, slots)
  on public.daily_work_schedules to authenticated;

create function public.check_confirmed_work_slot()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  slot_index smallint;
begin
  -- AFTER sees the actual operation, including the UPDATE arm of a PostgREST upsert.
  -- Keep confirmed history editable even if a shift shrank or the employee was archived.
  if tg_op = 'UPDATE' and old.status = 'confirmed' and old.owner_id = new.owner_id
    and old.appointment_date = new.appointment_date and old.appointment_time = new.appointment_time then
    if old.employee_id is not distinct from new.employee_id
      and (new.employee_id is not null or old.employee_name = new.employee_name) then
      return null;
    end if;
    -- Preserve the existing employee FK's ON DELETE SET NULL historical-name snapshot.
    if old.employee_id is not null and new.employee_id is null
      and new.employee_name = old.employee_name and new.employee_name <> 'Admin'
      and not exists (select 1 from public.employees e where e.id = old.employee_id and e.owner_id = old.owner_id) then
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
  -- Lock the qualifying schedule through commit, serializing a booking with a concurrent edit.
  -- Subsequent edits can remove slots without cancelling or moving an existing appointment.
  perform 1 from public.daily_work_schedules s
    where s.owner_id = new.owner_id and s.work_date = new.appointment_date
      and s.employee_id is not distinct from new.employee_id and slot_index = any(s.slots) for share;
  if not found then
    raise exception 'appointment_outside_work_schedule' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function public.check_confirmed_work_slot() from public, anon, authenticated;

create trigger appointments_confirmed_work_slot
  after insert or update on public.appointments
  for each row when (new.status = 'confirmed') execute function public.check_confirmed_work_slot();

commit;
