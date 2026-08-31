# 📋 Bug Remediation & Hardening Task List

This task list tracks the execution and verification of all bug fixes, security hardening, R2 receipt storage, and frontend improvements.

---

## 🚀 Execution Progress

- [x] **Task 1: Server Action Authentication Hardening**
  - [x] **1.1** `apps/admin/src/app/actions/clients.ts`
    - Added `await getSessionOrRedirect();` to `createClient`, `updateClient`, `toggleClientActive`, and `deleteClient`.
  - [x] **1.2** `apps/admin/src/app/actions/billing-invoices.ts`
    - Added `await getSessionOrRedirect();` to `fetchInvoicesByMonth` and `fetchInvoicesByYear`.
  - [x] **1.3** `apps/admin/src/app/actions/accounting.ts`
    - Added `await getSessionOrRedirect();` to `fetchJournalsByMonth`, `fetchJournalsByYear`, `fetchGeneralLedgerByMonth`, and `fetchGeneralLedgerByYear`.
  - [x] **1.4** `apps/admin/src/app/actions/leads.ts`
    - Imported `getSessionOrRedirect` from `@/lib/auth`.
    - Added session verification to `updateLeadStatus`, `updateLeadNotes`, `createLead`, `deleteLead`, and `convertLeadToClient`.
  - [x] **1.5** `apps/admin/src/app/actions/divisions.ts`
    - Imported `getSessionOrRedirect` from `@/lib/auth`.
    - Added session verification to `createDivision`, `updateDivision`, `toggleDivisionActive`, and `deleteDivision`.
  - [x] **1.6** `apps/admin/src/app/actions/expense-categories.ts`
    - Imported `getSessionOrRedirect` from `@/lib/auth`.
    - Added session verification to `createExpenseCategory`, `updateExpenseCategory`, and `deleteExpenseCategory`.
  - [x] **1.7** `apps/admin/src/app/actions/expenses.ts`
    - Imported `getSessionOrRedirect` from `@/lib/auth`.
    - Added session verification to `createExpense`, `updateExpense`, `deleteExpense`, `fetchExpensesByMonth`, and `fetchExpensesByYear`.
  - [x] **1.8** `apps/admin/src/app/actions/income.ts`
    - Imported `getSessionOrRedirect` from `@/lib/auth`.
    - Added session verification to `deleteIncome`, `fetchIncomeByMonth`, and `fetchIncomeByYear`.
  - [x] **1.9** `apps/admin/src/app/actions/project-progress.ts`
    - Imported `getSessionOrRedirect` from `@/lib/auth`.
    - Added session verification to all 9 checklist and progress actions.
  - [x] **1.10** `apps/admin/src/app/actions/automated-statements.ts` & `credit-management.ts`
    - Protected `triggerAutomatedStatementsRun` and `expireCreditNotes` with session checks while supporting internal cron runs.
  - [x] **1.11** `apps/admin/src/app/actions/portal-impersonation.ts`
    - Removed `as any` type bypass from `requireRole` and added client verification.

---

- [x] **Task 2: Cloudflare R2 Receipt Storage & API**
  - [x] **2.1** `apps/admin/src/app/actions/expenses.ts`
    - Replaced local `fs/promises` with Cloudflare R2 upload using `PutObjectCommand`.
    - Saved receipts under key `receipts/${Date.now()}-${cleanFileName}`.
    - Stored receipt reference URL as `/api/receipts?key=${encodeURIComponent(s3Key)}`.
  - [x] **2.2** `apps/admin/src/app/api/receipts/route.ts` & `apps/admin/src/lib/r2.ts`
    - Created secure API route handler `GET /api/receipts?key=...`.
    - Authenticated admin session via `auth.api.getSession({ headers: request.headers })`.
    - Validated requested key resides strictly within `receipts/` prefix (blocking traversal).
    - Generated short-lived presigned URL (300s) and redirected with 307.

---

- [x] **Task 3: Remove Hardcoded R2 Secrets in TES**
  - [x] **3.1** `apps/tes/src/pages/api/download.ts`
    - Removed `DEFAULT_R2_ACCOUNT_ID`, `DEFAULT_R2_ACCESS_KEY_ID`, and `DEFAULT_R2_SECRET_ACCESS_KEY` plaintext credentials.
    - Validated required environment variables and return structured configuration error if missing.

---

- [x] **Task 4: Email Template XSS Sanitization**
  - [x] **4.1** `apps/admin/src/app/actions/email-delivery.ts`
    - Implemented `escapeHtml()` helper.
    - Sanitized `personalMessage`, `clientName`, and `incomeRow.description` before embedding into `htmlBody` in `sendReceiptEmailAction` and `getReceiptEmailPreviewAction`.

---

- [ ] **Task 5: Portal Dev Mode User Selector**
  - [ ] **5.1** `apps/portal/src/app/(auth)/login/page.tsx`
    - When `process.env.NODE_ENV === 'development'`, render an interactive "Dev Mode: Quick Switch User" dropdown allowing developers to select any active client and authenticate with 1 click.

---

- [ ] **Task 6: Cron & Middleware Security Hardening**
  - [ ] **6.1** `apps/admin/src/app/api/cron/daily/route.ts`
    - Enforce `CRON_SECRET` authorization header check across all environments.
  - [ ] **6.2** `apps/tes/src/middleware.ts`, `apps/aws/src/middleware.ts`, `apps/pmg/src/middleware.ts`
    - Apply security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) across all routes.
  - [ ] **6.3** `apps/admin/src/proxy.ts` and Astro middlewares
    - Add TTL eviction / cleanup to in-memory rate limiter `Map` instances.

---

- [ ] **Task 7: Frontend Mastery & React 19 Hardening**
  - [ ] **7.1** `apps/admin/src/components/projects/task-board.tsx`
    - Fix cascading `setSections` inside `useEffect`.
    - Replace render-phase `Math.random` fallback with `crypto.randomUUID()` in the click event handler.
  - [ ] **7.2** `apps/admin/src/components/ui/not-found-view.tsx`
    - Replace unescaped single quote `'` with `&apos;`.
  - [ ] **7.3** `apps/admin/eslint.config.mjs`
    - Configure test mock fixture overrides for `src/__tests__/**` allowing test mock type flexibility (`as any`) while maintaining strict zero-warning rules across production app code.

---

- [ ] **Task 8: Full Verification Suite Run**
  - [ ] **8.1** `bun run check-types`
  - [ ] **8.2** `bun run lint`
  - [ ] **8.3** `bun run test`
  - [ ] **8.4** `bun run build`
