-- Salon services are private to the authenticated salon owner.
create table if not exists public.salon_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, id),
  unique (owner_id, name)
);

alter table public.salon_services enable row level security;

drop policy if exists "Salon services are private to owner" on public.salon_services;
create policy "Salon services are private to owner" on public.salon_services
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create index if not exists salon_services_owner_position_idx
  on public.salon_services (owner_id, position, name);

revoke all on public.salon_services from anon;
grant select, insert, update, delete on public.salon_services to authenticated;
