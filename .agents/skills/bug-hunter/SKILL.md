---
name: bug-hunter
description: |
  Multi-phase systematic bug audit, logic check, and codebase hardening. Use when user says "/bug-hunter", "bug-hunter", "bug hunter", "hunt bugs", "audit bugs", or "/audit".
metadata:
  author: custom
  version: '1.0.0'
---

# Bug Hunter (Systematic Bug Audit & Hardening)

Systematic multi-phase bug hunt, security verification, financial logic audit, and codebase hardening before shipping.

## Audit Workflow

### Phase 1: Static Analysis & Type Safety
1. Run full workspace typecheck:
   ```bash
   bun run check-types
   ```
2. Verify code style and formatting:
   ```bash
   npx prettier --check .
   ```

### Phase 2: Security & Authorization Audit
1. **Server Actions & Mutations**:
   - Check that all `'use server'` action files verify authenticated session (`auth.api.getSession`, `withAdminContext`, or `withClientContext`).
   - Ensure unauthenticated callers are rejected with structured error responses.
2. **Cron Routes & API Endpoints**:
   - Verify cron handlers enforce `CRON_SECRET` authorization bearer headers.
   - Check rate limiting and webhook signature verifications (e.g. Resend webhooks).
3. **Data Isolation & Row-Level Security (RLS)**:
   - Verify tenant isolation on multi-client queries so clients cannot access cross-client invoices, receipts, or data.
4. **Input Sanitization & Injection Defense**:
   - Ensure Drizzle queries use parameterized sql templates.
   - Prevent XSS in email delivery templates and generated documents.

### Phase 3: Financial & Business Logic Invariants
1. **Double-Entry Balance**:
   - Verify general ledger debits equal credits: `Dr == Cr`.
2. **Payment Allocation Invariant**:
   - `allocated <= amount` on all income records.
   - Partial payments correctly update invoice status (`paid`, `partially_paid`, `unpaid`).
3. **Date & Accounting Period Rules**:
   - Validate that transactions cannot be backdated into closed accounting periods without admin authorization.
4. **Rounding & Currency Arithmetic**:
   - Ensure monetary calculations use fixed cent precision, avoiding floating-point drift.

### Phase 4: Test Suite & Regression Verification
1. Run database tests:
   ```bash
   bun --filter @pmg/db test
   ```
2. Run admin test suite:
   ```bash
   bun --filter admin test
   ```
3. Run all tests across monorepo:
   ```bash
   bun run test
   ```
   Fix any failing tests immediately.

### Phase 5: Production Build Gate
Ensure clean production build without chunking, dynamic import, or SSR mismatches:
```bash
bun run build
```

---

## Summary & Next Step Guidance

Present an audit report with:
1. **Audit Findings**: Summary of any vulnerabilities, type errors, or logic edge cases detected and remediated.
2. **Verification Results**: Status of `check-types`, `prettier`, `test`, and `build`.
3. **Next Step Reminder**:
   ```
   🛡️ Bug Hunter Audit Complete: 0 bugs, all quality gates passing!

   👉 Next Step: Run `/ship` (or `/done`) to commit, push, and create your PR to dev.
   ```
