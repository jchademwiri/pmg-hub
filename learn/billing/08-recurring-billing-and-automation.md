# 8. Recurring Billing & Automation

> Learn how recurring retainers, subscription services, and automated billing crons function in PMG Hub.

---

## What Is Recurring Billing?

Many clients engage PMG, TES, or AWS on monthly service retainers (such as web maintenance, tender monitoring, SEO consulting, or cloud hosting).

Instead of manually generating invoices every month, PMG Hub allows you to set up **Recurring Billing Profiles**:

- Defines the client and division (`PMG`, `TES`, or `AWS`).
- Sets fixed monthly line items, quantities, and prices.
- Configures the billing cycle (e.g. 1st of each month).
- Automatically applies universal End-of-Month (EOM) due dates.

---

## The Recurring Billing Workflow

```text
1. Admin creates Recurring Profile in Billing -> Recurring
2. Cron job triggers on scheduled day (00:00 SAST)
3. System generates new Invoice in "Draft" or "Issued" state
4. Branded invoice PDF is emailed to client's billing email
5. Invoice appears immediately in the client's self-service Portal
6. On the 25th, client receives Stage 1 Early Review Statement
7. Client pays via EFT -> Admin records payment -> Account reconciled
```

---

## Setting Up A Recurring Billing Profile

1. Navigate to `Billing -> Recurring`.
2. Click **Create Recurring Profile**.
3. Select the **Client** and **Division**.
4. Configure the **Frequency** (Monthly, Quarterly, Annual).
5. Specify the **Start Date** and optional **End Date**.
6. Add the recurring line items (e.g. "Monthly Cloud Hosting & Maintenance", "Tender Monitoring Retainer").
7. Toggle **Auto-Issue** if invoices should be issued and sent immediately upon generation, or leave unchecked if you prefer to review drafts before dispatch.
8. Click **Save Profile**.

---

## Automation via Vercel Cron

The recurring billing engine runs autonomously:

- **Endpoint**: `/api/cron/recurring-billing`
- **Schedule**: Daily at 01:00 UTC (03:00 SAST)
- **Action**: Queries all active profiles due for generation on today's date, creates sequential invoice numbers (e.g., `INV-PMG-0042`), and logs the execution for auditing.

---

## Managing Pauses, Cancellations & Upgrades

- **Pausing a Retainer**: Open the profile and toggle status to `Paused`. No invoices will be generated while paused.
- **Upgrading Scope**: Edit the profile's line items. All future generated invoices will reflect the updated pricing.
- **Cancelling**: Set the status to `Cancelled` or set an end date. Historical invoices remain preserved in the ledger.
