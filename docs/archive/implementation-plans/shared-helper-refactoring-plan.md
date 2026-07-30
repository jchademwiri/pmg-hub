# Shared Helper Refactoring Plan

**Date:** 2026-06-23
**Author:** AI Planning Agent
**Status:** Draft / Planned

---

## Overview

Six distinct duplication patterns were identified across the admin billing codebase. This plan phases them by risk, complexity, and dependency. Each phase is standalone and can be implemented independently.

---

## Phase 0 — Foundation: `buildOrgProps()` (Low Risk, High ROI)

### Problem

The org object (10 fields: `name`, `logoUrl`, `divisionOf`, `registrationNumber`, `vatNumber`, `email`, `phone`, `website`, `address`, `salesRep`) is constructed identically in **11 locations** across 5 files. The `buildDivisionBase64Url` property is now handled via `getDocumentLogoUrl()`.

### Solution

Create `buildOrgProps(divisionName, divSettings, orgSettings)` that returns the full org object:

```ts
// apps/admin/src/lib/client-billing-helpers.ts (or new file: apps/admin/src/lib/build-org-props.ts)

export interface OrgPreviewProps {
  name: string;
  logoUrl: string;
  divisionOf: string;
  registrationNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  salesRep?: string;
}

export function buildOrgProps(
  divisionName: string,
  divSettings: { salesRepEmail?: string | null; salesRepPhone?: string | null; divisionWebsite?: string | null; salesRepName?: string | null } | null | undefined,
  orgSettings?: { registrationNumber?: string | null; vatNumber?: string | null; email?: string | null; phone?: string | null; website?: string | null; addressStreet?: string | null; addressCity?: string | null; addressPostal?: string | null } | null,
): OrgPreviewProps {
  return {
    name: divisionName,
    logoUrl: getDocumentLogoUrl(divisionName),
    divisionOf: 'Playhouse Media Group',
    registrationNumber: orgSettings?.registrationNumber ?? undefined,
    vatNumber: orgSettings?.vatNumber ?? undefined,
    email: divSettings?.salesRepEmail ?? orgSettings?.email ?? undefined,
    phone: divSettings?.salesRepPhone ?? orgSettings?.phone ?? undefined,
    website: divSettings?.divisionWebsite ?? orgSettings?.website ?? undefined,
    address: formatOrgAddress(orgSettings),
    salesRep: divSettings?.salesRepName ?? undefined,
  };
}
```

### Files to update (11 replacements)

| # | File | Occurrences |
|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | 4x (invoice, quote, receipt, statement builders) |
| 2 | `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` | 2x (statementProps + docPreviewProps) |
| 3 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x |
| 4 | `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx` | 3x (invoice, quote, statement previews) |
| 5 | `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx` | 1x |

### Net reduction

~100 lines removed (11 copies × ~9 lines each − ~1 copy of the function definition).

### Risks

- ✅ `getDocumentLogoUrl` is already imported everywhere needed
- ✅ `formatOrgAddress` is already imported everywhere needed
- ✅ No behavioral change — pure extraction

---

## Phase 1 — `determineStatementStatus()` (Trivial, Immediate)

### Problem

The Paid / Outstanding / Overdue status logic is repeated in 4 places:

```ts
let docStatus = 'Paid'
if (summary.totalOutstanding > 0) {
  const hasOverdue = invoices.some(i => i.status === 'overdue')
  docStatus = hasOverdue ? 'Overdue' : 'Outstanding'
}
```

### Solution

Add to `apps/admin/src/lib/client-billing-helpers.ts`:

```ts
export function determineStatementStatus(
  totalOutstanding: number,
  invoices: { status: string }[],
): 'Paid' | 'Outstanding' | 'Overdue' {
  if (totalOutstanding <= 0) return 'Paid';
  const hasOverdue = invoices.some(i => i.status === 'overdue');
  return hasOverdue ? 'Overdue' : 'Outstanding';
}
```

### Files to update (4 replacements)

