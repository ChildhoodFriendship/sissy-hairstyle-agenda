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
    - part: component
      path: src/app/components/confirmation-dialog/confirmation-dialog.ts
    - part: resource
      path: src/bundle/it.ts
    - part: model
      path: src/app/library/models.ts
    - part: other
      path: src/app/library/domain-utils.ts
    - part: other
      path: src/app/library/database-constraints.ts
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
    - part: other
      path: supabase/migrations/20261110000000_employees_capacity_and_usernames.sql
    - part: other
      path: supabase/migrations/20261107000000_create_agenda_core.sql
    - part: other
      path: supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql
    - part: other
      path: supabase/migrations/20261121000000_daily_work_schedules.sql
    - part: other
      path: supabase/migrations/20261125000000_appointment_duration_and_overlap.sql

    - part: test
      path: src/app/components/dashboard/dashboard.spec.ts
    - part: test
      path: src/app/api/supabase-agenda-repository-constraints.spec.ts
---

## Short Description

This section describes creating, editing, assigning, and removing salon appointments, including explicit durations, acknowledged overlaps, and confirmed-slot capacity rules.

## Description

This section describes appointment records shown for a selected date in the dashboard. An appointment contains client identity and contact details, date, start time and duration, optional service and notes, status, reminder-consent state, creation time, and a Sissy or employee assignment. The configured repository maps these records to the Supabase `appointments` table. Historical employee assignment is retained as an employee reference and display-name snapshot; older assignments without a surviving employee ID can be represented by the saved name. The old schema stored no duration, so existing records receive the 30-minute default and longer historical bookings must be reviewed and corrected before relying on overlap availability. New and edited durations are saved in 30-minute increments from 30 minutes through 12 hours.

## Functional Characteristics

