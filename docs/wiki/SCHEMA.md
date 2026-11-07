# Appointment Agenda Documentation Schema

## Version

| Property | Value |
|---|---|
| Schema version | `1.0` |
| Last modified | `2026-11-07` |

## Purpose

This schema defines the documentation structure and validation rules for the Angular appointment-agenda application. The application integrates Supabase Auth and owner-scoped database access; the database migration and public runtime configuration must still be applied for a deployment to use that backend. WhatsApp reminders are user-mediated links and are not sent by the application.

## Language

English is the official language of the wiki. Use English for headings, prose, procedures, variable documentation, and validation messages. Preserve source identifiers, file paths, configuration keys, and user-visible Italian labels exactly as they appear in the application.

## Document authority

Each type of information has one authoritative location:

| Location | Responsibility |
|---|---|
| `AGENTS.md` | Operational instructions, repository overview, project boundaries, and commands. |
| `docs/wiki/SCHEMA.md` | Normative documentation structure, metadata, vocabulary, and validation rules. |
| `docs/wiki/` | Technical and functional wiki owned by this application. |
| `src/` | Application source code and localization resources. |

Do not duplicate normative rules, navigation catalogs, project descriptions, or technical content across these locations. The wiki root contains `index.md`, `overview.md`, area directories, and this schema.

```text
repository/
├── AGENTS.md
├── docs/wiki/
│   ├── SCHEMA.md
│   ├── index.md
│   ├── overview.md
│   └── <area>/
│       ├── overview.md
│       └── <section>.md
└── src/
```

### `index.md`

`index.md` is the wiki navigation map. It links to the root overview, every area overview, every section page, and this active schema. It may reference connected external Markdown documents only when they are identified and verifiable; it must not duplicate their content.

### `overview.md`

The root `overview.md` describes the application wiki; an area `overview.md` describes one area. Both use the common chapter structure below, in the same order and with the same applicability rules. `Description` is mandatory. The root overview and area overviews may link to their pages but must not reproduce complete catalogs owned by those pages.

### Area

An area groups information about one application concern. It is represented by one directory containing exactly one `overview.md` and its section documents.

### Section

A section is a detailed page about one verified application capability, workflow, data contract, configuration, or deployment concern. It may describe frontend behavior, data, validation, browser storage, or a verified combination of these subjects.

### Common document structure

The root overview, each area overview, and each section document contain YAML frontmatter and may use the following Markdown chapters, in this order:

```markdown
## Short Description
## Description
## Functional Characteristics
## Interfaces And Protocols
## Dependencies And Relationships
## Procedures
## Variables
```

`Short Description` concisely identifies the subject, its primary purpose, and its most distinctive characteristic.

`Description` provides the detailed conceptual, user-oriented account: define the subject first; explain its structure, practical use, operating context, benefits, and verified limitations. For collection sections, define both the collection and its elements when they are distinct concepts. Do not turn descriptions into inventories of implementation mechanisms.

For active documentation, organize verified facts by topic. Keep identity, configuration, behavior, limits, associations, and special-value rules together without repetition. Introduce section content with user-facing wording such as `This section ...`.

`Functional Characteristics` documents observable behavior: capabilities and required human actions; responses to user actions and supported workflows; inputs, outputs, and data changes; and handling of invalid input, interruptions, unavailable data, disabled modes, boundaries, and exceptions. Distinguish simulated behavior from real external effects.

Use these controlled verbs for verified capabilities:

- `Manages` — creates, edits, or deletes records or settings.
- `Shows` — displays data in the interface.
- `Sends` — sends a message or command to an external recipient or system. Do not use for a preview or simulated action.
- `Receives` — obtains data from an external system.
- `Calculates` — computes indicators, dates, conditions, or other derived values.
- `Exports` — produces a file.
- `Stores` — saves data for later use.
- `Notifies` — alerts a user through a verified channel.
- `Configures` — changes application or service settings.
- `Monitors` — observes runtime states or values.
- `Validates` — checks input, references, constraints, or compliance.
- `Transfers` — exchanges data between defined boundaries.
- `Analyzes` — examines events, reports, or collected data.
- `Generates` — creates derived content or results.
- `Simulates` — presents a virtual or simulated outcome without performing its real-world effect.

