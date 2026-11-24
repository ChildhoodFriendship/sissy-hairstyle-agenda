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
    - part: other
      path: src/app/library/database-constraints.ts
    - part: configuration
      path: public/supabase-config.json
    - part: other
      path: supabase/migrations/20261107000000_create_agenda_core.sql
    - part: other
      path: supabase/migrations/20261110000000_employees_capacity_and_usernames.sql
    - part: other
      path: supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql
    - part: other
      path: supabase/migrations/20261123000000_create_salon_settings.sql
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

This section describes username/password authentication, account registration with email and password, owner-scoped persistence for clients, employees, appointments, salon services, and salon settings, and password recovery through an email link. Usernames are unique identifiers mapped server-side to the email managed by Supabase Auth.

## Description

This section defines how the browser application reaches the Supabase project. Runtime configuration contains the project URL and client-safe publishable key. Supabase Auth manages passwords and persistent sessions. Usernames and Auth email mappings are stored in `public.user_profiles`; the `login-with-username` Edge Function resolves usernames server-side and never returns email addresses. Authenticated calls access `public.clients`, `public.employees`, `public.appointments`, `public.salon_services`, and `public.salon_settings`, whose RLS policies compare each row's `owner_id` with the authenticated user ID. Theme preference remains browser-side; salon settings are stored remotely.

The employees table stores first name, last name, active status, and creation time. Removing an employee archives the row so existing appointments retain their employee reference and display-name snapshot. For older appointments whose employee row was already deleted, a null employee ID with a non-`Admin` display name preserves the historical assignment; a null ID with the name `Admin` is the legacy database sentinel for the Sissy assignee. The application displays this assignee as `Sissy`; the stored sentinel remains unchanged for compatibility. Database constraints allow up to three confirmed appointments per date/time and prevent assigning the same person twice in a slot. Passwords remain managed by Supabase Auth. A publishable key is not a secret; RLS is the data authorization boundary.

The [daily work schedules migration](../../../supabase/migrations/20261121000000_daily_work_schedules.sql) adds `daily_work_schedules` with one row per owner, date, and employee (`NULL` means Sissy); this ordered migration is the canonical SQL source. The user confirmed successful manual execution; read-only provider metadata confirms the table, expected columns, employee/user foreign keys, and RLS enabled. The migration-history API is empty because the SQL was run manually; the table currently has no rows, so there is no backfill. Trigger/policy details and actual booking behavior still need verification; configure a first working day from **Modifica turno** and verify from another device. See the [project TODO](../../todo).

The repository contains migration scripts and Edge Function source, but a local build does not prove that the migrations or function have been deployed, or that a particular account can sign in or receive recovery email.

## Functional Characteristics

- Registers an account by providing a username, email, and password; after submission, the UI tells the user to check email to complete registration, while Supabase Auth may require email confirmation. The known Auth trigger error `Database error saving new user` receives a distinct profile-save message that points to a possible username conflict without claiming the cause is confirmed.
- Trims and lowercases registration usernames, requires 3–30 characters from `a-z`, digits, `.`, `_`, and `-`, and rejects invalid values before the request. The `user_profiles.username` database constraint remains unique; a duplicate is reported as **Questo username è già in uso. Scegline un altro.** rather than as a generic account-creation failure.
- Authenticates with username and password through the `login-with-username` Edge Function, which returns a Supabase session without exposing the email mapping.
- Checks whether a Supabase session exists before allowing access to the protected agenda route.
- Requests a password-reset email from the dedicated recovery page, using a generic confirmation that does not reveal whether the email belongs to an account.
- Listens for the Supabase password-recovery event and allows a new password to be saved after the recovery link establishes the session.
- Manages client, employee, and appointment records through authenticated Data API requests, with database RLS separating owners' rows.
- Manages salon preferences in the owner-scoped `public.salon_settings` row and services in `public.salon_services`. When no settings row exists, an existing `sissy-agenda-settings-v1` browser record is migrated once; if the table is unavailable, the UI shows a warning and does not report browser-only writes as saved.
- Archives removed employees so appointments retain their historical assignment.
- Does not send a WhatsApp message; it prepares the `wa.me` link for the operator to review and send manually.

## Interfaces And Protocols

At startup, the application fetches `/supabase-config.json` and initializes `@supabase/supabase-js` with the configured URL and publishable key. Registration calls Supabase Auth with email, password, and username metadata. A matching username-constraint error is distinguished from other registration failures; the known generic Auth trigger error is shown as a profile-save failure with a possible duplicate-username hint. This mapping is covered by local mocked tests, not verified against a live Auth project, and a provider-side error may have another cause. Username login calls the `login-with-username` Edge Function, which looks up the private email mapping using a server-side service key and returns only session tokens. Recovery calls Supabase Auth's password-reset email endpoint and redirects to `/login?recovery=1`; the configured redirect allow-list must include the app's actual origin and path. Authenticated repositories read and write client, employee, appointment, salon service, and salon setting rows through the Supabase Data API.

The client does not contain a `secret` or `service_role` key. RLS scopes the salon settings and service tables to `auth.uid()`. The employee migration grants reads, inserts, and updates only to authenticated owners; physical employee deletion is not granted, and the application archives employee rows instead.

## Dependencies And Relationships

The integration depends on the Supabase project, `public/supabase-config.json`, Supabase Auth users, the applied migration, RLS policies, and redirect/email settings. Operator instructions, the seed query, and runtime setup details are in the [Supabase setup guide](../../../supabase/USER-SETUP.md).

## Procedures

### Configure and activate the integration

1. Apply the SQL migrations in `supabase/migrations/` in filename order in the intended Supabase project's SQL Editor. For an already initialized project, check its schema and apply only missing migrations, including `20261123000000_create_salon_settings.sql` when `public.salon_settings` is absent.
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

<!-- user-manual-it:start:getting-started -->
## 3. Primi passi

### Creare un account

1. Nella schermata di accesso scegli **Crea un account**.
2. Inserisci username, email e password rispettando i requisiti mostrati dall’app.
3. Scegli **Crea account** e segui l’eventuale richiesta di conferma inviata all’email.

La registrazione dipende dalla configurazione Supabase dell’istanza. La conferma mostrata dall’app non prova che un’email sia stata consegnata. Se non puoi registrarti o non ricevi il messaggio, contatta il gestore.

### Accedere

1. Inserisci username e password dell’account.
2. Scegli **Accedi**.
3. Se l’accesso non riesce, verifica i dati e l’eventuale conferma email; per assistenza contatta il gestore senza condividere la password.

### Recuperare la password

1. Scegli **Password dimenticata?** nella schermata di accesso.
2. Inserisci l’email associata all’account e invia la richiesta.
3. Controlla posta in arrivo e Spam. La conferma generica a schermo non dimostra che il messaggio sia stato consegnato.
4. Se ricevi il link, aprilo nello stesso browser, imposta una nuova password e salvala.
<!-- user-manual-it:end:getting-started -->
