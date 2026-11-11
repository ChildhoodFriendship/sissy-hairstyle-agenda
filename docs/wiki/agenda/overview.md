---
title: "Agenda"
status: active
role: application
navigation:
  - type: module
    id: agenda
    name: "Agenda"
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
    - part: test
      path: src/app/components/dashboard/dashboard.spec.ts
---

## Short Description

This area documents daily appointment management, employee assignment, salon clients, preferences, and reminder preparation in the dashboard.

## Description

This area covers the dashboard's agenda and the records that support it. The detailed behavior is split across [appointments](appointments.md), [clients](clients.md), [employees](employees.md), [salon settings](salon-settings.md), and [WhatsApp reminders and themes](reminders-and-theme.md). Persistent data operations use the configured agenda repository; a local build alone does not establish that a live Supabase project is configured or reachable.

## Functional Characteristics

The dashboard shows appointments for a selected calendar date and provides separate views for clients, employees, and salon settings. It uses client and employee records to prefill and assign appointments. Reminder links require recorded client WhatsApp consent and are opened for manual review and sending. The desktop sidebar ends with the logout action; it does not show a repeated salon identity or a claim that data is synchronized.

## Responsive Layout

The app opts into edge-to-edge mobile viewport rendering (`viewport-fit=cover`) so safe-area insets can be applied to the fixed navigation, dialogs, and toast. On viewports up to 900 px, the dashboard switches to a fixed bottom navigation bar; it respects horizontal/bottom safe areas and reserves space so content can scroll above it. Touch controls and form fields use 44 px minimum targets on the bottom-navigation layout and on wider coarse-pointer devices such as tablets, including page actions and date/search controls. The client list keeps its action buttons grouped below the customer details and wraps them at narrow widths, including the intermediate 901–1050 px layout, rather than creating implicit narrow grid columns. On screens up to 420 px, the date controls switch to a compact grid. The operation toast and its close control also respect the top/right safe area and use a 44 × 44 px close target.

## Interfaces And Protocols

The operator interacts with the dashboard through its date controls, lists, forms, and settings view. The repository reads and writes agenda data through the configured Supabase Data API; detailed provider setup is documented in the [backend integration area](../backend-integration/overview.md).

## Dependencies And Relationships

This area depends on the dashboard component, agenda domain models, repository implementation, and the Supabase integration when configured. See [Supabase Authentication and Storage](../backend-integration/supabase-authentication-and-storage.md).
