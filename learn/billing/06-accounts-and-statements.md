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
│  STAGE 1 (25th)   │        STAGE 2 (1st)          │   STAGE 3 (7th)    │
│  "Early Review"   │    "Official Statement"       │  "Final Notice"    │
├───────────────────┼───────────────────────────────┼────────────────────┤
│ Sent to Retainer  │ Sent to ALL clients with      │ Sent ONLY to       │
│ clients 5 days    │ outstanding balances on the   │ clients with       │
│ before month-end. │ 1st of the new month.         │ overdue balances.  │
│                   │                               │                    │
│ Gives clients     │ Formal monthly statement      │ Urgent notice      │
│ time to process   │ detailing invoices, credits,  │ before service     │
│ POs & approvals.  │ and opening/closing balances. │ suspension/freeze. │
└───────────────────┴───────────────────────────────┴────────────────────┘
```

### Stage 1: Early Review Statement (25th of Month)

- **Target**: Retainer clients (`isRetainerClient = true`).
- **Goal**: Gives corporate and government clients 5 to 6 business days before month-end to generate purchase orders (POs) and schedule batch EFT runs for the last day of the month.

### Stage 2: Official Statement of Account (1st of Month)

- **Target**: All active clients with an open balance greater than zero.
- **Goal**: Provides the standard monthly statement reflecting closing balances from the previous month and opening balances for the new month.

### Stage 3: Final Notice / Overdue Statement (7th of Month)

- **Target**: Clients whose invoices are overdue (past the End-of-Month due date).
- **Goal**: Serves as a firm payment reminder before services, hosting, or ongoing tender consulting are paused.

---

## How Statements Are Delivered

1. **Automated Background Cron**: The Vercel cron job `/api/cron/automated-statements` checks the current date daily at 08:00 SAST and automatically executes the appropriate stage (25th, 1st, or 7th).
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
