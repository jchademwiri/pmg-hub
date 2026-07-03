# Invoice Write-offs & Bad Debt Recovery Implementation Plan

We need a structured way to handle invoices when a client does not pay (Write-offs) and how to manage the accounting ledger when a client eventually pays after a write-off (Bad Debt Recovery).

---

## Technical Overview

### 1. The Write-off Flow
When an invoice is deemed uncollectible:
1. The admin clicks **Write Off** on an `issued` or `overdue` invoice.
2. The user enters a reason.
3. The invoice status is set to `written_off`.
4. A journal entry is posted to recognize the Bad Debt Expense:
   - **Debit:** `5150 Bad Debt Expense` (Operating Expense)
   - **Credit:** `1100 Accounts Receivable` (Asset reduction)

### 2. The Bad Debt Recovery Flow (When a Client Pays)
When a payment is received and allocated to a `written_off` invoice:
1. We **re-establish the Accounts Receivable balance** by reversing the write-off for the payment amount:
   - **Debit:** `1100 Accounts Receivable`
   - **Credit:** `5150 Bad Debt Expense` (reduces net bad debt expense in current period)
2. We **post the standard cash receipt** against the re-established AR:
   - **Debit:** `1010 Business Cheque Account`
   - **Credit:** `1100 Accounts Receivable`
   - **Debit:** `1020 Savings Account` (25% PMG Share transfer)
   - **Credit:** `1010 Business Cheque Account` (25% PMG Share reduction)
3. The invoice status is updated:
   - **Paid in Full:** Transition to `paid`.
   - **Partial Payment:** Transition to `partially_paid` (with the remaining balance remaining as written off).

---

## User Review Required

> [!IMPORTANT]
> **Database Enum Migration:** We will add the `'written_off'` value to `invoice_status` enum. Drizzle will generate the migration script.
> **Auto-creation of Account 5150:** If the `5150 Bad Debt Expense` account does not exist in the active `chart_accounts` table, the posting engine will automatically create it in the database. This ensures the app doesn't crash if the seeding script hasn't run.

---

## Proposed Changes

### Component 1: Database Schema

#### [MODIFY] [billing.ts](file:///d:/websites/pmg-hub/packages/db/src/schema/billing.ts)
Update `invoiceStatusEnum` to support `'written_off'`:
```typescript
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "void",
  "written_off", // <-- New status
]);
```

---

### Component 2: Ledger Posting Logic

#### [MODIFY] [posting.ts](file:///d:/websites/pmg-hub/apps/admin/src/lib/accounting/posting.ts)
1. Add constant for `BAD_DEBT_EXPENSE_CODE = '5150'`.
2. Add helper to ensure the Bad Debt account exists:
```typescript
async function ensureBadDebtAccount(tx: any) {
  const [existing] = await tx
    .select()
    .from(chartAccounts)
    .where(eq(chartAccounts.code, BAD_DEBT_EXPENSE_CODE))
    .limit(1);

  if (!existing) {
    await tx.insert(chartAccounts).values({
      code: BAD_DEBT_EXPENSE_CODE,
      name: 'Bad Debt Expense',
      type: 'expense',
      isActive: true,
      isPostingAccount: true,
    });
  }
}
```
3. Implement `postInvoiceWriteOffJournalEntry` to write off the remaining unpaid balance:
```typescript
export async function postInvoiceWriteOffJournalEntry(data: {
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
}): Promise<{ error?: string; entryId?: string }> {
  // Post DR 5150 Bad Debt / CR 1100 Accounts Receivable
}
```
4. Implement `postBadDebtRecoveryJournalEntry` to reverse the write-off for the recovered amount:
```typescript
export async function postBadDebtRecoveryJournalEntry(data: {
  incomeId: string;
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
}): Promise<{ error?: string; entryId?: string }> {
  // Post DR 1100 Accounts Receivable / CR 5150 Bad Debt Expense
}
```

---

### Component 3: Server Actions

#### [MODIFY] [billing-invoices.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/billing-invoices.ts)
Create a `writeOffInvoice(id: string, reason: string)` server action:
- Checks if the invoice is `issued` or `overdue`.
- Calculates outstanding balance.
- Updates invoice status to `'written_off'`.
- Calls `postInvoiceWriteOffJournalEntry` in the db transaction.
- Revalidates cached paths.

#### [MODIFY] [billing-payments.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/billing-payments.ts)
Update `recordClientPayment`:
- When allocating payment to an invoice, check if the invoice's current status is `'written_off'`.
- If yes, call `postBadDebtRecoveryJournalEntry` inside the transaction *before* inserting the payment allocation and updating the invoice status.
- Drizzle transaction ensures both the recovery reversal and standard payment journal entries post atomically.

Update `deleteClientPayment` / `voidPaymentJournalEntries`:
- Ensure that if a payment on a written-off invoice is deleted/refunded, the invoice is transitioned back to `'written_off'` status.

---

### Component 4: UI Enhancements

#### [MODIFY] [invoice-detail-actions.tsx](file:///d:/websites/pmg-hub/apps/admin/src/app/(admin)/billing/invoices/[id]/invoice-detail-actions.tsx)
- Render a **Write Off** button next to "Void Invoice" when status is `'issued'` or `'overdue'`.
- Clicking it opens a dialog/prompt asking for a reason, then triggers the `writeOffInvoice` action.
- If the status is `'written_off'`, render a status badge: `Written Off` (gray/red style).

---

## Verification Plan

### Automated Tests
We will run vitest tests in `packages/db` and `apps/admin` to verify:
- Invoices can transition to `written_off` and post balanced `DR 5150 / CR 1100` entries.
- Payments on written-off invoices transition the invoice back to `paid` or `partially_paid`, posting reversing recovery entries and standard cash receipts.
- Command:
  ```bash
  bun test billing-invoices
  bun test billing-payments
  ```

### Manual Verification
1. Create a draft invoice, issue it, and verify it shows as outstanding.
2. Click **Write Off**, enter a reason, and verify the invoice status updates to `Written Off` and outstanding balance goes to R0.
3. Inspect `Journal Entries` in the ledger to confirm a `DR 5150 / CR 1100` entry was created.
4. Record a payment for this client and allocate it to the written-off invoice.
5. Verify the invoice status updates to `Paid` (or `Partially Paid`).
6. Confirm two journal entries are created: the reversal (`DR 1100 / CR 5150`) and the cash payment receipt (`DR 1010 / CR 1100` + share allocation).
