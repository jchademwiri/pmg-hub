# Master Execution Plan: Database Refactoring \u0026 Compliance Module

## 1. Overview
This document outlines the step-by-step execution order to implement both the **Database Terminology Refactor** (Tender → Project) and the **Client Compliance Tracking** module safely and efficiently.

## 2. Phase 1: Database Refactoring (Tender to Project)
*Crucial first step: We clean up the foundation before building new features on top of it.*
1. **Update Schema Definitions:** Modify `packages/db/src/schema/project-schedule.ts` to replace all `tender_` strings with `project_` (tables, columns, indexes, enums).
2. **Generate Migration:** Run `npm run db:generate` in the `db` package.
3. **Verify SQL (CRITICAL):** Manually inspect the generated `.sql` file to ensure Drizzle used `ALTER TABLE ... RENAME TO`. If it generated `DROP TABLE`, manually rewrite the SQL to prevent data loss.
4. **Apply Migration:** Push the safe migration to the database.
5. **Verify App:** Start the dev server and verify the Projects board still loads perfectly.

## 3. Phase 2: Database Expansion (Compliance)
1. **Create Schema:** Add the new `complianceDocuments` table definition (text-based tracking only, no files) to the Drizzle schema.
2. **Generate Migration:** Run `npm run db:generate`.
3. **Apply Migration:** Push the new table to the database.

## 4. Phase 3: Backend Actions \u0026 Automation
1. **Admin Server Actions:** Build `addComplianceRecord`, `deleteComplianceRecord`, and `getComplianceRecordsByClient` in the `@admin` app.
2. **Portal Server Actions:** Build the restricted equivalent actions in the `@portal` app.
3. **Cron Job Engine:** Create the Vercel Cron API route (`/api/cron/compliance-reminders`).
   - Implement the time-math logic (60-day, current month, 14-day, 7-day, expired).
   - Integrate **Resend** and **React Email** to dispatch the HTML digest emails.

## 5. Phase 4: Admin Portal UI
1. **Navigation Update:** Rename the legacy "Relationships" sidebar link and routes to "Clients".
2. **Compliance Dialog:** Build the `ComplianceFormDialog` for adding text-based records.
3. **Client Profile Tab:** Add the Compliance data table to the individual client view (`/clients/[id]/compliance`).
4. **Global Radar (Upsell Pipeline):** Build the master "Compliance Radar" dashboard showing upcoming expirations across *all* clients.

## 6. Phase 5: Client Portal UI
1. **Portal Navigation:** Add the "Compliance" section to the client's dashboard.
2. **Bi-Directional View:** Implement the shared data table so clients can see the records the admin added, and vice versa.
3. **Client Self-Service:** Allow clients to add and update their own document expiry dates.

## 7. Verification \u0026 Testing
- **Refactor Test:** Ensure all legacy "Tender" project data survived the rename.
- **Bi-Directional Test:** Add a record as an Admin, log in as the Client, verify visibility.
- **Automation Test:** Manually trigger the cron job endpoint locally with mock dates to ensure the Resend emails fire successfully.
