-- Insert six fictitious sample customers for an existing Supabase Auth account.
-- First apply ../migrations/20261107000000_create_agenda_core.sql.
-- Replace the email literal with the real login email for the account created in Auth > Users.
-- These records intentionally have no WhatsApp consent; do not send messages to them.
with account as (
  select id as owner_id
  from auth.users
  where lower(email) = lower('childhoodfriendship00@gmail.com')
), sample_clients(first_name, last_name, phone) as (
  values
    ('Giulia', 'Esempio', '+390000000001'),
    ('Maria', 'Prova', '+390000000002'),
    ('Elena', 'Demo', '+390000000003'),
    ('Sofia', 'Test', '+390000000004'),
    ('Anna', 'Fittizia', '+390000000005'),
    ('Chiara', 'Campione', '+390000000006')
)
insert into public.clients (owner_id, first_name, last_name, phone, whatsapp_consent, notes)
select account.owner_id, sample_clients.first_name, sample_clients.last_name,
       sample_clients.phone, false, 'Dato fittizio per test: non contattare'
from account
cross join sample_clients
on conflict (owner_id, phone) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    whatsapp_consent = false,
    notes = excluded.notes;

-- Aggiunge un appuntamento futuro per ogni cliente fittizio, senza consenso WhatsApp.
with account as (
  select id as owner_id
  from auth.users
  where lower(email) = lower('childhoodfriendship00@gmail.com')
), sample_appointments(first_name, last_name, day_offset, appointment_time) as (
  values
    ('Giulia', 'Esempio', 21, time '09:00'),
    ('Maria', 'Prova', 22, time '10:00'),
    ('Elena', 'Demo', 23, time '11:00'),
    ('Sofia', 'Test', 24, time '14:00'),
    ('Anna', 'Fittizia', 25, time '15:00'),
    ('Chiara', 'Campione', 26, time '16:00')
)
insert into public.appointments (
  owner_id, client_id, client_name, phone, appointment_date, appointment_time,
  service, notes, status, reminder_consent
)
select account.owner_id, clients.id,
       concat_ws(' ', clients.first_name, clients.last_name), clients.phone,
       current_date + sample_appointments.day_offset, sample_appointments.appointment_time,
       'Servizio di prova', 'Appuntamento fittizio: non contattare', 'confirmed', false
from account
join public.clients as clients on clients.owner_id = account.owner_id
join sample_appointments
  on sample_appointments.first_name = clients.first_name
 and sample_appointments.last_name = clients.last_name
on conflict (owner_id, appointment_date, appointment_time) where status = 'confirmed'
do nothing;
