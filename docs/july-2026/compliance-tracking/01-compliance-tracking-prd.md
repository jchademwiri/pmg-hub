# Client Compliance \u0026 Expiry Tracking: Product Requirements Document (PRD)

## 1. Overview
The **Client Compliance Tracking System** is a new module designed to help both PMG Admins and PMG Clients manage critical expiring business documents (e.g., Tax PINs, B-BBEE affidavits, COIDA). 

By providing bi-directional visibility and automated email reminders, this feature ensures clients never miss a renewal deadline, ultimately protecting their ability to apply for tenders and conduct business.

## 2. Feasibility Assessment
**Status:** **Highly Feasible**
- **Database:** Adding a `client_compliance_documents` table to Drizzle ORM is trivial. 
- **User Interface:** The UI patterns for listing, adding, and editing items already exist in the `@admin` app (Billing/Projects) and the Client Portal.
- **Automated Reminders:** Next.js API routes triggered by Vercel Cron (or similar schedulers) combined with the existing **Resend** email integration make periodic scanning and email dispatching straightforward.

## 3. Core Features

### 3.1 Bi-Directional Management
- **Client Portal:** Clients can log in, view their compliance dashboard, and add new compliance records.
- **Admin Portal:** Admins can view a client's profile and add compliance documents on their behalf.

### 3.2 Document Entry Types
This system is purely text-based tracking to avoid high cloud storage costs. Users simply log the document type and expiry date.
- **Pre-defined List:** Users can select from standard South African compliance types:
  - SARS Tax Clearance PIN
  - B-BBEE Affidavit / Certificate
  - CIPC Annual Returns
  - COIDA / Letter of Good Standing
  - CIDB Registration (Annual & 3-Year Renewals)
- **Custom Input:** Users can type a custom document name if it's not on the list.
- **Expiry Date:** The crucial data point driving the automation.

### 3.3 Automated Expiry Reminders (Cron Job)
The system will run a scheduled background task to scan for upcoming expirations and group them into digest emails.

**Proposed Notification Intervals:**
1. **The "Two-Month Lookahead" (e.g., Sent on the 25th of the month)**
   - *Example:* On June 25th, the system scans for documents expiring in July and August.
   - *Message:* "Heads up! You have compliance documents expiring in the next 60 days. Taking action now ensures your tender readiness is not interrupted."
2. **The "Current Month Warning" (e.g., Sent on the 10th of the month)**
   - *Example:* On July 10th, sends a reminder strictly for documents expiring *this month*.
   - *Message:* "Action Required: The following documents expire this month."
3. **14-Day Warning**
   - *Message:* "Urgent: You have compliance documents expiring in exactly 14 days."
4. **7-Day Final Warning**
   - *Message:* "Critical: Your compliance documents will expire in 7 days."
5. **The "Expired Alert" (Sent on the day after expiry)**
   - *Message:* "Your compliance document has expired. Please update it in the portal to maintain compliance."

## 4. User Stories
1. **As a Client**, I want to pick "Tax PIN" from a dropdown, select an expiry date, and save it, so I can get automated reminders.
2. **As an Admin**, I want to add a renewed compliance record for my client, so they can log in and see the updated expiry date.
3. **As a Client**, I want to receive an email consolidated list of what is expiring in the next 2 months, so I can budget time and money for renewals.
4. **As an Admin**, I want a dashboard view of *all* clients with upcoming expirations so I can proactively offer "Compliance Renewal" services as an upsell.

## 5. Required Technical Documentation
To prepare for software engineering, the following architectural documents have been drafted:
- `02-architecture-and-schema.md`: Details the database tables, API routes, and cron job logic.
