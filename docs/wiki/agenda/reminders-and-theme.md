---
title: "WhatsApp Reminders and Themes"
status: active
role: frontend
navigation:
  - type: module
    id: agenda
    name: "Agenda"
  - type: section
    id: reminders-and-theme
    name: "WhatsApp reminders and themes"
source:
  technology: angular
  references:
    - part: component
      path: src/app/components/dashboard/dashboard.ts
    - part: model
      path: src/app/library/models.ts
    - part: other
      path: src/app/library/domain-utils.ts
---

## Short Description

This section documents consent-gated WhatsApp reminder link preparation and the dashboard's browser-persisted light and dark appearance choice.

## Description

This section describes two dashboard behaviors: preparing a WhatsApp URL containing a rendered message, and toggling the visual theme. The application does not send WhatsApp messages itself. The operator reviews and sends the prepared message in WhatsApp. The selected theme is stored in the browser under `sissy-agenda-theme`.

## Functional Characteristics

- Shows a reminder count for confirmed, consented appointments on the day following the selected date; the count is a cue to prepare reminders, not a send queue or delivery status.
- Opens a `wa.me` link only when the associated saved client has WhatsApp consent. If consent is absent, the action is disabled and the application can show a consent-required notice.
- Generates message text from the configured template using `nome`, `data`, `ora`, `servizio`, and `salone` placeholders. The link opens in a new tab with the text URL-encoded.
- Does not send the message, verify WhatsApp delivery, or schedule automatic delivery.
- Configures light or dark mode with the dashboard theme control and stores the choice in browser local storage. On initialization, the dashboard reads `sissy-agenda-theme`; storage failures can affect retention.

## Interfaces And Protocols

The operator opens a reminder from an appointment card. The browser opens `https://wa.me/<number>?text=<encoded message>` in a new tab with `noopener,noreferrer`. WhatsApp interaction and final sending occur outside the application. Theme selection is a local browser-storage interaction; no external service is involved.

## Dependencies And Relationships

Reminder eligibility depends on appointment status, appointment date, appointment consent, and the saved client's consent flag. Message rendering depends on the template in [Salon Settings](salon-settings.md). Appointment consent and client fields are described in [Appointment Management](appointments.md) and [Client Management](clients.md).
