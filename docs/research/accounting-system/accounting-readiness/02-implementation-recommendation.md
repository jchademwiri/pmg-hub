# PMG Accounting System — Implementation Recommendation

> **Date:** 2026-06-12
> **Based on cross-report comparison of:** Buffy (live code audit), Codex, Gemini CLI, and ChatGPT research outputs
> **Previously saved in:** `docs/research/accounting-system/accounting-readiness/01-comparison-report.md`

---

## 1. Report Quality Assessment

| Report | Trust Level | Best For | Don't Use For |
|---|---|---|---|
| **Buffy** | ✅ **Highest** — line-by-line code evidence | Understanding exact code-level risks (transaction gaps, legacy fields, hardcoded VAT defaults) | Schema code — described gaps but didn't write Drizzle |
| **Codex** | ✅ **High** — direct file reads | **Implementation reference** — has the full Drizzle schema code and 45-feature audit table | Finding the exact `db.transaction()` count or `defaultVatRate: "15"` |
| **Gemini CLI** | ✅ **High** — direct file reads + caught UI bug | Business policy context (Jacob's decisions) and document-preview VAT mismatch found nowhere else | Transaction severity — rated it MEDIUM when it's clearly HIGH |
| **ChatGPT** | ⚠️ **Low-Medium** — no live repo access | High-level architectural reasoning (cash vs accrual theory) | **Any code-level decision** — marked invoice numbering and snapshots as "missing" when they exist |

---

## 2. What All 4 Reports Agree On (No Decision Needed)

| Finding | Consensus |
|---|---|
| PMG is a billing/management tool, not a bookkeeping system | ✅ Unanimous |
| Cash-basis, non-VAT, no bank feeds for MVP | ✅ Unanimous |
| 5 new tables needed: COA, journal_entries, journal_entry_lines, bank_accounts, audit_logs | ✅ Unanimous |
| Chart of Accounts: same 21 accounts, codes 1001-5900 | ✅ Unanimous |
| Posting rules (cash-basis): no journal on invoice, Dr Bank/Cr Revenue on payment | ✅ Unanimous |
| Division as a dimension, not duplicated COA accounts | ✅ Unanimous |
| Period locking is well-implemented | ✅ Unanimous |
| Existing `ledger` table is NOT a General Ledger | ✅ Unanimous |
| First 5 development tasks (nearly identical order) | ✅ Unanimous |

---

## 3. Recommended Hybrid Approach

Use the **strengths of each report** rather than following any single one:

### Phase 0 — Critical Fixes

**Primary source: Buffy** (only report that found exact code-level issues)

| Task | Why This Source | Evidence |
|---|---|---|
| Wrap multi-step writes in `db.transaction()` | **Buffy** — only report to identify the exact count (1 call, in expense-categories.ts) | `recordClientPayment()` does 4+ sequential writes |
| Add `isVatRegistered` guard to org settings | **Buffy** — only report to trace the full VAT chain from schema → action → UI | `calcTotals()` hardcodes 15%, no global guard exists |
| Fix document-preview VAT hardcoding | **Gemini CLI** — only report that caught this UI/PDF mismatch | `document-preview.tsx` hardcodes `vatApplicable: false` but sidebar shows VAT |
| Add `payment_method` to income records | **Buffy** — only report to identify missing payment metadata | No way to reconcile payments to bank statements |
| Create `audit_logs` table | **All 4 agree** | Only `email_audit_log` exists currently |

### Phase 1 — Accounting Schema Implementation

**Primary source: Codex** (most complete, production-ready Drizzle schema code)

| Decision | Choice | Rationale |
|---|---|---|
| Drizzle schema code template | **Codex** | Most complete enum set (`account_type`, `journal_source_type`, `bank_account_type`) |
| Bank account type enum | **Codex** (`bank`/`cash`) over **Gemini** (`checking/savings/cash/credit_card`) | Simpler for cash-basis MVP — can add types later |
| Journal source types | **Codex** — includes `manual_adjustment`, `opening_balance` | More future-proof for accountant import use cases |
| COA account list | **Any report — all identical** | 21 accounts, codes 1001-5900 |

### Phase 2-5 — Building Features

**Primary source: Codex roadmap** (most structured, best order)

| Phase | Task | Priority |
|---|---|---|
| 2 | Wrap transactions in `db.transaction()` + integration audit logging | 🔴 **High** |
| 3 | Build posting helper (`postJournalEntry`) + wire billing events → auto-journals | 🔴 **High** |
| 4 | Build GL report (account history), Trial Balance (debit/credit check), P&L (cash-basis) | 🟡 **Medium** |
| 5 | AR/Cash/Bank account management UI + reconciliation | 🟡 **Medium** |

---

## 4. What to Discard from Each Report

### ChatGPT — Discard at code level
- Marked "invoice numbering" as missing — it exists (`document_sequences`)
- Marked "financial snapshots" as missing — they exist (`snapshots` table)
- Marked "payment allocations" as missing — they exist (`payment_allocations`)
- **Keep only:** high-level cash vs accrual reasoning and IRS Pub 538 guidance for accounting standards

### Gemini CLI — Discard overly complex enum
- `bank_account_type` with 4 values (`checking`, `savings`, `cash`, `credit_card`) is too granular for MVP
- Rated transaction boundary issue as MEDIUM — this is clearly HIGH risk
- **Keep only:** the document-preview VAT mismatch fix and the business policy context from Jacob

### Codex — Discard gaps in code-level findings
- Missed the single `db.transaction()` call finding
- Missed `defaultVatRate: "15"` default in schema
- Missed legacy `incomeId` field on invoices
- **Keep:** schema code, roadmap, commit plan, 45-feature audit table structure

### Buffy — Discard lack of schema code
- No Drizzle schema code was written — only described what's missing
- Missed the document-preview VAT hardcoding mismatch (Gemini caught this)
- Less structured presentation than Codex's 45-feature table
- **Keep:** code-level findings, exact line references, grep evidence

---

## 5. Implementation Sequence

```
Week 1-2: Phase 0 (Critical Fixes)
  ├── db.transaction() wrappers (all action files)
  ├── isVatRegistered guard + VAT cleanup
  ├── document-preview VAT fix
  ├── payment_method on income
  └── audit_logs table

Week 3: Phase 1 (Accounting Schema)
  ├── chart_of_accounts table + seed data
  ├── journal_entries + journal_entry_lines
  ├── bank_accounts table
  └── audit_logs integration

Week 4: Phase 2 (Transaction Safety)
  ├── Wrap all billing writes in transactions
  ├── postJournalEntry helper function
  └── Wire payment → auto-journal (Dr Bank/Cr Revenue)

Week 5: Phase 3 (Posting Engine)
  ├── Wire expense → auto-journal (Dr Expense/Cr Bank)
  ├── Wire invoice issue → Dr AR/Cr Revenue
  ├── Wire void invoice → reversing journal
  └── Manual journal entry UI

Week 6: Phase 4 (Reports)
  ├── General Ledger (account history + running balance)
  ├── Trial Balance (debit = credit verification)
  └── Cash-basis P&L (from GL accounts, not raw sums)
```

---

## 6. Quick Reference: Best Source Per Decision

| Decision | Best Source |
|---|---|
| What's broken in the codebase right now? | **Buffy** (line-level evidence) |
| What schema code should I write? | **Codex** (complete Drizzle schema) |
| What business decisions do I need? | **Gemini CLI** (Jacob's resolved policies) |
| What's the big picture architecture? | **ChatGPT** (cash vs accrual theory) |
| What order should I build in? | **Codex** (most structured roadmap) |
| What UI bugs exist? | **Gemini CLI** (document-preview mismatch) |
| What are the exact risks of not fixing something? | **Buffy** (line-level severity breakdown) |
