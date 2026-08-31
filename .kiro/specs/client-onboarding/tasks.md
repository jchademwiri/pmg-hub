# Implementation Tasks — Ultra-Lean Client Account Creation

## Phase 1: Database & Schemas (`packages/db`)

- [ ] **1.1 Add Nullable Columns to `clients`**
  - Add `registrationNumber`, `website`, `billingAddress`, `city`, `postalCode`, `province` to `packages/db/src/schema/clients.ts`.

- [ ] **1.2 Create `client_onboardings` Staging Table**
  - Create `packages/db/src/schema/onboarding.ts` with `leadId` foreign key and core account profile fields.
  - Export from `packages/db/src/schema/index.ts`.

- [ ] **1.3 Generate & Run Migration**
  - Run Drizzle migration (zero-downtime, non-blocking).

---

## Phase 2: Public Account Creation Web Flow & Pre-fill

- [ ] **2.1 Mobile Single-Card Form (`/onboard`)**
  - Build ultra-fast single-card form with strictly 4 essentials: Contact Name, Business Name, Email, Phone.
  - Optional CIPC field.

- [ ] **2.2 Lead Pre-filling (`/onboard?lead=<id>`)**
  - Fetch lead info to pre-fill Name, Email, Phone, Company, Division.
  - 1-tap submission for existing leads.

- [ ] **2.3 Submission & Email Alerts**
  - Add Turnstile bot protection.
  - Wire submission action to save `client_onboardings` and dispatch notification email.

---

## Phase 3: Admin Portal Integration & 1-Click Conversion (`apps/admin`)

- [ ] **3.1 Lead Detail Onboarding Action**
  - Add **"📱 Send Account Setup Link"** modal on `/relationships/leads/[id]` generating pre-filled WhatsApp link.

- [ ] **3.2 Admin Onboarding Queue**
  - Build `/relationships/onboarding` tabs (`Pending`, `Converted`, `All`).

- [ ] **3.3 Atomic 1-Click Conversion**
  - Implement `convertOnboardingToClient` (creates `clients` record + marks `leads` as `converted`).

---

## Phase 4: Client Portal Profile & Verification

- [ ] **4.1 Client Portal Profile Update (`apps/portal`)**
  - Allow existing clients to view/edit profile in `/profile`.

- [ ] **4.2 End-to-End Verification**
  - Test lead pre-fill -> 10s mobile submit -> 1-click admin conversion.
