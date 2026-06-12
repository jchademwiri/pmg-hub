# PMG Manual Bookkeeping MVP - Schema Plan

Date: 2026-06-12

## Architecture decision

Add accounting tables alongside the existing billing, income, expense, snapshot, and allocation-ledger tables. Do not replace the current billing schema. The existing `ledger` table should remain the PMG allocation/spend ledger; the true accounting General Ledger should be derived from journal entry lines.

Recommended new file:

- `packages/db/src/schema/accounting.ts`

Recommended query file:

- `packages/db/src/queries/accounting.ts`

## Table evaluation

| Table | Scope | Purpose | Key columns | Relationships | Reuse existing? | Create now? | Migration risk |
|---|---|---|---|---|---|---|---|
| `chart_of_accounts` | MVP | Master list of accounting accounts | `id`, `code`, `name`, `type`, `isActive`, timestamps | referenced by journal lines | New | Yes | Low |
| `bank_accounts` | MVP | Manual internal bank/cash accounts only | `id`, `accountId`, `name`, `accountType`, `openingBalance`, `openingBalanceDate`, `isActive` | linked to COA asset account | New | Yes | Low |
| `journal_entries` | MVP | Accounting event header | `id`, `entryDate`, `sourceType`, `sourceId`, `referenceNo`, `description`, `divisionId`, `createdBy` | one-to-many journal lines | New | Yes | Medium |
| `journal_entry_lines` | MVP | Debit/credit rows | `id`, `journalEntryId`, `accountId`, `debit`, `credit`, `clientId`, `divisionId`, `bankAccountId`, `memo` | many-to-one journal/account | New | Yes | Medium |
| `audit_logs` | MVP | Immutable financial audit trail | `id`, `entityType`, `entityId`, `action`, `beforeJson`, `afterJson`, `actorUserId`, `createdAt` | soft references to changed entity | New | Yes | Low |
| `tax_settings` | Future/minimal now | VAT registration control | `isVatRegistered`, `vatNumber`, effective dates | could extend org settings | Reuse `organisation_settings` first | Add `isVatRegistered` now | Low |
| `manual_reconciliations` | Future | Manual bank balance checks | `id`, `bankAccountId`, `statementDate`, `statementBalance`, `notes` | bank accounts | New | Later | Low |
| `bank_transactions` | Future | Imported statement rows | `id`, `bankAccountId`, `date`, `description`, `amount`, `matchedJournalLineId` | bank accounts/journal lines | New | No | Medium |
| `credit_notes` | Future | Reduce invoice balance | `id`, `invoiceId`, `documentNumber`, `date`, `amount`, `reason` | invoices | New | No | Medium |
| `refunds` | Future | Return client cash | `id`, `incomeId`, `clientId`, `bankAccountId`, `amount`, `date` | income/client/bank | New | No | Medium |
| `suppliers` | Future | Vendor master | `id`, `name`, contact fields | bills | New | No | Low |
| `bills` | Future | Supplier invoices | `id`, `supplierId`, `billDate`, `dueDate`, `total`, `status` | suppliers | New | No | Medium |
| `bill_payments` | Future | Supplier bill payments | `id`, `billId`, `bankAccountId`, `amount`, `date` | bills/bank | New | No | Medium |
| `attachments` | Future | Receipts/supporting files | `id`, `entityType`, `entityId`, `fileUrl`, metadata | soft references | New | No | Low |
| `assets` | Future | Asset register | `id`, `accountId`, `description`, `cost`, `purchaseDate` | COA | New | No | Medium |
| `liabilities` | Future | Liability schedules | `id`, `accountId`, `description`, `principal`, `startDate` | COA | New | No | Medium |

## Recommended Chart of Accounts

Keep divisions as a separate reporting dimension. Do not duplicate every account per division.

