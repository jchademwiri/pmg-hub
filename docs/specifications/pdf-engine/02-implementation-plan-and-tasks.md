# PMG Hub PDF Generation Engine — Implementation Plan & Master Task List

> **Status**: In Progress  
> **Branch**: `feat/pdf-engine-pdfcn`  
> **Reference Docs**: [`docs/references/pdfcn-llms.txt`](../references/pdfcn-llms.txt)  
> **Technical Spec**: [`docs/specifications/pdf-engine/01-pdf-engine-spec.md`](./01-pdf-engine-spec.md)  

---

## Phase Summary & Progress Tracking

| Phase | Description | Status | Tests Passed | Commit |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Environment, Registry, Specs & WASM Setup | ✅ Completed | ✅ Passed | `8ffa6841` |
| **Phase 2** | PDF Design System Primitives & Brand Themes | ⏳ In Progress | ⏳ Pending | `Pending` |
| **Phase 3** | Billing Documents Modernization (`@pmg/billing`) | ⏳ Not Started | ⏳ Pending | `Pending` |
| **Phase 4** | Financial Statements & Accounting Reports (`@pmg/accounting`) | ⏳ Not Started | ⏳ Pending | `Pending` |
| **Phase 5** | Client Optimization, Email Attachments & Deprecations | ⏳ Not Started | ⏳ Pending | `Pending` |

---

## Detailed Task Breakdown

### Phase 1: Environment, Registry, Specs & WASM Setup
- [x] **Task 1.1**: Save official `pdfcn` documentation reference at `docs/references/pdfcn-llms.txt`.
- [x] **Task 1.2**: Write technical specification at `docs/specifications/pdf-engine/01-pdf-engine-spec.md`.
- [x] **Task 1.3**: Initialize persistent master implementation tracking at `docs/specifications/pdf-engine/02-implementation-plan-and-tasks.md`.
- [x] **Task 1.4**: Configure `@pdfcn` registry in `apps/admin/components.json`.
- [x] **Task 1.5**: Initialize shadcn MCP via `bunx --bun shadcn@latest mcp init`.
- [x] **Task 1.6**: Install `takumi-pdf` and `@takumi-rs/helpers` dependencies in `packages/billing`.
- [x] **Task 1.7**: Verify WASM compilation and smoke test in Next.js Turborepo pipeline (`wasm-engine.test.ts` passing).
- [ ] **Task 1.8**: Commit Phase 1 changes (`chore: setup pdfcn registry, mcp, and takumi wasm dependencies`).

---

### Phase 2: PDF Design System Primitives & Brand Themes
- [x] **Task 2.1**: Implement core declarative primitives in `packages/billing/src/pdf/primitives.tsx` (`Document`, `Page`, `View`, `Text`, `Image`, `Link`, `StyleSheet`).
- [x] **Task 2.2**: Implement SVG primitives in `packages/billing/src/pdf/svg.tsx` (`Svg`, `Rect`, `Circle`, `Path`, `Line`, `SvgText`).
- [x] **Task 2.3**: Implement theme context & provider in `packages/billing/src/pdf/theme-provider.tsx`.
- [x] **Task 2.4**: Define multi-brand theme palettes in `packages/billing/src/pdf/themes.ts` (Playhouse Media Group, TenderEdge Solutions, Apex Web Solutions).
- [x] **Task 2.5**: Pull and assemble reusable PDF blocks:
  - [x] `packages/billing/src/pdf/components/table.tsx`
  - [x] `packages/billing/src/pdf/components/key-value.tsx`
  - [x] `packages/billing/src/pdf/components/badge.tsx`
  - [x] `packages/billing/src/pdf/components/page-header.tsx`
  - [x] `packages/billing/src/pdf/components/page-footer.tsx`
  - [x] `packages/billing/src/pdf/primitives.tsx` (`KeepTogether`)
- [x] **Task 2.6**: Write unit tests for primitives and theme resolution (`packages/billing/src/pdf/__tests__/primitives.test.ts` - 4/4 passing).
- [ ] **Task 2.7**: Commit Phase 2 changes (`feat(billing): add pdfcn design system primitives and brand themes`).

---

### Phase 3: Billing Documents Modernization (`@pmg/billing`)
- [ ] **Task 3.1**: Build `InvoicePdfDocument` (`packages/billing/src/pdf/documents/invoice-pdf-document.tsx`) with full ZAR formatting, VAT summary, and banking info.
- [ ] **Task 3.2**: Build `QuotePdfDocument` (`packages/billing/src/pdf/documents/quote-pdf-document.tsx`) with validity timeline and signature placeholder.
- [ ] **Task 3.3**: Build `StatementPdfDocument` (`packages/billing/src/pdf/documents/statement-pdf-document.tsx`) with transaction table and 5-tier ageing buckets.
- [ ] **Task 3.4**: Build `ReceiptPdfDocument` (`packages/billing/src/pdf/documents/receipt-pdf-document.tsx`).
- [ ] **Task 3.5**: Integrate new declarative documents into `generateBillingPdf()` in `server-billing-pdf.ts` with fallback flag.
- [ ] **Task 3.6**: Create Vitest test suite for billing documents (`packages/billing/src/pdf/__tests__/billing-pdf.test.ts`).
- [ ] **Task 3.7**: Verify API route `apps/admin/src/app/api/billing/pdf/[type]/[id]/route.ts` and `apps/portal` endpoint.
- [ ] **Task 3.8**: Commit Phase 3 changes (`feat(billing): implement modern declarative invoice, quote, statement, and receipt pdf templates`).

---

### Phase 4: Financial Statements & Accounting Reports (`@pmg/accounting`)
- [ ] **Task 4.1**: Build `BalanceSheetDocument` & `ProfitAndLossDocument` with structured multi-column ledger format.
- [ ] **Task 4.2**: Build `CashFlowDocument` & `ChangesInEquityDocument`.
- [ ] **Task 4.3**: Build high-density `TrialBalanceDocument` & `GeneralLedgerDocument` with `<KeepTogether>` to prevent orphaned line splits.
- [ ] **Task 4.4**: Integrate into `generateAccountingPdf()` in `packages/accounting/src/server-accounting-pdf.ts`.
- [ ] **Task 4.5**: Create Vitest test suite for accounting documents (`packages/accounting/src/pdf/__tests__/accounting-pdf.test.ts`).
- [ ] **Task 4.6**: Verify API route `apps/admin/src/app/api/accounting/export/[type]/route.ts`.
- [ ] **Task 4.7**: Commit Phase 4 changes (`feat(accounting): modernize financial statements and ledger pdf reports`).

---

### Phase 5: Client Optimization, Tests & Deprecations
- [ ] **Task 5.1**: Replace blurry client-side `html2canvas` in `apps/admin/src/lib/pdf-export.ts` with direct vector PDF downloads.
- [ ] **Task 5.2**: Test email attachments with Resend in `apps/admin/src/actions/system/email-delivery.ts` (< 10MB quota verification).
- [ ] **Task 5.3**: Run full monorepo test suite (`bun run test`) and typecheck (`bun run check-types`).
- [ ] **Task 5.4**: Deprecate legacy `packages/billing/src/pdf-shell.ts`.
- [ ] **Task 5.5**: Commit Phase 5 changes (`refactor: deprecate legacy coordinate pdf engine and remove html2canvas`).
