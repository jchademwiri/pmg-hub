# 2. Clients

> A client is an active organisation or individual with whom you do business.

## What A Client Record Shows

A client record contains comprehensive operational and financial information:

- **Company & Contact Information**: Business name, registration number, VAT number, physical & postal addresses.
- **Primary & Billing Contacts**: Direct contact person name, email, phone number, and billing email preferences.
- **Assigned Division**: Default division (`PMG`, `TES`, or `AWS`) used for billing and communication branding.
- **Billing Profile & Settings**:
  - `Retainer Client` flag: Indicates whether the client is on a monthly recurring retainer (used in automated statement cycles and recurring billing).
  - Payment terms (e.g. End of Month, Net 30).
- **Financial Health Summary**:
  - Total Invoiced, Total Paid, and Real-time Outstanding Balance.
  - Complete history of Quotes, Invoices, Payments, Credit Notes, and Statements.
- **Active Projects & Tenders**: Ongoing projects or bid submissions linked to this client.
- **Admin Impersonation**: One-click direct access to view the client's view in the Client Portal.

---

## Client Financial Health Metrics

| Metric                  | Meaning                                         | Impact                                                       |
| :---------------------- | :---------------------------------------------- | :----------------------------------------------------------- |
| **Total Invoiced**      | Cumulative sum of all issued invoices.          | Indicates client lifetime billed volume.                     |
| **Total Paid**          | Total cash received and allocated.              | Actual revenue realized from client.                         |
| **Outstanding Balance** | Total unpaid / overdue amount.                  | Drives statement dispatches and overdue reminder sequences.  |
| **Retainer Status**     | Whether client is flagged as a retainer client. | Determines if included in 25th Early Review statement cycle. |

---

## Admin Impersonation (View as Client)

When assisting a client or verifying what they see on their self-service portal:

1. Open the client record in `Relationships -> Clients -> [Client Name]`.
2. Click the **Impersonate Client** button in the header.
3. A new tab opens securely in `apps/portal` (`portal.playhousemedia.co.za` or `portal.tenderedgesolutions.co.za`) logged in as that client.
4. You can see their invoices, quotes, statement downloads, and active project dashboard exactly as they see it.

---

## Workflow: Adding & Managing Clients

1. **Check Onboarding First**: Go to `Relationships -> Onboarding` to see if the client submitted an onboarding form. If yes, use **1-Click Conversion**.
2. **Manual Creation (if needed)**: Click **Add Client**, choose the division, enter company name and primary email.
3. **Configure Billing Preferences**: Set whether the client is a **Retainer Client** and verify tax/registration details.
4. **Link Documents**: Create quotes or invoices directly from the client's profile page.

---

## Common Mistakes & Best Practices

| Mistake                             | Prevention / Fix                                                                                                                          |
| :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Creating Duplicate Records**      | Always search by company name, registration number, or email before adding a client.                                                      |
| **Wrong Assigned Division**         | Verify whether the client belongs to `AWS`, `TES`, or `PMG` so invoice templates and bank details match.                                  |
| **Leaving Retainer Flag Unchecked** | If the client pays a monthly subscription/retainer, check the `Retainer Client` box so automated monthly statements are sent on the 25th. |
