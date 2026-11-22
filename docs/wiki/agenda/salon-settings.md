---
title: "Salon Settings"
status: active
role: application
navigation:
  - type: module
    id: agenda
    name: "Agenda"
  - type: page
    id: settings
    name: "Impostazioni"
source:
  technology: angular
  references:
    - part: component
      path: src/app/components/dashboard/dashboard.ts
    - part: model
      path: src/app/library/models.ts
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
---

## Short Description

This section documents the salon name, service list, and message-template preferences managed by the dashboard.

## Description

This section describes the salon preferences form. `SalonSettings` also defines business-hour and demo-data fields, but the current dashboard settings view exposes the salon name, services, and reminder message template. Do not infer user-facing controls for fields that are not presented in this view.

## Functional Characteristics

- Configures the salon name and the list of service names.
- Adds a non-empty service name unless a case-insensitive duplicate is already present; removes a service from the draft list using its row action.
- Loads service names from `public.salon_services` and saves additions/removals to Supabase when **Salva impostazioni** is selected. The table is owner-scoped with RLS; if it is unavailable, the settings page shows a database setup warning instead of presenting browser-only services as saved.
- Uses the full available content width for the settings panel.
- Configures the reminder template in a guided dialog rather than asking the operator to memorize placeholder syntax. The operator writes ordinary text, places the cursor, and inserts client name, date, time, service, or salon name using labeled buttons.
- Shows a live example preview with sample appointment values; it is illustrative and does not send a message.
- Saves the template with the rest of the settings draft through **Salva impostazioni**. Closing the editor with **Fatto** returns to the draft; it does not persist settings by itself.
- The salon name is editable in settings and is substituted when a reminder template contains `{salone}`.
- Sets `defaultCountryCode` to `+39` when saving settings. `SalonSettings` also models confirmation templates, business hours, closed weekdays, and demo-data state; this view does not expose controls for the latter fields.

## Interfaces And Protocols

The operator edits the settings form and selects **Salva impostazioni**. The salon name and message preferences are stored through `LocalStorageRepository`; services are loaded from and saved to `public.salon_services` through the Supabase repository. A dismissible toast reports success or a generic error and closes automatically after about three seconds. A database warning appears if the services table cannot be reached. A runtime storage warning can indicate that browser storage failed.

## Database Setup

Apply [`20261122000000_create_salon_services.sql`](../../../supabase/migrations/20261122000000_create_salon_services.sql) in the configured Supabase project. To add the example salon services, run [`seed-salon-services.sql`](../../../supabase/seed-salon-services.sql) after replacing its placeholder with the signed-in operator's Auth user UUID. The seed is idempotent. These SQL files have not been applied to a live project by the application.

## Dependencies And Relationships

Service names appear in the appointment form, and the reminder template is used when preparing WhatsApp links. See [Appointment Management](appointments.md) and [WhatsApp Reminders and Themes](reminders-and-theme.md).