- Shows only **Agenda** as the agenda screen heading, without the promotional eyebrow or subtitle. In the daily agenda card, the selected date appears under the **OGGI** or **AGENDA DEL GIORNO** eyebrow, followed by **Appuntamenti totali: N**. The date control contains only the date and has its own accessible name. The redundant summary and reminder counter are not shown. New appointments are stored as `confirmed` without displaying that state; only cancelled or completed appointments show a status badge.
- Shows appointments for the selected date in time order, grouped into one column for Sissy and one for each registered employee. Columns show appointment counts and remain visible when empty; historical assignments without a current employee record remain visible in a separate historical column. On viewports up to 900 px, the all-people agenda scrolls horizontally with one employee column centered at each snap point and neighboring columns partially visible; single-person view centers the same column. A person selector chooses one agenda or restores all agendas. Employee names remain horizontal. Directional image buttons move to the previous or next calendar day, and the **Oggi** control returns to today.
- Shows each appointment expanded by default. Its keyboard-accessible disclosure control collapses or reopens only that card: time, client name, a service preview, and any historical status remain visible, while phone, notes, and the message/edit/delete actions collapse with a brief motion and remain inert and hidden from assistive technology. When expanded, service and phone are arranged on separate lines and the mobile action buttons remain together in one non-wrapping row. This is temporary frontend state and does not change appointment data.
- Manages appointments through a form with required client first name, last name, phone, date, and time. Service, notes, client link, reminder consent, and assignee are also available.
- Opens the appointment form dialog at the top of the viewport and centers its close icon in a fixed 44 × 44 px button.
- Opens a new appointment with no client selected and blank client-detail fields; explicitly selecting a saved client fills those details, while choosing the empty “Nuova cliente” option clears them. This TODO is complete; remaining requests are in the [project TODO](../../todo).
- **Modifica turno** edits the selected calendar date for Sissy or one active employee. Split shifts and days off are supported. When no schedule is saved for that person/date, the default is 08:30–20:00, with appointment starts every 30 minutes through 19:30. Saving an explicit schedule, including a day off, overrides that default. Archived and historical columns remain readable and cannot be booked.
- **Orari liberi** lists half-hour starts within the person's shift and hides a start only when it has reached the salon-wide capacity of three confirmed appointments. A start that would overlap another confirmed appointment for the same person remains selectable but is visibly marked; choosing it opens the form with a 30-minute default duration. When schedule data has loaded successfully, the end-time choices cover only durations whose complete half-hour slots fit the person's shift. Choosing an available start prefills date, time and assignee; existing appointments remain visible even outside the updated shift. On mobile, available-time buttons use three equally divided columns within each employee column. Horizontal divider lines are shown only between non-empty sections: heading and appointments, or appointments and available times; an empty appointments or free-times list removes its adjacent divider.
- Activation requires the daily work schedules migration. When the default schedule is used for a new confirmed appointment, the dashboard saves that person's default slots for the date before saving the appointment, satisfying the database work-slot trigger. If the relation is missing, existing appointments and the previous native time picker remain available. Other failures to read shifts show an error and a retry action, not an all-day availability assumption.
- Adds a new client record when saving an appointment only when **Aggiungi anche alla Rubrica Clienti** is checked and no client with the normalized phone exists. If a match is absent from the loaded directory, the repository checks the exact phone in Supabase and links a matching record instead of attempting a duplicate insert. If the checkbox is cleared and there is no existing client selected or matched, the appointment is saved without a new client row and its `client_id` remains empty. If the client write succeeds but the appointment fails, the form keeps that client linked for retry and states that it was already added, preventing a second client insert. A duplicate-client error is reported as a client error rather than an unavailable time slot.
- While saving an appointment, the form becomes inert, submit and close controls are disabled, and the submit label changes to **Salvataggio…**; concurrent submissions are ignored. Appointment save success appears in a dismissible toast that closes after about three seconds; validation and conflicts remain inline.
- Shows icon-only edit and delete actions on appointment cards after the WhatsApp action. There is no cancel or reactivate action; the icon-only actions retain accessible labels.
- Prefills contact fields and consent state when the operator selects a saved client. A matching phone number can also link a new appointment to an existing client.
- Assigns an appointment to Sissy or an active employee. Existing appointments assigned to archived employees or legacy deleted employees retain a non-active historical assignment while edited.
- Validates phone numbers using `+39` as the country code and rejects an explicit different prefix on save; appointment cards and phone fields hide the Italian prefix, including when selecting a saved client or editing an appointment. The stored number retains its international form for matching and WhatsApp. Existing non-Italian phone values are not changed automatically, and WhatsApp preparation refuses a saved number without a valid Italian prefix rather than opening a link to the wrong recipient.
- Allows confirmed appointments for one person to overlap only after the operator explicitly confirms a dialog listing the existing and proposed time ranges. For a save that is otherwise within capacity, every confirmed appointment with current overlaps requires explicit confirmation, including an edit that changes only client or service details. Cancelled and completed records do not occupy capacity or trigger an overlap confirmation. The database rechecks overlaps under an assignee/day transaction lock and compares the exact displayed overlap snapshot. If the refreshed overlap set remains non-empty and differs from the acknowledged snapshot, the form asks for a new confirmation; if no overlap remains, it asks the operator to review and save again. The existing salon-wide limit remains three confirmed appointments with the same exact start time, regardless of assignee.
- Mirrors the database input limits in the form: first and last name are each 1–100 trimmed characters, the combined appointment client name is at most 201 characters, and the phone input is at most 24 characters (the database accepts stored phone strings of 7–24 characters). Appointment starts use a valid half-hour boundary and durations are 30–720 minutes in 30-minute increments; the full interval must fit in the saved shift and within the calendar day. Work schedules allow up to 48 distinct slot indexes from 0 through 47. The schedule editor and appointment form validate before writing.
- Explains database rejections by cause: an existing client phone, overlap requiring confirmation, the three-booking capacity limit, an appointment outside the saved shift, an unavailable linked client/employee, a missing feature migration, or a missing required field. Supabase collection reads request exact counts and fetch stable 500-row pages; a missing or changed count, or an empty page while the count says rows remain, is treated as a read error rather than an empty/available list. Separate page requests are not a transaction snapshot, so database constraints remain authoritative for concurrent changes and their rejections are mapped to a specific inline message.
- Shows cancelled and completed status labels for historical records when present in data; the appointment card does not change status. Editing retains the stored status.
- Deletes an appointment only after the operator confirms in the in-app dialog. Deleting a client does not delete appointments.
- The migration `20261125000000_appointment_duration_and_overlap.sql` adds `duration_minutes` and the transient JSONB `overlap_acknowledgement` snapshot, removes the former one-assignee-per-start unique index, and retains the three-booking capacity trigger. Under a transaction lock, database triggers compare the exact current overlap rows with the snapshot acknowledged by the operator; if the refreshed set remains non-empty and differs, the form requests refreshed confirmation, while an empty set prompts the operator to review and save again. They also validate each half-hour of newly created, rescheduled, resized or reassigned confirmed appointments against the saved shift. The user reported executing the migration in Supabase SQL Editor; read-only table metadata confirms the new columns, defaults, checks, and RLS, but does not expose the installed triggers, functions, or index. See the [Supabase setup](../../../supabase/README.md) for current verification limits.

## Interfaces And Protocols

