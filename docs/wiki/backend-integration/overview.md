---
title: "Backend Integration"
status: active
role: application
navigation:
  - type: module
    id: backend-integration
    name: "Backend integration"
source:
  technology: angular
  references:
    - part: service
      path: src/app/api/auth.service.ts
      description: Supabase sign-in, sign-out, session checks, and password recovery.
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
      description: Authenticated client and appointment persistence.
    - part: other
      path: supabase/migrations/20261107000000_create_agenda_core.sql
      description: Owner-scoped database tables and RLS policies.
    - part: other
      path: supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql
      description: Employee archival and collision-safe username profile repair.
---

## Short Description

This area documents the Supabase Auth and database boundary used by the agenda, including activation prerequisites and owner-scoped data access.

## Description

This area groups the application's backend integration documentation. It distinguishes implemented client behavior from provider-side setup that has not been verified in a live deployment. The detailed contract is documented in [Supabase Authentication and Storage](supabase-authentication-and-storage.md).

## Functional Characteristics

The application registers account owners with a username, email, and password; username/password login uses a server-side Edge Function. It reads and writes client, employee, and appointment rows through the Supabase client, and requests password recovery on a dedicated email form. These capabilities require the database migrations, runtime publishable-key configuration, an Edge Function secret, allowed Auth redirects, and usable email delivery.

## Interfaces And Protocols

The browser communicates with Supabase Auth and the Supabase Data API over the Supabase JavaScript client. Database policies scope access to the current authenticated user. The browser must never receive a secret or service-role key.

## Dependencies And Relationships

This area depends on the Supabase project, `public/supabase-config.json`, all three ordered SQL migrations, the Supabase Auth user account, and the `clients`, `employees`, and `appointments` tables. See the [operator setup guide](../../../supabase/USER-SETUP.md).

## Procedures

Follow the ordered activation and recovery procedures in [Supabase Authentication and Storage](supabase-authentication-and-storage.md) and the [operator setup guide](../../../supabase/USER-SETUP.md).
