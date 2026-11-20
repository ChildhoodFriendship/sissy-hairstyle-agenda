# Sissy Hairstyle Agenda

Sissy Hairstyle Agenda is an Angular 21 application for managing a salon agenda, clients, employees and salon settings. The interface supports appointment creation and assignment, guided reminder preparation and persistent theme preference. WhatsApp reminders are prepared for the operator to review and send manually; the application does not send them automatically.

The app's authentication and data layer use Supabase when the project has been configured and the required migrations, Auth setup and Edge Function are deployed. Repository files and a local build do not verify a live Supabase project or email delivery.

## Repository guide

- [Repository instructions](AGENTS.md)
- [Documentation schema](SCHEMA.md)
- [Wiki index](docs/wiki/index.md) and [application overview](docs/wiki/overview.md)
- [Italian user manual](docs/manual/user-manual-it.md)
- [Supabase setup](supabase/README.md) and [operator setup guide](supabase/USER-SETUP.md)

## Local development

The repository declares npm `11.4.1` and Angular CLI `21.2.29`. In a suitable authorized environment, install dependencies and start the dev server:

```bash
npm ci
npm start
```

The development server uses `http://localhost:4200/` by default.

## Available checks

```bash
npm run validate-wiki
npm test
npm run build
```

`validate-wiki` checks wiki frontmatter, local links and declared source paths. Tests/builds do not verify remote Supabase configuration, row-level security, SMTP, Auth recovery or WhatsApp delivery. Read `AGENTS.md` before running commands; do not install, build or test on this VM without task-specific authorization.
