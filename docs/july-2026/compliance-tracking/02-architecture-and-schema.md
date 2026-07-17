# Client Compliance Tracking: Architecture \u0026 Schema

This document outlines the technical architecture, database schema, and server architecture required to build the Client Compliance Tracking system in the PMG Hub.

## 1. Database Schema (Drizzle ORM)

We will introduce a new table in the `@pmg/db` package to track these records.

```typescript
import { pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { clients } from "./clients"; // Assuming existing clients table

export const complianceDocuments = pgTable("compliance_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // What is this document?
  documentType: text("document_type").notNull(), // e.g., 'TAX_PIN', 'BBBEE', 'CUSTOM'
  customName: text("custom_name"), // Populated only if documentType === 'CUSTOM'
  
  // Tracking
  expiryDate: date("expiry_date").notNull(),
  
  // Audit trail
  uploadedBy: text("uploaded_by").notNull(), // 'ADMIN' or 'CLIENT'
  uploadedById: uuid("uploaded_by_id"), // Reference to admin user_id or client contact_id
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## 2. Server Actions \u0026 API Layer

### 2.1 Admin App Server Actions (`apps/admin/src/app/actions/compliance.ts`)
- `addComplianceRecord(data)`
- `updateComplianceRecord(id, data)`
- `deleteComplianceRecord(id)`
- `getComplianceRecordsByClient(clientId)`
- `getUpcomingExpirationsGlobal()` (For admin dashboard cross-client view)

### 2.2 Client Portal Actions (`apps/portal/src/app/actions/compliance.ts`)
- `addClientComplianceRecord(data)` (Restricted to their own `clientId`)
- `getClientComplianceRecords()`
- `deleteClientComplianceRecord(id)`

## 3. Automated Reminders Engine (Cron Job)

We will use an API Route invoked by Vercel Cron to process the reminders.

**Endpoint:** `GET /api/cron/compliance-reminders`
**Schedule:** Runs daily at 08:00 AM (`0 8 * * *`)

### Logic Flow:
1. **Query:** Fetch all `complianceDocuments` where `expiryDate` is between `today` and `today + 60 days`.
2. **Group:** Group the results by `clientId`.
3. **Filter by Notification Rules:**
   - Check if today is the 25th of the month (Trigger "2-Month Lookahead" email).
   - Check if today is the 10th of the month (Trigger "Current Month Warning" email).
   - Check if `expiryDate` is exactly 14 days from today (Trigger "14-Day Warning").
   - Check if `expiryDate` is exactly 7 days from today (Trigger "7-Day Warning").
   - Check if `expiryDate` was exactly yesterday (Trigger "Expired" email).
   *(If today does not match these rules for a specific document, skip sending to avoid spamming the client daily).*
4. **Dispatch:**
   - Loop through the grouped clients.
   - Fetch the primary contact email for the client.
   - Use **Resend** and **React Email** to render a beautiful HTML email containing a table of the expiring documents.
   - Send the email.
5. **Log:** Keep a record of the sent emails to prevent duplicate dispatching in case the cron job retries.

## 4. UI Components

### 4.1 Shared Components
- `ComplianceTable`: A reusable table component (Document Name, Expiry Date, Status Badge [Valid, Expiring Soon, Expired], Actions).
- `ComplianceFormDialog`: A modal containing a dropdown for Document Type, and a Date Picker for the Expiry Date.

### 4.2 Admin Views
- **Client Profile Tab:** `/clients/[id]/compliance` - Shows the `ComplianceTable` for the specific client.
- **Global Overview:** `/insights/compliance-radar` - A master list showing all upcoming client expirations, acting as a sales/upsell pipeline for the TenderCore division.

### 4.3 Portal Views
- **Client Dashboard Tab:** `/portal/compliance` - Shows their own `ComplianceTable` and an "Add Expiry Tracker" button.
