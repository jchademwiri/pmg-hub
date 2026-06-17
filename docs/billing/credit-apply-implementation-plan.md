# Client Credit Management Module — Implementation Plan

> **Last Updated:** June 2026  
> **Scope:** Full credit lifecycle management for the PMG billing system  
> **Research Sources:** Xero, QuickBooks, FreshBooks, Stripe, Zuora, IFRS accounting standards, Modern Treasury ledger patterns

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Research Findings](#3-research-findings)
4. [Credit Management Module — Full Specification](#4-credit-management-module)
5. [Database Schema Changes](#5-database-schema-changes)
6. [Server Actions](#6-server-actions)
7. [UI Components & Pages](#7-ui-components--pages)
8. [Credit Lifecycle Workflows](#8-credit-lifecycle-workflows)
9. [Edge Cases & Validation Rules](#9-edge-cases--validation-rules)
10. [Testing Strategy](#10-testing-strategy)
11. [Implementation Phases](#11-implementation-phases)
12. [File Manifest](#12-file-manifest)

---

## 1. Executive Summary

### The Problem

When a client overpays an invoice (e.g. R2000 on a R1500 invoice), the excess R500 is stored as an **implicit credit balance** — calculated dynamically as `sum(income.amount) - sum(payment_allocations.amount)`. However, there is **no mechanism** to apply this existing credit to a new invoice. When a user records a R500 payment, the system creates a **new** income row instead of using the existing R500 credit.

### The Solution

Build a comprehensive **Credit Management Module** that handles the full credit lifecycle: issuance, tracking, application, adjustment, and reporting. This module transforms credits from an implicit, read-only calculation into a first-class, auditable financial entity.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Credit tracking | **Hybrid** — implicit balance + explicit transaction log | Keep backward compatibility while adding audit trail |
| Credit notes | **Yes, introduce `credit_notes` table** | Industry standard (Xero, QuickBooks, Stripe all use them) |
| Double-entry ledger | **No — too complex for current scale** | Overkill for SMB billing; implicit + allocation is sufficient |
| Credit expiry | **Configurable, default 12 months** | Reduces indefinite liability on balance sheet |
| Auto-apply | **FIFO, opt-in setting** | Standard for accounting; user controls whether it's on |

---

## 2. Current State Analysis

### What Exists Today

#### Database Schema

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│     income       │────▶│  payment_allocations  │◀────│   invoices   │
│─────────────────│     │──────────────────────│     │─────────────│
│ id              │     │ id                   │     │ id          │
│ date            │     │ income_id (FK)       │     │ client_id   │
│ division_id     │     │ invoice_id (FK)      │     │ total       │
│ client_id       │     │ amount               │     │ status      │
│ description     │     │ created_at           │     │ ...         │
│ amount          │     └──────────────────────┘     └─────────────┘
│ created_at      │
│ updated_at      │
└─────────────────┘
```

#### Current Credit Calculation

```typescript
// billing-payments.ts — getClientCreditBalance()
const totalPaid = SUM(income.amount) WHERE clientId = X
const totalAllocated = SUM(payment_allocations.amount) WHERE invoice.clientId = X
credit = MAX(0, totalPaid - totalAllocated)
```

#### What's Missing

| Capability | Status | Impact |
|------------|--------|--------|
| Apply credit to invoice | ❌ Missing | **Critical** — users cannot use existing credits |
| Credit notes / memos | ❌ Missing | No formal adjustment documents |
| Credit history / audit trail | ❌ Missing | No visibility into credit movements |
| Credit expiry | ❌ Missing | Indefinite liability |
| Credit source tracking | ❌ Missing | Can't tell if credit came from overpayment, manual adjustment, etc. |
| Refund of credits | ❌ Missing | No way to return credit to cash |
| Credit reports | ❌ Missing | No dashboard for credit exposure |
| Auto-apply setting | ❌ Missing | No configurable automation |
| Credit limits | ❌ Missing | No client credit limit enforcement |

---

## 3. Research Findings

### How Leading Platforms Handle Credits

#### Xero
- **Credit Notes** reduce invoice totals. Created from overpayments, returns, or billing errors.
- Overpayments automatically become "Credit" records (liability against AR).
- Credits can be applied manually or automatically to oldest invoices.
- Full audit trail with reversing entries (never delete — void and reverse).

#### QuickBooks Online
- **Credit Memos** and **Refund Receipts** are separate document types.
- Credits appear as negative balances on customer accounts.
- Applied to specific invoices via "Receive Payment" with credit checkbox.
- Supports both line-item and total-amount application.

#### Stripe
- **Credit Notes** adjust invoice amounts. If invoice is already paid, credit note creates a customer balance.
- Customer balance auto-applies to next invoice.
- Supports partial and full credit notes with tax adjustment handling.

#### FreshBooks
- Overpayments and credit notes are categorized as "Credits" on customer statements.
- Credits can be applied to any open invoice from the payment screen.
- Simple, visual credit application with real-time balance preview.

### Best Practices Identified

1. **Immutable Ledger:** Once written, never delete — use reversing entries.
2. **Source Tracking:** Every credit must record its origin (overpayment, manual, promotional, refund).
3. **FIFO Application:** Always apply oldest credits first for accurate aging reports.
4. **Period Lock:** Respect financial period boundaries — credits in closed periods cannot be modified.
5. **Credit Notes as Documents:** Formal, numbered documents (like invoices) for audit compliance.
6. **Configurable Rules:** Let businesses set their own credit policies (expiry, limits, auto-apply).

### South African Context

- Credits must comply with **IFRS 15** revenue recognition standards.
- **VAT implications:** When credit notes are issued, output VAT must be adjusted on SARS returns.
- Systems like Sage Pastel and Xero (ZA) handle this with explicit VAT adjustment fields on credit notes.
- For this MVP, we'll track credit amounts excluding VAT (matching current invoice structure) and add VAT handling in a future phase.

---

## 4. Credit Management Module — Full Specification

### Module Overview

The Credit Management Module provides a complete credit lifecycle:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  CREDIT      │    │  CREDIT       │    │  CREDIT      │    │  CREDIT       │
│  ISSUANCE    │───▶│  TRACKING     │───▶│  APPLICATION │───▶│  REPORTING    │
│              │    │              │    │              │    │              │
│ • Overpayment│    │ • Balance    │    │ • Manual     │    │ • Dashboard  │
│ • Manual     │    │ • History    │    │ • Auto-FIFO  │    │ • Aging      │
│ • Adjustment │    │ • Source     │    │ • Multi-inv  │    │ • Exposure   │
│ • Credit Note│    │ • Expiry     │    │ • Partial    │    │ • Utilization│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                              │
                                                        ┌─────▼──────┐
                                                        │  REFUND     │
                                                        │             │
                                                        │ • Cash back │
                                                        │ • Transfer  │
                                                        └─────────────┘
```

### 4.1 Credit Types

| Type | Source | Description |
|------|--------|-------------|
| `overpayment` | Automatic | Created when a payment exceeds invoice total |
| `manual_adjustment` | Manual | Admin manually adds credit to client account |
| `credit_note` | Manual | Formal credit memo (billing error, return, goodwill) |
| `promotional` | Manual | Promotional or goodwill credit |
| `refund_reversal` | Automatic | Credit created when a refund is reversed |

### 4.2 Credit Lifecycle States

```
active ──▶ partially_applied ──▶ applied (fully consumed)
  │                                    │
  ├──▶ expired                          ├──▶ refunded
  │                                    │
  └──▶ refunded                        └──▶ voided
```

### 4.3 Credit Application Rules

1. **FIFO Order:** Credits are always applied oldest-first by default.
2. **Same Client:** Credits can only be applied to invoices belonging to the same client.
3. **Same Division (Optional):** Configurable — some businesses want credits restricted to the same division.
4. **Period Lock:** allow applying active credits after lock period, but record the application in the current period.
5. **Partial Application:** Credits can be partially applied (e.g., apply R200 of a R500 credit).
6. **No Double-Apply:** System prevents applying the same credit amount to multiple invoices.

---

## 5. Database Schema Changes

### 5.1 New Table: `credit_notes`

Formal credit documents — the audit trail for credit adjustments.

```sql
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  document_number TEXT NOT NULL UNIQUE,        -- Auto-generated: CN-{DIV}-{YEAR}-{SEQ}
  status TEXT NOT NULL DEFAULT 'active'        -- active | void | expired
    CHECK (status IN ('active', 'void', 'expired')),
  type TEXT NOT NULL                           -- overpayment | manual_adjustment | credit_note | promotional | refund_reversal
    CHECK (type IN ('overpayment', 'manual_adjustment', 'credit_note', 'promotional', 'refund_reversal')),
  reason TEXT,                                 -- Why this credit was issued
  original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,  -- If linked to a specific invoice
  original_payment_id UUID REFERENCES income(id) ON DELETE SET NULL,    -- If linked to a specific payment
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),  -- Original credit amount
  amount_remaining NUMERIC(12,2) NOT NULL CHECK (amount_remaining >= 0),  -- How much is still available
  currency TEXT NOT NULL DEFAULT 'ZAR',
  expires_at TIMESTAMPTZ,                      -- Null = never expires
  created_by TEXT NOT NULL,                    -- Session user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_by TEXT
);

CREATE INDEX idx_credit_notes_client_id ON credit_notes(client_id);
CREATE INDEX idx_credit_notes_status ON credit_notes(status);
CREATE INDEX idx_credit_notes_type ON credit_notes(type);
CREATE INDEX idx_credit_notes_expires_at ON credit_notes(expires_at);
```

### 5.2 New Table: `credit_applications`

Tracks every credit-to-invoice application — the audit trail.

```sql
CREATE TABLE credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),  -- Amount applied from this credit note
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by TEXT NOT NULL
);

CREATE INDEX idx_credit_applications_credit_note_id ON credit_applications(credit_note_id);
CREATE INDEX idx_credit_applications_invoice_id ON credit_applications(invoice_id);
```

### 5.3 New Table: `credit_refunds`

Tracks cash refunds issued against credits.

```sql
CREATE TABLE credit_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  refund_date DATE NOT NULL,
  refund_method TEXT NOT NULL DEFAULT 'bank_transfer',  -- bank_transfer | cash | other
  reference TEXT,                                        -- EFT reference, cheque number, etc.
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_refunds_client_id ON credit_refunds(client_id);
```

### 5.4 Migration Strategy

**Do NOT use a "big bang" migration.** Use shadow accounting:

1. **Phase 1 (Schema):** Create new tables. Existing implicit credits remain untouched.
2. **Phase 2 (Backfill):** Script to generate credit_notes for all existing overpayments:
   ```sql
   -- For each client where income > allocations, create a credit_note record
   INSERT INTO credit_notes (client_id, division_id, document_number, type, amount, amount_remaining, created_by)
   SELECT 
     i.client_id,
     i.division_id,
     'CN-BACKFILL-' || i.id,
     'overpayment',
     (i.amount - COALESCE(pa.allocated, 0)),
     (i.amount - COALESCE(pa.allocated, 0)),
     'system-backfill'
   FROM income i
   LEFT JOIN (
     SELECT income_id, SUM(amount) as allocated 
     FROM payment_allocations 
     GROUP BY income_id
   ) pa ON pa.income_id = i.id
   WHERE (i.amount - COALESCE(pa.allocated, 0)) > 0;
   ```
3. **Phase 3 (Dual-Write):** New credit actions write to both old implicit system AND new credit_notes table.
4. **Phase 4 (Cutover):** Switch reads to credit_notes for balance calculations.
5. **Phase 5 (Deprecate):** Remove implicit credit calculation code.

---

## 6. Server Actions

### 6.1 New File: `apps/admin/src/app/actions/credit-management.ts`

```typescript
// ── Core Credit Management Server Actions ──

/**
 * Creates a credit note (manual adjustment, credit memo, etc.)
 * Used when admin manually credits a client account.
 */
createCreditNote(data: {
  clientId: string;
  divisionId: string;
  type: 'manual_adjustment' | 'credit_note' | 'promotional';
  amount: number;
  reason: string;
  originalInvoiceId?: string;  // Optional: link to specific invoice
  expiresAt?: string;          // Optional: credit expiry date
}): Promise<{ error?: string; creditNoteId?: string }>

/**
 * Applies existing credit to one or more invoices.
 * Core function for credit application workflow.
 */
applyCreditToInvoices(data: {
  clientId: string;
  allocations: { invoiceId: string; amount: number }[];
  creditNoteIds?: string[];  // Optional: specify which credits to use (FIFO if omitted)
}): Promise<{ error?: string; totalApplied?: number }>

/**
 * Applies credit to a single invoice (convenience wrapper).
 */
applyCreditToInvoice(
  invoiceId: string,
  amountToApply: number
): Promise<{ error?: string; success?: boolean; applied?: number }>

/**
 * Voids a credit note (reverses it). Credit note must not be fully consumed.
 */
voidCreditNote(creditNoteId: string): Promise<{ error?: string }>

/**
 * Issues a cash refund against available credit.
 * Reduces credit balance and creates a refund record.
 */
refundCredit(data: {
  creditNoteId: string;
  amount: number;
  refundDate: string;
  refundMethod: 'bank_transfer' | 'cash' | 'other';
  reference?: string;
  description?: string;
}): Promise<{ error?: string; refundId?: string }>

/**
 * Checks and expires credit notes past their expiry date.
 * Intended to run as a cron job or manual batch.
 */
expireCreditNotes(): Promise<{ expired?: number; error?: string }>

/**
 * Fetches the full credit balance and breakdown for a client.
 */
getClientCreditSummary(clientId: string): Promise<{
  totalCredit: number;
  activeCredit: number;
  expiredCredit: number;
  creditNotes: {
    id: string;
    documentNumber: string;
    type: string;
    originalAmount: number;
    remainingAmount: number;
    createdAt: string;
    expiresAt: string | null;
  }[];
}>

/**
 * Fetches credit transaction history for a client.
 */
getClientCreditHistory(clientId: string): Promise<{
  entries: {
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
    balanceAfter: number;
    documentNumber?: string;
    linkedInvoiceNumber?: string;
  }[];
}>

/**
 * Modifies the auto-apply credit setting for a client.
 */
setClientCreditSettings(clientId: string, settings: {
  autoApplyCredits?: boolean;
  creditExpiryMonths?: number;
  creditLimit?: number | null;
}): Promise<{ error?: string }>
```

### 6.2 Modify Existing: `apps/admin/src/app/actions/billing-payments.ts`

```typescript
// MODIFY: recordClientPayment()
// After inserting allocations, check if any allocation creates an overpayment.
// If so, create a credit_note for the excess.

// NEW: When recording a payment, if client has existing credit and auto-apply is on,
// offer to apply credit first, reducing the payment amount needed.

// MODIFY: updateClientPayment()
// When allocations change, update related credit_applications accordingly.
```

### 6.3 Modify Existing: `apps/admin/src/app/actions/billing-invoices.ts`

```typescript
// MODIFY: voidInvoice()
// When an invoice is voided that had credit applied:
// 1. Reverse the credit_applications
// 2. Restore the credit_note amounts_remaining
// 3. Revert invoice status based on remaining allocations

// MODIFY: markInvoicePaid()
// When marking as paid, also check for and apply any available client credit.
```

---

## 7. UI Components & Pages

### 7.1 New Page: Credit Management Dashboard

**Route:** `/billing/credits`

A dedicated page showing all credit activity across clients.

```
┌─────────────────────────────────────────────────────────┐
│  Credit Management                              [+ New] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Total     │  │ Active   │  │ Expired  │  │ Refund │ │
│  │ Credits   │  │ Credits  │  │ Credits  │  │ Pending│ │
│  │ R 12,500  │  │ R 8,300  │  │ R 4,200  │  │ R 1,000│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Filter: [All Clients ▾] [All Types ▾] [Active ▾]│   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Client       │ Type        │ Original │ Remaining│   │
│  │──────────────│─────────────│──────────│──────────│   │
│  │ Acme Corp    │ Overpayment │ R 500    │ R 500    │   │
│  │ Beta Ltd     │ Credit Note │ R 1,200  │ R 800    │   │
│  │ Gamma Inc    │ Promotional │ R 250    │ R 250    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Recent Activity                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 15 Jun - Credit applied to INV-2026-042 (R200)  │   │
│  │ 14 Jun - Credit note CN-2026-015 issued (R500)  │   │
│  │ 13 Jun - Credit applied to INV-2026-039 (R300)  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 7.2 New Component: `ApplyCreditDialog`

**File:** `apps/admin/src/components/billing/apply-credit-dialog.tsx`

A modal dialog for applying credit to invoices. Used from:
- Invoice detail page sidebar
- Payment recording form
- Client billing workspace

```
┌─────────────────────────────────────────────┐
│  Apply Client Credit                    [X] │
├─────────────────────────────────────────────┤
│                                             │
│  Available Credit:    R 500.00              │
│  Invoice Outstanding: R 1,500.00            │
│                                             │
│  Amount to Apply:  [R 500.00      ]         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ After applying:                     │   │
│  │ Invoice Balance:  R 1,000.00        │   │
│  │ Credit Remaining: R 0.00            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Credits to be used (FIFO):                │
│  ☑ CN-2026-012 — R500 — Overpayment       │
│                                             │
│              [Cancel]  [Apply Credit]       │
└─────────────────────────────────────────────┘
```

### 7.3 New Component: `CreditBalanceCard`

**File:** `apps/admin/src/components/billing/credit-balance-card.tsx`

A reusable card component showing client credit balance with quick actions. Used on:
- Invoice detail sidebar
- Client billing workspace
- Payment form sidebar

```
┌──────────────────────────────────┐
│  Client Credit Balance           │
│                                  │
│  R 500.00                        │
│  ─────────────────────────────── │
│  Active:   R 500.00              │
│  Expired:  R 0.00                │
│                                  │
│  [Apply to Invoice ▾]            │
│  [View History]                  │
│  [Issue Credit Note]             │
└──────────────────────────────────┘
```

### 7.4 New Component: `CreditHistoryTable`

**File:** `apps/admin/src/components/billing/credit-history-table.tsx`

Chronological feed of all credit movements for a client.

```
┌───────────────────────────────────────────────────────────────┐
│  Credit History — Acme Corp                    [Export CSV]   │
├───────┬─────────────┬──────────────┬──────────┬──────────────┤
│ Date  │ Type        │ Description  │ Amount   │ Balance      │
│───────│─────────────│──────────────│──────────│──────────────│
│ 15 Jun│ Application │ INV-2026-042 │ -R 200   │ R 300        │
│ 14 Jun│ Credit Note │ Overpayment  │ +R 500   │ R 500        │
│ 01 Jun│ Application │ INV-2026-039 │ -R 300   │ R 0          │
│ 01 Jun│ Overpayment │ Payment 012  │ +R 300   │ R 300        │
└───────┴─────────────┴──────────────┴──────────┴──────────────┘
```

### 7.5 New Component: `IssueCreditNoteDialog`

**File:** `apps/admin/src/components/billing/issue-credit-note-dialog.tsx`

Dialog for manually issuing a credit note to a client.

### 7.6 Modified Pages

| Page | Modification |
|------|-------------|
| `/billing/invoices/[id]` | Add `CreditBalanceCard` in sidebar + `ApplyCreditDialog` button |
| `/billing/payments/add` | Add "Apply Existing Credit" toggle + `ApplyCreditDialog` |
| `/billing/payments/[id]` | Show credit application details in payment receipt |
| `/relationships/clients/[id]` | Add "Credits" tab to billing workspace with credit history |
| `/billing/invoices/new` | Show credit balance + option to apply at invoice creation |
| `/settings/billing` | Add credit policy settings (expiry, auto-apply, limits) |

### 7.7 Navigation Update

**File:** `apps/admin/src/components/navigation/nav-data.ts`

```typescript
// Add to billing section:
{ title: 'Credits', url: '/billing/credits', icon: Wallet },
```

---

## 8. Credit Lifecycle Workflows

### 8.1 Overpayment Creates Credit

```
User records R2000 payment for R1500 invoice
  │
  ├─▶ recordClientPayment() creates income row (R2000)
  │
  ├─▶ Creates payment_allocation (R1500 → invoice)
  │
  ├─▶ ** NEW: Detects R500 excess **
  │
  └─▶ Creates credit_note (type: overpayment, amount: R500)
```

### 8.2 Apply Credit to Invoice

```
User clicks "Apply Credit" on invoice detail page
  │
  ├─▶ Opens ApplyCreditDialog
  │   • Shows available credit: R500
  │   • Shows invoice outstanding: R1,500
  │   • User enters amount: R500
  │
  ├─▶ User confirms → applyCreditToInvoice()
  │
  ├─▶ Selects oldest unallocated income row (FIFO)
  │
  ├─▶ Creates payment_allocation (R500 → invoice, incomeId: <original income>)
  │
  ├─▶ Updates credit_note.amount_remaining (R500 → R0)
  │
  ├─▶ Creates credit_application record (audit trail)
  │
  ├─▶ Recalculates invoice status → partially_paid
  │
  └─▶ Revalidates paths
```

### 8.3 Manual Credit Note Issuance

```
Admin opens Issue Credit Note dialog
  │
  ├─▶ Selects client, enters amount, reason
  │
  ├─▶ Creates credit_note (type: credit_note/manual_adjustment)
  │
  ├─▶ Creates income row (R0 or R{amount} depending on whether cash moves)
  │
  └─▶ Credit available for application
```

### 8.4 Credit Refund

```
Admin clicks "Refund" on a credit note
  │
  ├─▶ Opens refund dialog
  │   • Shows available credit: R500
  │   • User enters refund amount, method, reference
  │
  ├─▶ refundCredit()
  │   • Creates credit_refund record
  │   • Reduces credit_note.amount_remaining
  │   • Creates income row with negative amount (or separate refund record)
  │
  └─▶ Credit balance decreases
```

### 8.5 Credit Expiry (Cron Job)

```
Daily cron job runs expireCreditNotes()
  │
  ├─▶ Finds all credit_notes WHERE expires_at < NOW() AND status = 'active'
  │
  ├─▶ For each:
  │   • If amount_remaining > 0: set status = 'expired'
  │   • Log expiry event
  │
  └─▶ Optional: Send email notification to admin about expired credits
```

### 8.6 Void Invoice with Applied Credits

```
Admin voids an invoice that had credit applied
  │
  ├─▶ voidInvoice()
  │
  ├─▶ ** NEW: Check for credit_applications on this invoice **
  │
  ├─▶ For each credit_application:
  │   • Restore credit_note.amount_remaining
  │   • Delete credit_application record
  │
  ├─▶ Delete payment_allocations for this invoice
  │
  ├─▶ Recalculate affected credit_note statuses
  │
  └─▶ Credit is now available again
```

---

## 9. Edge Cases & Validation Rules

| Scenario | Rule |
|----------|------|
| Apply credit > available | Block: "Insufficient credit" |
| Apply credit > invoice outstanding | Auto-cap to outstanding amount |
| Apply credit to void invoice | Block: "Cannot apply credit to voided invoice" |
| Apply credit to paid invoice | Block: "Invoice is already fully paid" |
| Apply credit to draft invoice | Block: "Issue the invoice first" |
| Refund > available credit | Block: "Insufficient credit for refund" |
| Expire credit with remaining balance | Set status to 'expired', log event |
| Void credit note that was partially applied | Block: "Cannot void — credit is in use. Revoke applications first." |
| Concurrent credit application | Use database transaction with SELECT FOR UPDATE |
| Credit in closed period | Block modification if income row is in closed period |
| Client deactivated | Credits remain but cannot be applied to new invoices |
| Multiple divisions | Credits are division-scoped (can only apply within same division) |
| Credit limit exceeded | Optional: Warn when issuing credit would exceed client limit |
| Rounding errors | Use `toFixed(2)` consistently; last allocation absorbs rounding difference |

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Test | Expected |
|------|----------|
| `createCreditNote` — valid input | Credit note created, amount_remaining = amount |
| `applyCreditToInvoice` — full amount | Invoice paid, credit consumed |
| `applyCreditToInvoice` — partial | Invoice partially_paid, credit partially consumed |
| `applyCreditToInvoice` — insufficient credit | Error returned |
| `applyCreditToInvoice` — void invoice | Error returned |
| `voidCreditNote` — no applications | Credit note voided |
| `voidCreditNote` — has applications | Error returned |
| `refundCredit` — valid | Refund created, credit reduced |
| `refundCredit` — exceeds credit | Error returned |
| `expireCreditNotes` — past expiry | Credits expired |
| `getClientCreditSummary` — mixed states | Correct breakdown |
| FIFO allocation order | Oldest income rows consumed first |

### 10.2 Integration Tests

| Test | Scenario |
|------|----------|
| Full overpayment workflow | R2000 on R1500 → R500 credit → apply to new R1500 invoice |
| Multi-invoice credit application | R1000 credit applied across 3 invoices |
| Void invoice restores credit | Void invoice → credit restored → can reapply |
| Credit note lifecycle | Issue → apply → refund → exhausted |
| Credit expiry | Create with 1-month expiry → expire → verify inactive |

### 10.3 Manual QA Scenarios

1. **The original bug:** Record R2000 payment on R1500 invoice → Apply R500 credit to new R1500 invoice → Verify invoice shows R1000 outstanding
2. **Partial credit:** Apply R200 of R500 credit → Verify R300 remains
3. **Credit note creation:** Issue manual R1000 credit note → Verify appears in credit dashboard
4. **Refund:** Refund R500 of R1000 credit via bank transfer → Verify R500 remains
5. **Expiry:** Create credit expiring tomorrow → Run expiry cron → Verify expired

---

## 11. Implementation Phases

### Phase 1: Core Credit Application (Fixes the Immediate Bug)
**Priority: CRITICAL — Addresses the user's reported issue**

- [x] Create `credit_notes` and `credit_applications` tables (migration)
- [x] Implement `applyCreditToInvoice()` server action
- [x] Implement `getClientCreditSummary()` server action
- [x] Create `ApplyCreditDialog` component
- [x] Add "Apply Credit" button to invoice detail sidebar
- [x] Backfill existing overpayments as credit_notes
- [x] Write unit tests

**Files:**
- `packages/db/src/migrations/XXXX_add_credit_tables.sql` (new)
- `packages/db/src/schema/credits.ts` (new)
- `apps/admin/src/app/actions/credit-management.ts` (new)
- `apps/admin/src/components/billing/apply-credit-dialog.tsx` (new)
- `apps/admin/src/components/billing/credit-balance-card.tsx` (new)
- `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` (modify)
- `apps/admin/src/app/actions/billing-payments.ts` (modify — auto-create credit_note on overpayment)
- `apps/admin/src/app/actions/billing-invoices.ts` (modify — restore credits on void)

### Phase 2: Payment Form Integration
**Priority: HIGH — Prevents duplicate payments**

- [x] Add "Apply Existing Credit" toggle to payment recording form
- [x] Implement `applyCreditToInvoices()` batch server action
- [x] Update payment form to call credit actions when toggle is on
- [x] Write tests

**Files:**
- `apps/admin/src/app/(admin)/billing/payments/add/payment-form-client.tsx` (modify)
- `apps/admin/src/app/(admin)/billing/payments/[id]/payment-detail-client.tsx` (modify)

### Phase 3: Credit Management Dashboard
**Priority: MEDIUM — Visibility and control**

- [x] Create `/billing/credits` page
- [x] Create `IssueCreditNoteDialog` component
- [x] Create `CreditHistoryTable` component
- [x] Create credit summary cards (total, active, expired, pending refunds)
- [x] Add "Credits" tab to client billing workspace
- [x] Update navigation
- [x] Write tests

**Files:**
- `apps/admin/src/app/(admin)/billing/credits/page.tsx` (new)
- `apps/admin/src/app/(admin)/billing/credits/credits-client.tsx` (new)
- `apps/admin/src/components/billing/issue-credit-note-dialog.tsx` (new)
- `apps/admin/src/components/billing/credit-history-table.tsx` (new)
- `apps/admin/src/components/navigation/nav-data.ts` (modify)
- `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx` (modify)

### Phase 4: Refunds & Expiry
**Priority: MEDIUM — Complete credit lifecycle**

- [x] Implement `refundCredit()` server action
- [x] Implement `expireCreditNotes()` cron job
- [x] Create refund dialog component
- [x] Add credit expiry settings to billing settings page
- [x] Write tests

**Files:**
- `apps/admin/src/app/actions/credit-management.ts` (modify — add refund/expire)
- `apps/admin/src/components/billing/credit-refund-dialog.tsx` (new)
- `apps/admin/src/app/(admin)/settings/billing/billing-settings-client.tsx` (modify)
- `apps/admin/src/app/api/cron/credit-expiry/route.ts` (new)

### Phase 5: Reports & Polish
**Priority: LOW — Advanced features**

- [x] Credit aging report
- [x] Credit utilization report
- [x] Credit exposure by client
- [x] Email notifications for expiring credits
- [x] Export credit history to CSV
- [x] Client-facing credit statement (PDF)

---

## 12. File Manifest

### New Files

| File | Purpose |
|------|---------|
| `packages/db/src/schema/credits.ts` | Drizzle schema for credit_notes, credit_applications, credit_refunds |
| `packages/db/src/migrations/XXXX_add_credit_tables.sql` | Database migration |
| `apps/admin/src/app/actions/credit-management.ts` | All credit server actions |
| `apps/admin/src/components/billing/apply-credit-dialog.tsx` | Dialog for applying credit to invoices |
| `apps/admin/src/components/billing/credit-balance-card.tsx` | Reusable credit balance display card |
| `apps/admin/src/components/billing/credit-history-table.tsx` | Credit transaction history table |
| `apps/admin/src/components/billing/issue-credit-note-dialog.tsx` | Dialog for issuing credit notes |
| `apps/admin/src/components/billing/credit-refund-dialog.tsx` | Dialog for refunding credits |
| `apps/admin/src/app/(admin)/billing/credits/page.tsx` | Credit management dashboard page |
| `apps/admin/src/app/(admin)/billing/credits/credits-client.tsx` | Client component for credits page |
| `apps/admin/src/app/api/cron/credit-expiry/route.ts` | Cron endpoint for credit expiry |

### Modified Files

| File | Change |
|------|--------|
| `apps/admin/src/app/actions/billing-payments.ts` | Auto-create credit_note on overpayment; integrate with credit system |
| `apps/admin/src/app/actions/billing-invoices.ts` | Restore credits on void; check credits on mark-paid |
| `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` | Add CreditBalanceCard + ApplyCreditDialog |
| `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx` | Show credit balance + apply option |
| `apps/admin/src/app/(admin)/billing/payments/add/payment-form-client.tsx` | Add "Apply Existing Credit" toggle |
| `apps/admin/src/app/(admin)/billing/payments/[id]/payment-detail-client.tsx` | Show credit application details |
| `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx` | Add Credits tab |
| `apps/admin/src/components/navigation/nav-data.ts` | Add Credits nav item |
| `packages/db/src/index.ts` | Export new schema tables |

---

## Summary

This plan transforms the credit system from a read-only implicit calculation into a full-featured credit management module. The key additions are:

1. **`credit_notes` table** — Formal, auditable credit documents with source tracking and expiry
2. **`credit_applications` table** — Complete audit trail of every credit-to-invoice application
3. **`applyCreditToInvoice` action** — The missing write path that fixes the immediate bug
4. **Credit management dashboard** — Visibility into all credit activity across clients
5. **Credit lifecycle** — Issuance → Application → Refund/Expiry with full audit trail
6. **Backward compatibility** — Shadow accounting approach ensures no disruption to existing data

The implementation is phased to deliver the critical fix first (Phase 1), then progressively build out the full module.
