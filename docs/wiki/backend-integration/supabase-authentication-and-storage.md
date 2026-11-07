---
title: "Supabase Authentication and Storage"
status: active
role: functional_module
navigation:
  - type: module
    id: backend-integration
    name: "Backend integration"
  - type: section
    id: supabase-authentication-and-storage
    name: "Supabase authentication and storage"
source:
  technology: angular
  references:
    - part: service
      path: src/app/api/auth.service.ts
    - part: client
      path: src/app/api/supabase-client.ts
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
    - part: component
      path: src/app/components/login/login.ts
    - part: configuration
      path: public/supabase-config.json
    - part: other
      path: supabase/migrations/20261107000000_create_agenda_core.sql
    - part: test
      path: src/app/api/auth.service.spec.ts
    - part: test
      path: src/app/components/login/login.spec.ts
---

## Short Description

This section describes Supabase email/password authentication, owner-scoped client and appointment persistence, and password recovery through an emailed link.

## Description

This section defines how the browser application reaches the Supabase project. The runtime configuration contains the project URL and the client-safe publishable key. Supabase Auth manages operator sessions. Authenticated calls access `public.clients` and `public.appointments`, whose row-level security policies compare each row's `owner_id` with the authenticated user ID.

The clients table stores first name, last name, phone, WhatsApp consent, notes, and creation time. The appointments table stores the client reference and name/phone snapshot, date, time, service, notes, status, reminder consent, and creation time. Passwords are managed by Supabase Auth, not in application SQL or local browser storage. A publishable key is not a secret; RLS is the data authorization boundary.

The live project currently contains the `clients` and `appointments` tables with owner-scoped RLS policies and no client or appointment rows. One Auth account exists, but its email does not match the address currently entered on the local login page. A local build does not prove that a particular account can sign in or that provider email delivery is configured.

## Functional Characteristics

- Authenticates with an operator email address and password through Supabase Auth.
- Checks whether a Supabase session exists before allowing access to the protected agenda route.
- Requests a password-reset email for an entered address, using a generic confirmation message to avoid confirming whether the address belongs to an account; recovery does not create an Auth user, and Supabase may return success without sending mail when no account matches.
- Listens for the Supabase password-recovery event and allows a new password to be saved after the recovery link establishes the session.
- Manages client and appointment records through authenticated Data API requests, with database RLS separating owners' rows.
- Does not include a public sign-up flow or a hardcoded `admin`/`admin` account.
- Does not send a WhatsApp message; it prepares the `wa.me` link for the operator to review and send manually.

## Interfaces And Protocols

At startup, the application fetches `/supabase-config.json` and initializes `@supabase/supabase-js` with the configured URL and publishable key. Sign-in uses Supabase Auth's email/password flow. Recovery uses the Auth password-reset email endpoint and redirects to `/login?recovery=1`; the configured Supabase redirect allow-list must include the app's actual origin and path. After authentication, the repository reads and writes `clients` and `appointments` through the Supabase Data API. Errors are surfaced through the app's login or operation feedback.

The client does not contain a `secret` or `service_role` key. The database migration enables RLS and grants table operations only to authenticated users under owner checks.

## Dependencies And Relationships

The integration depends on the Supabase project, `public/supabase-config.json`, Supabase Auth users, the applied migration, RLS policies, and redirect/email settings. Operator instructions, the seed query, and runtime setup details are in the [Supabase setup guide](../../../supabase/USER-SETUP.md).

## Procedures

### Configure and activate the integration

1. Apply `supabase/migrations/20261107000000_create_agenda_core.sql` in the intended Supabase project's SQL Editor.
2. Copy the **publishable** project key into `public/supabase-config.json`; leave secret and service-role keys server-side and out of the browser.
3. Set the Supabase Auth Site URL and allow the local and production recovery redirect URLs.
4. Verify the operator's exact email in Supabase Auth; if no matching account exists, invite it from **Authentication → Users**. Do not insert users or password hashes through SQL.
5. Deploy and verify an authenticated read/write operation and confirm that a second account cannot access the first account's rows.

### Recover an operator password

1. Verify that the email already belongs to an Auth user, then enter that exact address on the login page and select **Password dimenticata?**. The recovery request does not create an account.
2. If Supabase sends the message, open it and follow the link back to the configured `/login?recovery=1` route.
3. Enter a new password of at least eight characters and save it.
4. Verify delivery using the intended mailbox. For ordinary recipients, configure and test a custom SMTP sender in Supabase; the default mail service is restricted and is not a production delivery guarantee.

The complete operator-facing procedure and sample data query are in [`supabase/USER-SETUP.md`](../../../supabase/USER-SETUP.md).
