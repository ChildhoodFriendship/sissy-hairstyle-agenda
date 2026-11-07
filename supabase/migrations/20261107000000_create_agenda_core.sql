-- Agenda Sissy: per-user customer and appointment records with mandatory RLS.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  phone text not null check (char_length(trim(phone)) between 7 and 24),
  whatsapp_consent boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (owner_id, id),
  unique (owner_id, phone)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid,
  client_name text not null check (char_length(trim(client_name)) between 1 and 201),
  phone text not null check (char_length(trim(phone)) between 7 and 24),
  appointment_date date not null,
  appointment_time time not null,
  service text not null default '',
  notes text not null default '',
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  reminder_consent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint appointments_client_owner_fk
    foreign key (owner_id, client_id) references public.clients(owner_id, id)
    on delete set null (client_id)
);

alter table public.clients enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "Clients are private to owner" on public.clients;
create policy "Clients are private to owner" on public.clients
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Appointments are private to owner" on public.appointments;
create policy "Appointments are private to owner" on public.appointments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create unique index if not exists appointments_owner_confirmed_slot_idx
  on public.appointments (owner_id, appointment_date, appointment_time)
  where status = 'confirmed';
create index if not exists clients_owner_name_idx
  on public.clients (owner_id, last_name, first_name);
create index if not exists appointments_owner_date_time_idx
  on public.appointments (owner_id, appointment_date, appointment_time);

revoke all on public.clients, public.appointments from anon;
grant select, insert, update, delete on public.clients, public.appointments to authenticated;
