# 🛡️ Consolidated Bug Audit & Diagnostic Report

## 📊 Summary of Findings

- **Branch Audited**: `fix/codebase-bug-audit`
- **Total Files Inspected**: ~1740 project files across 5 apps + 9 packages
- **Verified Issues**: 3 Critical | 4 High/Medium | 5 Reliability/Security Hardening | 1 Frontend/Lint
- **Status**: ⏳ Ready for Implementation

---

## 🔍 Detailed Triage Table

| Ref    | Severity    | File / Symbol                                                                                                                     | Issue Description                                                                    | Root Cause                                                                                                | Proposed Remediation                                                                  |
| ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **C1** | 🔴 Critical | `apps/admin/src/app/actions/clients.ts`                                                                                           | Missing auth on `createClient`, `updateClient`, `toggleClientActive`, `deleteClient` | Auth check was only in `sendPortalInvitation`                                                             | Add `await getSessionOrRedirect();` at entry of all 4 functions                       |
| **C2** | 🔴 Critical | `apps/admin/src/app/actions/email-delivery.ts:763-806`                                                                            | XSS vulnerability in `sendReceiptEmailAction` via `dangerouslySetInnerHTML`          | Raw template literal interpolation of user input `personalMessage`, `clientName`, `incomeRow.description` | Escape HTML entities before interpolation                                             |
| **C3** | 🔴 Critical | `apps/admin/src/app/actions/billing-invoices.ts:1109-1126`                                                                        | Missing auth on `fetchInvoicesByMonth`, `fetchInvoicesByYear`                        | Unprotected exported server actions                                                                       | Add `await getSessionOrRedirect();` to both                                           |
| **C4** | 🔴 Critical | `apps/admin/src/app/actions/accounting.ts:371-418`                                                                                | Missing auth on `fetchJournalsByMonth/Year`, `fetchGeneralLedgerByMonth/Year`        | Unprotected exported server actions                                                                       | Add `await getSessionOrRedirect();` to all 4                                          |
| **C5** | 🔴 Critical | `apps/admin/src/app/actions/leads.ts`, `divisions.ts`, `expense-categories.ts`, `expenses.ts`, `income.ts`, `project-progress.ts` | Missing auth across remaining administrative server actions                          | Missing `getSessionOrRedirect()` guards                                                                   | Add `await getSessionOrRedirect();` across all action files                           |
| **C6** | 🔴 Critical | `apps/admin/src/app/actions/automated-statements.ts`, `credit-management.ts:1078`                                                 | Missing auth on `triggerAutomatedStatementsRun` & `expireCreditNotes`                | Missing session/cron guard                                                                                | Add `await getSessionOrRedirect();` or internal authorization                         |
| **H1** | 🟠 High     | `apps/tes/src/pages/api/download.ts:6-9`                                                                                          | Hardcoded Cloudflare R2 Access Key & Secret in source                                | Hardcoded fallback constants                                                                              | Remove plaintext defaults; enforce env variable validation                            |
| **H2** | 🟠 High     | `apps/admin/src/app/actions/expenses.ts:45-53`                                                                                    | Receipt uploads saved to ephemeral local disk                                        | Local filesystem writes in serverless                                                                     | Migrate receipt uploads to Cloudflare R2 under `receipts/` + `/api/receipts` endpoint |
| **M1** | 🟡 Medium   | `apps/admin/src/app/api/cron/daily/route.ts:12-16`                                                                                | Cron auth skipped in non-production environments                                     | `NODE_ENV === 'production'` guard                                                                         | Require `CRON_SECRET` unconditionally                                                 |
| **M2** | 🟡 Medium   | `apps/portal/src/app/(auth)/login/page.tsx`                                                                                       | Portal dev mode user authentication                                                  | Need dev client selector                                                                                  | Add interactive Dev Mode User Selector dropdown on login page in dev                  |
| **M3** | 🟡 Medium   | `apps/tes/src/middleware.ts`, `apps/aws/src/middleware.ts`, `apps/pmg/src/middleware.ts`                                          | Security headers only applied to `/` or missing                                      | Conditional `pathname === '/'` check                                                                      | Apply security headers on all routes                                                  |
| **M4** | 🟡 Medium   | `apps/admin/src/proxy.ts`, Astro middlewares                                                                                      | In-memory rate limiter `Map` accumulation                                            | No TTL eviction/cleanup                                                                                   | Add periodic TTL pruning                                                              |
| **F1** | 🟡 Medium   | `apps/admin/src/components/projects/task-board.tsx`, `not-found-view.tsx`                                                         | React 19 cascading state in effect & impure `Math.random`                            | React hook & purity violations                                                                            | Refactor effect synchronization, use `crypto.randomUUID()`, escape entity             |
| **A1** | 🔵 Advisory | `apps/admin/eslint.config.mjs`                                                                                                    | Monorepo ESLint failure on test mocks (`as any`)                                     | Strict type checking on test fixtures                                                                     | Add test file override configuration                                                  |

