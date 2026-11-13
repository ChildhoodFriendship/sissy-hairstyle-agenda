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
    - part: other
      path: supabase/migrations/20261110000000_employees_capacity_and_usernames.sql
    - part: other
      path: supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql
    - part: endpoint
      path: supabase/functions/login-with-username/index.ts
    - part: component
      path: src/app/components/login/forgot-password.ts
    - part: test
      path: src/app/api/auth.service.spec.ts
    - part: test
      path: src/app/components/login/login.spec.ts
---

## Short Description

This section describes username/password authentication, account registration with email and password, owner-scoped persistence for clients, employees, and appointments, and password recovery through an email link. Usernames are unique identifiers mapped server-side to the email managed by Supabase Auth.

## Description

This section defines how the browser application reaches the Supabase project. Runtime configuration contains the project URL and client-safe publishable key. Supabase Auth manages passwords and sessions. Usernames and Auth email mappings are stored in `public.user_profiles`; the `login-with-username` Edge Function resolves usernames server-side and never returns email addresses. Authenticated calls access `public.clients`, `public.employees`, and `public.appointments`, whose RLS policies compare each row's `owner_id` with the authenticated user ID.

The employees table stores first name, last name, active status, and creation time. Removing an employee archives the row so existing appointments retain their employee reference and display-name snapshot. For older appointments whose employee row was already deleted, a null employee ID with a non-Admin display name preserves the historical assignment; a null ID with the name `Admin` represents the admin. Database constraints allow up to three confirmed appointments per date/time and prevent assigning the same person twice in a slot. Passwords remain managed by Supabase Auth. A publishable key is not a secret; RLS is the data authorization boundary.

The repository contains migration scripts and Edge Function source, but a local build does not prove that the migrations or function have been deployed, or that a particular account can sign in or receive recovery email.

## Functional Characteristics

- Registers an account by providing a username, email, and password; after submission, the UI tells the user to check email to complete registration, while Supabase Auth may require email confirmation.
- Authenticates with username and password through the `login-with-username` Edge Function, which returns a Supabase session without exposing the email mapping.
- Checks whether a Supabase session exists before allowing access to the protected agenda route.
- Requests a password-reset email from the dedicated recovery page, using a generic confirmation that does not reveal whether the email belongs to an account.
- Listens for the Supabase password-recovery event and allows a new password to be saved after the recovery link establishes the session.
- Manages client, employee, and appointment records through authenticated Data API requests, with database RLS separating owners' rows.
- Archives removed employees so appointments retain their historical assignment.
- Does not send a WhatsApp message; it prepares the `wa.me` link for the operator to review and send manually.

## Interfaces And Protocols

At startup, the application fetches `/supabase-config.json` and initializes `@supabase/supabase-js` with the configured URL and publishable key. Registration calls Supabase Auth with email, password, and username metadata. Username login calls the `login-with-username` Edge Function, which looks up the private email mapping using a server-side service key and returns only session tokens. Recovery calls Supabase Auth's password-reset email endpoint and redirects to `/login?recovery=1`; the configured redirect allow-list must include the app's actual origin and path. Authenticated repositories read and write clients, employees, and appointments through the Supabase Data API.

The client does not contain a `secret` or `service_role` key. The database migration enables RLS and grants employee reads, inserts, and updates only to authenticated owners; physical employee deletion is not granted, and the application archives employee rows instead.

## Dependencies And Relationships

The integration depends on the Supabase project, `public/supabase-config.json`, Supabase Auth users, the applied migration, RLS policies, and redirect/email settings. Operator instructions, the seed query, and runtime setup details are in the [Supabase setup guide](../../../supabase/USER-SETUP.md).

## Procedures

### Configure and activate the integration

1. Apply `supabase/migrations/20261107000000_create_agenda_core.sql`, then `supabase/migrations/20261110000000_employees_capacity_and_usernames.sql` and `supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql` in order in the intended Supabase project's SQL Editor. If the first two are already applied, apply only the third migration.
2. Keep the project's **publishable** key in `public/supabase-config.json`; never put a secret or service-role key in the browser.
3. Deploy the `login-with-username` Edge Function with JWT verification disabled and configure its server-only service-role secret.
4. Configure the Supabase Auth Site URL, allowed recovery redirects, and email sender. Registration may require email confirmation.
5. Verify registration, username login, recovery email delivery, and owner-scoped client/employee/appointment access in the live project; a local build does not verify these provider-side behaviors.

### Recover an operator password

1. On the login page, choose **Password dimenticata?** to open the dedicated recovery page and enter the account email.
2. The confirmation is generic and does not prove that an email was delivered. If the account exists and delivery is configured, open the link received and return to `/login?recovery=1`.
3. Enter a new password of at least eight characters and save it.
4. Verify delivery in the intended mailbox. For ordinary recipients, configure and test a custom SMTP sender in Supabase; the default mail service is not a production delivery guarantee.

The complete operator-facing procedure and sample data query are in [`supabase/USER-SETUP.md`](../../../supabase/USER-SETUP.md).
