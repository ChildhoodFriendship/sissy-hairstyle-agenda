alter table public.clients
  add column if not exists in_contacts boolean not null default true;

comment on column public.clients.in_contacts is
  'Whether the client appears in the salon contacts directory. Appointment-linked client records may remain hidden from that directory.';
