# AGENTS.md — MACS Webapp

## Scope and project boundaries

These instructions apply to the `macs-webapp` repository. The application is an Angular/TypeScript web frontend delivered through npm. The repository contains one Angular application project, not an aggregator or a multi-project Gradle, Java, JavaFX, Flutter, or C++ repository.

Before modifying the project, inspect its `package.json`, `angular.json`, active `tsconfig*.json`, `src/environments/`, application routes, and the relevant source boundaries under `src/`.

## Project structure

- `src/main.ts`, `src/index.html`, `src/styles.css` — application bootstrap and global presentation.
- `src/app/components/` — Angular application components and their child components.
- `src/app/api/` — HTTP, authentication, identity-provider, MQTT, and transport boundaries.
- `src/app/library/` — domain types, definitions, helpers, shared models, and reusable feature logic.
- `src/bundle/` — localization resources and message bundles.
- `src/environments/` — runtime environment files and the active compile-time build configuration.
- `src/scripts/` — build and post-build scripts.
- `docs/wiki/` — technical and functional documentation maintained for the application.
- `docs/build-config-examples/` — maintained product-build examples used to reconcile edition scope.
- `dist/` — generated build output; do not treat it as source documentation or commit it unless explicitly requested.
- `package.json`, `package-lock.json`, `angular.json`, and `tsconfig*.json` — toolchain, build, localization, lint, and TypeScript contracts.

The exact location of a symbol or resource must be verified from the current tree; do not invent paths from a component name.

## Documentation overview

`macs-webapp` is an Angular browser client for TMACS and the supported product editions. After authentication, it builds a shell with a top bar, sidebar, layout, and dynamic component container; loaded modules manage devices, maps, TLC/VMS control, analysis, logs, and public transport.

The frontend owns user-visible display, editing, validation, export, navigation, state orchestration, and requests to external services. Backend services, identity providers, HTTP APIs, persistence, retention, backups, notifications, devices, and MQTT brokers are separate boundaries. A frontend source path or successful build does not prove backend persistence, permissions, broker behavior, or complete user-flow acceptance.

Product scope is compile-time configuration, not runtime identity, locale, or backend availability. Reconcile the active configuration with every maintained example before documenting an edition-specific claim.

- `tmacs` — TMACS-Web; RSMP traffic model; TMACS sidebar and map-first startup.
- `smacs` — SMACS-Web; broad traffic-model list; SMACS sidebar and map-first startup.
- `predict` — MACS-Predict; broad traffic-model list; Predict sidebar and map-first startup.
- `rsmp-proxy` — RSMP Proxy; RSMP traffic model; RSMP Proxy sidebar and TLC Status startup.

The project and documentation entry points are:

- `docs/wiki/index.md` — published wiki navigation.
- `docs/wiki/overview.md` — project-level application overview.
- `docs/wiki/<area>/` — area overviews and section pages.
- `docs/wiki/SCHEMA.md` — shared normative documentation schema.
- `docs/manual/README.md` — external user-manual boundary, screenshot contract, and commands.
- `src/main.ts`, `src/app/app.routes.ts`, and `src/environments/build-config.ts` — application bootstrap, routing, and compile-time product configuration.

## Build and startup

- Declared toolchain: Node.js/npm and the Angular CLI; always check `package.json` and the lockfile.
- Run commands from the repository root.
- Install locked dependencies: `npm ci`.
- Start the default development application: `npm run serve`.
- Start a localized development application: `npm run serve-it`, `npm run serve-en`, or `npm run serve-fi`.
- Build: `npm run build`.
- Run lint: `npm run lint`.
- Run the focused TypeScript check: `npx tsc -p tsconfig.json --noEmit`.
- Run `git diff --check` before handoff.

`npm run build` also runs the repository `postbuild` script and can create generated artifacts under `dist/`. Inspect the command output and report warnings exactly. `package.json` currently does not declare a test script; never report automated tests as passing when no test command was executed.

A local build does not verify the identity provider, authenticated HTTP services, permissions, backend persistence, MQTT broker, live device data, or browser acceptance. State these limits explicitly.

## Code conventions

- Preserve existing Angular component boundaries, template and style wiring, localization keys, file extensions, endpoints, protocol constants, and serialized contracts.
- Use UTF-8 and the existing localization-bundle pattern for UI text. Keep backend field names, protocol values, MQTT topics, and data identifiers literal.
- Keep configuration state, runtime/protocol state, and renderer or view state separate.
- Verify APIs at external boundaries before changing callers.

## Documentation workflow

`docs/wiki/SCHEMA.md` is the normative source for documentation structure, metadata, source mapping, page types, vocabulary, chapter order, and validation. Do not duplicate those rules here.

Before changing documentation:

1. Read `docs/wiki/SCHEMA.md`, `docs/wiki/index.md`, the relevant area overview, and the target page.
2. Inspect the implementation sources, templates, styles, configuration, tests, and related documents.
3. Preserve existing paths and update affected links and indexes.
4. Run the relevant documentation validation and state any runtime limitations.

## Manual creation workflow

For a standalone manual, read `docs/manual/README.md` for the editorial and screenshot rules, then follow `docs/manual/workflows/manifest.yaml` and its `execution_order`/`depends_on` values. Keep canonical sources separate from generated manuals and outputs; never edit generated Markdown manually.

The workflow is: prepare verified content and evidence, compose the edition/language manual, run `npm run validate-manual`, and build a PDF only when the declared renderer exists and representative pages have been inspected. Keep credentials, tokens, certificates, customer data, and installation-specific values out of all manual inputs and outputs. Source validation does not prove PDF rendering, backend behavior, permissions, persistence, or complete browser acceptance.

## MCP wiki creation and synchronization

When the project exposes a derived wiki through MCP, keep its manifest and generation tooling separate from the technical wiki, and generate the derived tree under the declared documentation output. The technical wiki is authoritative and the generated tree is read-only.

1. Update and validate the technical wiki pages first.
2. Use the project's declared MCP manifest or generation procedure to create or update the derived tree.
3. Transfer only verified user-facing behavior, fields, values, actions, warnings, and expected results.
4. Remove source declarations, internal identifiers, credentials, customer-specific data, and unverified claims.
5. Read back the generated `index.md`, `overview.md`, and affected pages.
6. Validate links and ensure every returned path remains inside the configured documentation root.

## Validation and repository safety

- Run the narrowest relevant npm, TypeScript, lint, build, or documentation validation command after changes.
- For UI changes, verify templates, styles, localization resources, routes, and build configuration.
- Do not claim tests, backend behavior, MQTT delivery, persistence, permissions, or browser behavior without real command or runtime evidence.
- Run `git diff --check` and `git status --short` before reporting completion.
- Do not commit, push, or rewrite history unless explicitly requested.
- Do not commit `dist/`, generated releases, credentials, or other generated artifacts unless explicitly requested.
