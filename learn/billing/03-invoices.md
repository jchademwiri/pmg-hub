# 3. Invoices

> An invoice is a bill sent to a client for payment.

## When To Use An Invoice

Use an invoice when:

- Work has been approved
- Work has been completed
- A client needs a formal payment request
- A quote has been accepted and must now be billed

## Invoice Statuses

| Status | Meaning | What To Do |
|--------|---------|------------|
| Draft | Not yet issued | Review before sending |
| Issued | Sent and awaiting payment | Follow up until paid |
| Partially Paid | Some payment received | Follow up for the balance |
| Paid | Fully paid | No action needed |
| Overdue | Past due date | Send a reminder |
| Void | Cancelled | Keep for audit trail |

## How To Read The Invoice List

| Column | Meaning |
|--------|---------|
| Invoice # | Unique invoice number |
| Division | `AWS`, `TES`, or `PMG` |
| Client | Who must pay |
| Issue Date | Invoice date |
| Due Date | Expected payment date |
| Amount | Invoice total |
| Status | Payment or document state |

## What Happens In Accounting

When an invoice is issued, the system records that the client owes money.

```text
DR Accounts Receivable
CR Sales Revenue
```

When the client pays, the payment clears the amount owed.

```text
DR Bank
CR Accounts Receivable
```

## Basic Workflow

1. Go to Billing -> Invoices.
2. Create a new invoice or use an accepted quote.
3. Select the correct division.
4. Add line items and check totals.
5. Save as draft while checking.
6. Issue the invoice when ready.
7. Record payment when money arrives.