Use these verbs only for verified capabilities. Do not label capabilities with generic verbs such as `Uses`, `Supports`, `Requires`, `Loads`, `Keeps`, or `Applies` when a controlled verb is more precise. Put dependency statements in `Dependencies And Relationships`. Do not describe a simulated WhatsApp preview as `Sends` or `Notifies`.

`Interfaces And Protocols` explains interactions with people, browser APIs, external systems, or services. State direction, sequence, inputs, outputs, errors, and security expectations only when verified. For user-interface interactions, describe the relevant user action and visible result. When no external interface or protocol is defined, write exactly `No external interface or protocol is defined.`

`Dependencies And Relationships` describes verified domain relationships between the subject and other areas, settings, data concepts, browser storage, or external services. When none are verified, write `No dependencies.`

`Procedures` documents ordered operational workflows. Each procedure states purpose, prerequisites, actions, expected result, verification, and warnings or recovery information when known.

`Variables` documents applicable data fields, values, and constraints. Omit chapters that do not apply; `Description` remains mandatory.

### Document responsibilities

| Document | Required responsibility |
|---|---|
| `docs/wiki/index.md` | Navigation map of the published wiki. |
| `AGENTS.md` | Operational instructions, project boundaries, and repository overview. |
| `docs/wiki/overview.md` | Application-level semantics and links to areas. |
| `<area>/overview.md` | Area scope and links to all its sections. |
| `<area>/<section>.md` | Detailed verified behavior, data, procedures, and source references for one subject. |
| `docs/wiki/SCHEMA.md` | Normative schema and validation rules. |

### Structural rules

1. Every area directory has exactly one `overview.md`.
2. Every section file belongs to exactly one area directory.
3. Every area overview links to every section file in its directory.
4. `index.md` links to the root overview, every area overview, every section page, and this schema.
5. Internal links are relative, resolve to existing files, and are updated when files move or change.
6. Semantic descriptions are not duplicated across the index, root overview, area overviews, and section pages.
7. Cross-area procedures belong in the root overview; area-specific procedures belong in the corresponding area overview. Section pages may document behavior, dependencies, verification, and troubleshooting without duplicating complete procedures.

---

## General Frontmatter Structure

YAML frontmatter contains document metadata and optional frontend-specific navigation or source mappings.

```yaml
---
title: "Appointment Details"
status: active
role: frontend

navigation:
  - type: page
    id: agenda
    name: "Agenda"
  - type: modal
    id: appointment-form
    name: "Appointment form"

source:
  technology: angular
  references:
    - part: component
      path: src/app/components/appointments/appointments.ts
---
```

### General properties

| Property | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | User-facing title of the documented subject. |
| `status` | enum | Yes | Lifecycle state of the documentation. |
| `role` | enum | Yes | Role of the documented section. |
| `navigation` | array | No | Ordered hierarchy locating a frontend element. |
| `source` | object | No | Mapping to existing source files. |

`role` must be one of `functional_module`, `frontend`, `application`, `config-data`, or `status-data`.

| Role | Description |
|---|---|
| `functional_module` | A feature implementing an application or business concern. |
| `frontend` | A user-interface element or behavior. |
| `application` | Application logic or a browser-side service. |
| `config-data` | Configuration data, settings, or a data contract. |
| `status-data` | Runtime status, derived state, or a report data contract. |

For `config-data` and `status-data`, retain the `Functional Characteristics` and `Interfaces And Protocols` headings for structural consistency. Their content is respectively `No functional characteristics are defined.` and `No external interface or protocol is defined.` Describe data meaning, values, states, and constraints in `Description` or `Variables` instead.

`status` must be one of:

