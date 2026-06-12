# PMG Control Center — Accounting Readiness Reports Comparison

This document provides a comparative analysis of the three versions of the **Accounting Readiness Improvement Audit** report stored in this directory.

---

## 1. File Inventory and Metadata

| File Name | Size (Bytes) | Lines | Focus / Version Type |
|---|---|---|---|
| [01-accounting-readiness-improvement-audit.md](file:///D:/websites/pmg-hub/docs/research/accounting-system/accounting-readiness/01-accounting-readiness-improvement-audit.md) | 33,429 | 425 | **Initial Draft** — Shorter, summaries of critical action items. |
| [02-accounting-readiness-improvement-audit.md](file:///D:/websites/pmg-hub/docs/research/accounting-system/accounting-readiness/02-accounting-readiness-improvement-audit.md) | 44,485 | 784 | **Final Expanded Report** — Highly detailed, tabular format, full schemas and file inventory. |
| [03-accounting-readiness-improvement-audit.md](file:///D:/websites/pmg-hub/docs/research/accounting-system/accounting-readiness/03-accounting-readiness-improvement-audit.md) | 33,429 | 425 | **Duplicate Save** — Byte-for-byte identical to File `01`. |

> [!NOTE]
> File `01` and File `03` are byte-for-byte identical (33,429 bytes, 425 lines). They represent the same version of the initial codebase audit, whereas File `02` is an expanded, final edition representing a deep codebase analysis.

---

## 2. Core Areas of Convergence (What Both Versions Agree On)

Both the draft (File `01`/`03`) and the expanded version (File `02`) agree on the core risks and architectural blockers that must be resolved before the manual bookkeeping module can be built:

1. **Role/Permission Guard Bypass:** Both identify that 19 out of 21 Server Actions (including voiding invoices, deleting payments, and editing ledger settings) only check for a valid session, missing role authorization checks.
2. **Missing Database Transactions:** Both highlight that multi-table writes (such as recording a payment, which affects `income`, `payment_allocations`, and `invoices`) are not wrapped in database transactions, posing a risk of database drift.
3. **VAT Deactivation Requirement:** Both insist that VAT calculations must be deactivated globally for the MVP, as PMG is currently not VAT registered.
4. **Ledger Terminology Conflict:** Both clarify that the current `ledger` table is not a General Ledger (GL) but a managerial profit-allocation tool, and recommend renaming it to avoid confusion.
5. **Period Lock Bypass:** Both point out that invoices in `draft`, `issued`, or `overdue` status bypass the closed-period checks, allowing backdated mutations.
6. **Self-Healing Side Effects:** Both identify that the automatic backfill of payment allocations on the payments read path is dangerous and should be moved to a one-time migration script.

---

## 3. Structural and Content Differences

File `02` is an extensive expansion of the initial draft. Below is a breakdown of the structural and content additions:

### 3.1 Structural Enhancements in File `02`
* **Table of Contents:** File `02` includes an interactive Table of Contents for easy navigation.
* **Numbered Headers:** Sections are organized using a clean decimal hierarchy (e.g., `1.1`, `1.2`, `1.3`) instead of simple headings.
* **Appendix: File Inventory:** File `02` contains a comprehensive index of all relevant codebase files across Server Actions, Queries, Database Schemas, and UI Components, indicating their line counts and known issues.

### 3.2 Content and Depth Enhancements in File `02`
* **Tabular Audits:** File `02` converts bullet points from File `01` into structured comparison tables:
  * **Section 1:** A tabular inventory of the 13 existing modules, their database tables, and current status.
  * **Section 5:** A tabular comparison of **Billing Operations** (Invoices/Quotes) vs. **Accounting Responsibilities** (GL/Journals).
  * **Section 10:** Detailed action-plan tables categorized by severity (Critical, Important, Nice-to-Have, Future) with estimated effort in developer-days.
* **Accounting Architecture Design:** File `02` adds concrete pre-implementation designs that are completely absent in File `01`/`03`:
  * **Chart of Accounts (COA) Blueprint:** Defines the exact 21 seeded standard accounts, including system numbers, types, and allocation rules.
  * **Double-Entry Posting Hooks:** Outlines the specific journal postings for cash receipts and expenses (`Dr Bank / Cr Revenue` and `Dr Expense / Cr Bank`).
  * **Journal Entry Database Schema:** Explains the design pattern of splitting journal transactions into header and line items.

---

## 4. Section-by-Section Mapping

| Section (File `02`) | Status in File `01` / `03` | Additions in File `02` |
|---|---|---|
| **Executive Summary** | Present as introductory text | Restructured, added Table of Contents. |
| **1. Current System Review** | Present as bulleted lists | Added Module Status table; structured key strengths vs weaknesses. |
| **2. UI/UX Audit** | Present as text blocks | Expanded list of routes with missing loading/error boundaries. |
| **3. Data Flow Audit** | Present as simple text | Restructured to trace complete lifecycles of Invoices, Payments, Quotes, and Expenses. |
| **4. Database & Schema Audit** | Present as text blocks | Added specific details on missing database indexes and constraints. |
| **5. Billing vs Accounting** | Present as text blocks | Added a side-by-side comparison table and the Bridging Pattern. |
| **6. Code Quality & Architecture** | Present as text blocks | Added detailed folder structure audit of the repository. |
| **7. Security & Access Control** | Present as text blocks | Added recommendations for a concrete role-based permissions matrix. |
| **8. Reporting & Dashboard** | Present as text blocks | Detailed report-by-report issues (e.g. hardcoded split rates in reports.ts). |
| **9. Accounting Readiness** | Present as text blocks | **Completely New:** Added detailed COA table, journal entry blueprints, and posting hooks. |
| **10. Final Recommendations** | Present as bulleted work order | Added 4 prioritized tables (Critical, Important, Polish, Future) with effort estimates. |
| **Appendix: File Inventory** | **Absent** | **Completely New:** List of 40+ codebase files with line counts and file-specific issues. |

---

## 5. Conclusion and Recommendation

* **File `02`** represents the **Master Audit Report** and should be used as the primary source of truth for planning codebase improvements.
* **Files `01` and `03`** are legacy drafts and can be archived or deleted to keep the workspace clean, as all of their contents are fully represented and expanded upon in File `02`.