---

## 📋 Comprehensive Remediation Task List

Upon execution, we will update this task list as each item is completed:

- [ ] **Task 1: Server Action Authentication Hardening**
  - [ ] 1.1 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/clients.ts` (`createClient`, `updateClient`, `toggleClientActive`, `deleteClient`)
  - [ ] 1.2 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/billing-invoices.ts` (`fetchInvoicesByMonth`, `fetchInvoicesByYear`)
  - [ ] 1.3 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/accounting.ts` (`fetchJournalsByMonth`, `fetchJournalsByYear`, `fetchGeneralLedgerByMonth`, `fetchGeneralLedgerByYear`)
  - [ ] 1.4 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/leads.ts` (`updateLeadStatus`, `updateLeadNotes`, `createLead`, `deleteLead`, `convertLeadToClient`)
  - [ ] 1.5 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/divisions.ts` (`createDivision`, `updateDivision`, `toggleDivisionActive`, `deleteDivision`)
  - [ ] 1.6 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/expense-categories.ts` (`createExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory`)
  - [ ] 1.7 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/expenses.ts` (`createExpense`, `updateExpense`, `deleteExpense`, `fetchExpensesByMonth`, `fetchExpensesByYear`)
  - [ ] 1.8 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/income.ts` (`deleteIncome`, `fetchIncomeByMonth`, `fetchIncomeByYear`)
  - [ ] 1.9 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/project-progress.ts` (all 9 checklist & task actions)
  - [ ] 1.10 Add `getSessionOrRedirect()` to `apps/admin/src/app/actions/automated-statements.ts` and `credit-management.ts` with cron support
  - [ ] 1.11 Harden `apps/admin/src/app/actions/portal-impersonation.ts` against self-impersonation

- [ ] **Task 2: Cloudflare R2 Receipt Storage & API**
  - [ ] 2.1 Migrate `handleReceiptUpload` in `apps/admin/src/app/actions/expenses.ts` to upload to Cloudflare R2 (`receipts/${Date.now()}-${cleanFileName}`)
  - [ ] 2.2 Create `apps/admin/src/app/api/receipts/route.ts` with admin session authentication and presigned download URL generation

- [ ] **Task 3: Remove Hardcoded R2 Secrets in TES**
  - [ ] 3.1 Remove plaintext access keys and secret fallbacks from `apps/tes/src/pages/api/download.ts` and enforce environment configuration checks

- [ ] **Task 4: Email Template XSS Sanitization**
  - [ ] 4.1 Implement `escapeHtml()` and sanitize `personalMessage`, `clientName`, and `description` in `apps/admin/src/app/actions/email-delivery.ts`

- [ ] **Task 5: Portal Dev Mode User Selector**
  - [ ] 5.1 Add interactive Dev Mode User Selector to `apps/portal/src/app/(auth)/login/page.tsx` for quick switching in local development

- [ ] **Task 6: Cron & Middleware Security Hardening**
  - [ ] 6.1 Enforce `CRON_SECRET` authorization header check unconditionally in `apps/admin/src/app/api/cron/daily/route.ts`
  - [ ] 6.2 Apply security headers on all routes in `apps/tes/src/middleware.ts`, `apps/aws/src/middleware.ts`, and `apps/pmg/src/middleware.ts`
  - [ ] 6.3 Add TTL eviction / cleanup to in-memory rate limiters in `apps/admin/src/proxy.ts` and Astro middlewares

- [ ] **Task 7: Frontend & ESLint Hardening**
  - [ ] 7.1 Fix cascading effect render and render-phase impure functions in `apps/admin/src/components/projects/task-board.tsx`
  - [ ] 7.2 Escape unescaped single quote in `apps/admin/src/components/ui/not-found-view.tsx`
  - [ ] 7.3 Configure test fixture overrides in `apps/admin/eslint.config.mjs`

- [ ] **Task 8: Full Verification Suite Run**
  - [ ] 8.1 Run `bun run check-types`
  - [ ] 8.2 Run `bun run lint`
  - [ ] 8.3 Run `bun run test`
  - [ ] 8.4 Run `bun run build`