| Status | Description |
|---|---|
| `active` | Current documentation describing verified, implemented behavior. |
| `draft` | Documentation under preparation or review, or describing planned behavior. |
| `commercial` | Documentation describing a proposed or commercially available feature whose implementation may not be present in this repository. |
| `archived` | Historical or obsolete documentation retained for reference. |

A `draft` or `commercial` document must not contain invented source references.

---

## Navigation Hierarchy

`navigation` is an ordered array describing the actual frontend path from the outermost container to the documented element. It has variable depth and does not require any fixed level or sequence.

Each element has a required non-empty `type` and `name`, and an optional stable `id`.

Supported navigation types:

| Type | Description |
|---|---|
| `module` | Top-level functional area. |
| `page` | Standalone page or screen. |
| `subpage` | Nested page. |
| `tab` | Primary tab. |
| `subtab` | Nested tab. |
| `step` | Step in a multi-step workflow. |
| `section` | Logical content section. |
| `subsection` | Nested content section. |
| `panel` | Container for related information or controls. |
| `accordion` | Expandable or collapsible content container. |
| `modal` | Dialog displayed over the current interface. |
| `drawer` | Slide-out contextual panel. |
| `popover` | Contextual overlay anchored to an interface element. |

Validation rules: use only listed types; order elements from outermost to most specific; reflect the actual interface; do not invent missing levels; repeated types are allowed; use `id` when stable identification is needed. Tabs and subtabs are represented only in `navigation`, not in separate metadata properties.

---

## Source Code Mapping

The optional `source` property maps documented behavior to actual implementation artifacts. Include only verified paths relative to the repository root. A source mapping must contain a non-empty `references` list; `technology`, when present, must be `angular`.

```yaml
source:
  technology: angular
  references:
    - part: component
      path: src/app/components/appointments/appointments.ts
    - part: service
      path: src/app/api/appointment-repository.ts
```

Each reference requires `part` and `path`; optional properties are `selector` for a real selector or stable identifier and `description` for the artifact's responsibility.

Supported `part` values are `component`, `controller`, `view`, `template`, `stylesheet`, `routing`, `service`, `model`, `dto`, `state`, `validator`, `event-handler`, `resource`, `api`, `endpoint`, `repository`, `dao`, `persistence`, `serializer`, `protocol`, `client`, `worker`, `configuration`, `test`, and `other`. Use the most precise applicable value.

Source mapping rules:

1. Use only existing repository-relative paths and actual selectors.
2. One documented subject may reference multiple files; a file may be shared by multiple subjects.
3. Include only verified references when implementation is partial.
4. Maintain references when source files move or change.
5. Technology-specific metadata is not required when technology is not applicable.
6. Markdown filenames must use lowercase characters, digits, and the repository's established separator convention.
7. Include tests or persistence artifacts when they materially verify the documented contract.

---

## Data-structure documentation

A section documenting a data structure includes `Description` and `Variables` in the same Markdown file. Do not create a parallel page for the same structure or duplicate its variables in an overview or index. Its `source.references` point directly to verified model, repository, persistence, serializer, and test files when present.

Every `Variables` chapter for data structures contains a property table with all columns below, plus a constants table. Use `TO BE DEFINED` or `Not verified` for unknown values; never infer them.

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Exact source-level property name or nested path. |
| `type` | string | Yes | Declared TypeScript type. |
| `json_type` | enum | Yes | Serialized JSON type: `string`, `number`, `boolean`, `object`, `array`, or `null`. |
| `semantic_type` | string | Yes | Domain meaning, selected from the vocabulary below. |
| `unit` | string | Yes | Verified unit, `-` when none applies, or `TO BE DEFINED`. |
| `description` | string | Yes | Functional meaning, behavior, and verified special-value semantics. |
| `default` | any | Yes | Verified default or `TO BE DEFINED`. |
| `minimum` | number or marker | Yes | Verified minimum, `-` when not applicable, or `TO BE DEFINED`. |
| `maximum` | number or marker | Yes | Verified maximum, `-` when not applicable, or `TO BE DEFINED`. |
| `allowed_values` | array or marker | Yes | Verified allowed values, `-` when not applicable, or `TO BE DEFINED`. |

