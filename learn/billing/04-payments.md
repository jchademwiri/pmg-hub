# 4. Payments

> A payment is money received from a client.

## When To Record A Payment

Record a payment only after the money actually arrives in the bank, cash, or payment account.

## What Payment Allocation Means

Allocation means connecting the payment to the invoice or invoices it pays.

Example:

| Invoice | Amount Owed | Paid | Remaining |
|---------|-------------|------|-----------|
| PMG-INV-2026-001 | R2,000 | R2,000 | R0 |
| PMG-INV-2026-002 | R1,500 | R500 | R1,000 |

One payment can pay one invoice or be split across several invoices.

## Basic Workflow

1. Go to Billing -> Payments.
2. Create a new payment.
3. Select the client.
4. Enter the amount and payment date.
5. Allocate the payment to the correct invoice or invoices.
6. Save.
7. Check that invoice statuses updated correctly.

## What Happens In Accounting

Payments create accounting activity automatically.

```text
DR Bank
CR Accounts Receivable
```

The system may also create the configured PMG share movement.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Payment recorded but not allocated | Open the payment and allocate it |
| Wrong client selected | Correct before relying on the statement |
| Payment entered before money arrived | Void or correct it so records match the bank |