| Code | Name | Type | MVP use |
|---|---|---|---|
| 1001 | Business Bank Account | Asset | Main manual operating bank account |
| 1002 | Cash on Hand | Asset | Manual cash account |
| 1100 | Accounts Receivable | Asset | Future accrual posting; operational AR is invoice-based in MVP |
| 2000 | General Liabilities | Liability | Placeholder |
| 2100 | Accounts Payable | Liability | Future AP |
| 2300 | Loans Payable | Liability | Future loan accounting |
| 3000 | Owner Equity | Equity | Contributions/capital |
| 3100 | Retained Earnings | Equity | Period close roll-forward later |
| 3200 | Owner Drawings | Equity | Owner withdrawals; not P&L expense |
| 3300 | PMG Share / Internal Allocation Equity | Equity | Optional management allocation bridge |
| 4000 | Service Revenue | Revenue | Default service income |
| 4100 | Tender Edge Revenue | Revenue | Optional division-specific revenue |
| 4200 | Apex Web Solutions Revenue | Revenue | Optional division-specific revenue |
| 4300 | PMG Services Revenue | Revenue | Optional division-specific revenue |
| 4900 | Other Income | Revenue | Non-invoice income |
| 5000 | General Expenses | Expense | Default expense |
| 5100 | Software & Subscriptions | Expense | SaaS/tools |
| 5200 | Printing & Stationery | Expense | Stationery/printing |
| 5300 | Transport & Courier | Expense | Travel/courier |
| 5400 | Marketing | Expense | Marketing spend |
| 5500 | Communication | Expense | Phone/internet |
| 5600 | Professional Fees | Expense | Contractors/legal/accounting |
| 5700 | Bank Charges | Expense | Bank/payment fees |
| 5800 | Office/Admin Expenses | Expense | Office/admin overhead |
| 5900 | Miscellaneous Expenses | Expense | Temporary catch-all |

Recommendation: seed `4000`, `4900`, and the expense accounts first. Add `4100`, `4200`, and `4300` only if Jacob wants revenue accounts by division. The cleaner MVP is one revenue account plus `divisionId`.

## Drizzle schema sketch

```ts
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { clients } from "./clients";
import { divisions } from "./divisions";

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "bank",
  "cash",
]);

export const journalSourceTypeEnum = pgEnum("journal_source_type", [
  "invoice_payment",
  "manual_income",
  "expense",
  "owner_draw",
  "transfer",
  "manual_adjustment",
  "opening_balance",
]);

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    unique("chart_of_accounts_code_unique").on(t.code),
    index("chart_of_accounts_type_idx").on(t.type),
  ],
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    accountType: bankAccountTypeEnum("account_type").notNull().default("bank"),
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    openingBalanceDate: date("opening_balance_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("bank_accounts_account_id_idx").on(t.accountId),
    index("bank_accounts_active_idx").on(t.isActive),
  ],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryDate: date("entry_date").notNull(),
    sourceType: journalSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"),
    referenceNo: text("reference_no"),
    description: text("description").notNull(),
    divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "restrict" }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("journal_entries_date_idx").on(t.entryDate),
    index("journal_entries_source_idx").on(t.sourceType, t.sourceId),
    index("journal_entries_division_idx").on(t.divisionId),
  ],
);

export const journalEntryLines = pgTable(
  "journal_entry_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
    divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "restrict" }),
    memo: text("memo"),
    debit: numeric("debit", { precision: 12, scale: 2 }).notNull().default("0"),
    credit: numeric("credit", { precision: 12, scale: 2 }).notNull().default("0"),
  },
  (t) => [
    index("journal_entry_lines_entry_idx").on(t.journalEntryId),
    index("journal_entry_lines_account_idx").on(t.accountId),
    index("journal_entry_lines_bank_account_idx").on(t.bankAccountId),
    index("journal_entry_lines_client_idx").on(t.clientId),
    index("journal_entry_lines_division_idx").on(t.divisionId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    actorUserId: text("actor_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorUserId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);
```

## Posting rules

### Quote created

No journal entry.

### Invoice created or issued

No journal entry for the cash-basis MVP.

Reason: unpaid invoices remain operational AR only. Revenue is recognized when cash is received.

### Invoice payment received

Dr `1001 Business Bank Account` or selected bank/cash account

Cr `4000 Service Revenue` or selected revenue account

Tags:

- `clientId` from invoice/payment
- `divisionId` from invoice/payment
- `sourceType = invoice_payment`
- `sourceId = income.id` or payment id

### Manual income without invoice

Dr selected bank/cash account

Cr `4900 Other Income` or selected revenue account

### Expense paid

