# Consolidated Bug Remediation & System Hardening Plan

## Overview
A comprehensive systematic plan resolving all verified security vulnerabilities, server action authentication gaps, Cloudflare R2 receipt storage, email template XSS escaping, Astro middleware headers, and dev mode user switching across the monorepo apps and packages.

---

## User Guidelines & Constraints Incorporated

> [!IMPORTANT]
> **No Legacy Receipts**: No existing receipt migration needed. All new uploads will be stored cleanly in Cloudflare R2 under `receipts/${timestamp}-${cleanFileName}`.

> [!IMPORTANT]
> **Portal Dev Mode User Selector**: Preserve development mode convenience by providing an explicit interactive client/user selector on the portal login page in local dev (`process.env.NODE_ENV === 'development'`), allowing instant switching between test clients.

> [!IMPORTANT]
> **Retain Local LAN IP**: Keep `http://192.168.0.190:3000` and `http://192.168.0.190:3001` in `trustedOrigins` for local LAN/device testing.

---

## Proposed Changes (By Component)

### 1. Server Action Authentication & Session Verification (`apps/admin/src/app/actions`)

#### [MODIFY] [clients.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/clients.ts)
- Add `await getSessionOrRedirect();` to `createClient`, `updateClient`, `toggleClientActive`, and `deleteClient`.

#### [MODIFY] [billing-invoices.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/billing-invoices.ts)
- Add `await getSessionOrRedirect();` to `fetchInvoicesByMonth` and `fetchInvoicesByYear`.

#### [MODIFY] [accounting.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/accounting.ts)
- Add `await getSessionOrRedirect();` to `fetchJournalsByMonth`, `fetchJournalsByYear`, `fetchGeneralLedgerByMonth`, and `fetchGeneralLedgerByYear`.

#### [MODIFY] [leads.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/leads.ts)
- Import `getSessionOrRedirect` from `@/lib/auth`.
- Add session verification to `updateLeadStatus`, `updateLeadNotes`, `createLead`, `deleteLead`, and `convertLeadToClient`.

#### [MODIFY] [divisions.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/divisions.ts)
- Import `getSessionOrRedirect` from `@/lib/auth`.
- Add session verification to `createDivision`, `updateDivision`, `toggleDivisionActive`, and `deleteDivision`.

#### [MODIFY] [expense-categories.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/expense-categories.ts)
- Import `getSessionOrRedirect` from `@/lib/auth`.
- Add session verification to `createExpenseCategory`, `updateExpenseCategory`, and `deleteExpenseCategory`.

#### [MODIFY] [income.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/income.ts)
- Import `getSessionOrRedirect` from `@/lib/auth`.
- Add session verification to `deleteIncome`, `fetchIncomeByMonth`, and `fetchIncomeByYear`.

#### [MODIFY] [project-progress.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/project-progress.ts)
- Import `getSessionOrRedirect` from `@/lib/auth`.
- Add session verification to all 9 checklist and progress tracking actions.

#### [MODIFY] [automated-statements.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/automated-statements.ts)
- Protect `triggerAutomatedStatementsRun` with `await getSessionOrRedirect();` when called from the UI, while allowing internal cron execution.

#### [MODIFY] [credit-management.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/credit-management.ts)
- Protect `expireCreditNotes` with `await getSessionOrRedirect();` when called manually, while supporting cron batch execution.

#### [MODIFY] [portal-impersonation.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/portal-impersonation.ts)
- Remove `as any` type bypass from `requireRole`.
- Add self-impersonation guard preventing admin from impersonating a client record linked to their own admin userId.

---

### 2. Cloudflare R2 Receipt Storage & Secret Protection

#### [MODIFY] [expenses.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/expenses.ts)
- Add `await getSessionOrRedirect();` to `createExpense`, `updateExpense`, `deleteExpense`, `fetchExpensesByMonth`, and `fetchExpensesByYear`.
- Replace local `fs/promises` (`process.cwd()/public/uploads/receipts/`) with Cloudflare R2 upload using `PutObjectCommand`.
- Save files under key `receipts/${Date.now()}-${cleanFileName}`.
- Store receipt reference URL `/api/receipts?key=${encodeURIComponent(s3Key)}`.

