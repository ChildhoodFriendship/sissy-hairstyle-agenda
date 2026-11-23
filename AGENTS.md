# AGENTS.md — Sissy Hairstyle Agenda

These instructions apply to the single Sissy Hairstyle Agenda application. Read the root `SCHEMA.md`, `docs/wiki/index.md`, the relevant area pages and `README.md` before changing implementation or documentation.

## Verified repository and application boundaries

- The repository is an Angular 21 application for salon appointments, clients, employees and salon settings.
- `src/app/` contains routes, components, auth and repository integrations; `src/bundle/` contains UI translations.
- `supabase/` contains local configuration, ordered migrations and Edge Function source. Local presence does not prove provider setup or deployment.
- `docs/wiki/` contains the technical/functional wiki; `docs/manual/user-manual-it.md` is a separate Italian manual draft.
- WhatsApp reminders prepare a message/link for the operator to review and send manually; the app does not automatically send messages.

## Before editing

1. Verify the repository root, branch, remotes and `git status --short --branch`; preserve existing work.
2. Read `SCHEMA.md`, the wiki index, the area overview and relevant section; inspect source/configuration before documenting behavior.
3. Never read, print, copy or record `.env*`, tokens, passwords, private keys or credentials. Use placeholders only.
4. Separate UI/source behavior from live Supabase, Auth, SMTP, Storage, deployment and email-delivery state.

## Operational and security constraints

- Do not install dependencies, build, test, start Angular or perform resource-heavy checks on this VM without task-specific authorization. Do not bypass Heavyguard or another guard.
- Do not change database migrations, RLS/grants, Auth configuration, Edge Functions or deployments without explicit authorization and a fresh read-only provider check.
- Preserve owner-scoped data access, the existing `Admin` database sentinel/display mapping, employee archival and appointment history unless an explicitly authorized change defines a migration and compatibility plan.
- Do not describe WhatsApp message preparation as automatic sending or delivery.
- Preserve exact Angular routes, Supabase contracts, visible UI strings and localization keys.

## Documentation

- Root `SCHEMA.md` is the normative wiki schema. `docs/wiki/SCHEMA.md` is a compatibility pointer only.
- `docs/wiki/index.md` is navigation; `docs/wiki/overview.md` is the application overview; `agenda/` and `backend-integration/` are areas.
- The Italian manual is generated at `docs/manual/user-manual-it.md` from marked source blocks in the Wiki. Edit those Wiki blocks, not the generated Markdown; the DOCX/PDF generator and replaceable `.dotx` template are documented in `docs/manual/README.md`.
- After documentation or code changes, update the relevant wiki section and index/links. Update the central project wiki when project state or structure changes.

## Verification and handoff

Run only authorized lightweight static checks. Do not claim tests, builds, browser rendering, email delivery, Auth, database policies or deployment succeeded unless actually verified. Before handoff inspect `git diff --check`, `git status --short` and the full diff; preserve unrelated changes. Commit/push only when explicitly authorized for the current task.