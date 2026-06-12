# PMG Accounting System — Cross-Report Comparison

**Date:** 2026-06-12
**Reports Compared:**
- **Buffy** — `docs/research/accounting-system/buffy/01-independent-code-audit.md`
- **Codex** — `docs/research/accounting-system/codex/01-pmg-manual-bookkeeping-mvp-audit.md`, `02-...roadmap.md`, `03-...schema-plan.md`
- **Gemini CLI** — `docs/research/accounting-system/gemini-cli/01-pmg-manual-bookkeeping-mvp-audit.md`, `02-...roadmap.md`, `03-...schema-plan.md`
- **ChatGPT** — `docs/research/accounting-system/chatgpt/chatgpt-deep-research-report.md`

---

## 1. Methodology — How Each Report Was Produced

| Dimension | Buffy | Codex | Gemini CLI | ChatGPT |
|---|---|---|---|---|
| **Codebase access** | ✅ Full — read every schema, Server Action, query, and lib file directly | ✅ Full — read schema, actions, and queries directly | ✅ Full — scanned schema, actions, queries, and preview components | ❌ **No live access** — relied entirely on prior PMG research document |
| **grep searches** | ✅ 4 targeted searches (VAT, transactions, period lock, audit) | ⚠️ Partial — text mentions but no explicit grep results | ⚠️ Partial — text mentions but no explicit grep results | ❌ None — couldn't run code search |
| **Web research** | ✅ QuickBooks, Xero, FreshBooks, Wave, Zoho, Sage, double-entry patterns | ✅ Xero, Wave, FreshBooks, IRS Pub 538, Zoho Books | ✅ Same 6 platforms | ✅ Same 6 platforms + IRS Pub 538 |
| **Direct file citations** | ✅ Line-level evidence with exact code quotes | ✅ File-level evidence with path references | ✅ File-level evidence with file:// path references | ❌ No file citations — used "prior research doc" as source |
| **Confidence level** | **High** — line-by-line verification | **High** — direct file reading | **High** — direct file reading | **Low-Medium** — all items marked "documented only" |

---

## 2. What All 4 Reports Agree On (Convergence)

