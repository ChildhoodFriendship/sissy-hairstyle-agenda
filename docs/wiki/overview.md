---
title: "Appointment Agenda Application"
status: active
role: application
---

## Short Description

This application manages a salon's appointment agenda and client contact records through an Angular interface with a Supabase-backed authentication and data layer.

## Description

This application provides the salon operator with a daily agenda, a manageable client list, a team roster, configurable services, WhatsApp reminder preparation, and salon preferences. Appointments can be assigned to Sissy or a saved employee; each confirmed time slot accepts up to three appointments, with no duplicate assignee in the same slot. Existing clients can be selected when creating appointments, and their contact details are prefilled. The interface offers persistent light and dark themes. Supabase Auth manages account credentials, while row-level security scopes salon records to the signed-in account. WhatsApp links prepare a reminder for manual review and sending; they do not transmit a message.

The wiki is organized into the [agenda area](agenda/overview.md), which documents appointment, client, employee, salon-setting, and reminder behavior, and the [backend integration area](backend-integration/overview.md), which documents authentication, the database boundary, activation prerequisites, and verified limitations.

## Functional Characteristics

- Manages client, employee, appointment, service, and salon-preference records through the configured agenda repository; `public.salon_services` and `public.salon_settings` are owner-scoped with RLS.
- Shows only “Agenda” as the agenda page heading, without the promotional eyebrow or subtitle; the dashboard header omits the “Area riservata” label.
- Assigns confirmed appointments to Sissy or one saved employee, with a maximum of three appointments per date/time slot.
- Registers accounts with username, email, and password and accepts username/password login through a Supabase Edge Function.
- Shows a dedicated email-based password recovery page.
- Prefills appointment contact details when the operator selects a saved client.
- Adds and edits client records from the client screen.
- Opens a consent-gated WhatsApp reminder from an appointment card for review and manual sending.
- Configures light or dark appearance from the login or agenda screen; the selected theme is retained in the browser.
- Authenticates operators through Supabase Auth when the project configuration and database setup are available.
- Shows a recovery flow for requesting an email link and setting a replacement password after Supabase verifies the recovery session.
- Uses `+39` as the default telephone country prefix when normalizing Italian numbers.
- Selects appointment date and time through native picker controls rather than direct text entry; time selection uses 30-minute increments.
- Chooses whether a client created through an appointment also appears in the client directory.
- Shows save-success and save-failure feedback in dismissible, auto-closing toasts; field validation remains inline and the browser-storage warning remains persistent.
- Displays notifications at the top of the dashboard and uses a reusable, animated, top-aligned in-app confirmation dialog for destructive actions.
- Builds reminder templates in a guided editor with insertable appointment fields and a live sample preview.
- Keeps “Area riservata” on Login only in the pill next to the theme control and removes the decorative Login footer.
- Does not verify a live Supabase deployment, SMTP delivery, or WhatsApp delivery as part of a local build.

## Responsive Layout

