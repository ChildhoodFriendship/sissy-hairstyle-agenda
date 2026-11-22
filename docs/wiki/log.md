---
title: "Documentation log"
status: active
role: status-data
---

## Description

This page records documentation changes; entries are historical and do not represent current runtime verification.

## Documentation log

### Collapsible appointments and reminder cue

- Added per-appointment disclosure controls in the agenda without changing stored records. Removed the summary reminder count and next-day reminder card: neither could represent actual message preparation or delivery. The manually opened WhatsApp action remains on expanded cards. Tests and build were not run on this VM under repository restrictions.

### Italian phone prefix validation

- Documented rejection of explicit non-Italian prefixes on save and suppression of WhatsApp preparation for existing appointments whose saved number does not carry a valid `+39` prefix. No stored records are rewritten; live data was not inspected. Tests and build were not run on this VM under repository restrictions.

### Italian phone number display

- Hid the Italian prefix in the client list, client editor, appointment cards and appointment phone form while retaining normalized numbers for persistence and WhatsApp. Other international prefixes are left intact to avoid misrepresenting historical numbers.
- Updated the client and appointment wiki and Italian manual. Tests and build were not run on this VM under repository restrictions.

### Appointment status display

- Removed the confirmed count and label from the agenda UI while retaining `confirmed` as the stored default for new appointments. Removed the cancel/reactivate card action; historical cancelled and completed badges remain visible.
- Updated the appointment wiki and Italian manual. Automated tests and builds were not run on this VM under repository restrictions.

### 2026-11-20 — project documentation standardization

- Moved the canonical documentation schema to the repository root and retained `docs/wiki/SCHEMA.md` as a compatibility pointer.
- Replaced the Angular scaffold README with a project guide and a summary of the declared commands.
- Updated the wiki index and repository instructions; the user manual remains separate from the technical wiki.
- No install, build, test, or remote-service checks were run during this work.

### 2026-11-21 — default daily work hours

- Added default bookable appointment starts from 08:30 through 19:30 (closing at 20:00) when no per-person schedule exists for a date; explicit saved shifts and days off still take precedence.
- The dashboard persists the default schedule for the selected person/date before creating a confirmed appointment, as required by the database trigger.
- Tests and build were not run because repository instructions prohibit them in this VM.

### 2026-11-21 — responsive employee agenda

- Limited the mobile agenda viewport to two employee columns, with horizontal scrolling for larger teams and a single-person view control.
- Kept employee names horizontal and updated the agenda wiki, project overview, and TODO status.
- Automated tests, build, and browser rendering were not run because repository instructions prohibit them in this VM.

### 2026-11-22 — motion and tablet refinement

- Added restrained page/list entrance motion, staggered appointment/client/employee rows, animated appointment disclosure and modal surfaces, smooth theme-surface transitions, and tactile button feedback. Hover lift is limited to fine pointers; reduced-motion mode suppresses transforms, delays, and agenda snapping.
- Aligned client-list actions below customer details at 901–1050 px and raised login theme/recovery/registration targets to 44 px on coarse-pointer tablets.
- Verification: production build and wiki validation passed; focused appointment-disclosure and login tests passed. The full suite reports 58 passed and 8 existing failures in phone, form, style, and archive assertions. Browser checks covered login/recovery at 390, 834, and 1024 px with no horizontal overflow or console errors; authenticated dashboard visual review was unavailable because no saved login was present.
