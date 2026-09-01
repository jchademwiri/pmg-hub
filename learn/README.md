# PMG Hub Knowledge Base & Learning Modules

> Start here if you are new to the system. These guides explain what each area does, what to do day-to-day, and how information flows through the entire multi-division business ecosystem.

---

## The Big Picture

PMG Hub is the centralized operational and financial engine powering Playhouse Media Group and its operating divisions. It unifies client onboarding, relationships, quotes, invoices, automated billing, payments, expense management, double-entry accounting, project delivery, compliance tracking, and executive insights into a cohesive workflow.

```text
Public Websites (PMG / TES / AWS)
    └─► Public Onboarding Form (/onboard)
            └─► Admin Review Drawer (1-Click Conversion)
                    ├─► Active Client Record (Relationships)
                    │       ├─► Client Portal Account (portal.playhousemedia.co.za)
                    │       │       ├─► Quote Approvals & Invoices
                    │       │       ├─► Monthly Statements
                    │       │       ├─► Active Projects & Tenders
                    │       │       └─► Compliance Document Vault
                    │       │
                    │       ├─► Quotes -> Invoices -> Payments -> Income (Billing & Finance)
                    │       │       ├─► Automated 3-Stage Monthly Statements
                    │       │       ├─► Recurring Retainer Billing
                    │       │       └─► Universal EOM Due Dates
                    │       │
                    │       ├─► Expenses & Receipts (Cloudflare R2)
                    │       │
                    │       ├─► Double-Entry Accounting (Journals, Ledger, Trial Balance, P&L)
                    │       │
                    │       └─► Insights, Monthly Snapshots & Executive Commentary
                    │
                    └─► Asset Register, Treasury Savings & SBD Document Hub
```

Use the operational workflows first. The accounting ledgers and periods are designed for automated posting, periodic reviews, and accountant verification.

---

## Operating Divisions & Brands

PMG Hub manages three distinct operating divisions under one shared backend:

| Code      | Division Name             | Focus Area                                  | Production Domain           | Client Portal                      |
| :-------- | :------------------------ | :------------------------------------------ | :-------------------------- | :--------------------------------- |
| **`PMG`** | **Playhouse Media Group** | Digital Media, Branding & Creative Services | `playhousemedia.co.za`      | `portal.playhousemedia.co.za`      |
| **`TES`** | **Tender Edge Solutions** | Tender Consulting, Bid Prep & SBD Forms     | `tenderedgesolutions.co.za` | `portal.tenderedgesolutions.co.za` |
| **`AWS`** | **Apex Web Solutions**    | Web Design, Software & Cloud Development    | `apexwebsolutions.co.za`    | `portal.playhousemedia.co.za`      |

---

## Complete Learning Modules

| #   | Domain                      | Guide                                              | What It Covers                                                                                                 |
| :-- | :-------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| 1   | **Relationships & CRM**     | [Relationships Guide](./relationships/README.md)   | Clients, leads, divisions, and the **Client Onboarding & 1-Click Conversion** pipeline                         |
| 2   | **Billing & Invoicing**     | [Billing Guide](./billing/README.md)               | Quotes, invoices, payments, credit notes, statements, and **Automated 3-Stage Statements & Recurring Billing** |
| 3   | **Client Portal**           | [Client Portal Guide](./portal/README.md)          | Passwordless magic link login, admin impersonation, client self-service, quotes, invoices, and compliance      |
| 4   | **Finance**                 | [Finance Guide](./finance/README.md)               | Income tracking, expense recording with Cloudflare R2 receipts, categories, and profit distributions           |
| 5   | **Projects & Tasks**        | [Scheduling & Tasks Guide](./scheduling/README.md) | Tender submission scheduling, effort calculation, risk rating, and task boards                                 |
| 6   | **Documents & SBD Hub**     | [Documents Guide](./documents/README.md)           | Admin document manager, Cloudflare R2 storage, and the public SEO SBD forms hub on TES                         |
| 7   | **Assets & Savings**        | [Assets & Savings Guide](./assets/README.md)       | Fixed asset register, equipment depreciation, Luno crypto portfolio, and treasury reserves                     |
| 8   | **Insights & Analytics**    | [Insights Guide](./insights/README.md)             | Monthly locked snapshots, financial reports, revenue drilldowns, and executive commentary                      |
| 9   | **Accounting**              | [Accounting Guide](./accounting/README.md)         | Double-entry journals, chart of accounts, general ledger, trial balance, P&L, periods, and exports             |
| 10  | **Settings & System Admin** | [Settings Guide](./settings/README.md)             | Organisation setup, billing defaults, users, permissions, Cloudflare R2 backups, and automated cron jobs       |

---

## Daily Operational Routine

| Task                                  | Where To Go                   | Recommended Actions                                                                                    |
| :------------------------------------ | :---------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Review New Onboarding Submissions** | `Relationships -> Onboarding` | Inspect pending intake forms, review company details, and trigger 1-click conversion to active client. |
| **Send Quotes for New Work**          | `Billing -> Quotes`           | Select the correct division (`PMG`, `TES`, `AWS`), add line items, and email to the client.            |
| **Issue Invoices**                    | `Billing -> Invoices`         | Issue drafted invoices. Universal End-of-Month (EOM) due dates are applied by default.                 |
| **Record Money Received**             | `Billing -> Payments`         | Record payments received and allocate them against open invoices immediately.                          |
| **Record Business Expenses**          | `Finance -> Expenses`         | Enter costs, select category & division, and attach receipts (stored securely in Cloudflare R2).       |
| **Track Tasks & Tender Deadlines**    | `Projects` / `Scheduling`     | Update task statuses, verify tender submission closing dates, and monitor risk indicators.             |
| **Follow Up on Overdue Accounts**     | `Billing -> Statements`       | Review outstanding balances and trigger strategic reminder emails or statements.                       |

---

## Month-End Closing Routine

1. **Verify Inbound & Outbound Transactions**: Ensure all client payments and supplier expenses for the month are captured and receipts attached.
2. **Review Drafts & Retainers**: Check recurring billing invoices generated for the month and confirm drafts are either issued or removed.
3. **Reconcile Accounts**: Verify that client statement balances match actual payments in `Billing -> Statements`.
4. **Inspect Trial Balance & P&L**: Go to `Accounting -> Trial Balance` and `Accounting -> Profit & Loss` to review revenue, direct costs, and net margins across divisions.
5. **Lock the Completed Accounting Period**: In `Accounting -> Periods` or from the Dashboard, lock the completed month (e.g. at the start of June, lock the finalized month of May).
6. **Generate Executive Snapshot**: Review the generated monthly snapshot in `Insights -> Snapshots` and record commentary for leadership.
7. **Verify Automated Backups**: Confirm that the daily PostgreSQL backup snapshot is synced to Cloudflare R2 in `Settings -> Data`.

---

## Core System Principles

1. **Division Integrity**: Always associate every quote, invoice, expense, and lead with the correct division code (`AWS`, `TES`, or `PMG`).
2. **Audit Trails Over Deletion**: Never delete issued financial records. Use voids, credit notes, or reversal journals so financial audit trails remain intact.
3. **Session-Guarded Privacy**: Client documents, receipts, and sensitive financial records are protected by Better Auth sessions and Cloudflare R2 access guards.
4. **Automated Consistency**: Rely on automated cron schedules for recurring billing, statement dispatches, and compliance expiration alerts rather than manual reminders.