| # | File | Occurrences |
|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | 1x (statement builder) |
| 2 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x |
| 3 | `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` | 1x |
| 4 | `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx` | 1x |

### Net reduction

~12 lines removed.

---

## Phase 2 — `buildIncomeInvoiceMap()` (Trivial)

### Problem

The income-to-invoice-number map-building pattern appears in 3 places:

```ts
const incomeToInvoiceNumber = new Map<string, string>()
for (const inv of invoices) {
  if (inv.incomeId) incomeToInvoiceNumber.set(inv.incomeId, inv.documentNumber)
}
```

### Solution

```ts
export function buildIncomeInvoiceMap(
  invoices: { incomeId?: string | null; documentNumber: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const inv of invoices) {
    if (inv.incomeId) map.set(inv.incomeId, inv.documentNumber);
  }
  return map;
}
```

### Files to update (3 replacements)

| # | File | Occurrences |
|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | 1x (statement builder) |
| 2 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x |
| 3 | `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` | 1x |

Note: The `client-billing-workspace.tsx` has its own variant named `statementToInvoiceNumber` — worth aligning with the shared helper but optional.

---

## Phase 3 — `buildTransactionHistory()` (Medium Complexity)

### Problem

The full statement transaction building (filtering invoices, merging with payments/credit notes/refunds, sorting by date, computing running balance) is duplicated across **3 files** (~40–50 lines each):

1. `server-billing-pdf.ts` — `buildStatementPdfData()` builds transactions inline (repeated in `txRaw` → `transactions`)
2. `statements/[clientId]/page.tsx` — builds `txRaw` + `transactions` inline with credit note/refund filtering
3. `client-billing-workspace.tsx` — simplified version (no credit notes/refunds)
4. `invoices/[id]/page.tsx` — simplified version (no credit notes/refunds)

### Solution

Create a single `buildTransactionHistory()` that takes a unified input and returns `StatementTransaction[]`:

```ts
export interface BuildTransactionsInput {
  invoices: { id: string; invoiceDate: string; documentNumber: string; reference?: string | null; status: string; total: number }[];
  incomeRecords: { id: string; date: string; amount: number }[];
  creditNotes?: { id: string; createdAt: Date; documentNumber: string; reason?: string | null; amount: number; type?: string }[];
  refunds?: { id: string; refundDate: string; reference?: string | null; description?: string | null; amount: number }[];
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
}

export interface StatementTransaction {
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
  invoiceId?: string;
  paymentId?: string;
  creditNoteId?: string;
  refundId?: string;
}

export function buildTransactionHistory(input: BuildTransactionsInput): {
  transactions: StatementTransaction[];
  adjustedOpeningBalance: number;
  finalBalance: number;
} {
  // 1. Adjust opening balance for historical credit notes/refunds
  // 2. Build raw transactions from invoices + payments + filtered credit notes + filtered refunds
  // 3. Sort by date
  // 4. Compute running balance
  // 5. Reverse (newest first)
  // 6. Return { transactions, adjustedOpeningBalance, finalBalance }
}
```

### Files to update

| # | File | Occurrences | Complexity |
|---|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | 1x (statement builder) | Full — includes credit notes/refunds |
| 2 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x | Full |
| 3 | `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` | 1x | Simplified (no credit notes/refunds) |
| 4 | `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx` | 1x | Simplified |

### Net reduction

~120–160 lines removed.

### Risks

- ⚠️ The simplified callers (workspace, invoice page) don't have credit notes or refunds available — need to handle optional params gracefully
- ⚠️ `invoices/[id]/page.tsx` uses `statement.outstandingInvoices ?? statement.invoices` for ageing, but `statement.invoices` for transaction building — must pass the correct set
- ⚠️ Return signature change: callers that currently use `adjustedOpeningBalance` and `currentBalance` need both exposed

---

## Phase 4 — `adjustOpeningBalance()` (Medium Complexity)

### Problem

The opening balance adjustment logic (offset by historical credit notes and refunds) appears in 2 places with nearly identical code:

