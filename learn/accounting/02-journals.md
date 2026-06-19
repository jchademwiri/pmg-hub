# 2. Journals — Recording Every Transaction

> **In plain English:** A journal entry is how you record a financial transaction. Every time money moves in your business, you create a journal entry that says "money went from HERE to THERE."

---

## What Is a Journal Entry?

Think of a journal entry as a **receipt with two sides**. When you record a transaction, you're saying:

1. **Debit side** — What account received value? (what came IN)
2. **Credit side** — What account gave value? (what went OUT)

**Navigate to:** `/accounting/journals`

---

## The Anatomy of a Journal Entry

Every journal entry has:

| Field | What It Means |
|-------|---------------|
| **Entry Number** | Auto-generated unique ID (e.g., JE-2026-0001) |
| **Date** | When the transaction happened |
| **Description** | Plain-English explanation of the transaction |
| **Status** | Draft (not final) or Posted (final, affects reports) |
| **Lines** | The individual debit/credit rows (minimum 2) |
| **Source Module** | Where this entry came from (manual, income, expense, etc.) |

### Journal Lines (the details)

Each line in a journal entry has:

| Field | What It Means |
|-------|---------------|
| **Account** | Which chart account this line affects |
| **Debit** | Amount on the debit side (enter this OR credit, not both) |
| **Credit** | Amount on the credit side (enter this OR debit, not both) |
| **Description** | What specifically this line is for |

---

## How to Create a Journal Entry

**Navigate to:** `/accounting/journals/new`

### Step-by-Step:

1. **Enter the date** — When did this transaction happen? (defaults to today)
2. **Enter a description** — What is this transaction about? Be specific.
   - Good: "Paid Uber to client meeting in Sandton"
   - Bad: "Transport"
3. **Add lines** — Click "Add Line" for each account affected
4. **Select an account** for each line — use the dropdown grouped by type
5. **Enter amounts** — put the amount in EITHER Debit OR Credit, not both
6. **Check the balance** — the bottom shows if your entry balances (Debits = Credits)
7. **Submit** — save as Draft or Post immediately

---

## Real Examples from Your Business

### Example 1: Receiving Payment from a Client

A client pays you R5,000 for tender services via bank transfer.

```
Date: 2026-04-15
Description: "TES-INV-0001 - Full Tender"

  DR  1010  Business Cheque Account    R5,000
  CR  4010  Sales Revenue              R5,000
```

**Why:** Money came INTO your bank account (debit = increase in asset), and you earned revenue (credit = increase in income).

### Example 2: Paying for Office Supplies

You buy bond paper and printing supplies for R250.

```
Date: 2026-04-20
Description: "Bond Paper"

  DR  5030  Office & Supplies          R250
  CR  1010  Business Cheque Account    R250
```

**Why:** An expense increased (debit = increase in expense), and money LEFT your bank account (credit = decrease in asset).

### Example 3: Paying for Transport (Uber)

You take an Uber to meet a client for R85.

```
Date: 2026-05-10
Description: "Uber to meet a client"

  DR  5070  Travel & Transport         R85
  CR  1010  Business Cheque Account    R85
```

**Why:** Travel expense increased (debit), bank account decreased (credit).

---

## The Rules of Journal Entries

### Rule 1: Debits MUST Equal Credits
Every journal entry **must balance**. The system will not let you save if the total debits don't equal the total credits. This is the most important rule in accounting.

### Rule 2: Every Entry Needs At Least 2 Lines
You can't have a one-sided entry. There must be at least a debit and a credit.

### Rule 3: One Line = One Account
Each line affects exactly one chart account. If a transaction affects multiple accounts, add multiple lines.

### Rule 4: Each Line Has Either a Debit OR a Credit (not both)
A single line cannot have amounts in both the debit and credit columns.

---

## Draft vs Posted

| Status | What It Means | Affects Reports? | Can You Edit? |
|--------|---------------|------------------|---------------|
| **Draft** | Entry saved but not finalised | ❌ No | ✅ Yes |
| **Posted** | Entry is final and permanent | ✅ Yes | ❌ No (you'd need to reverse it) |

**Best practice:** Save as Draft first, review it, then Post when you're confident it's correct.

---

## Source Module Tracking

The system tracks WHERE each journal entry came from:

| Source | What It Means |
|--------|---------------|
| `manual` | You created it manually via the Journals page |
| `income` | Automatically created when you record income |
| `expense` | Automatically created when you record an expense |

This is useful for auditing — you can trace any journal entry back to its origin.

---

## Common Mistakes to Avoid

1. **Forgetting to balance** — Always check the balance indicator before submitting
2. **Using the wrong account** — Double-check the account code matches what you intend
3. **Wrong date** — Use the actual transaction date, not today's date
4. **Vague descriptions** — "Payment" is bad. "Payment for April printing supplies to Office Depot" is good.
5. **Posting too early** — Save as Draft first, review, then Post

---

## When to Create Manual Journal Entries

You'll create manual journal entries when:
- Recording a bank transfer between your own accounts
- Adjusting for errors in previously posted entries
- Recording depreciation on equipment
- Recording accruals (expenses incurred but not yet invoiced)
- Recording owner's capital contributions or drawings
- Any transaction not automatically captured by income/expense recording

**You don't need to create journal entries for** routine income and expenses that are already recorded through the income and expense pages — those create journal entries automatically.

---

## Your Current Journal Entries

You have **27 posted journal entries** (JE-2026-0001 through JE-2026-0027):

- **12 income entries** — Client payments received (total R20,500)
- **15 expense entries** — Business expenses paid (total R2,360)

All entries are posted and balanced. ✅
