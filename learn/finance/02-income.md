# 2. Income

> Income is money the business has received.

## Where Income Comes From

Most income starts in Billing:

1. Invoice is issued.
2. Client pays.
3. Payment is recorded in Billing -> Payments.
4. Income appears in Finance.
5. Accounting updates automatically.

Use Finance -> Income directly only for non-invoice income.

## What An Income Record Should Have

- Client or source
- Division: `AWS`, `TES`, or `PMG`
- Date received
- Amount
- Description
- Linked invoice, if applicable

## Accounting Effect

Income normally creates or contributes to accounting entries like:

```text
DR Bank
CR Sales Revenue
```

Invoice payments may clear Accounts Receivable instead of posting directly to revenue.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Recording invoice payments directly as income | Use Billing -> Payments so invoice status updates |
| Missing division | Correct the source record |
| Duplicate income | Check whether a billing payment already created it |

