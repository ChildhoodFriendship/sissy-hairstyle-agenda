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

The app opts into edge-to-edge mobile viewport rendering (`viewport-fit=cover`) so safe-area insets can be applied to the fixed navigation, dialogs, and toast. On viewports up to 900 px, the dashboard switches to a fixed bottom navigation bar; it respects horizontal/bottom safe areas and reserves space so content can scroll above it. The previous/next-day and “Oggi” controls remain vertically centered alongside the selected-day control. This first responsive backlog item is marked complete; remaining requests are tracked in the [project TODO](../../todo). Touch controls and form fields use 44 px minimum targets on the bottom-navigation layout and on wider coarse-pointer devices such as tablets, including page actions and date/search controls. The client list keeps its action buttons grouped below the customer details and wraps them at narrow widths, including the intermediate 901–1050 px layout, rather than creating implicit narrow grid columns. On screens up to 420 px, the date controls switch to a compact grid. All modal dialogs use a full-screen centered scrim, and operation toasts now appear centered horizontally and vertically as well. Toasts are bounded by the viewport height and scroll when needed on short mobile screens; the close control remains a 44 × 44 px target, resets browser-default padding, and centers its × glyph. The daily agenda shows one column for Sissy and each registered employee. On mobile, one person's column fills the available width at a time, with horizontal scrolling that snaps to one full employee agenda at a time; the “Mostra” selector filters the view to one person or restores all agendas, and a scroll cue appears in the all-agendas view when at least two columns are available. The appointment total appears below the selected date on mobile. Collapsed appointment cards retain a brief service preview, separate service and phone details when expanded, and keep their action buttons in one non-wrapping row. Available-time buttons form three equal-width columns within each employee column on mobile. Sidebar navigation icons are black in light mode and white in dark mode, including in the fixed bottom navigation. Employee names stay horizontal. Icon-bearing dashboard buttons use flex/grid alignment. Dashboard sections and dynamic rows enter with a brief opacity-and-rise transition, with a short stagger across appointment, client, and employee lists. Appointment details expand and collapse smoothly while the collapsed content remains inert and hidden from assistive technology. Modal surfaces and the native work-hours dialog enter with a restrained scale-and-rise motion, and theme changes ease across major surfaces. Press feedback is available to touch users; hover lift is limited to fine pointers. With `prefers-reduced-motion: reduce`, animations and transitions become near-instant, entrance delays and transforms are removed, and agenda scroll snapping is disabled.

## Interfaces And Protocols

The operator interacts with the dashboard through its date controls, lists, forms, and settings view. The repository reads and writes agenda data through the configured Supabase Data API; detailed provider setup is documented in the [backend integration area](../backend-integration/overview.md).

## Dependencies And Relationships

This area depends on the dashboard component, agenda domain models, repository implementation, and the Supabase integration when configured. See [Supabase Authentication and Storage](../backend-integration/supabase-authentication-and-storage.md).