Login switches to a stacked story-and-form layout at widths up to 900 px, covering tablet portrait widths. On narrow touch layouts and wider coarse-pointer devices such as iPad in landscape, the theme toggle and interactive recovery/registration controls have at least 44 px touch targets. Page entrances, modal surfaces, and theme changes use brief transitions; touch buttons provide press feedback, while reduced-motion preferences suppress movement and scroll snapping. See the [agenda responsive layout](agenda/overview.md#responsive-layout) for dashboard navigation, safe-area, small-screen date controls, and mobile employee-column behavior.

## Interfaces And Protocols

The browser loads `/supabase-config.json` and uses the Supabase JavaScript client with a publishable key. Authenticated data requests use the Supabase Data API for clients, employees, and appointments; row-level security restricts rows to the authenticated owner. Username login exchanges the identifier and password through the `login-with-username` Edge Function, which returns a Supabase session. Password recovery uses Supabase Auth email delivery and a configured application redirect URL.

## Dependencies And Relationships

The application depends on the Supabase project configuration, all migrations under `supabase/migrations/` applied in filename order, authenticated accounts, the username-login Edge Function, and owner-scoped RLS policies. Runtime activation instructions are in [`supabase/README.md`](../../supabase/README.md) and [`supabase/USER-SETUP.md`](../../supabase/USER-SETUP.md).

## Procedures

### Activate the Supabase-backed deployment

1. Apply all SQL migrations in `supabase/migrations/` in filename order in the intended Supabase project, including `20261122000000_create_salon_services.sql` and `20261123000000_create_salon_settings.sql`.
2. Set the project's publishable key in `public/supabase-config.json`; do not expose a secret or service-role key.
3. Configure the allowed Auth redirect URLs and, for production password recovery, a verified SMTP sender.
4. Create the operator account through Supabase Auth and test login, row access, and recovery email delivery.
5. Verify that one account cannot read or change another account's rows before adding real customer data.

For the example salon service list, run [`supabase/seed-salon-services.sql`](../../supabase/seed-salon-services.sql) after replacing its Auth user UUID placeholder.

The local build does not perform these provider-side steps. See the [operator setup guide](../../supabase/USER-SETUP.md) for the full workflow.

<!-- user-manual-it:start:intro -->
# Sissy Hairstyle Agenda

## Manuale utente

**Versione applicativa:** da completare prima della distribuzione

**Lingua:** italiano

## Informazioni sul documento

Questo manuale descrive i flussi visibili all’operatore. Prima di distribuirlo, il gestore deve verificare la versione dell’app e completare i recapiti di assistenza riportati alla fine. Le funzioni che dipendono da Supabase sono disponibili solo quando l’istanza è configurata.

## Indice

- [1. Introduzione](#1-introduzione)
- [2. Panoramica del software](#2-panoramica-del-software)
- [3. Primi passi](#3-primi-passi)
- [4. Panoramica dell’interfaccia](#4-panoramica-dellinterfaccia)
- [5. Moduli dell’interfaccia](#5-moduli-dellinterfaccia)
- [6. Risoluzione dei problemi](#6-risoluzione-dei-problemi)
- [7. Informazioni di supporto](#7-informazioni-di-supporto)

## Glossario

| Termine | Significato |
|---|---|
| Appuntamento | Prenotazione con cliente, data, ora e, quando indicati, servizio, note e persona assegnata. |
| Cliente in rubrica | Contatto mostrato nella schermata **Clienti**. Un appuntamento può contenere i dati di una cliente senza aggiungerla alla rubrica. |
| Dipendente | Persona del team assegnabile agli appuntamenti quando è attiva; non è un account di accesso separato. |
| Consenso WhatsApp | Consenso registrato per il cliente e richiesto per preparare dall’app il collegamento a WhatsApp. |
| Promemoria | Testo preparato dall’app e aperto in WhatsApp per revisione e invio manuale. |

## 1. Introduzione

Questo manuale spiega come accedere a Sissy Hairstyle Agenda e usare l’agenda, la rubrica clienti, il team e le impostazioni. È rivolto alla persona che gestisce il salone con un account autorizzato.

L’interfaccia descritta non garantisce che un’istanza specifica sia configurata o raggiungibile. Registrazione, accesso, salvataggio dei dati e consegna delle email dipendono anche dalla configurazione del gestore.

## 2. Panoramica del software

L’applicazione consente di consultare e gestire gli appuntamenti per data, aggiungere clienti e dipendenti, configurare i servizi e il testo dei promemoria, e scegliere il tema chiaro o scuro. Gli appuntamenti possono essere assegnati a Sissy o a un dipendente attivo.

Quando il backend è configurato, i dati del salone sono associati all’account autenticato. Le preferenze del tema e la sessione di accesso restano nel browser. Un messaggio WhatsApp non viene inviato automaticamente: l’app prepara un collegamento che l’operatore deve controllare e inviare manualmente.
<!-- user-manual-it:end:intro -->

<!-- user-manual-it:start:support -->
## 6. Risoluzione dei problemi

### Non riesco a registrarmi o non arriva l’email

Controlla i dati richiesti e riprova. La registrazione può dipendere dalle impostazioni dell’istanza e la conferma a schermo non dimostra che un’email sia stata consegnata. Controlla la posta indesiderata; se il problema continua, contatta il gestore senza inviare password o codici.

### Non riesco ad accedere

Verifica username e password e, se hai appena creato l’account, completa l’eventuale conferma email. Se il problema persiste, contatta il gestore dell’istanza.

### Non riesco a salvare un appuntamento

Controlla i campi obbligatori, la data e l’ora. Per lo stesso orario possono esserci al massimo tre appuntamenti confermati e la stessa persona non può essere assegnata due volte. Se compare un errore, annota il messaggio e contatta il gestore.

### Non vedo fasce orarie disponibili

Verifica che per quella data sia stato impostato un turno per Sissy o per il dipendente attivo. Un giorno senza fasce salvate non mostra orari prenotabili. Gli appuntamenti già presenti restano consultabili.

### Le impostazioni o i servizi mostrano un avviso

Non considerare salvate le modifiche se l’app segnala che le impostazioni o i servizi non sono raggiungibili su Supabase. Contatta il gestore perché verifichi la connessione e la configurazione del database.

### Il pulsante WhatsApp non è disponibile

L’azione richiede il consenso WhatsApp registrato per l’appuntamento e un numero valido per la destinazione italiana. L’app apre WhatsApp solo per consentire la revisione e l’invio manuale.

### Il tema non viene mantenuto

La scelta del tema è conservata nel browser. Se la memoria locale viene cancellata o il browser impedisce l’archiviazione, la preferenza può andare persa.

## 7. Informazioni di supporto

Il gestore deve completare questi dati prima della distribuzione; non inserire recapiti non verificati.

| Informazione | Valore |
|---|---|
| Referente | Da completare dal gestore |
| Email o telefono | Da fornire |
| Orari di assistenza | Da definire |
<!-- user-manual-it:end:support -->
