# Requirements Document

## Introduction

This feature extracts all React Email templates from `apps/aws/emails/` into a shared `packages/emails` package within the Bun monorepo. The package provides a typed Resend send wrapper, all email templates as exportable React components, and a react-email dev preview server. Any app in the monorepo can import the package and supply its own environment-specific configuration (API key, sending domain, admin address) at call time.

## Glossary

- **Email_Package**: The `packages/emails` workspace package (`@pmg/emails`)
- **Send_Wrapper**: The typed function exported by the Email_Package that accepts a Resend config and email payload, then dispatches the email via the Resend API
- **Resend_Config**: The per-app runtime configuration object containing `apiKey`, `from`, and `adminEmail` fields
- **Template**: A React component that renders an email body, accepting both content props and Branding_Props
- **Branding_Props**: Optional props passed to a Template at call time: `companyName`, `logoUrl`, `primaryColor`, `websiteUrl`
- **Preview_Server**: The react-email development server that renders all Templates in a browser for visual inspection
- **Consuming_App**: Any app in the monorepo (`aws`, `admin`, `pmg`, `tes`) that imports from `@pmg/emails`
- **Content_Props**: Template-specific data props (e.g. `name`, `email`, `message`) distinct from Branding_Props
- **Reset_Script**: The `packages/db/src/reset.ts` script that drops all application tables and types before a migration cycle
- **Migration_Runner**: The Drizzle migration script (`db:migrate`) that applies pending schema migrations to the database
- **Root_Package_JSON**: The `package.json` at the monorepo root, which contains the `overrides` block applied workspace-wide by Bun
- **Turbo_Config**: The `turbo.json` at the monorepo root that defines pipeline tasks for Turborepo

---

## Requirements

### Requirement 1: Package Structure and Exports

**User Story:** As a monorepo developer, I want a single `@pmg/emails` package, so that all apps share one source of truth for email templates and sending logic.

#### Acceptance Criteria

1. THE Email_Package SHALL export all Templates as named exports from its main entry point
2. THE Email_Package SHALL export the Send_Wrapper as a named export from its main entry point
3. THE Email_Package SHALL export all TypeScript prop interfaces for each Template as named exports
4. THE Email_Package SHALL be listed as a workspace dependency using `workspace:*` in any Consuming_App that uses it
5. WHEN a Consuming_App imports from `@pmg/emails`, THE Email_Package SHALL resolve without requiring a build step (source-first via `exports` pointing to `.tsx` files or a `bun`-compatible entry)
6. THE Email_Package directory SHALL be physically scaffolded at `packages/emails/` with the following structure before any Consuming_App attempts to consume it:
   ```
   packages/emails/
     package.json
     tsconfig.json
     README.md
     src/
       index.ts
       send.ts
       templates/
         ContactFormEmail.tsx
         AutoReplyEmail.tsx
         BookingConfirmationEmail.tsx
         NewSubscriberEmail.tsx
         AdminNewLeadEmail.tsx
   ```

---

### Requirement 2: Template Migration

**User Story:** As a developer, I want all existing email templates centralised in the Email_Package, so that I do not maintain duplicate template files across apps.

#### Acceptance Criteria

1. THE Email_Package SHALL include a Template for each of the five existing templates: `ContactFormEmail`, `AutoReplyEmail`, `BookingConfirmationEmail`, `NewSubscriberEmail`, and `AdminNewLeadEmail`
2. WHEN a Template is rendered with its defined Content_Props, THE Template SHALL produce an HTML output that contains all provided Content_Props values
3. THE Email_Package SHALL preserve the `PreviewProps` static property on each Template so the Preview_Server can render default previews
4. WHEN a Template is rendered with Branding_Props, THE Template SHALL include the provided `companyName`, `websiteUrl`, and `primaryColor` values in the rendered HTML output

---

### Requirement 3: Branding Props

**User Story:** As a developer for multiple client sites, I want to pass branding at call time, so that the same template renders correctly for different companies without forking the template.

#### Acceptance Criteria

1. THE Email_Package SHALL define a `BrandingProps` TypeScript interface with optional fields: `companyName`, `logoUrl`, `primaryColor`, and `websiteUrl`
2. WHEN a Template is rendered without Branding_Props, THE Template SHALL fall back to sensible default values for each branding field
3. WHEN a Template is rendered with a `primaryColor` value, THE Template SHALL apply that colour to primary interactive elements (buttons, headings, accents) in the rendered output
4. WHEN a Template is rendered with a `logoUrl` value, THE Template SHALL render an image element using that URL in the email header

---

### Requirement 4: Resend Send Wrapper

**User Story:** As a developer, I want a typed send function that accepts per-app config, so that each app can use its own Resend API key and sending domain without sharing credentials.

#### Acceptance Criteria

1. THE Send_Wrapper SHALL accept a `Resend_Config` object containing `apiKey`, `from`, and `adminEmail` as required fields
2. THE Send_Wrapper SHALL accept a `to` address, a `subject` string, and a pre-rendered React element or Template reference as required fields
3. WHEN the Send_Wrapper is called with a valid Resend_Config and email payload, THE Send_Wrapper SHALL call the Resend API and return a result object containing `{ data, error }`
4. IF the Resend API returns an error, THEN THE Send_Wrapper SHALL return the error in the `error` field of the result object without throwing
5. THE Send_Wrapper SHALL be fully typed so that TypeScript consumers receive type errors when required fields are omitted
6. THE Email_Package SHALL NOT store or read `RESEND_API_KEY`, `FROM_EMAIL`, or `ADMIN_EMAIL` from environment variables internally; all config SHALL be supplied by the Consuming_App at call time

