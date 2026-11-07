# Supabase setup — Agenda Sissy

The Angular client uses Supabase Auth and the Data API. Customer and appointment records are stored remotely; salon preferences remain in this browser and do not contain customer records.

## One-time project setup

1. Open the `sissy hairstyle agenda` project in Supabase and run `migrations/20261107000000_create_agenda_core.sql` in the SQL Editor. The migration creates `clients` and `appointments`, owner-scoped Row Level Security policies, and a uniqueness constraint for confirmed appointment time slots.
2. In the Supabase API settings, copy the project's **publishable** key into `public/supabase-config.json` as `publishableKey`. Do not use a `secret` or `service_role` key in this browser application.
3. In Supabase Auth, create the salon operator account directly. Public sign-up is intentionally not implemented in the application. Configure the allowed redirect/site URLs for the deployed agenda origin and local development.
4. Deploy the app after configuration. The config file is downloaded at runtime from `/supabase-config.json`.

The publishable key is intended for client applications; access to customer data is enforced by authentication and the database RLS policies, not by hiding that key. Do not enter real customer information until the migration is applied and an authenticated account can read/write only its own rows.

## Limitations

See [`USER-SETUP.md`](./USER-SETUP.md) for operator account creation, publishable-key setup, recovery-email configuration, and the example customer/appointment seed script.

The connected Supabase SQL tool currently opens a read-only transaction, so it cannot apply DDL. Verify the migration by confirming that both tables exist and have RLS enabled in the Supabase dashboard. The application build alone does not verify live authentication, database policies, or persistence.

WhatsApp remains a user-initiated `wa.me` link. The app prepares `Buongiorno [nome], le ricordo il suo appuntamento il [data] alle [ora]...`; it does not send messages automatically.
