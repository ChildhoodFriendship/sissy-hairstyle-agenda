---
title: "Client Management"
status: active
role: functional_module
navigation:
  - type: module
    id: agenda
    name: "Agenda"
  - type: page
    id: clients
    name: "Clienti"
source:
  technology: angular
  references:
    - part: component
      path: src/app/components/dashboard/dashboard.ts
    - part: model
      path: src/app/library/models.ts
    - part: other
      path: src/app/library/domain-utils.ts
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
    - part: other
      path: supabase/migrations/20261107000000_create_agenda_core.sql
---

## Short Description

This section documents the salon client directory, client details, WhatsApp-consent flag, and linking clients to appointments.

## Description

This section describes saved client contact records used by the dashboard. A client has a name, phone number, WhatsApp-consent flag, notes, and creation time. The application keeps first and last name fields and presents the combined name in the directory. Records are loaded and saved through the configured repository; live persistence depends on the Supabase project and its policies being configured.

## Functional Characteristics

- Shows clients in name order and filters the list by name or phone.
- Manages client records through a form requiring first name, last name, and a valid phone number. Notes and WhatsApp consent are optional form values.
- Normalizes telephone numbers using `+39` as the default country prefix; explicit international numbers are retained in normalized E.164 form. Invalid numbers prevent saving.
- Shows whether WhatsApp consent is recorded and counts appointments linked to each client.
- Opens a new appointment form from a client row and pre-fills the selected client details.
- When a saved client is selected during appointment creation, pre-fills their contact data and consent state. Consent for WhatsApp reminders is checked from the saved client record.
- Deletes a client only after browser confirmation; the confirmation states that appointments remain in the agenda. Appointment records retain their own name and phone snapshot.

## Interfaces And Protocols

The operator searches, adds, edits, or removes client records in the dashboard. The repository maps client fields to the Supabase `clients` table. Appointment creation may also save or update a related client record. Failures are presented as a generic error; this documentation does not establish live backend availability.

## Dependencies And Relationships

Clients are associated with appointments by client ID where available. Phone normalization is implemented in `normalizePhoneNumber`. The consent flag gates reminder preparation described in [WhatsApp Reminders and Themes](reminders-and-theme.md); appointment form behavior is described in [Appointment Management](appointments.md).