For nested objects, use `json_type: object` and `semantic_type: object`; for arrays use `json_type: array` and `semantic_type: collection`. Use dot notation for nested fields (for example `client.phone`) and `[]` for array elements (for example `services[].name`). Document each parent in the main table and nested properties in a separate table immediately after it. If a nested type has its own section in this wiki, reference it instead of duplicating its variables. Keep collection elements and exclusively owned subordinate objects under the owning collection unless they have an independently documented contract or lifecycle.

The `type` column records the declared source type; `json_type` records the serialized representation; `semantic_type` records domain meaning. A field not serialized as JSON is not a JSON property. Explain computed or omitted fields in `description` when relevant.

Distinguish omitted properties, JSON `null`, and concrete defaults. `TO BE DEFINED` is a documentation marker, not a runtime value. Document collection defaults as `[]` or `empty list`, and initialized objects as `initialized object with defaults`, rather than constructor expressions.

Constants table:

| Constant | Type | Value | Description |
|---|---|---|---|
| `CONSTANT_NAME` | declared type | verified value | Functional meaning or use. |

List all verified constants for enums, flags, or discrete sets. Use exact identifiers without a class prefix. When a value is represented by a declared constant, use its identifier in the variable table and raw value in the constants table. For discrete sets, use `allowed_values` and `-` for minimum/maximum. When no constants exist, state explicitly: `No constants are defined or used.`

### Semantic Type Vocabulary

| Semantic type | Meaning |
|---|---|
| `action` | Action to perform. |
| `code` | Short functional or symbolic code. |
| `collection` | Collection of elements. |
| `color` | Color value. |
| `count` | Quantity or number of elements. |
| `credential` | Authentication or authorization value reference. |
| `date` | Calendar date. |
| `description` | Human-readable text. |
| `duration` | Duration with a documented unit. |
| `flag` | Boolean `true`/`false` value. |
| `identifier` | Identifier of the documented object. |
| `mode` | Discrete operating or configuration choice. |
| `money` | Monetary value with a documented currency. |
| `object` | Nested structured object. |
| `other` | Verified reusable domain role not covered above. |
| `phone_number` | Telephone number; document normalization and formatting separately. |
| `reference` | Scalar link to another object. |
| `status` | Functional or operational state. |
| `template` | Text template with named placeholders. |
| `time_of_day` | Local time-of-day value. |
| `timestamp` | Point in time associated with an event. |
| `timezone` | Time-zone identifier or setting. |
| `type` | Generic category where no more specific role applies. |
| `version` | Version identifier. |

Use `identifier` for an object's own ID, `reference` for a scalar link, and `collection` for arrays. Use `flag` only for booleans and `mode` for discrete selectors. Extend the vocabulary only for a distinct, reusable domain role; explain temporary `other` values. Do not infer units, defaults, limits, or allowed values from names or types.

---

## Cross-Property Validation

1. Every document declares a valid `status` and `role`.
2. `navigation` and `source` are independent optional properties.
3. `navigation` is the single authoritative representation of frontend location.
4. Tabs and subtabs appear only in `navigation`.
5. No fixed navigation depth or type is required.
6. Frontend documentation may omit `source` when implementation details are not verified.
7. Declared `source.technology` is `angular`; every source path exists.
8. Navigation labels, source paths, and behavior reflect the actual application when verified.
9. Do not duplicate data across metadata locations or pages.
10. `draft` or `commercial` documents contain no invented implementation references.
11. A documented data structure has one authoritative section with `Description` and `Variables`.
12. Every variable table contains all required columns and uses a semantic type from this schema.
13. Constants include verified name, type, value, and description; if absent, say so explicitly.
14. Links resolve relative to the page and remain inside the wiki or repository as applicable.
15. Simulations and browser-local behavior are distinguished from real external sending, server persistence, or authentication.
