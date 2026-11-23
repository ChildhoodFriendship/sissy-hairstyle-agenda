# Supabase setup — Agenda Sissy

The Angular client uses Supabase Auth and the Data API. Client, employee, appointment, service, and salon-preference records are stored remotely in owner-scoped tables. Theme preference and the persistent Auth session remain browser-side. A legacy salon-settings record is migrated from this browser once after the settings table exists.

## One-time project setup

1. In the Supabase SQL Editor for the intended project, apply the SQL files in `migrations/` in filename order. Check which migrations are already present and apply only missing ones; the latest files include `20261121000000_daily_work_schedules.sql`, `20261122000000_create_salon_services.sql`, and `20261123000000_create_salon_settings.sql`. The settings migration creates the owner-scoped preferences row and RLS policy.
2. In the Supabase API settings, copy the project's **publishable** key into `public/supabase-config.json` as `publishableKey`. Never put a `secret` or `service_role` key in this browser application.
3. Deploy `functions/login-with-username/index.ts` as the `login-with-username` Edge Function; `config.toml` sets JWT verification off for this public login endpoint. Configure a server-only secret named `SERVICE_ROLE_KEY` if the project does not expose its legacy service-role environment variable. Never expose that key in the browser.
4. The login screen supports username/email/password account registration. Configure Auth email confirmation and the deployed redirect URLs before relying on registration or recovery email delivery.
5. Deploy the app after configuration. The publishable key is downloaded at runtime from `/supabase-config.json`.

Keep applied migrations in this ordered directory: they are the schema history needed to reproduce the database in another environment. Do not remove a migration simply because it was already run in one project; a deliberate squash/rebaseline needs an explicit schema-history and compatibility plan. Avoid maintaining duplicate SQL copies under `docs/queries`.

The publishable key is intended for browser clients; access to salon data is enforced by authentication and RLS policies. Do not enter real customer information until the required migrations are applied and an authenticated account can read/write only its own rows.

## Limitations

The repository build does not deploy database migrations or Edge Functions, configure secrets, verify Auth email delivery, or prove live access control. The connected Supabase SQL tool is read-only; execute the migration scripts in the intended project's SQL Editor.

WhatsApp remains a user-initiated `wa.me` link. The app prepares message text for review; it does not send messages automatically.
