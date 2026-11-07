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
---

## Short Description

This area documents the Supabase Auth and database boundary used by the agenda, including activation prerequisites and owner-scoped data access.

## Description

This area groups the application's backend integration documentation. It distinguishes implemented client behavior from provider-side setup that has not been verified in a live deployment. The detailed contract is documented in [Supabase Authentication and Storage](supabase-authentication-and-storage.md).

## Functional Characteristics

The application authenticates operators with email and password, reads and writes client and appointment rows through the Supabase client, and requests a password recovery email. These capabilities require the database migration, runtime publishable-key configuration, allowed Auth redirects, and a usable email-delivery configuration.

## Interfaces And Protocols

The browser communicates with Supabase Auth and the Supabase Data API over the Supabase JavaScript client. Database policies scope access to the current authenticated user. The browser must never receive a secret or service-role key.

## Dependencies And Relationships

This area depends on the Supabase project, `public/supabase-config.json`, the SQL migration, the Supabase Auth user account, and the `clients` and `appointments` tables. See the [operator setup guide](../../../supabase/USER-SETUP.md).

## Procedures

Follow the ordered activation and recovery procedures in [Supabase Authentication and Storage](supabase-authentication-and-storage.md) and the [operator setup guide](../../../supabase/USER-SETUP.md).
