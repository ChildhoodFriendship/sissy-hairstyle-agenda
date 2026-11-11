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
- Configures the reminder template. The interface displays the supported placeholders through localized help text.
- Saves the settings draft through the repository and reports success or a generic error.
- Sets `defaultCountryCode` to `+39` when saving settings. The model includes confirmation and reminder templates, business hours, closed weekdays, and a demo-data flag; this view does not expose business-hours or demo-data controls.

## Interfaces And Protocols

The operator edits the settings form and selects **Salva impostazioni**. The repository's `saveSettings` operation is the persistence boundary. The Supabase repository inherits settings storage behavior from `LocalStorageRepository`; therefore, do not assume these preferences are stored in the Supabase database. A runtime storage warning can indicate that browser storage failed.

## Dependencies And Relationships

Service names appear in the appointment form, and the reminder template is used when preparing WhatsApp links. See [Appointment Management](appointments.md) and [WhatsApp Reminders and Themes](reminders-and-theme.md).
