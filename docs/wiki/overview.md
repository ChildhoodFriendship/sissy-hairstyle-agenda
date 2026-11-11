---
title: "Appointment Agenda Application"
status: active
role: application
---

## Short Description

This application manages a salon's appointment agenda and client contact records through an Angular interface with a Supabase-backed authentication and data layer.

## Description

This application provides the salon operator with a daily agenda, a manageable client list, a team roster, configurable services, WhatsApp reminder preparation, and salon preferences. Appointments can be assigned to the admin or a saved employee; each confirmed time slot accepts up to three appointments, with no duplicate assignee in the same slot. Existing clients can be selected when creating appointments, and their contact details are prefilled. The interface offers persistent light and dark themes. Supabase Auth manages account credentials, while row-level security scopes salon records to the signed-in account. WhatsApp links prepare a reminder for manual review and sending; they do not transmit a message.

The wiki is organized into the [agenda area](agenda/overview.md), which documents appointment, client, employee, salon-setting, and reminder behavior, and the [backend integration area](backend-integration/overview.md), which documents authentication, the database boundary, activation prerequisites, and verified limitations.

## Functional Characteristics

- Manages client, employee, appointment, and service records through the configured agenda repository and salon settings.
- Assigns confirmed appointments to the admin or one saved employee, with a maximum of three appointments per date/time slot.
- Registers accounts with username, email, and password and accepts username/password login through a Supabase Edge Function.
- Shows a dedicated email-based password recovery page.
- Prefills appointment contact details when the operator selects a saved client.
- Adds and edits client records from the client screen.
- Opens a consent-gated WhatsApp reminder from an appointment card for review and manual sending.
- Configures light or dark appearance from the login or agenda screen; the selected theme is retained in the browser.
- Authenticates operators through Supabase Auth when the project configuration and database setup are available.
- Shows a recovery flow for requesting an email link and setting a replacement password after Supabase verifies the recovery session.
- Uses `+39` as the default telephone country prefix when normalizing Italian numbers.
- Selects appointment date and time through native picker controls rather than direct text entry.

- Does not verify a live Supabase deployment, SMTP delivery, or WhatsApp delivery as part of a local build.

## Interfaces And Protocols

The browser loads `/supabase-config.json` and uses the Supabase JavaScript client with a publishable key. Authenticated data requests use the Supabase Data API for clients, employees, and appointments; row-level security restricts rows to the authenticated owner. Username login exchanges the identifier and password through the `login-with-username` Edge Function, which returns a Supabase session. Password recovery uses Supabase Auth email delivery and a configured application redirect URL.

## Dependencies And Relationships

The application depends on the Supabase project configuration, all three migrations under `supabase/migrations/` applied in order, authenticated accounts, the username-login Edge Function, and owner-scoped RLS policies. Runtime activation instructions are in [`supabase/README.md`](../../supabase/README.md) and [`supabase/USER-SETUP.md`](../../supabase/USER-SETUP.md).

## Procedures

### Activate the Supabase-backed deployment

1. Apply all three SQL migrations in `supabase/migrations/` in filename order in the intended Supabase project.
2. Set the project's publishable key in `public/supabase-config.json`; do not expose a secret or service-role key.
3. Configure the allowed Auth redirect URLs and, for production password recovery, a verified SMTP sender.
4. Create the operator account through Supabase Auth and test login, row access, and recovery email delivery.
5. Verify that one account cannot read or change another account's rows before adding real customer data.

The local build does not perform these provider-side steps. See the [operator setup guide](../../supabase/USER-SETUP.md) for the full workflow.
