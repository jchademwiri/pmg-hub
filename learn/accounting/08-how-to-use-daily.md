# 8. Daily Workflow — How to Use This System Every Day

> **In plain English:** This is your practical, step-by-step guide for using the PMG accounting system in your day-to-day business operations. No accounting jargon — just what to do and when.

---

## Your Daily Routine

### When You Receive Money (Income)

**What happened:** A client paid you for services.

**What to do:**
1. Go to **Income** page and record the income
2. The system automatically creates a journal entry:
   - DR Business Cheque Account (money came in)
   - CR Sales Revenue (you earned it)
3. Check the **Journals** page to see the created entry
4. The entry appears in the **General Ledger** automatically
5. The **Trial Balance** and **P&L** update automatically

**You don't need to manually create journal entries for income.** The income page handles it.

---

### When You Spend Money (Expenses)

**What happened:** You paid for something business-related.

**What to do:**
1. Go to **Expenses** page and record the expense
2. Select the correct expense category (e.g., Office & Supplies, Travel)
3. The system automatically creates a journal entry:
   - DR Expense Account (you spent it)
   - CR Business Cheque Account (money left the bank)
4. The rest updates automatically

**You don't need to manually create journal entries for expenses.** The expense page handles it.

---

### When You Need to Record Something Special

Sometimes you need to create a manual journal entry. Common situations:

| Situation | Journal Entry |
|-----------|--------------|
| Transfer money between your own bank accounts | DR New Account, CR Old Account |
| A client pays a deposit upfront | DR Bank, CR Client Deposits (Liability) |
| Owner puts personal money into the business | DR Bank, CR Owner's Capital (Equity) |
| Owner takes money out for personal use | DR Owner's Drawings (Equity), CR Bank |
| You receive interest on your bank account | DR Bank, CR Interest Income (Revenue) |
| A client owes you money (invoice sent) | DR Accounts Receivable, CR Sales Revenue |
| You pay an outstanding invoice | DR Accounts Payable, CR Bank |

**How to create a manual journal entry:**
1. Go to `/accounting/journals/new`
2. Set the date
3. Add a clear description
4. Add at least 2 lines (debit and credit)
5. Check the balance indicator
6. Submit (save as Draft first if unsure)

---

## Weekly Routine

At the end of each week, spend 5 minutes:

1. **Review the Journals page** — Do all entries look correct? Any duplicates?
2. **Check the Trial Balance** — Is it balanced? (Debits = Credits)
3. **Glance at the P&L** — Are the numbers reasonable?

---

## Monthly Routine (End of Month)

Spend 30 minutes at the end of each month:

### Step 1: Record All Remaining Transactions
- Go through your bank statements
- Make sure every transaction is recorded as income or expense
- Create manual journal entries for anything special

### Step 2: Reconcile with Bank
- Compare your Business Cheque Account (1010) in the General Ledger with your actual bank statement
- They should match (or be very close)
- If they don't match, find and fix the discrepancy

### Step 3: Review the Trial Balance
- Navigate to `/accounting/trial-balance`
- Confirm Debits = Credits (Difference should be R0.00)
- Review the balances — do they make sense?

### Step 4: Review the Profit & Loss
- Navigate to `/accounting/profit-and-loss`
- Filter to the current month
- Ask yourself: "Does this match what I know about this month?"

### Step 5: Close the Period
- Navigate to `/accounting/periods`
- Close the previous month's period
- This prevents accidental changes to last month's data

### Step 6: Export a Backup
- Navigate to `/accounting/exports`
- Export the Trial Balance and P&L for the month
- Save the files in a backup folder

---

## Quarterly Routine (Every 3 Months)

Every quarter, take an hour to:

1. **Do everything in the monthly routine** (if you haven't already)
2. **Review the full P&L** — How is the year going overall?
3. **Check all account balances** — Are any accounts unusually high or low?
4. **Export a full backup** — Complete General Ledger and Journal Entries
5. **Share with your accountant** — Send them the exports for review

---

## Annual Routine (Year-End)

At the end of the financial year:

1. **Record all remaining transactions** — Make sure nothing is missed
2. **Complete the monthly routine** for December
3. **Review the full-year P&L** — Total revenue, total expenses, net profit
4. **Export everything** — Full accounting data backup
5. **Send to your accountant** — They'll prepare your annual financial statements
6. **Lock the year** — Once your accountant confirms everything is correct, lock all periods for the year
7. **Start fresh** — The new year begins with open periods

---

## Quick Reference: Where Do I Go?

| I want to... | Go to... |
|-------------|----------|
| Record income | `/income` |
| Record an expense | `/expenses` |
| Create a manual journal entry | `/accounting/journals/new` |
| View all journal entries | `/accounting/journals` |
| See all transactions | `/accounting/general-ledger` |
| Check if my books are balanced | `/accounting/trial-balance` |
| See if I'm making money | `/accounting/profit-and-loss` |
| Manage accounting periods | `/accounting/periods` |
| Export data | `/accounting/exports` |
| View/edit account categories | `/accounting/chart-of-accounts` |

---

## Quick Reference: Account Codes

| Code | Account | When to Use |
|------|---------|-------------|
| 1010 | Business Cheque Account | Every bank transaction |
| 1030 | Accounts Receivable | Client owes you money |
| 2010 | Accounts Payable | You owe a supplier |
| 3010 | Owner's Capital | Owner invests in business |
| 3030 | Owner's Drawings | Owner takes money out |
| 4010 | Sales Revenue | Every sale/income |
| 5030 | Office & Supplies | Printing, stationery |
| 5070 | Travel & Transport | Uber, petrol, flights |
| 5140 | Miscellaneous Expense | Doesn't fit other categories |

---

## Tips for Success

1. **Record transactions regularly** — Don't let them pile up. Do it weekly at minimum.
2. **Be specific in descriptions** — "Uber to client meeting in Sandton" is better than "Transport"
3. **Use the right expense category** — It makes your P&L more useful
4. **Check the Trial Balance regularly** — It's your early warning system
5. **Close periods on time** — Don't leave old months open
6. **Export and backup** — Monthly exports give you peace of mind
7. **Ask your accountant** — When in doubt, ask. They're there to help.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "The Trial Balance doesn't balance" | Check recent journal entries for errors |
| "I can't post to a closed period" | Reopen the period, post the entry, then close it again |
| "I recorded an expense to the wrong account" | Create a correcting journal entry (DR correct account, CR wrong account) |
| "The P&L shows zero" | Check that journal entries are posted (not just draft) |
| "I don't see my income on the P&L" | Make sure the journal entry status is "posted" not "draft" |
| "I need to undo a posted entry" | Create a reversing journal entry (swap the debits and credits) |
