---
title: "Documentation log"
status: active
role: status-data
---

## Description

This page records documentation changes; entries are historical and do not represent current runtime verification.

## Documentation log

### 2026-11-24 — database constraints and Vercel notice

- Compared the local migrations with client, appointment, employee, schedule, service, settings, and registration flows. Added frontend length/format/slot checks, unique-conflict detection, and specific Italian database-error messages; updated the related Wiki pages and TODO. PostgreSQL remains authoritative for concurrent writes and records not loaded in the UI.
- Recorded the Vercel email analysis: `docs/manual/requirements.txt` is consistent with automatic Python-project detection, while the root `vercel.json` configures the Angular app. No Vercel project, dashboard setting, or deployment was changed or live-verified.
- Verification: `npm test` passed (91 tests, 12 files); `npm run build` and `npm run validate-wiki` passed; `git diff --check` passed with informational LF→CRLF warnings for the two Auth files. The build reported Node.js v23.11.0 as a non-LTS odd-numbered version.
- No live Supabase schema was queried, migrations were applied, or Vercel production deployment was inspected.

### 2026-11-24 — frontend guardrail follow-up

- Added an exact repository lookup before client creation, duplicate-phone feedback in the client form, and an appointment preflight that links an existing client instead of inserting a duplicate. Added stable 500-row pagination with exact counts for Supabase collection reads; absent or changed counts and empty pages before the expected count fail closed.
- Strengthened legacy LocalStorage settings validation, added targeted messages for settings constraint failures and delete authorization errors, and mapped the known generic Supabase Auth profile-trigger error to a user-facing profile-save hint. These lookups/checks are preflights; database constraints remain authoritative for races.
- Updated the corresponding agenda/authentication Wiki pages and `docs/todo`. Preserved the separate Vercel analysis; no Vercel project/deployment or live Supabase/Auth state was checked or changed.
- Verification: `npm run test` passed (101 tests, 14 files); `npm run build`, `npm run validate-wiki`, and `git diff --check` passed. The build emitted the existing Node.js v23.11.0 non-LTS warning; Git emitted line-ending conversion warnings for source files.
- Browser rendering, live Supabase schema/Auth behavior, and Vercel dashboard/deployment were not verified.

### 2026-11-24 — review follow-up

- Kept compatible legacy settings without `demoDataEnabled` loadable with the false default; malformed settings are no longer migrated as defaults or removed from browser storage.
- Collection reads now reject a changed exact row count between pages rather than returning a potentially shifted list. Separate PostgREST requests still do not provide a transaction snapshot; count-preserving concurrent changes remain a documented limitation.
- Added regression tests for legacy settings preservation and page-count drift.
- Verification after the review fixes: `npm run test` passed (105 tests, 14 files); `npm run build`, `npm run validate-wiki`, and `git diff --check` passed. The build reported Node.js v23.11.0 as an odd, non-LTS version.

### 2026-11-24 — settings migration isolation

- Separated invalid-settings state from the repository-wide LocalStorage warning, so malformed unrelated local collections no longer suppress migration of valid legacy salon preferences.
- Treat only a missing settings key (`null`) as absent; empty or malformed stored values are preserved and never migrated as defaults.
- Migrate legacy service names additively to the owner-scoped catalog and verify the readback before removing the browser record; the settings form blocks writes when settings or services failed to load.
- Added regression coverage for unrelated LocalStorage corruption, empty legacy settings, legacy service catalog migration/preservation, settings-save blocking, unavailable exact counts, and empty pages before the reported total.
- Refreshed actionable TODO source references after the code changes and narrowed the remaining Supabase setup-documentation item to the fresh-install path in `USER-SETUP.md`.
- Verification after the empty-value fix: `npm run test` passed (109 tests, 14 files); `npm run build` completed with the dashboard as a lazy chunk; `npm run validate-wiki` and `git diff --check` passed. Node.js v23.11.0 reported the odd, non-LTS warning.
- Final verification after service migration and settings-save guard: `npm run test` passed (112 tests, 14 files); `npm run build` completed with the dashboard as a lazy chunk; `npm run validate-wiki` and `git diff --check` passed. Node.js v23.11.0 reported the odd, non-LTS warning.

### 2026-11-23 — generated Italian user manual

- Added marked Italian source blocks to the relevant wiki pages and a deterministic generator for `docs/manual/user-manual-it.md`, DOCX and PDF. Added a replaceable `.dotx` template, pinned Python dependencies, usage instructions, and source/text-preservation tests.
- Removed `docs/queries/daily_work_schedules.sql.txt` after verifying it was byte-identical to the canonical ordered migration. Kept the migration history intact because live application status was not freshly verified; no SQL was applied.
- Verification: wiki validation passed; all 5 manual-generator tests passed using the pinned document environment; generated Markdown passed `--check`; DOCX/PDF content checks passed and the PDF rendered to 5 pages. Angular tests/build were not run under the repository's VM restriction.

### 2026-11-23 — static bug audit

- Added source-backed bug candidates and verification follow-ups to the project TODO. The audit did not run tests, build, browser checks, or live Supabase/Vercel verification; the previously logged eight test failures remain unverified on current `main`.

### 2026-11-22 — one employee per mobile agenda view

- Mobile agenda columns now snap horizontally one employee at a time and prevent a swipe from skipping columns; the scroll cue appears in the all-agendas view when two or more columns are available. The reduced-motion preference continues to disable snapping.

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

### 2026-11-23 — top-aligned popup and confirmation UI

- Moved dashboard notices and modal surfaces to the top safe area, refined their entrance motion, and standardized close controls as centered 44 × 44 px targets. The native work-hours dialog now opens at the top as well.
- Replaced browser-native confirmations for deleting appointments, clients, and employees with a reusable accessible in-app dialog.
- Added dashboard coverage for opening and dismissing the confirmation dialog. Tests, build, and browser rendering were not run in this VM under the repository restrictions.
- Salon-settings persistence was still pending at that point; the later read-only schema result and migration work are recorded below. No SQL was executed or applied.

### 2026-11-23 — owner-scoped salon settings

- Added `public.salon_settings` persistence and an RLS migration. Legacy browser settings are copied with a conflict-safe insert only when the owner has no remote row, then removed after a successful read-back; unavailable remote storage shows a warning and does not silently save locally. Theme preference and Supabase Auth session remain browser-side.
- The supplied read-only schema output showed `public.salon_services` with RLS and no `salon_settings` entry. The migration SQL was added but not executed or applied to Supabase.
- Focused repository settings tests (4 cases), the dashboard-unavailable-settings test, top-aligned toast/confirmation tests, and all 7 work-hours-editor tests passed. The broader `--filter="Dashboard"` run had 18 passing and 6 failing assertions in unrelated dashboard form, phone-display, and archive tests already recorded as baseline debt. No production build or browser rendering was run.