| Finding | Agreement |
|---|---|
| PMG is a billing/management tool, not a bookkeeping system | ✅ **Unanimous** |
| Needs: Chart of Accounts, journal entries, journal lines, GL, Trial Balance, audit trail, bank accounts | ✅ **Unanimous** |
| Cash-basis, non-VAT, no bank feeds for MVP | ✅ **Unanimous** |
| Period locking is well-implemented | ✅ **Unanimous** |
| VAT is still partially active and is a HIGH risk | ✅ **Unanimous** |
| Payment writes need `db.transaction()` wrapping | ✅ **Unanimous** |
| Existing `ledger` table is NOT a General Ledger (it's management allocations) | ✅ **Unanimous** |
| Double-counting risk with PMG allocation model | ✅ **Unanimous** |
| 10-phase implementation roadmap | ✅ **Unanimous** |
| First 5 development tasks (nearly identical order) | ✅ **Unanimous** |
| 5 new tables needed: COA, journal_entries, journal_entry_lines, bank_accounts, audit_logs | ✅ **Unanimous** |
| Recommended COA (same 21 accounts, codes 1001-5900) | ✅ **Unanimous** |
| Posting rules (cash-basis): no journal on invoice, Dr Bank/Cr Revenue on payment | ✅ **Unanimous** |
| Keep division as a dimension, not duplicated COA accounts | ✅ **Unanimous** |

---

## 3. Differences in Findings

### 3a. Unique Findings Per Report

| Finding | Buffy | Codex | Gemini CLI | ChatGPT |
|---|---|---|---|---|
| **Exactly 1 `db.transaction()` call in entire codebase** (in expense-categories.ts, not financial) | ✅ **Found** | ❌ Not noted | ❌ Not noted | ❌ Couldn't check |
| **`recordClientPayment()` does 4+ sequential writes** — detailed step-by-step breakdown | ✅ **Detailed** | ⚠️ Mentioned | ⚠️ Mentioned | ❌ Couldn't verify |
| **`divisionBillingSettings.defaultVatRate` defaults to `"15"`** | ✅ **Found** | ❌ Not noted | ❌ Not noted | ❌ Couldn't check |
| **Allocation math: revenue - expenses - pmgShare = profitPool | 35%/30%/30%/5% split** | ✅ **Documented** | ❌ Not detailed | ❌ Not detailed | ❌ Couldn't verify |
| **`incomeId` on invoices is legacy** — payment_allocations are true source of truth | ✅ **Found** | ❌ Not noted | ❌ Not noted | ❌ Couldn't check |
| **Document-preview VAT mismatch** — sidebar shows VAT, PDF hardcodes `vatApplicable: false` | ❌ Not detailed | ❌ Not detailed | ✅ **Found** (line-level) | ❌ Couldn't check |
| **5 resolved business policies from Jacob** (AR, divisions, COA editing, loans, export) | ❌ Not mentioned | ❌ Not mentioned | ✅ **Documented** | ❌ Couldn't verify |
| **"Repo-verification gap" listed as a risk itself** | ❌ N/A | ❌ N/A | ❌ N/A | ✅ **Unique** |
| **Commit plan table** for solo-developer workflow | ❌ Not included | ✅ **Included** | ❌ Not included | ✅ **Included** |
| **Only `email_audit_log` exists** (no financial audit log) | ✅ **Found** | ❌ Not noted | ❌ Not noted | ❌ Couldn't check |

### 3b. Severity Differences for the Same Finding

| Finding | Buffy | Codex | Gemini CLI | ChatGPT |
|---|---|---|---|---|
| **VAT still active** | HIGH — "hardcoded 15%" | HIGH — "no global guard" | HIGH — also found UI/PDF mismatch | HIGH — but caveated "couldn't verify" |
| **No transaction boundaries** | HIGH — "4+ sequential writes" | HIGH — "can partially write" | MEDIUM — "lack of transactional mutexes" | HIGH |
| **Payment allocation model** | "Sophisticated and well-designed" | "Good" | "Good" | "No accessible evidence" |
| **Period locking** | "Good but needs transactional enforcement" | "Good" | "Good" | "Good but may be UI-heavy" |
| **Double-counting risk** | HIGH | HIGH | HIGH | HIGH |

### 3c. Recommended First 5 Tasks (Order)

| Step | Buffy | Codex | Gemini CLI | ChatGPT |
|---|---|---|---|---|
| 1 | Non-VAT mode | Non-VAT mode | Non-VAT mode | Non-VAT mode |
| 2 | Accounting schema | Wrap transactions | Accounting schema | Accounting schema |
| 3 | Wrap transactions | Accounting schema | Wire postings | Wire postings |
| 4 | Posting helper | Posting helper | GL, TB, P&L reports | Build reports |
| 5 | GL, TB, P&L reports | GL, TB, P&L reports | Audit & hardening | Harden controls |

**Verdict:** Nearly identical — only Buffy and Codex differ by swapping steps 2 and 3.

### 3d. Schema Code Quality

| Report | Drizzle Code? | Completeness | Differences |
|---|---|---|---|
| **Buffy** | ❌ No — described gaps only | N/A | Focused on what's missing |
| **Codex** | ✅ Full Drizzle schema | Complete | Enums: `account_type`, `bank_account_type`, `journal_source_type` |
| **Gemini CLI** | ✅ Full Drizzle schema | Complete | Enums: `account_type`, `bank_account_type` (differs: `checking/savings/cash/credit_card`), `journal_source` |
| **ChatGPT** | ❌ No — couldn't verify | N/A | Table descriptions only |

**Codex vs Gemini CLI schema differences:**
- Gemini CLI uses `bank_account_type` enum (`checking`, `savings`, `cash`, `credit_card`) — Codex uses simpler `bank`/`cash`
- Gemini CLI uses `journal_source` enum — Codex uses `journal_source_type` with more specific values including `manual_adjustment`, `opening_balance`
- Both have same 5 tables with same column types
- Gemini CLI's `audit_logs` uses `timestamp` instead of `created_at` field name

### 3e. COA Differences

All 4 reports recommend **identical** COA (21 accounts, codes 1001-5900). No differences.

All recommend: division as dimension, not duplicated accounts. No differences.

---

## 4. Critical Gaps in Each Report

### Buffy Gaps
- Did not write Drizzle schema code
- Did not include a commit plan
- Did not note the document-preview VAT hardcoding mismatch
- No explicit business policy decisions recorded
- Less structured than Codex's 45-feature table

### Codex Gaps
- Did not find the exact `db.transaction()` count (1)
- Did not break down the 4-step sequential write issue in detail
- Did not note `defaultVatRate: "15"` default value
- Schema code uses `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` on audit_logs but ChatGPT review not applicable
- Did not note legacy `incomeId` vs `payment_allocations` relationship

### Gemini CLI Gaps
- Did not find the exact `db.transaction()` count
- Did not find `incomeId` legacy relationship
- Did not document exact allocation math percentages
- Rated transaction boundaries as MEDIUM severity (others say HIGH)
- Schema enum for bank accounts is more complex than needed for MVP

### ChatGPT Gaps
- **Could not verify any code** — all findings caveated as "documented only"
- Did not catch the single `db.transaction()` call finding
- Did not catch the document-preview VAT mismatch
- Did not specify exact file paths or code lines
- Marked "invoice numbering" as missing (others confirmed it exists)
- Marked "financial snapshots" as missing (others confirmed it exists)
- Most conservative and least actionable for implementation

---

## 5. Factual Discrepancies Between Reports

| Item | Buffy | Codex | Gemini CLI | ChatGPT | Truth |
|---|---|---|---|---|---|
| **Invoice numbering** | ✅ Exists (document_sequences) | ✅ Exists | ✅ Exists | 🔴 "Missing" | ✅ **Exists** |
| **Financial snapshots** | ✅ Exists (snapshots.ts) | ✅ Exists | ✅ Exists | 🔴 "Missing" | ✅ **Exists** |
| **Payment allocations** | ✅ Exists (payment_allocations) | ✅ Exists | ✅ Exists | 🔴 "No accessible evidence" | ✅ **Exists** |
| **Aged Receivables** | ✅ Exists (getAgingReport) | ✅ Exists | ✅ Exists | ✅ "Exists" | ✅ **Exists** |
| **Expense categories** | ✅ Exists | ✅ Exists | ✅ Exists | 🔴 "May lack full COA assignment" | ✅ **Exists** (not COA-linked) |

**Key takeaway:** ChatGPT incorrectly marked several existing features as missing because it could not access the live repo. This is the most significant difference — ChatGPT's report should be treated as **less reliable for implementation planning**.

---

## 6. Quality Assessment for Implementation

| Report | Best For | Weakness |
|---|---|---|
| **Buffy** | Understanding exact code-level risks (line-by-line evidence, transaction counts, legacy fields) | No schema code, less structured presentation |
| **Codex** | Complete implementation reference (schema code, roadmap, commit plan, detailed feature table) | Missed a few specific code-level findings |
| **Gemini CLI** | Understanding business decisions (resolved policies from Jacob, UI/UX mismatches) | Missed a few code-level findings, different severity ratings |
| **ChatGPT** | Big-picture architectural reasoning (cash vs accrual, industry norms, IRS guidance) | **Cannot be trusted for code-level accuracy** — no live repo access |

---

## 7. Summary of Key Differences

1. **ChatGPT is the outlier** — couldn't access the repo, marked several existing features as missing, and should only be used for high-level architectural guidance, not implementation.

2. **Buffy found most code-level details** — the single `db.transaction()` call, the 4-step sequential write breakdown, the `defaultVatRate: "15"`, the legacy `incomeId` field, and the missing `isVatRegistered` flag. Buffy also did 4 targeted grep searches that the others didn't.

3. **Gemini CLI found the document-preview VAT mismatch** — the only report to identify that the form sidebar includes VAT but the PDF hardcodes `vatApplicable: false`. This is a critical UI bug that only Gemini caught.

4. **Codex has the most structured output** — the 45-feature audit table with detailed evidence column and the most complete Drizzle schema code make it the best implementation reference.

5. **All 4 reports agree on the 5-solution**: Non-VAT mode → Accounting schema → Transaction wrapping → Posting helper → GL/TB/P&L reports. The order varies slightly but the substance is identical.

6. **No factual disagreements between Buffy, Codex, and Gemini** on any substantive finding — only differences in detail depth and presentation.