- `server-billing-pdf.ts` (lines 739–743)
- `statements/[clientId]/page.tsx` (lines 126–137)

### Solution

Can be bundled into `buildTransactionHistory()` (Phase 3) since it's always used together. If kept separate:

```ts
export function adjustOpeningBalance(
  openingBalance: number,
  creditNotes: { createdAt: Date; amount: number; type?: string }[],
  refunds: { refundDate: string; amount: number }[],
  periodFrom: string,
): number {
  let adjusted = openingBalance;
  for (const n of creditNotes) {
    const dateStr = n.createdAt.toISOString().split('T')[0];
    if (dateStr < periodFrom && n.type !== 'overpayment') {
      adjusted -= Number(n.amount);
    }
  }
  for (const r of refunds) {
    if (r.refundDate < periodFrom) {
      adjusted += Number(r.amount);
    }
  }
  return adjusted;
}
```

### Files to update

| # | File | Occurrences |
|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | 1x |
| 2 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x |

### Dependency

If Phase 3 (`buildTransactionHistory`) is implemented first, this logic is already inside it and no separate phase is needed.

---

## Phase 5 — `resolveDivisionBranding()` (Medium Complexity)

### Problem

The division name resolution pattern (linked division fallback chain) is duplicated in 2 places:

```ts
const clientRecord = await getClientById(clientId);
const linkedDivisionId = clientRecord?.divisionId ?? null;
const effectiveDivisionId = linkedDivisionId ?? invoices[0]?.divisionId;
const divSettings = effectiveDivisionId ? await getDivisionBillingSettings(effectiveDivisionId) : null;
const allDivisions = await getAllDivisions();
const linkedDivisionName = linkedDivisionId
  ? allDivisions.find(d => d.id === linkedDivisionId)?.name
  : undefined;
const linkedInvoice = invoices.find(inv => inv.divisionId === linkedDivisionId);
const orgName = linkedInvoice?.divisionName
  ?? linkedDivisionName
  ?? invoices[0]?.divisionName
  ?? 'Playhouse Media Group';
```

### Solution

```ts
export type DivisionBrandingResult = {
  linkedDivisionId: string | null;
  effectiveDivisionId: string | null;
  divSettings: any; // DivisionBillingSettings | null
  divisionName: string;
};

export async function resolveDivisionBranding(
  clientId: string,
  invoices: { divisionId: string; divisionName: string }[],
): Promise<DivisionBrandingResult> {
  const clientRecord = await getClientById(clientId);
  const linkedDivisionId = clientRecord?.divisionId ?? null;
  const effectiveDivisionId = linkedDivisionId ?? invoices[0]?.divisionId ?? null;
  const divSettings = effectiveDivisionId ? await getDivisionBillingSettings(effectiveDivisionId) : null;
  const allDivisions = await getAllDivisions();
  const linkedDivisionName = linkedDivisionId
    ? allDivisions.find(d => d.id === linkedDivisionId)?.name
    : undefined;
  const linkedInvoice = invoices.find(inv => inv.divisionId === linkedDivisionId);
  const divisionName = linkedInvoice?.divisionName
    ?? linkedDivisionName
    ?? invoices[0]?.divisionName
    ?? 'Playhouse Media Group';
  return { linkedDivisionId, effectiveDivisionId, divSettings, divisionName };
}
```

### Files to update

| # | File | Occurrences |
|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | 1x (statement builder) |
| 2 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x |

The `client-billing-workspace.tsx` has a client-side version that uses `divisions.find(d => d.id === client.divisionId)` — this one cannot use the server-side helper since it's a `'use client'` component and doesn't have access to `getClientById` directly.

### Risks

- ⚠️ Must not be used in client components (no server access)
- ⚠️ If `linkedDivisionId` is null, `effectiveDivisionId` falls back to `invoices[0]?.divisionId` which could also be null — the helper must handle `divisionName` fallback to `'Playhouse Media Group'`

---

## Phase 6 — `buildBankingProps()` (Lower Priority)

### Problem

