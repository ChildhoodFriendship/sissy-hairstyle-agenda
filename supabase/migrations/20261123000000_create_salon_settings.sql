-- Salon settings are private to the authenticated salon owner.
create table if not exists public.salon_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  salon_name text not null default 'Il tuo salone',
  default_country_code text not null default '+39',
  business_hours jsonb not null default '{"open":"","close":"","closedDays":[]}'::jsonb
    check (jsonb_typeof(business_hours) = 'object'),
  message_templates jsonb not null default '{"confirmation":"Ciao {nome}, il tuo appuntamento è fissato per {data} alle {ora}. A presto! — {salone}","reminder":"Buongiorno {nome}, le ricordo il suo appuntamento il {data} alle {ora}. A presto! — {salone}"}'::jsonb
    check (jsonb_typeof(message_templates) = 'object'),
  demo_data_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.salon_settings enable row level security;

drop policy if exists "Salon settings are private to owner" on public.salon_settings;
create policy "Salon settings are private to owner" on public.salon_settings
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on public.salon_settings from public, anon, authenticated;
grant select, insert, update on public.salon_settings to authenticated;
