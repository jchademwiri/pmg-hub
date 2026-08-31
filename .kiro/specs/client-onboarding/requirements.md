# Requirements Document — Ultra-Lean Client Account Creation

## Introduction

The Client Onboarding feature delivers an ultra-fast, zero-friction account creation workflow for Playhouse Media Group, Tender Edge Solutions, and Apex Web Solutions. Designed specifically for WhatsApp and mobile phone handoffs, the form captures only the essential business identity needed to establish their profile in our systems (**Contact Person Name, Business/Company Name, Email Address, Phone Number**). All non-essential fields (VAT, Street Address, City, Postal Code) have been skipped. For existing CRM leads, a personalized link pre-fills known information so the client can confirm and establish their account in under 10 seconds.

---

## Glossary

- **Onboarding_Page**: Public web page (`/onboard`) with minimal fields for instant 10-second mobile completion.
- **Lead_Prefill**: Populates known lead fields (`name`, `companyName`, `email`, `phone`, `divisionId`) when accessing `/onboard?lead=<id>`.
- **Admin_Onboarding_Queue**: The admin view at `/relationships/onboarding` managing submissions.
- **1_Click_Conversion**: An atomic server action that creates the `clients` row, updates `client_onboardings` to `converted`, and marks any linked `leads` row as `converted`.

---

## Requirements

### Requirement 1: 10-Second Account Creation Intake Form

**User Story:** As a client, I want an effortless form where I only provide my name, company name, email, and phone number so that my account profile can be created immediately.

#### Acceptance Criteria

1. THE Onboarding_Page SHALL only require 4 core fields: Contact Person Name, Business / Company Name, Email Address, and Phone / WhatsApp Number.
2. THE Onboarding_Page SHALL NOT require Street Address, City, Postal Code, or VAT Number.
3. THE Onboarding_Page SHALL provide an optional field for CIPC Registration Number (can be skipped).
4. THE Onboarding_Page SHALL render as a single-card interface optimized for mobile viewports (`< 375px`).
5. THE Onboarding_Page SHALL include honeypot and Turnstile bot protection.

---

### Requirement 2: Smart Pre-Filling for Existing Leads

**User Story:** As an admin, I want to send a lead-specific setup link to an existing inquiry so that the client only needs to confirm their details to establish their account.

#### Acceptance Criteria

1. IN the Lead Detail page (`/relationships/leads/[id]`), THE system SHALL provide a **"📱 Send Account Setup Link"** button.
2. THE system SHALL generate a shareable URL formatted as `/onboard?lead=<id>` with a pre-written WhatsApp message.
3. WHEN a client navigates to `/onboard?lead=<id>`, THE Onboarding_Page SHALL pre-populate `contactName`, `companyName`, `email`, `phone`, and select the lead's `divisionId`.
4. THE client SHALL be able to submit with 1 tap.

---

### Requirement 3: 1-Click Conversion & Lead Sync

**User Story:** As an admin, I want to approve onboarding submissions with 1 click and automatically create the active client record.

#### Acceptance Criteria

1. WHEN the admin clicks **"⚡ Save as Client"** in the Onboarding Review drawer:
   - THE system SHALL insert a new record into `clients`.
   - THE system SHALL update `client_onboardings.status = 'converted'`.
   - IF the onboarding is linked to a `lead_id`, THE system SHALL automatically update `leads.status = 'converted'`.
2. THE system SHALL execute all updates in an atomic database transaction.