---

### Requirement 5: Per-App Environment Variable Strategy

**User Story:** As a developer managing multiple sites with different sending domains, I want each app to supply its own credentials, so that emails are sent from the correct domain for each site.

#### Acceptance Criteria

1. THE Email_Package SHALL NOT contain any `.env` files or hardcoded credential values
2. WHEN a Consuming_App calls the Send_Wrapper, THE Consuming_App SHALL supply `apiKey` sourced from its own `RESEND_API_KEY` environment variable
3. WHEN a Consuming_App calls the Send_Wrapper, THE Consuming_App SHALL supply `from` sourced from its own `FROM_EMAIL` environment variable
4. WHEN a Consuming_App calls the Send_Wrapper, THE Consuming_App SHALL supply `adminEmail` sourced from its own `ADMIN_EMAIL` environment variable
5. THE Email_Package README SHALL document the three required environment variables and provide a usage example for a Consuming_App

---

### Requirement 6: React Email Preview Server

**User Story:** As a developer, I want to run a single preview server that shows all templates, so that I can visually inspect and iterate on email designs without deploying.

#### Acceptance Criteria

1. THE Email_Package SHALL include an `email:dev` script in its `package.json` that starts the react-email Preview_Server pointed at the templates directory
2. WHEN the `email:dev` script is run, THE Preview_Server SHALL discover and display all Templates defined in the Email_Package
3. THE Email_Package SHALL include `react-email` as a dev dependency so the Preview_Server can be run from the package directory
4. WHEN a Template's `PreviewProps` are defined, THE Preview_Server SHALL render the Template using those props as the default preview state

---

### Requirement 7: Consuming App Integration

**User Story:** As a developer adding email sending to any app, I want a clear, minimal integration pattern, so that I can send emails in a few lines of code.

#### Acceptance Criteria

1. WHEN a Consuming_App adds `@pmg/emails` as a dependency, THE Consuming_App SHALL be able to import any Template and the Send_Wrapper in a single import statement
2. THE Email_Package SHALL export a `createEmailClient` factory function that accepts a `Resend_Config` and returns a bound send function, so that Consuming_Apps do not repeat config on every call
3. WHEN `createEmailClient` is called with a valid `Resend_Config`, THE factory function SHALL return a `sendEmail` function that closes over the provided config
4. THE Email_Package README SHALL include a complete usage example showing `createEmailClient` instantiation and a `sendEmail` call with a Template

---

### Requirement 8: TypeScript and Build Compatibility

**User Story:** As a developer, I want the package to work with TypeScript across all apps without manual build steps, so that the monorepo DX stays fast.

#### Acceptance Criteria

1. THE Email_Package SHALL include a `tsconfig.json` that extends the shared `@pmg/typescript-config`
2. THE Email_Package `package.json` exports map SHALL point directly to `.tsx` source files so Bun resolves them without a compile step
3. WHEN a Consuming_App runs `tsc --noEmit` or equivalent type checking, THE Email_Package types SHALL resolve without errors
4. THE Email_Package SHALL list `@react-email/components` and `resend` as dependencies (not devDependencies) so Consuming_Apps do not need to install them separately

---

### Requirement 9: Database Reset Script Completeness

**User Story:** As a developer, I want the `db:reset` script to drop all tables, so that a full `db:reset` + `db:migrate` cycle completes cleanly without leftover tables causing migration errors.

#### Acceptance Criteria

1. THE Reset_Script SHALL include `withdrawals` in the `DROP TABLE IF EXISTS` statement alongside `leads`, `expenses`, `income`, `clients`, `divisions`, and `aws_pricing`
2. WHEN the Reset_Script is executed, THE Reset_Script SHALL drop all application tables in a single query so that no table remains after the reset
3. WHEN `db:reset` is followed by `db:migrate`, THE Migration_Runner SHALL complete without errors caused by pre-existing tables

---

### Requirement 10: Root Package Dependency Overrides for Email Packages

**User Story:** As a monorepo maintainer, I want version pins for email-related dependencies in the root `package.json` overrides block, so that Bun resolves a single consistent version of React peer dependencies across the workspace.

#### Acceptance Criteria

1. THE Root_Package_JSON SHALL include an `overrides` entry for `@react-email/components` pinned to `^1.0.1`
2. THE Root_Package_JSON SHALL include an `overrides` entry for `resend` pinned to `^4.0.0`
3. WHEN Bun resolves workspace dependencies, THE Workspace SHALL use the pinned versions from the overrides block rather than resolving conflicting peer dependency versions independently per package
4. THE pinned versions in the overrides block SHALL match the versions installed in `apps/aws`

---

### Requirement 11: Turbo Pipeline Task for Email Preview Server

**User Story:** As a developer, I want an `email:dev` task registered in `turbo.json`, so that the react-email preview server is discoverable and runnable from the monorepo root via `turbo run email:dev`.

#### Acceptance Criteria

1. THE Turbo_Config SHALL include an `email:dev` task entry in the `tasks` block
2. THE `email:dev` task SHALL have `"cache": false` so the preview server is never served from a stale cache
3. THE `email:dev` task SHALL have `"persistent": true` so Turborepo treats it as a long-running process, mirroring the existing `dev` and `db:studio` task patterns
4. WHEN `turbo run email:dev` is executed from the monorepo root, THE Preview_Server SHALL start for any package that defines an `email:dev` script
