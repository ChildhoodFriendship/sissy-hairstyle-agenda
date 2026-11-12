---
title: "Appointment Management"
status: active
role: functional_module
navigation:
  - type: module
    id: agenda
    name: "Agenda"
  - type: section
    id: appointments
    name: "Appointments"
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
      path: supabase/migrations/20261110000000_employees_capacity_and_usernames.sql
    - part: other
      path: supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql
    - part: other
      path: supabase/migrations/20261111000000_client_contact_directory_flag.sql
    - part: test
      path: src/app/components/dashboard/dashboard.spec.ts
---

## Short Description

This section describes creating, editing, assigning, changing the status of, and removing salon appointments, including confirmed-slot conflict rules.

## Description

This section describes appointment records shown for a selected date in the dashboard. An appointment contains client identity and contact details, date and time, optional service and notes, status, reminder-consent state, creation time, and an Admin or employee assignment. The configured repository maps these records to the Supabase `appointments` table. Historical employee assignment is retained as an employee reference and display-name snapshot; older assignments without a surviving employee ID can be represented by the saved name.

## Functional Characteristics

- Shows only **Agenda** as the agenda screen heading, without the promotional eyebrow or subtitle.
- Shows appointments for the selected date in time order; directional image buttons move to the previous or next calendar day, and the **Oggi** control returns to today.
- Manages appointments through a form with required client first name, last name, phone, date, and time. Service, notes, client link, reminder consent, and assignee are also available.
- Opens a new appointment with no client selected and blank client-detail fields; explicitly selecting a saved client fills those details, while choosing the empty “Nuova cliente” option clears them. This TODO is complete; remaining requests are in the [project TODO](../../todo).
- Selects date and time with native browser picker controls; appointment time selection is restricted to 30-minute increments.
- Adds a new client record when saving an appointment. The **Aggiungi anche alla Rubrica Clienti** checkbox determines whether it appears in the Clients directory; unchecked appointment-linked clients remain available to their appointments but are hidden from the directory.
- Shows icon-only edit and delete actions for appointment cards; each keeps an accessible text label. The corresponding TODO is already satisfied in the current interface.
- Prefills contact fields and consent state when the operator selects a saved client. A matching phone number can also link a new appointment to an existing client.
- Assigns an appointment to Admin or an active employee. Existing appointments assigned to archived employees or legacy deleted employees retain a non-active historical assignment while edited.
- Validates phone numbers and checks confirmed appointments for a time slot: no more than three confirmed appointments and no duplicate assignee. Cancelled or completed appointments are excluded from this client-side conflict check.
- Manages status changes between confirmed and cancelled from the appointment card; the interface also displays completed status when present in data.
- Deletes an appointment only after browser confirmation. Deleting a client does not delete appointments.
- The database migration adds a unique confirmed-assignee constraint and a database capacity trigger. This database enforcement applies only when the migration has been deployed; a local build does not prove deployment.

## Interfaces And Protocols

The operator uses the date picker, appointment form, and card actions. The dashboard validates the requested confirmed slot before saving, then saves the client and appointment through the repository. If a repository operation fails, the form displays a generic error. The Supabase repository sends appointment and client upserts or deletes through the authenticated Data API; live persistence depends on backend configuration and policies.

## Dependencies And Relationships

Appointments relate to a client, an optional employee, salon service names, reminder consent, and the configured repository. The dashboard conflict check is implemented in `findAppointmentConflict`; the migrations independently enforce confirmed capacity and assignee uniqueness in a configured database. See [Clients](clients.md), [Employees](employees.md), [Salon Settings](salon-settings.md), and [Supabase Authentication and Storage](../backend-integration/supabase-authentication-and-storage.md).
