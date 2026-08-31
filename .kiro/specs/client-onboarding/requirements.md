# Requirements Document — Client Onboarding Feature

## Introduction

The Client Onboarding feature provides an end-to-end self-service intake and conversion workflow for Playhouse Media Group, Tender Edge Solutions, and Apex Web Solutions. When an admin engages a prospective client over a phone call or WhatsApp, the admin sends a branded self-onboarding URL. The client submits their complete corporate and billing profile via a mobile-optimized multi-step form. Submissions land in the Admin Portal onboarding queue, where the admin can review the submitted data and with a **single button click** convert the submission into an active `clients` record with pre-populated legal and billing details, optionally dispatching a client portal invitation.

---

## Glossary

- **Onboarding_Page**: Public web page (e.g. `/onboard`) where clients fill in corporate, contact, and billing information.
- **Admin_Onboarding_Queue**: The admin view at `/relationships/onboarding` displaying submitted onboarding records categorized by status (`pending`, `converted`, `rejected`, `archived`).
- **Onboarding_Review_Drawer**: A slide-over drawer or modal in the admin app allowing the admin to inspect submitted details, check for duplicates, and trigger 1-click client conversion.
- **Client_Onboarding_Record**: Staging database entity in `client_onboardings` holding incoming submissions prior to approval.
- **Client_Record**: The primary business entity in `clients` used across billing, projects, portal access, and financial statements.
- **1_Click_Conversion**: An atomic server action that validates uniqueness, creates the `clients` row, links the `client_onboardings` record, and flags the status as `converted`.
- **Division**: A business unit (`Playhouse Media Group`, `Tender Edge Solutions`, `Apex Web Solutions`) referenced by `divisionId`.
- **Portal_Invitation**: Automated email sent to the client allowing them to set up their password and access `apps/portal`.

---

## Requirements

### Requirement 1: Public Self-Onboarding Intake Form

**User Story:** As a prospective client, I want to fill in my company and billing details on a fast, mobile-friendly web page so that my provider can set up my account and issue accurate quotes and invoices.

#### Acceptance Criteria

1. THE Onboarding_Page SHALL render a responsive, mobile-first 3-step form supporting:
   - **Step 1 (Contact)**: Full Name, Direct Email, Phone / Mobile Number.
   - **Step 2 (Company Details)**: Registered Company Name, Trading Name (optional), CIPC Registration Number (optional), VAT Number (optional), Website (optional).
   - **Step 3 (Billing & Invoicing)**: Billing / Accounts Email, Physical/Street Address, City, Postal Code, Province.
2. THE Onboarding_Page SHALL dynamically adapt branding (color scheme, logo, title) based on the `?division=` query parameter (e.g. `pmg`, `tes`, `aws`).
3. THE Onboarding_Page SHALL enforce strict client-side and server-side Zod validation with inline error messages that do not cause layout shifts.
4. THE Onboarding_Page SHALL integrate bot protection (honeypot fields + timestamp speed verification + Cloudflare Turnstile token check).
5. WHEN submission succeeds, THE Onboarding_Page SHALL display a polished confirmation screen with an optional WhatsApp button to notify the admin immediately.
6. UPON valid submission, THE system SHALL dispatch an admin email notification alerting Jacob/admin of the incoming onboarding request and an auto-acknowledgment email to the client.

---

### Requirement 2: Admin Onboarding Queue & Management

**User Story:** As an admin, I want a centralized dashboard showing all onboarding submissions so that I can track pending submissions and see who has completed their onboarding.

#### Acceptance Criteria

1. THE Admin_Onboarding_Queue SHALL fetch all `client_onboardings` records and render them in a searchable, filterable table.
2. THE Admin_Onboarding_Queue SHALL provide status filter tabs: `Pending Review`, `Converted`, `Archived`, and `All`, displaying live count badges for each tab.
3. THE Admin_Onboarding_Queue SHALL display columns: Company Name, Primary Contact, Email/Phone, Division, Submission Date, and Status Badge.
4. THE Admin_Onboarding_Queue SHALL provide a "Quick Share Link" tool that allows the admin to generate a pre-filled WhatsApp share link or copy the URL with 1 click.

---

### Requirement 3: 1-Click "Save as Client" Conversion

**User Story:** As an admin, I want to convert an onboarding submission into an official client profile with 1 click so that I don't have to re-type company names, addresses, or tax numbers manually.

#### Acceptance Criteria

1. WHEN an admin opens a submission in the Onboarding_Review_Drawer, THE system SHALL perform an automated duplicate check against existing `clients.email` and `clients.phone`.
2. WHEN the admin clicks the **"⚡ Save as Client"** button:
   - THE system SHALL execute an atomic database transaction (`db.transaction`).
   - THE system SHALL insert a new record into `clients` populating `name`, `businessName`, `email`, `phone`, `divisionId`, `registrationNumber`, `vatNumber`, `billingEmail`, `billingAddress`, `city`, `postalCode`, `province`, `website`, and `isActive = true`.
   - THE system SHALL update the `client_onboardings` record setting `status = 'converted'`, `convertedClientId = <new_client_id>`, `reviewedBy = session.user.id`, and `reviewedAt = NOW()`.
3. IF the admin checks the option "Send Client Portal Invitation", THE system SHALL automatically trigger `sendPortalInvitation(client.id)` within the conversion flow.
4. IF a client with the same email already exists, THE system SHALL prevent creation, return a descriptive error message, and offer an option to link/merge with the existing client.
5. UPON successful conversion, THE system SHALL display a success toast and update the UI immediately via Next.js cache revalidation (`revalidatePath`).
