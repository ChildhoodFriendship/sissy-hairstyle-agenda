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
    - part: stylesheet
      path: src/app/components/dashboard/dashboard-shell.css
    - part: stylesheet
      path: src/app/components/dashboard/dashboard-content.css
    - part: stylesheet
      path: src/app/components/dashboard/dashboard-responsive.css
    - part: stylesheet
      path: src/app/components/dashboard/dashboard-premium.css
    - part: component
      path: src/app/components/login/login.ts
    - part: component
      path: src/app/components/login/forgot-password.ts
    - part: stylesheet
      path: src/styles.css
    - part: other
      path: src/app/library/theme.ts
    - part: model
      path: src/app/library/models.ts
    - part: other
      path: src/app/library/domain-utils.ts
    - part: resource
      path: public/assets/whatsapp.svg
---

## Short Description

This section documents consent-gated WhatsApp reminder link preparation and the application's browser-persisted, dark-first light and dark appearance choice.

## Description

This section describes two dashboard behaviors: preparing a WhatsApp URL containing a rendered message, and toggling the visual theme. The application does not send WhatsApp messages itself. The operator reviews and sends the prepared message in WhatsApp. The selected theme is stored in the browser under `sissy-agenda-theme`; a first visit defaults to dark unless a saved light choice exists. Shared palette, typography, and motion tokens are defined in `src/styles.css` without external font or animation dependencies. Dashboard presentation rules are split across four ordered component stylesheets, preserving Angular encapsulation and lazy loading. Burgundy is the primary action accent: `#7D3F4C` in light mode and `#D899A3` in dark mode.

## Functional Characteristics

- Does not show a reminder counter or a pending-reminder card: the previous calculation counted consented appointments for the next day but could not track whether a message was prepared or sent. The appointment's WhatsApp action is icon-only in its expanded card and retains an accessible name.
- Opens a `wa.me` link only when consent is recorded on the appointment and the saved phone number is valid for the Italian destination. If consent is absent, the action is disabled; if the saved prefix is invalid, a notice appears without opening WhatsApp.
- Uses the local `public/assets/whatsapp.svg` icon for the action. The icon glyph is from Simple Icons (CC0 1.0); WhatsApp remains a third-party trademark.
- Generates message text from the configured template using `nome`, `data`, `ora`, `servizio`, and `salone` placeholders. The link opens in a new tab with the text URL-encoded.
- Does not send the message, verify WhatsApp delivery, or schedule automatic delivery.
- Configures light or dark mode with the login or dashboard theme control and stores the explicit choice in browser local storage. On initialization, the application reads `sissy-agenda-theme`; when no valid light choice is stored, it opens in dark mode. Storage failures do not prevent an in-session theme change, but can affect retention.
- Synchronizes the browser `theme-color` metadata with the active palette. The login, password-recovery, and dashboard surfaces use the same warm-neutral palette; the dashboard retains its native date and form controls in the selected color scheme.
- Shows operation feedback in dismissible toasts that auto-close after about three seconds; the browser-storage warning remains a separate persistent alert.

## Interfaces And Protocols

The operator opens a reminder from an appointment card. The browser opens `https://wa.me/<number>?text=<encoded message>` in a new tab with `noopener,noreferrer`. WhatsApp interaction and final sending occur outside the application. Theme selection is a local browser-storage interaction; no external service is involved.

## Dependencies And Relationships

Reminder preparation depends on the appointment's consent and saved phone number; it does not track delivery. Message rendering depends on the template in [Salon Settings](salon-settings.md). Appointment consent and client fields are described in [Appointment Management](appointments.md) and [Client Management](clients.md).
