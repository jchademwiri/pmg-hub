# 6. Billing Accounts & Monthly Statements

> Learn how client account balances are tracked and how the automated 3-stage monthly statement cycle drives predictable cash flow.

---

## Client Billing Accounts

Each client has a dedicated ledger tracking:

- All historical and current invoices
- Cash receipts and unallocated payments
- Credit notes applied
- Current and overdue account balance
- Ageing analysis breakdown

You can access any client's billing account from `Billing -> Statements` or by clicking the **Billing** tab on any client profile.

---

## The Strategic 3-Stage Monthly Statement Cycle

To ensure predictable cash flow and eliminate payment disputes, PMG Hub implements a **3-stage monthly statement workflow**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MONTHLY STATEMENT PIPELINE                      │
├───────────────────┬───────────────────────────────┬────────────────────┤
│  STAGE 1 (26th)   │      STAGE 2 (Month-End)      │   STAGE 3 (8th)    │
│  "Retainer Cycle" │      "Month-End Notice"       │  "Overdue Notice"  │
├───────────────────┼───────────────────────────────┼────────────────────┤
│ Invoices auto-    │ Sent to ALL clients with      │ Sent ONLY to       │
│ issued on 26th    │ outstanding balances on the   │ clients with prior │
│ with statement    │ last day of the month.        │ overdue balances.  │
│ attached (no      │                               │                    │
│ duplicate emails) │ Formal courtesy notice and    │ Urgent reminder    │
│ to retainer       │ live statement before month-  │ before service     │
│ clients.          │ end payment due date.         │ suspension/freeze. │
└───────────────────┴───────────────────────────────┴────────────────────┘
```

### Stage 1: Retainer Billing & Statement Delivery (26th of Month)

- **Target**: Retainer clients (`isRetainer = true`).
- **Goal**: Generates monthly retainer invoices on the 26th and automatically attaches the client's live statement PDF in a single email delivery. Retainer clients with open balances who do not receive a recurring invoice receive their standalone statement.

### Stage 2: Month-End Statement & Courtesy Due Notice (Last Day of Month)

- **Target**: All active clients with an open balance greater than zero.
- **Goal**: Provides the standard monthly statement reflecting all current and carried-forward charges due for settlement at month-end.

### Stage 3: Post-Grace Overdue Notice (8th of Month)

- **Target**: Clients whose prior-month invoices are overdue (past the End-of-Month due date).
- **Goal**: Serves as a firm payment reminder following the standard grace period before services, hosting, or ongoing tender consulting are paused.

---

## How Statements Are Delivered

1. **Automated Background Crons**: 
   - Retainer invoices are generated and emailed with live statements attached on the **26th** via `/api/cron/recurring-billing` (08:00 SAST).
   - Automated statement sweeps and reminders are processed daily at 08:10 SAST via `/api/cron/outstanding-reminders` (handling the 26th sweep with deduplication, month-end sweep, and 8th overdue notice).
2. **Manual Batch Dispatch**: Go to `Billing -> Statements`, review client balances, select clients using the checkbox selector, and click **Send Statements**.
3. **Single Client Dispatch**: Open any client's statement page and click **Email Statement**.
4. **Client Portal Access**: Clients can log in to their self-service portal at `portal.playhousemedia.co.za` or `portal.tenderedgesolutions.co.za` at any time to download their live statement PDF.

---

## Understanding Ageing Buckets

The system categorizes unpaid amounts into 30-day buckets:

| Bucket       | Definition                                | Collection Risk | Recommended Action                           |
| :----------- | :---------------------------------------- | :-------------- | :------------------------------------------- |
| **Current**  | Invoiced within the current billing cycle | Low             | Covered by Stage 1 & Stage 2 statements      |
| **30+ Days** | 1 to 30 days past due date                | Moderate        | Stage 3 Final Notice + phone follow-up       |
| **60+ Days** | 31 to 60 days past due date               | High            | Escalate to executive account manager        |
| **90+ Days** | More than 60 days past due date           | Critical        | Immediate service suspension & formal demand |