#### [NEW] [route.ts (Receipts API)](file:///d:/websites/pmg-hub/apps/admin/src/app/api/receipts/route.ts)
- Create secure API route handler `GET /api/receipts?key=...`.
- Authenticate admin session via `auth.api.getSession()`.
- Validate requested key starts strictly with `receipts/` prefix.
- Generate short-lived presigned URL or stream the object directly from R2.

#### [MODIFY] [download.ts](file:///d:/websites/pmg-hub/apps/tes/src/pages/api/download.ts)
- Remove hardcoded `DEFAULT_R2_ACCOUNT_ID`, `DEFAULT_R2_ACCESS_KEY_ID`, and `DEFAULT_R2_SECRET_ACCESS_KEY` plaintext credentials.
- Validate that `CLOUDFLARE_R2_ACCESS_KEY_ID` and `CLOUDFLARE_R2_SECRET_ACCESS_KEY` exist in environment, returning a descriptive configuration error if missing.

---

### 3. Email Template XSS Hardening (`apps/admin/src/app/actions/email-delivery.ts`)

#### [MODIFY] [email-delivery.ts](file:///d:/websites/pmg-hub/apps/admin/src/app/actions/email-delivery.ts)
- Create HTML entity escape helper `escapeHtml(str)`.
- Escape `personalMessage`, `clientName`, and `incomeRow.description` before embedding into `htmlBody` in `sendReceiptEmailAction` and `getReceiptEmailPreviewAction`.

---

### 4. Portal Dev Mode User Switcher & Middleware Hardening

#### [MODIFY] [page.tsx (Portal Login)](file:///d:/websites/pmg-hub/apps/portal/src/app/(auth)/login/page.tsx)
- In development mode (`process.env.NODE_ENV === 'development'`), render a "Dev Mode: Quick Switch User" dropdown allowing developers to select any active client and authenticate immediately.

#### [MODIFY] [route.ts (Daily Cron)](file:///d:/websites/pmg-hub/apps/admin/src/app/api/cron/daily/route.ts)
- Require `CRON_SECRET` authorization header across all environments (including preview/staging) rather than skipping in non-production.

#### [MODIFY] [middleware.ts (TES, AWS, PMG)](file:///d:/websites/pmg-hub/apps/tes/src/middleware.ts)
- Apply security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) across all routes.
- Add periodic rate limit store cleanup.

#### [MODIFY] [proxy.ts (Admin)](file:///d:/websites/pmg-hub/apps/admin/src/proxy.ts)
- Add periodic TTL pruning for expired rate limit entries.

---

### 5. Frontend Mastery & React 19 Hardening (`apps/admin`)

#### [MODIFY] [task-board.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/projects/task-board.tsx)
- Refactor `setSections(initialSections)` to prevent cascading render loops.
- Use `crypto.randomUUID()` in event handlers instead of `Math.random` during render.

#### [MODIFY] [not-found-view.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/ui/not-found-view.tsx)
- Replace unescaped single quote `'` with `&apos;`.

#### [MODIFY] [eslint.config.mjs](file:///d:/websites/pmg-hub/apps/admin/eslint.config.mjs)
- Configure test directory overrides for `src/__tests__/**` allowing test mock type flexibility (`@typescript-eslint/no-explicit-any: off` in test fixtures) while enforcing strict zero-warning rules across application source code.

---

## Verification Plan

### Automated Verification Suite
```bash
bun run check-types
bun run lint
bun run test
bun run build
```

### Security & Functional Verification
1. **Auth Verification**: Confirm all modified server actions return `{ error: '...' }` or redirect when invoked without an active admin session.
2. **R2 Receipt Upload**: Confirm receipt file uploads to Cloudflare R2 under `receipts/` and renders a working view link.
3. **Email XSS**: Test receipt email preview with payload containing HTML/JS characters and verify proper escaping.
4. **Dev User Switcher**: Confirm portal login page in dev mode displays active client list and enables quick 1-click login.
5. **Security Headers**: Verify all routes in Astro apps return correct security headers.
