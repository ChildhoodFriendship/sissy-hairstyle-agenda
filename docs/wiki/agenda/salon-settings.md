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
    - part: other
      path: src/app/library/database-constraints.ts
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
    - part: other
      path: supabase/migrations/20261122000000_create_salon_services.sql
    - part: other
      path: supabase/migrations/20261123000000_create_salon_settings.sql
---

## Short Description

This section documents the salon name, service list, and message-template preferences managed by the dashboard.

## Description

This section describes the salon preferences form. `SalonSettings` also defines business-hour and demo-data fields, but the current dashboard settings view exposes the salon name, services, and reminder message template. Do not infer user-facing controls for fields that are not presented in this view.

## Functional Characteristics

- Configures the salon name and the list of service names.
- Stores salon-wide preferences, including the salon name, phone prefix, business hours, message templates, and demo-data state in the owner-scoped `public.salon_settings` row. The current dashboard exposes only the salon name and reminder template; other model fields do not imply visible controls.
- On first load with no remote row, migrates the legacy `sissy-agenda-settings-v1` browser record using a conflict-safe insert, then removes it only after the saved row is read back. If Supabase is unavailable, existing browser settings remain a display fallback and a warning is shown; saves do not silently write settings back to browser storage.
- Adds a trimmed service name of 1–100 characters unless a case-insensitive duplicate is already present; removes a service from the draft list using its row action. The list index supplies the non-negative database `position` value.
- Loads service names from `public.salon_services` and saves additions/removals to Supabase when **Salva impostazioni** is selected. The table is owner-scoped with RLS and enforces unique `(owner_id, name)`; database duplicate errors are reported as an existing service rather than a generic settings failure. If the table is unavailable, the settings page shows a database setup warning instead of presenting browser-only services as saved.
- Uses the full available content width for the settings panel.
- Configures the reminder template in a guided dialog rather than asking the operator to memorize placeholder syntax. The operator writes ordinary text, places the cursor, and inserts client name, date, time, service, or salon name using labeled buttons.
- Shows a live example preview with sample appointment values; it is illustrative and does not send a message.
- Saves the template with the rest of the settings draft through **Salva impostazioni**. Closing the editor with **Fatto** returns to the draft; it does not persist settings by itself.
- The salon name is editable in settings and is substituted when a reminder template contains `{salone}`.
- Sets `defaultCountryCode` to `+39` when saving settings. `SalonSettings` also models confirmation templates, business hours, closed weekdays, and demo-data state; this view does not expose controls for the latter fields.

## Interfaces And Protocols

The operator edits the settings form and selects **Salva impostazioni**. Salon preferences are stored in `public.salon_settings`; the service list is stored separately in `public.salon_services`. `SupabaseAgendaRepository` scopes both tables to the authenticated owner. Theme preference and the persistent Supabase Auth session remain browser-side. The save action prevents repeat submissions and reports validation or database errors inline. Settings and services are separate writes: if settings persist but service saving fails, the form explicitly reports the partial result; atomic service replacement remains a TODO. A dismissible toast reports complete save success, while separate alerts identify unavailable settings or services.

## Database Setup

Apply [`20261123000000_create_salon_settings.sql`](../../../supabase/migrations/20261123000000_create_salon_settings.sql) in the configured Supabase project after checking which migrations are already present. The read-only schema metadata supplied on 2026-11-23 showed `public.salon_services` with RLS and no `salon_settings` entry; this change did not execute the migration. After it is applied, a legacy local settings record is copied once when the owner has no remote row. To add example services, run [`seed-salon-services.sql`](../../../supabase/seed-salon-services.sql) after replacing its placeholder with the signed-in operator's Auth user UUID.

## Dependencies And Relationships

Service names appear in the appointment form, and the reminder template is used when preparing WhatsApp links. See [Appointment Management](appointments.md) and [WhatsApp Reminders and Themes](reminders-and-theme.md).

<!-- user-manual-it:start:settings -->
### 5.4 Impostazioni

La schermata **Impostazioni** contiene il nome del salone, l’elenco dei servizi e il testo del promemoria.

#### Modificare e salvare le preferenze

1. Apri **Impostazioni** e modifica il **Nome del salone** se necessario.
2. Per aggiungere un servizio, inserisci il nome e scegli **Aggiungi**. Usa **Rimuovi** per eliminarlo dall’elenco.
3. Scegli **Crea o modifica il promemoria** per aprire l’editor. Scrivi il messaggio e usa i pulsanti per inserire nome cliente, data, ora, servizio o nome salone nel punto desiderato.
4. Controlla l’anteprima, che è solo dimostrativa. Scegli **Fatto** per tornare al modulo.
5. Scegli **Salva impostazioni** per salvare le preferenze e i servizi.

Le preferenze del salone e i servizi sono salvati su Supabase nell’account del proprietario; non sono semplici preferenze locali del tema. La disponibilità dipende dalla configurazione del database e dalla connessione. Se compare un avviso di indisponibilità, non considerare le modifiche salvate e contatta il gestore. Il tema e la sessione di accesso restano nel browser.
<!-- user-manual-it:end:settings -->
