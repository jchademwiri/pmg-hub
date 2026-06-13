# PMG Accounting System Research & Design

This folder contains a two-phase research and implementation framework for PMG's manual bookkeeping system.

## Phase 1: Research & Audit
**File:** `01-accounting-system-research-audit-prompt.md`

**Deliverables:**
- Industry research summary (how accounting systems work)
- Corrected MVP scope (required vs. deferred features)
- PMG current-state code audit (45-point feature table)

**Output:** `docs/research/accounting-system/01-pmg-manual-bookkeeping-mvp-audit.md`

**Estimated time:** 2-4 hours for AI to scan codebase and complete audit

**Run this first.** The audit findings inform Phase 2.

---

## Phase 2: Schema & Roadmap
**File:** `02-accounting-system-schema-roadmap-prompt.md`

**Deliverables:**
- Recommended database changes (Drizzle schema plan)
- Proposed Chart of Accounts (account codes for PMG)
- Posting rules (double-entry guidance)
- Report requirements (MVP vs. future)
- Implementation roadmap (10 phases with effort estimates)
- Critical bugs & risks scan

**Outputs:**
- `docs/research/accounting-system/02-pmg-manual-bookkeeping-mvp-roadmap.md`
- `docs/research/accounting-system/03-pmg-manual-bookkeeping-schema-plan.md`

**Estimated time:** 3-6 hours for schema design and detailed roadmap

**Run after Phase 1 completes.** Use Phase 1 findings to prioritize work.

---

## Business Scope

**PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds**

- ✅ Manual invoice/payment recording
- ✅ Chart of Accounts & double-entry posting
- ✅ Accounts Receivable & Aged Receivables reports
- ✅ Profit & Loss & Trial Balance
- ✅ Period locking & audit trail
- ❌ VAT support (disabled by default)
- ❌ Bank feeds or automatic syncing
- ❌ Accounts Payable (future phase)

---

## Quick Start

1. Open `01-accounting-system-research-audit-prompt.md`
2. Copy the entire content
3. Paste into your AI chat/prompt tool
4. Allow time for code repository scan
5. Review the `01-pmg-manual-bookkeeping-mvp-audit.md` output
6. Then proceed to Phase 2 using `02-accounting-system-schema-roadmap-prompt.md`

---

## Tech Stack

- Next.js App Router
- TypeScript
- Drizzle ORM
- PostgreSQL/Neon
- Server Actions
- shadcn/ui

All recommendations follow existing PMG codebase patterns.

---

## Archive

The original combined prompt is available as `ai-prompt.md` for reference, but **use the split prompts** for better focus and manageability.
