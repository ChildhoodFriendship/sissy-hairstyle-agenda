---
title: "Documentation log"
status: active
role: status-data
---

## Description

This page records documentation changes; entries are historical and do not represent current runtime verification.

## Documentation log

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
