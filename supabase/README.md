# Supabase setup — Agenda Sissy

The Angular client uses Supabase Auth and the Data API. Customer and appointment records are stored remotely; salon preferences remain in this browser and do not contain customer records.

## One-time project setup

1. In the Supabase SQL Editor for the intended project, run migrations in order: `migrations/20261107000000_create_agenda_core.sql`, `migrations/20261110000000_employees_capacity_and_usernames.sql`, then `migrations/20261110220224_employee_archive_and_username_backfill.sql`. The second migration creates employees and username profiles, adds appointment assignments, and enforces the three-appointment slot cap. The third repairs missing username profiles, adds employee archival, blocks physical employee deletes through the authenticated API, and preserves legacy employee assignments. If the first two migrations are already applied, run only the third.
2. In the Supabase API settings, copy the project's **publishable** key into `public/supabase-config.json` as `publishableKey`. Never put a `secret` or `service_role` key in this browser application.
3. Deploy `functions/login-with-username/index.ts` as the `login-with-username` Edge Function; `config.toml` sets JWT verification off for this public login endpoint. Configure a server-only secret named `SERVICE_ROLE_KEY` if the project does not expose its legacy service-role environment variable. Never expose that key in the browser.
4. The login screen supports username/email/password account registration. Configure Auth email confirmation and the deployed redirect URLs before relying on registration or recovery email delivery.
5. Deploy the app after configuration. The publishable key is downloaded at runtime from `/supabase-config.json`.

The publishable key is intended for browser clients; access to customer, employee, and appointment data is enforced by authentication and RLS policies. Do not enter real customer information until both migrations are applied and an authenticated account can read/write only its own rows.

## Limitations

The repository build does not deploy database migrations or Edge Functions, configure secrets, verify Auth email delivery, or prove live access control. The connected Supabase SQL tool is read-only; execute the migration scripts in the intended project's SQL Editor.

WhatsApp remains a user-initiated `wa.me` link. The app prepares message text for review; it does not send messages automatically.
