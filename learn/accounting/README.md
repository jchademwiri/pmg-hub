# 📚 PMG Accounting System — Complete Guide

> **Accounting 101 for non-accountants.** This guide explains every part of the PMG accounting module in plain language, with real examples from your business data.

---

## Table of Contents

| # | Topic | File | What It Covers |
|---|-------|------|----------------|
| 1 | **Chart of Accounts** | [01-chart-of-accounts.md](./01-chart-of-accounts.md) | The list of all your accounts — what they are, how they're numbered, and what each one is for |
| 2 | **Journals** | [02-journals.md](./02-journals.md) | How every transaction is recorded as a journal entry with debits and credits |
| 3 | **General Ledger** | [03-general-ledger.md](./03-general-ledger.md) | The master record of every transaction, organised by account |
| 4 | **Trial Balance** | [04-trial-balance.md](./04-trial-balance.md) | A health check that confirms your books are balanced (debits = credits) |
| 5 | **Profit & Loss** | [05-profit-and-loss.md](./05-profit-and-loss.md) | Your income minus expenses — the bottom line of your business |
| 6 | **Periods** | [06-periods.md](./06-periods.md) | How accounting is divided into monthly time blocks and why that matters |
| 7 | **Exports** | [07-exports.md](./07-exports.md) | How to export your accounting data for tax season, auditors, or your accountant |
| 8 | **Daily Workflow** | [08-how-to-use-daily.md](./08-how-to-use-daily.md) | A practical step-by-step guide for using the system day-to-day |

---

## Quick Orientation

**"I just logged in. Where do I start?"**

1. **Use Billing and Finance for daily work** — quotes, invoices, payments, income, and expenses should start there.
2. **Check the Accounting Overview** (`/accounting`) — this shows accounting totals at a glance.
3. **Review Journals** (`/accounting/journals`) — confirms automatic entries were created.
4. **Check the Trial Balance** (`/accounting/trial-balance`) — confirms your books are balanced.
5. **View the Profit & Loss** (`/accounting/profit-and-loss`) — see how the business is performing.

**"What's the flow of data?"**

```txt
You record a quote, invoice, payment, income, expense, or journal
        ↓
  Journal Entry (usually created automatically)
        ↓
  Flows into ──→ General Ledger (master record)
        ↓
  Flows into ──→ Trial Balance (balance check)
        ↓
  Flows into ──→ Profit & Loss (income statement)
```

Most day-to-day transactions are posted automatically from Billing or Finance. Manual journals are for special accounting corrections and adjustments.

---

## What Is Double-Entry Bookkeeping?

Every financial transaction has **two sides**. When you receive money, it comes from somewhere (e.g., a client pays you) and goes somewhere (e.g., into your bank account). Double-entry bookkeeping records both sides.

**The golden rule:** Debits must always equal Credits.

- **Debit (Dr)** = "what came in" or "what was used"
- **Credit (Cr)** = "what went out" or "what was earned"

If you receive R5,000 from a client:
- **Debit** your Bank Account (money came in) — R5,000
- **Credit** your Sales Revenue (you earned it) — R5,000

Both sides are R5,000. The books are balanced. ✅

**You never need to manually balance normal billing or expense entries.** The system enforces that every journal entry has equal debits and credits before it can be saved or posted.

---

## What New Users Should Know

| Area | What To Remember |
|------|------------------|
| Billing | Issued invoices and payments create accounting activity |
| Finance | Expenses and non-invoice income create accounting activity |
| Journals | This is where accounting entries live |
| General Ledger | This is the detailed transaction history by account |
| Trial Balance | Debits and credits should match |
| Profit & Loss | Revenue minus expenses shows performance |
| Periods | Close completed months so old data does not change unexpectedly |
| Snapshots | Locked monthly records live in Insights |

---

## Common Accounts You'll See

| Code | Account | Type | What It Means |
|------|---------|------|---------------|
| **1010** | Business Cheque Account | Asset | Your main bank account — where money comes in and goes out |
| **1020** | Savings Account | Asset | PMG share transfers or savings movement |
| **1030** | Accounts Receivable | Asset | Money clients owe after invoices are issued |
| **4010** | Sales Revenue | Revenue | Income earned from sales |
| **4020** | PMG Share Revenue | Revenue | Revenue allocated to PMG share |
| **5030** | Office & Supplies | Expense | Printing, stationery, document costs |
| **5070** | Travel & Transport | Expense | Uber, petrol, flights, tolls |
| **5140** | Miscellaneous Expense | Expense | General expenses that do not fit a better category |

## Other Accounts Available

These are seeded and ready when you need them:

| Code | Account | Type | When You'd Use It |
|------|---------|------|-------------------|
| 1040 | Client Deposits | Asset | Money clients pay upfront before work starts |
| 1050 | Petty Cash | Asset | Small cash purchases (office snacks, parking, etc.) |
| 1060 | Prepaid Expenses | Asset | Expenses paid in advance (e.g., annual software subscription) |
| 2010 | Accounts Payable | Liability | Money you owe to suppliers |
| 2040 | Accrued Expenses | Liability | Expenses incurred but not yet paid |
| 2050 | Client Credits | Liability | Credits you owe back to clients |
| 3010 | Owner's Capital | Equity | Money the owner has invested into the business |
| 3020 | Retained Earnings | Equity | Profits kept in the business (not withdrawn) |
| 3030 | Owner's Drawings | Equity | Money the owner takes out of the business |
| 4030 | Interest Income | Revenue | Interest earned on bank accounts |
| 4040 | Other Income | Revenue | Any other income not from sales |
| 5010 | Hosting & Internet | Expense | Website hosting, domain fees, internet |
| 5020 | Software & Subscriptions | Expense | SaaS tools, licences |
| 5040 | Marketing & Advertising | Expense | Ads, marketing materials, social media |
| 5050 | Professional Fees | Expense | Accountant, lawyer, consultant fees |
| 5060 | Telephone & Communications | Expense | Phone bills, airtime |
| 5080 | Insurance | Expense | Business insurance premiums |
| 5090 | Contractor Payments | Expense | Payments to freelancers/subcontractors |
| 5100 | Utilities | Expense | Electricity, water |
| 5110 | Bank Charges | Expense | Bank fees, transaction costs |
| 5120 | Staff Costs | Expense | Salaries, wages, UIF |
| 5130 | Reinvestment | Expense | Money reinvested into the business |