The operator uses the date picker, appointment form, and card actions. The dashboard validates the requested confirmed interval before saving, checks whether a phone already belongs to a client when adding it to the directory, and presents the overlap dialog before an acknowledged write. It then saves the client only if needed and saves the appointment through the repository. The form blocks edits and repeat submissions while saving. If the client insert fails, its error is shown inline; if the client is saved but the appointment fails, the form keeps the saved client linked and explains how to retry without duplicating it. Appointment success appears in a dismissible toast; form validation, slot conflicts, overlap confirmation and delete failures use operation-specific messages. The Supabase collection reads request exact counts and fetch stable 500-row pages; these reads are not a transaction snapshot. Live persistence depends on backend configuration and policies. Frontend availability and duplicate checks are preflights only: database triggers remain authoritative for concurrent capacity, overlap and work-schedule writes.

## Dependencies And Relationships

Appointments relate to a client, an optional employee, salon service names, reminder consent, and the configured repository. The dashboard overlap preflight is implemented in `findAppointmentOverlaps`; the database independently enforces confirmed capacity, explicit overlap acknowledgement, and full-duration work-schedule coverage in a configured database. See [Clients](clients.md), [Employees](employees.md), [Salon Settings](salon-settings.md), and [Supabase Authentication and Storage](../backend-integration/supabase-authentication-and-storage.md).

<!-- user-manual-it:start:appointments -->
## 5. Moduli dell’interfaccia

### 5.1 Agenda

L’agenda mostra gli appuntamenti della data selezionata, divisi per Sissy e per ciascun dipendente. La scheda indica il totale degli appuntamenti. Usa **Giorno precedente**, **Giorno successivo** o **Oggi** per cambiare data; su schermi stretti puoi scorrere tra le colonne o filtrare la vista a una sola persona.

#### Creare un appuntamento

1. Apri **Agenda** e scegli **Nuovo appuntamento**.
2. Inserisci nome, cognome e telefono della cliente. Seleziona una cliente salvata per precompilare i dati oppure scegli **Nuova cliente** per svuotare i campi.
3. Se la nuova cliente deve comparire nella rubrica, seleziona **Aggiungi anche alla Rubrica Clienti**.
4. Scegli data, ora di inizio, ora di fine e persona assegnata. La durata predefinita è di 30 minuti; puoi selezionare intervalli più lunghi di mezz’ora in mezz’ora, entro il turno. Inserisci, se necessario, servizio, note e consenso WhatsApp.
5. Scegli **Salva appuntamento**. Durante una modifica, scegli **Salva modifiche**.

Inserisci un numero italiano senza prefisso: l’app aggiunge `+39` e rifiuta prefissi internazionali diversi. Data e ora sono selezionate con i controlli disponibili nel modulo.

Quando la gestione dei turni è disponibile, **Modifica turno** permette di impostare una o più fasce per la persona e la data selezionate. Per una pausa crea due fasce; per un giorno di riposo non inserirne. In **Orari liberi**, scegli una mezz’ora per aprire il modulo con data, ora e persona già selezionate. In assenza di turni personalizzati l’app usa la disponibilità predefinita; un turno salvato o un giorno di riposo la sostituisce.

Per lo stesso giorno e ora possono esserci al massimo tre appuntamenti confermati. La stessa persona può seguire più clienti in intervalli sovrapposti: prima del salvataggio l’app mostra gli appuntamenti già presenti e l’intervallo della nuova prenotazione. Scegli **Conferma comunque** solo se vuoi accettare la sovrapposizione; senza conferma l’appuntamento non viene salvato. Se l’agenda cambia durante il salvataggio, l’app aggiorna l’elenco: se restano sovrapposizioni diverse, chiede una nuova conferma; se non ne restano, invita a controllare i dati e salvare di nuovo. Gli appuntamenti annullati o completati non occupano la fascia. Il database precedente non registrava l’ora di fine: dopo la migrazione gli appuntamenti esistenti avranno una durata iniziale di 30 minuti. Correggi la durata degli appuntamenti più lunghi prima di fare affidamento sugli avvisi di sovrapposizione. Se la persona assegnata è stata archiviata, l’app conserva la sua indicazione negli appuntamenti storici.

#### Consultare e modificare

- Apri la freccia sulla scheda per mostrare o nascondere i dettagli e le azioni.
- Scegli **Modifica appuntamento** per aggiornare una scheda.
- Per rimuoverla, scegli **Elimina appuntamento** e conferma nella finestra dell’app. La conferma appare in alto; puoi chiuderla con **Annulla** o con la X.
- Non è disponibile un’azione per annullare o riattivare un appuntamento. Le etichette di stato già presenti restano visibili.

Gli errori di compilazione o di disponibilità sono mostrati nel modulo; l’esito del salvataggio appare come avviso temporaneo in alto. Eliminare una cliente dalla rubrica non elimina gli appuntamenti già registrati.
<!-- user-manual-it:end:appointments -->
