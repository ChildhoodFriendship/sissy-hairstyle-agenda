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

- Shows the clients screen under the **Clienti** heading with a name-or-phone search beside the add-client button; the controls use a bounded grid and stack full-width below 420 px to stay within page padding.
- Shows the directory card heading as **I tuoi clienti**.
- Shows the WhatsApp reminder consent checkbox with masculine wording: **Il cliente ha acconsentito a ricevere promemoria WhatsApp**.
- Shows saved clients in name order and filters the list by name or phone. The directory and add/edit phone field hide the Italian `+39` prefix; saved numbers retain their normalized form for matching and WhatsApp. Numbers with a different country code remain visible as stored rather than being mistaken for Italian numbers.
- Manages client records through a form requiring first name, last name, and a valid phone number. Notes and WhatsApp consent are optional form values; adding a client from this screen always includes it in the directory. The add/edit dialog opens at the top of the viewport and centers its close icon in a fixed 44 × 44 px button.
- Normalizes telephone numbers using `+39` as the country prefix. Explicit non-Italian prefixes (including `+30` and `0030`) are rejected when saving instead of being mistaken for Italian numbers; invalid numbers prevent saving. Pasted Italian prefixes are removed from the form field but restored on save. Existing records are not rewritten automatically.
- Shows whether WhatsApp consent is recorded and counts appointments linked to each client.
- Opens a new appointment form from a client row through an agenda-icon-only button with a client-specific accessible label, and pre-fills the selected client details.
- When a saved client is selected during appointment creation, pre-fills their contact data and consent state. The appointment consent checkbox is persisted on the appointment and controls whether its WhatsApp reminder action is enabled.
- Deletes a client only after confirmation in the top-aligned in-app dialog; the confirmation states that appointments remain in the agenda. Appointment records retain their own name and phone snapshot.

## Interfaces And Protocols

The operator searches, adds, edits, or removes client records in the dashboard. A new client created here is included in the directory. The repository maps client fields to the Supabase `clients` table. Successful saves and repository failures appear in a dismissible toast that auto-closes after about three seconds; form validation remains inline. Appointment creation inserts a related client only when the directory checkbox is selected; otherwise it saves the appointment without a client link.

## Dependencies And Relationships

Clients are associated with appointments by client ID where available. Phone normalization is implemented in `normalizePhoneNumber`. The consent flag gates reminder preparation described in [WhatsApp Reminders and Themes](reminders-and-theme.md); appointment form behavior is described in [Appointment Management](appointments.md).

<!-- user-manual-it:start:clients -->
### 5.2 Clienti

La schermata **Clienti** contiene i contatti visibili nella rubrica. Puoi cercare per nome o telefono, vedere il consenso WhatsApp registrato e il numero di appuntamenti collegati.

#### Gestire la rubrica

1. Apri **Clienti** e scegli **Aggiungi cliente**.
2. Inserisci nome, cognome e telefono; aggiungi eventuali note e salva.
3. Usa **Modifica** per aggiornare un contatto. Per rimuoverlo, scegli **Elimina** e conferma nella finestra che appare in alto.
4. Per iniziare un appuntamento con i dati di una cliente, usa l’icona dell’agenda nella sua riga.

Inserisci il numero italiano senza prefisso `+39`: il prefisso non appare nel campo o nell’elenco, ma viene conservato nei dati. Numeri non validi o con un prefisso internazionale diverso non possono essere salvati. La cancellazione del contatto non elimina gli appuntamenti, che conservano i dati registrati al momento della prenotazione.
<!-- user-manual-it:end:clients -->
