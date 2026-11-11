---
title: "Employee Management"
status: active
role: functional_module
navigation:
  - type: module
    id: agenda
    name: "Agenda"
  - type: page
    id: employees
    name: "Dipendenti"
source:
  technology: angular
  references:
    - part: component
      path: src/app/components/dashboard/dashboard.ts
    - part: model
      path: src/app/library/models.ts
    - part: repository
      path: src/app/api/supabase-agenda-repository.ts
    - part: other
      path: supabase/migrations/20261110000000_employees_capacity_and_usernames.sql
    - part: other
      path: supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql
    - part: test
      path: src/app/components/dashboard/dashboard-employee-archive.spec.ts
---

## Short Description

This section describes adding, editing, assigning, and archiving salon employees while preserving historical appointment assignments.

## Description

This section describes the employee roster available to the salon operator. Employee records contain an identifier, first name, last name, creation time, and active state. Active employees can be assigned to appointments; inactive employees remain available to represent historical assignments but are not offered for new assignments.

## Functional Characteristics

- Shows active employees in the team view.
- Manages employee records through a form requiring a non-empty first and last name. The database migration constrains each trimmed name part to 1–100 characters.
- Offers only active employees for new appointment assignment.
- Archives an employee when the operator chooses **Elimina** and confirms. The repository updates `is_active` to `false`; it does not physically delete the row.
- Retains existing appointments' employee ID and display-name snapshot when an employee is archived. Editing a prior appointment can continue to display its archived assignee as non-active.
- Preserves legacy appointment display names where the historical employee row was already deleted and no employee ID remains.
- Database RLS policies allow authenticated owners to select, insert, and update their employee rows; the migrations revoke physical deletion. This behavior depends on those migrations being applied to the target project.

## Interfaces And Protocols

The operator adds, edits, or archives an employee through the dashboard. The repository reads and upserts rows in `employees`; its archive operation issues an update to `is_active`. Errors are shown in the form or as a generic dashboard notice.

## Dependencies And Relationships

Employees can be assigned to appointments. Their historical relation and archival behavior are described in [Appointment Management](appointments.md). The live access boundary is described in [Supabase Authentication and Storage](../backend-integration/supabase-authentication-and-storage.md).