The banking details object is constructed with the same fallback chain in ~10 places:

```ts
banking: divSettings?.bankName ? {
  bankName: divSettings.bankName,
  accountName: divSettings.bankAccountName ?? '',
  accountNumber: divSettings.bankAccountNumber ?? '',
  branchCode: divSettings.bankBranchCode ?? '',
} : undefined,
```

### Solution

```ts
export function buildBankingProps(
  divSettings?: { bankName?: string | null; bankAccountName?: string | null; bankAccountNumber?: string | null; bankBranchCode?: string | null } | null,
): { bankName: string; accountName: string; accountNumber: string; branchCode: string } | undefined {
  if (!divSettings?.bankName) return undefined;
  return {
    bankName: divSettings.bankName,
    accountName: divSettings.bankAccountName ?? '',
    accountNumber: divSettings.bankAccountNumber ?? '',
    branchCode: divSettings.bankBranchCode ?? '',
  };
}
```

### Files to update

| # | File | Occurrences |
|---|---|---|
| 1 | `apps/admin/src/lib/server-billing-pdf.ts` | up to 4x (invoice, quote, receipt, statement) |
| 2 | `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` | 1x (docPreviewProps) |
| 3 | `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx` | 1x |
| 4 | `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` | 1x |
| 5 | `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx` | 3x (invoice, quote, statement) |

---

## Implementation Order (Recommended)

```
Phase 0  [buildOrgProps]       ──→  Immediate, no dependencies
Phase 1  [determineStatus]     ──→  Immediate, no dependencies
Phase 2  [incomeInvoiceMap]    ──→  Immediate, no dependencies
Phase 6  [buildBankingProps]   ──→  Immediate, no dependencies
─────────────────────────────────────────────────────
Phase 4  [adjustOpeningBalance]──→  Prerequisite for Phase 3
Phase 5  [resolveDivision]     ──→  Prerequisite for Phase 3 (needed for org name in statement)
Phase 3  [buildTransaction]    ──→  Depends on Phases 4 & 5
```

Phases 0–2 and 6 are independent and can be done in parallel. Phases 4–5 feed into Phase 3 which is the most complex.

## Estimated Savings

| Phase | Lines Removed | Complexity | Risk |
|---|---|---|---|
| 0 — buildOrgProps | ~100 | Low | 🟢 None |
| 1 — determineStatus | ~12 | Trivial | 🟢 None |
| 2 — incomeInvoiceMap | ~15 | Trivial | 🟢 None |
| 3 — buildTransaction | ~140 | Medium | 🟡 Moderate |
| 4 — adjustOpening | ~30 | Low | 🟢 None |
| 5 — resolveDivision | ~25 | Medium | 🟡 Moderate |
| 6 — buildBanking | ~40 | Trivial | 🟢 None |
| **Total** | **~360+** | | |

## Testing Strategy

Each phase should be validated with:

1. **TypeScript compilation** — `cd apps/admin && bun x tsc --noEmit`
2. **Unit tests** for the new helper functions (follow pattern from `format-org-address.test.ts`)
3. **Code review** — spawn `code-reviewer-deepseek-flash` for each phase
4. **Manual visual verification** — generate a PDF or preview a document to confirm no visual regression

---

## Appendix: Affected Code Paths

```
Client Billing Workspace  ─── getInvoicePreviewProps() [invoice, quote, statement]
Invoice Detail Page       ─── statementProps + docPreviewProps
Quote Detail Page         ─── docPreviewProps
Statement Detail Page     ─── docPreviewProps
Server PDF Builder        ─── buildInvoicePdfData, buildQuotePdfData, buildReceiptPdfData, buildStatementPdfData
```

Each of these constructs at minimum:
- `org` object (Phase 0)
- `banking` object (Phase 6)
- Statement status (Phase 1) — for statement types
- Income map (Phase 2) — when building transaction history
- Transaction history (Phase 3) — for statement types
- Opening balance adjustment (Phase 4) — for statement types
- Division branding (Phase 5) — for statement types
