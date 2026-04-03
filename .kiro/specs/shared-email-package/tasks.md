# Implementation Plan: shared-email-package

## Overview

Scaffold `packages/emails` (`@pmg/emails`), migrate the five existing email templates from `apps/aws/emails/`, add the `sendEmail` / `createEmailClient` send wrapper, wire the package into the monorepo config, and update the db reset script.

## Tasks

- [ ] 1. Scaffold the `packages/emails` package skeleton
  - Create `packages/emails/package.json` with name `@pmg/emails`, exports pointing to `./src/index.ts`, `email:dev` script, and the dependencies listed in the design (`@react-email/components`, `resend`, `react-email`, `@pmg/typescript-config`)
  - Create `packages/emails/tsconfig.json` extending `@pmg/typescript-config/react-library.json` with `"include": ["src"]`
  - Create `packages/emails/README.md` documenting the three required env vars (`RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_EMAIL`) and a `createEmailClient` usage example
  - Create empty placeholder files: `src/index.ts`, `src/send.ts`, `src/types.ts`, and the five template stubs under `src/templates/`
  - _Requirements: 1.6, 8.1, 8.2, 5.5, 7.4_

- [ ] 2. Implement `BrandingProps` and the send wrapper
  - [ ] 2.1 Define `BrandingProps` interface in `src/types.ts` with optional fields: `companyName`, `logoUrl`, `primaryColor`, `websiteUrl`
    - _Requirements: 3.1_
  - [ ] 2.2 Implement `src/send.ts` — `ResendConfig`, `EmailPayload`, `SendResult` interfaces, `sendEmail` function (wraps Resend SDK in try/catch, never throws, never reads env vars), and `createEmailClient` factory
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.2, 7.3_
  - [ ]* 2.3 Write unit tests for `sendEmail` and `createEmailClient` in `src/__tests__/send.test.ts`
    - Verify `{ data, error }` shape is always returned
    - Verify `sendEmail` returns `{ data: null, error }` when Resend SDK throws
    - Verify `createEmailClient` returns a callable function
    - _Requirements: 4.3, 4.4, 7.3_
  - [ ]* 2.4 Write property test — `sendEmail` never throws (Property 3)
    - **Property 3: sendEmail always returns a result object, never throws**
    - **Validates: Requirements 4.3, 4.4**
    - Use `fast-check` with mocked Resend; 100 iterations minimum
    - Tag: `// Feature: shared-email-package, Property 3: sendEmail always returns result object, never throws`
    - _Requirements: 4.3, 4.4_
  - [ ]* 2.5 Write property test — `createEmailClient` closes over config (Property 4)
    - **Property 4: createEmailClient closes over config**
    - **Validates: Requirements 7.3**
    - Generate random `ResendConfig` and `EmailPayload`; assert bound result shape equals direct `sendEmail` result shape
    - Tag: `// Feature: shared-email-package, Property 4: createEmailClient closes over config`
    - _Requirements: 7.3_

- [ ] 3. Migrate and update the five email templates
  - [ ] 3.1 Copy `ContactFormEmail.tsx` from `apps/aws/emails/` to `src/templates/`, update to accept `ContentProps & BrandingProps`, apply branding defaults, export named `ContactFormEmailProps` type
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  - [ ] 3.2 Copy `AutoReplyEmail.tsx`, apply same branding props pattern and defaults, export `AutoReplyEmailProps`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_
  - [ ] 3.3 Copy `BookingConfirmationEmail.tsx`, apply branding props pattern and defaults, export `BookingConfirmationEmailProps`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_
  - [ ] 3.4 Copy `NewSubscriberEmail.tsx`, apply branding props pattern and defaults, export `NewSubscriberEmailProps`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_
  - [ ] 3.5 Copy `AdminNewLeadEmail.tsx`, apply branding props pattern and defaults, export `AdminNewLeadEmailProps`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.6 Write property test — rendered HTML contains all provided props (Property 1)
    - **Property 1: Rendered HTML contains all provided props**
    - **Validates: Requirements 2.2, 2.4, 3.3, 3.4**
    - Use `fast-check` to generate random content props and branding props for each template; assert rendered HTML contains each provided string value
    - Tag: `// Feature: shared-email-package, Property 1: rendered HTML contains all provided props`
    - _Requirements: 2.2, 2.4, 3.3, 3.4_
  - [ ]* 3.7 Write property test — branding defaults applied when props omitted (Property 2)
    - **Property 2: Branding defaults applied when props omitted**
    - **Validates: Requirements 3.2**
    - Render each template without branding props; assert HTML contains "Apex Web Solutions" and "apexwebsolutions.co.za"
    - Tag: `// Feature: shared-email-package, Property 2: branding defaults applied when props omitted`
    - _Requirements: 3.2_
  - [ ]* 3.8 Write snapshot and unit tests for all five templates in `src/__tests__/templates.test.tsx`
    - Render each template with its `PreviewProps`; assert snapshot matches
    - Verify each template has a `PreviewProps` static property
    - _Requirements: 2.3, 6.4_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Wire up `src/index.ts` and verify exports
  - Implement `src/index.ts` re-exporting `sendEmail`, `createEmailClient`, all type interfaces, `BrandingProps`, all five template components, and all five template prop types as shown in the design
  - _Requirements: 1.1, 1.2, 1.3, 7.1_

- [ ] 6. Update monorepo configuration
  - [ ] 6.1 Add `email:dev` task to `turbo.json` with `"cache": false` and `"persistent": true`
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ] 6.2 Add `@react-email/components: "^1.0.1"` and `resend: "^4.0.0"` to the `overrides` block in the root `package.json`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ] 6.3 Add `withdrawals` to the `DROP TABLE IF EXISTS` list in `packages/db/src/reset.ts`
    - _Requirements: 9.1, 9.2_

- [ ] 7. Integrate `@pmg/emails` into `apps/aws`
  - Add `"@pmg/emails": "workspace:*"` to `apps/aws/package.json` dependencies
  - Update the Astro actions / route handlers in `apps/aws` that currently import from the local `emails/` directory to import from `@pmg/emails` instead
  - Remove the now-redundant local email files from `apps/aws/emails/` once all imports are updated
  - _Requirements: 1.4, 1.5, 5.2, 5.3, 5.4_

- [ ] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass and type-check passes (`tsc --noEmit`) across the workspace, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with a minimum of 100 iterations each
- The package is source-first — no build step required; Bun resolves `.tsx` directly via the `exports` map
- All Resend credentials are supplied by the consuming app; the package never reads `process.env`
