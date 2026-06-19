# 3. General Ledger — The Master Record

> **In plain English:** The General Ledger is the **complete history** of every financial transaction in your business, organised so you can see the full story of any account.

---

## What Is the General Ledger?

If the Chart of Accounts is your filing cabinet, and Journal Entries are the individual receipts, then the General Ledger is the **complete record book** that shows ALL transactions for ALL accounts, in chronological order.

**Navigate to:** `/accounting/general-ledger`

---

## How It's Different from Journals

| | Journals | General Ledger |
|---|---------|----------------|
| **Shows** | Individual transactions | Every transaction line, across all accounts |
| **Organised by** | Transaction (entry) | Date and account |
| **Use when** | Recording a new transaction | Reviewing historical data, auditing, reconciling |
| **Can you create entries here?** | ✅ Yes | ❌ No — view only |

**Key insight:** The General Ledger is a **read-only view** of all the journal entry data. You cannot create or edit journal entries from here — you go to the Journals page for that.

---

## How to Read the General Ledger

The General Ledger shows each journal entry line as a row:

| Column | What It Means |
|--------|---------------|
| **Entry #** | The journal entry number (e.g., JE-2026-0001) |
| **Date** | When the transaction happened |
| **Account** | Which chart account was affected (code + name) |
| **Debit** | Amount on the debit side (if applicable) |
| **Credit** | Amount on the credit side (if applicable) |
| **Description** | What the transaction was about |
| **Source** | Where this entry came from (manual, income, expense) |

### Example: Reading a Transaction

```
Date: 2026-04-15 | Entry: JE-2026-0001 | Description: "TES-INV-0001 - Full Tender"
  1010  Business Cheque Account    DR: R5,000
  4010  Sales Revenue              CR: R5,000
```

**How to read this:** On April 15, a client paid R5,000 for tender services. The bank account received R5,000 (debit) and the revenue account earned R5,000 (credit).

---

## Filtering the General Ledger

You can filter by:

| Filter | What It Does | When to Use |
|--------|-------------|-------------|
| **Date Range** | Show only transactions between two dates | "Show me everything from April to May" |
| **Account** | Show only transactions affecting a specific account | "Show me only bank account activity" |
| **Both** | Combine date range and account filter | "Show me all expenses in May" |

### Useful Filter Combinations

1. **Bank reconciliation** — Filter by "Business Cheque Account" (1010) to see all money in and out of your bank
2. **Monthly review** — Set date range to a specific month to see all activity
3. **Expense audit** — Filter by specific expense accounts to see what was spent
4. **Revenue tracking** — Filter by Sales Revenue (4010) to see all income

---

## Pagination

The General Ledger can have many rows (2 lines per journal entry). It's paginated with 50 lines per page by default. Use the page controls at the bottom to navigate.

---

## Your Current General Ledger

Based on your data:

| Metric | Value |
|--------|-------|
| Total journal entries | 27 posted |
| Total ledger lines | 54 (2 lines per entry) |
| Date range | April 2026 – June 2026 |
| Total debits | R22,860.00 |
| Total credits | R22,860.00 |

### Types of Transactions You'll See

**Income entries** (12 entries):
```
DR  1010  Business Cheque Account    R[X,XXX]  ← Money came in
CR  4010  Sales Revenue              R[X,XXX]  ← You earned it
```

**Expense entries** (15 entries):
```
DR  5xxx  [Expense Account]          R[XXX]    ← You spent it
CR  1010  Business Cheque Account    R[XXX]    ← Money left the bank
```

---

## When to Use the General Ledger

| Use Case | How |
|----------|-----|
| **Verify a transaction** | Search by entry number or date |
| **Reconcile bank statements** | Filter by Business Cheque Account, compare with bank statement |
| **Audit an expense** | Filter by the specific expense account |
| **Prepare for tax season** | Export the full ledger for your accountant |
| **Investigate a discrepancy** | Trace back from Trial Balance to individual entries |

---

## Common Mistakes

1. **Trying to edit here** — You can't edit journal entries from the General Ledger. Go to `/accounting/journals` instead.
2. **Confusing it with Trial Balance** — The General Ledger shows individual transactions; the Trial Balance shows totals per account.
3. **Not filtering** — If you have hundreds of entries, use the filters to narrow down what you're looking for.

---

## The Data Flow

```
Journal Entries → General Ledger → Trial Balance → Profit & Loss
     (you)         (history)        (totals)      (performance)
```

The General Ledger is the **source of truth** for all financial data. Every other report reads from it.
