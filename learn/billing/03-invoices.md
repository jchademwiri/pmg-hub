# 3. Invoices

> An invoice is an official legal and commercial request for payment issued to a client.

---

## When To Issue An Invoice

- A quote has been accepted by the client.
- Agreed milestone work or services have been completed.
- Monthly retainer period begins.
- Ad-hoc consulting or development hours are ready to be billed.

---

## Universal End-of-Month (EOM) Due Dates

PMG Hub standardizes payment terms around **End-of-Month (EOM)** billing:

- When an invoice is created, the system defaults the due date to the **last calendar day of the current month** (e.g. June 30, July 31).
- This aligns with the business's **3-Stage Automated Monthly Statement Cycle** and simplifies cash collection.
- Specific invoices can still have custom due dates configured when contract terms require it.

---

## Invoice Status Lifecycle

```text
[Draft] ──(Issue Invoice)──► [Issued] ──(Full Payment)──► [Paid]
                                 │
                   (Partial Payment)
                                 ▼
                         [Partially Paid] ──(Full Payment)──► [Paid]
                                 │
                       (Past Due Date)
                                 ▼
                             [Overdue] ──(Follow-up / Reminders)──► [Paid]
```

| Status             | Meaning                                             | Action Required                                                    |
| :----------------- | :-------------------------------------------------- | :----------------------------------------------------------------- |
| **Draft**          | Created and editable; not sent to client.           | Review line items, VAT, and amounts before issuing.                |
| **Issued**         | Formally dispatched; posted to accounts receivable. | Awaiting client payment. Viewable by client in portal.             |
| **Partially Paid** | Portion of total received.                          | Follow up for remainder; allocate receipts.                        |
| **Paid**           | Settled in full.                                    | Closed; no further action needed.                                  |
| **Overdue**        | Past due date with unpaid balance.                  | Automated overdue reminders triggered via cron or manual dispatch. |
| **Void**           | Cancelled before payment.                           | Preserved in database for auditing; journal reversed.              |

---

## Double-Entry Accounting Impact

When an invoice is issued, the system automatically posts the following journal entries:

```text
DR 1200 Accounts Receivable (Asset)       R 11,500.00
   CR 4000 Sales / Service Revenue (Income)   R 10,000.00
   CR 2100 Output VAT Payable (Liability)     R  1,500.00
```

When the client payment is recorded:

```text
DR 1000 Bank Operating Account (Asset)   R 11,500.00
   CR 1200 Accounts Receivable (Asset)       R 11,500.00
```

---

## Strategic Overdue Reminders

In `Billing -> Invoices`:

1. The **Send Overdue Reminders** button scans all open invoices where `dueDate < today`.
2. It sends targeted reminder emails branded for the invoice's division (`PMG`, `TES`, or `AWS`) with attached invoice PDFs and direct client portal payment links.
3. This is also automatically executed in the background by the Vercel cron job `/api/cron/outstanding-reminders`.
