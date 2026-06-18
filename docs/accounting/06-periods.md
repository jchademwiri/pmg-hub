# 6. Accounting Periods — Time Blocking Your Finances

> **In plain English:** Accounting periods are **monthly time blocks** that divide your financial records into manageable chunks. Instead of one endless stream of transactions, you work month by month.

---

## What Are Accounting Periods?

An accounting period is a defined block of time (usually a month) during which transactions are recorded and reported. Think of it like chapters in a book — each month is a chapter that tells part of the financial story.

**Navigate to:** `/accounting/periods`

---

## Why Do Periods Matter?

1. **Monthly reporting** — You can see how each month performed individually
2. **Cut-off control** — Once a period is closed, no new transactions can be added to it
3. **Audit trail** — Periods create a clear timeline of financial activity
4. **Tax compliance** — SARS requires periodic (usually monthly/annual) reporting
5. **Preventing backdating** — You can't accidentally add a transaction to last month after the period is closed

---

## Period Statuses

| Status | What It Means | Can You Add Entries? |
|--------|---------------|---------------------|
| **Open** | Active period — transactions can be recorded | ✅ Yes |
| **Closed** | Period is finalised — no new entries allowed | ❌ No |
| **Locked** | Permanently sealed — cannot be reopened | ❌ Never |

### The Lifecycle of a Period

```
Open → Closed → Locked
 ↑       ↓
 └─ Reopen (if closed but not locked)
```

1. **Open** — The period is active. You can create and post journal entries dated in this period.
2. **Closed** — The period is finalised. No new entries can be posted to it. You can reopen it if needed.
3. **Locked** — The period is permanently sealed. This is typically done at year-end after your accountant has verified everything.

---

## Your Current Periods

| Period | Status |
|--------|--------|
| 2026-06 | Open |
| 2026-05 | Open |
| 2026-04 | Open |

All three periods are currently open, meaning you can post transactions to any of them.

---

## When to Close a Period

Close a period at the end of the month when:

1. **All transactions for the month are recorded** — No more entries pending
2. **You've reconciled with bank statements** — Bank balance matches your records
3. **The Trial Balance looks correct** — Debits = Credits
4. **You've reviewed the P&L** — You understand the month's performance

### Recommended Monthly Routine

```
End of Month:
  1. Record all remaining transactions
  2. Reconcile bank statements
  3. Check the Trial Balance (is it balanced?)
  4. Review the Profit & Loss (does it make sense?)
  5. Close the period
```

---

## How Periods Connect to Journal Entries

Every journal entry has a **period** (YYYY-MM format) based on its date. When you create a journal entry dated 2026-05-15, it belongs to period 2026-05.

If you try to post a journal entry to a **closed** period, the system will reject it. This prevents accidental backdating.

---

## Period Management Actions

| Action | What It Does | When to Use |
|--------|-------------|-------------|
| **Ensure/Open** | Creates a new period or returns the existing one | When creating entries for a new month |
| **Close** | Prevents new entries in this period | End of month, after review |
| **Reopen** | Allows entries again in a closed period | If you need to add a missed transaction |
| **Lock** | Permanently seals the period | Year-end, after accountant sign-off |

---

## Best Practices

1. **Close periods monthly** — Don't leave old periods open indefinitely
2. **Lock periods yearly** — After year-end close and accountant review, lock the full year
3. **Don't reopen without reason** — Only reopen a period if you genuinely need to add a missed transaction
4. **Document why** — If you reopen a period, make a note of why (for audit purposes)
5. **Keep current month open** — Always leave the current month's period open for new transactions

---

## Common Questions

**Q: What happens if I forget to close a period?**
A: Nothing breaks, but it means transactions could still be added to past months. It's best practice to close periods promptly.

**Q: Can I delete a period?**
A: No. Periods are created to organise data and cannot be deleted. You can only change their status (open → closed → locked).

**Q: What if I need to record something for last month?**
A: If the period is still open, just create the journal entry with the correct date. If it's closed, you'll need to reopen it first.

**Q: Do I need to create periods manually?**
A: Periods are created automatically when journal entries are posted to a new month. You don't need to manually create them.

**Q: What about year-end?**
A: At year-end, you'd typically lock all months in the financial year after your accountant has reviewed and signed off. This creates a permanent record.
