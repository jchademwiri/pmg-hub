# 5. Profit & Loss — How Your Business Is Performing

> **In plain English:** The Profit & Loss statement (also called the "Income Statement") shows you one simple thing: **Did you make money or lose money?** It's Revenue (what you earned) minus Expenses (what you spent).

---

## What Is a Profit & Loss Statement?

Every business owner wants to know: "Am I making money?" The Profit & Loss statement answers that question by showing:

```
Revenue (what you earned)
  minus
Expenses (what you spent)
  equals
Net Profit (or Loss)
```

**Navigate to:** `/accounting/profit-and-loss`

---

## The Three Sections

### 1. Revenue (Income)

This section lists all the money your business has **earned**. Revenue accounts (4xxx) show up here.

| Code | Account | Amount |
|------|---------|--------|
| 4010 | Sales Revenue | R20,500.00 |
| | **Total Revenue** | **R20,500.00** |

**What this means:** Your business earned R20,500 from sales/services during this period.

### 2. Expenses (Costs)

This section lists all the money your business has **spent** on operations. Expense accounts (5xxx) show up here.

| Code | Account | Amount |
|------|---------|--------|
| 5030 | Office & Supplies | R1,785.00 |
| 5070 | Travel & Transport | R215.00 |
| 5140 | Miscellaneous Expense | R360.00 |
| | **Total Expenses** | **R2,360.00** |

**What this means:** Your business spent R2,360 on operations during this period.

### 3. Net Profit (or Loss)

```
Total Revenue:    R20,500.00
Total Expenses:   R2,360.00
─────────────────────────────
Net Profit:       R18,140.00  ✅ (green = profit)
```

**What this means:** After all income and expenses, your business made R18,140 in profit.

---

## How Revenue Is Calculated

For revenue accounts, the system calculates:

```
Amount = Credits - Debits
```

Why? Because revenue is recorded as **credits** (you earned it). If there are any debits to a revenue account (rare — maybe a refund), they reduce the total.

**Example:** Sales Revenue has R20,500 in credits and R0 in debits.
Amount = R20,500 - R0 = **R20,500** ✅

---

## How Expenses Are Calculated

For expense accounts, the system calculates:

```
Amount = Debits - Credits
```

Why? Because expenses are recorded as **debits** (you spent it). If there are any credits to an expense account (rare — maybe a refund from a supplier), they reduce the total.

**Example:** Office & Supplies has R1,785 in debits and R0 in credits.
Amount = R1,785 - R0 = **R1,785** ✅

---

## Period Filter

Like the Trial Balance, the Profit & Loss can be filtered by accounting period. This lets you see:

- **Monthly P&L** — "How did we do in May?"
- **Year-to-date P&L** — "How are we doing this year overall?"
- **Comparing months** — "Are expenses increasing?"

Without a filter, it shows **all-time** totals.

---

## Your Current P&L Summary

| Category | Amount |
|----------|--------|
| **Revenue** | |
| Sales Revenue (4010) | R20,500.00 |
| **Total Revenue** | **R20,500.00** |
| | |
| **Expenses** | |
| Office & Supplies (5030) | R1,785.00 |
| Travel & Transport (5070) | R215.00 |
| Miscellaneous Expense (5140) | R360.00 |
| **Total Expenses** | **R2,360.00** |
| | |
| **Net Profit** | **R18,140.00** |

### What This Means for Your Business

- You earned R20,500 in revenue
- You spent R2,360 on operations (11.5% of revenue)
- You kept R18,140 as profit (88.5% margin)
- Your biggest expense category is Office & Supplies (75% of total expenses)

---

## Profit vs Loss

| Result | Colour | What It Means |
|--------|--------|---------------|
| **Net Profit** (positive) | 🟢 Green | You made money! Revenue > Expenses |
| **Net Loss** (negative) | 🔴 Red | You lost money. Expenses > Revenue |

---

## When to Review the P&L

| When | Why |
|------|-----|
| **End of each month** | See how the month went |
| **Before making big decisions** | "Can we afford to hire someone?" |
| **Tax preparation** | This is what SARS cares about |
| **Investor/stakeholder reporting** | Show business performance |
| **Comparing periods** | "Are we doing better than last month?" |

---

## P&L vs Other Reports

| Report | Question It Answers |
|--------|-------------------|
| **Profit & Loss** | "Did we make money?" |
| **Trial Balance** | "Are our books balanced?" |
| **General Ledger** | "What exactly happened?" |

The P&L is the **most important report for business decisions**. It tells you if your business model is working.

---

## Common Questions

**Q: Why doesn't my P&L show the bank balance?**
A: The P&L shows income and expenses, not your bank balance. Your bank balance is an **asset** (shown on the Balance Sheet, not the P&L). The P&L shows how much you EARNED and SPENT, not what's in the bank.

**Q: Why are some accounts missing from the P&L?**
A: Only Revenue and Expense accounts appear on the P&L. Assets, Liabilities, and Equity appear on the Balance Sheet.

**Q: Can I see a monthly breakdown?**
A: Use the period filter to view P&L for a specific month. There isn't yet a side-by-side monthly comparison, but you can switch between periods.

**Q: What about expenses I haven't been invoiced for yet?**
A: These are called "accruals." You'd create a journal entry debiting the expense and crediting Accounts Payable (2040). The P&L would then show the expense even though you haven't paid it yet.