Dr selected `5xxx` expense account

Cr selected bank/cash account

### Owner withdrawal

Dr `3200 Owner Drawings`

Cr selected bank/cash account

Owner drawings do not reduce P&L profit.

### PMG allocation/spending

The existing salary/reinvest/reserve/flex/PMG share allocation model should remain management reporting. Do not post those allocations as expenses by default.

Only post an accounting expense when cash is actually spent. Example: buying software from the reinvest bucket is Dr `5100 Software & Subscriptions` / Cr Bank. The allocation bucket can be metadata or a management ledger entry, not the accounting account itself.

### Internal transfer

Dr destination bank/cash account

Cr source bank/cash account

No P&L impact.

## Posting helper requirements

Implement a helper similar to:

```ts
await db.transaction(async (tx) => {
  const payment = await createIncomeRow(tx, input);
  await createPaymentAllocations(tx, payment.id, input.allocations);
  await updateInvoiceStatuses(tx, input.allocations);
  await postJournalEntry(tx, {
    entryDate: input.date,
    sourceType: "invoice_payment",
    sourceId: payment.id,
    referenceNo: paymentReference,
    description,
    divisionId: input.divisionId,
    createdBy: session.user.id,
    lines: [
      { accountCode: "1001", debit: input.amount, credit: 0, bankAccountId },
      { accountCode: "4000", debit: 0, credit: input.amount, clientId, divisionId },
    ],
  });
});
```

Validation:

- Total debits must equal total credits to 2 decimals.
- No line can have both debit and credit.
- No line can have zero debit and zero credit.
- Source references should be unique where duplicate posting would be dangerous.
- Closed periods should reject writes before posting starts.

## Backfill plan

1. Add schema and seed COA/bank accounts.
2. Backfill existing income rows:
   - Dr `1001 Business Bank Account`
   - Cr `4000 Service Revenue`
   - use income date, client, division, and description
3. Backfill existing expense rows:
   - Dr mapped `5xxx` expense account
   - Cr `1001 Business Bank Account`
   - use expense category mapping
4. Do not backfill invoice issue journals for MVP.
5. Do not backfill allocation ledger entries as expenses.
6. Mark backfilled journal entries with `sourceType` and reference to original row.
7. Run Trial Balance check after backfill.

## Migration risks

- Historical income may include non-invoice deposits or overpayments; map to `4900 Other Income` only when clearly non-service.
- Expense categories are free-form strings; create a mapping table or manual mapping file for backfill.
- Existing VAT-bearing historical documents may exist; do not generate VAT journal entries while PMG is non-VAT unless Jacob confirms historical truth.
- Existing payment allocations and `incomeId` on invoices overlap; treat `payment_allocations` as source of truth.
- PMG allocation ledger spending should not be backfilled into accounting expenses without confirming each entry represents real cash spent.

## Report query plan

General Ledger:

- Query `journal_entry_lines` joined to `journal_entries`, `chart_of_accounts`, optional clients/divisions/bank accounts.
- Filter by account, date range, source type, division, client.

Trial Balance:

- Group journal lines by account.
- Sum debit and credit.
- Show ending debit/credit balance.
- Assert grand total debit equals grand total credit.

Profit and Loss:

- Revenue = credit minus debit for revenue accounts.
- Expenses = debit minus credit for expense accounts.
- Net income = revenue - expenses.
- Filter by date range and division.

Cash Summary:

- Opening balance from `bank_accounts`.
- Inflows = debit lines on linked cash account.
- Outflows = credit lines on linked cash account.
- Closing balance = opening + inflows - outflows.

Accountant CSV:

- Export journal lines with account, date, source, client, division, debit, credit, memo, created by, created at.

## Open schema questions

1. Should `journal_entries.sourceId` remain a soft UUID reference, or should separate nullable FK columns be used for `incomeId`, `expenseId`, `invoiceId`, and `ledgerId`?
2. Should revenue subaccounts by division (`4100`, `4200`, `4300`) be seeded now, or should division remain the only split?
3. Should `bank_accounts` support multiple active bank accounts now, or only one business bank plus cash?
4. Should audit logs store full row snapshots or targeted diffs?
5. Should historical backfill run once as a migration script or as an admin-only repair action?
