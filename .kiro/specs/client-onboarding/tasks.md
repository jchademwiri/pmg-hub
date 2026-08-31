# Implementation Tasks — Client Onboarding Feature

## Phase 1: Database & Migrations (`packages/db`)

- [ ] **1.1 Expand `clients` Schema**
  - Add optional fields: `registrationNumber`, `vatNumber`, `billingEmail`, `billingAddress`, `city`, `postalCode`, `province`, `website` to `packages/db/src/schema/clients.ts`.
  - Update `Client` and `NewClient` TypeScript types.

- [ ] **1.2 Create `client_onboardings` Schema**
  - Create `packages/db/src/schema/onboarding.ts` with `onboardingStatusEnum` and `clientOnboardings` table definition.
  - Set up relations with `divisions`, `clients`, and `user`.
  - Export new schema and types from `packages/db/src/schema/index.ts`.

- [ ] **1.3 Add Query Helpers in `packages/db`**
  - Add `getAllOnboardings(statusFilter?)`, `getOnboardingById(id)`, and `getOnboardingCountsByStatus()`.

- [ ] **1.4 Generate & Run Drizzle Migration**
  - Generate Drizzle migration and verify database schema synchronization.

---

## Phase 2: Transactional Emails (`packages/emails`)

- [ ] **2.1 Admin Notification Template**
  - Create `packages/emails/src/emails/OnboardingAdminNotificationEmail.tsx` notifying admin of new submissions with direct deep-links.

- [ ] **2.2 Client Confirmation Template**
  - Create `packages/emails/src/emails/OnboardingClientConfirmationEmail.tsx` summarizing submitted info and providing WhatsApp support links.

- [ ] **2.3 Export Email Helpers**
  - Export templates and dispatch wrappers from `packages/emails/src/index.ts`.

---

## Phase 3: Public Self-Onboarding Web Flow

- [ ] **3.1 Create Responsive Multi-Step Form UI**
  - Implement 3-step form (Contact → Legal Business → Billing Address) in public Astro/Next route.
  - Implement dynamic division theming (`?division=pmg|tes|aws`).

- [ ] **3.2 Add Zod Schemas & Bot Protection**
  - Integrate honeypot field, timestamp check, and Cloudflare Turnstile token verification via `@pmg/utils/bot-protection`.
  - Implement inline error feedback without layout shift.

- [ ] **3.3 Submit Action & Notifications**
  - Wire submission action to insert into `client_onboardings` with `status: 'pending'`.
  - Trigger email dispatches to admin and client.

---

## Phase 4: Admin Portal & 1-Click Client Conversion (`apps/admin`)

- [ ] **4.1 Server Actions in `apps/admin/src/actions/crm/onboarding.ts`**
  - Implement `convertOnboardingToClient(id, options)` with atomic `db.transaction`, duplicate check, and optional portal invite.
  - Implement `updateOnboardingStatus(id, status, notes)` and `deleteOnboarding(id)`.

- [ ] **4.2 Quick Share & WhatsApp Link Generator**
  - Build modal/button to copy onboarding URL or open pre-filled WhatsApp message.

- [ ] **4.3 Admin Queue View (`/relationships/onboarding`)**
  - Build tabbed layout (`Pending`, `Converted`, `All`) with count badges.
  - Build interactive `OnboardingTable` component.

- [ ] **4.4 Onboarding Review Drawer & 1-Click Conversion UI**
  - Build `OnboardingReviewDrawer` with side-by-side verification and duplicate alert.
  - Wire **"⚡ Save as Client"** button with loading states and toast notifications.

---

## Phase 5: Verification, Testing & Polish

- [ ] **5.1 Unit & Integration Tests**
  - Write Vitest tests for `convertOnboardingToClient` (verifying transaction atomicity, duplicate prevention, and status update).
  - Write tests for Zod validation schemas.

- [ ] **5.2 End-to-End Flow Verification**
  - Test public form submission on mobile viewport.
  - Test admin 1-click conversion and verify data presence in `clients` list and billing quotes/invoices.
