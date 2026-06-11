# Client Detail Page — Industry Research
*PMG Hub Admin | June 2026*

---

## Overview

This document surveys how leading invoicing, accounting, and CRM platforms design their client/customer detail pages. Nine products were analysed: Xero, QuickBooks Online, FreshBooks, Zoho Invoice/Books, Wave, Stripe, Harvest, Invoice Ninja, and HubSpot. The goal is to identify patterns, best practices, and specific lessons applicable to the PMG Hub redesign.

---

## 1. Xero — Contact Overview Page

Xero's contact overview page (redesigned in 2023 as part of their multi-year modernisation program) is widely considered the gold standard for accounting software contact pages.

**Information hierarchy (top → bottom):**
1. **Header band** — Contact name, classification (Customer / Supplier), key contact details (email, phone, address) always visible. Financial summary surfaced immediately at top: amounts owed/owing as clickable summary tiles.
2. **Tabbed transaction browser** — Tabs for: *Invoices*, *Quotes*, *Bills*, *Purchase Orders*, *Activity* (chronological). Each tab has its own search + date filter.
3. **History & Notes** — Pinned at the bottom; chronological audit trail of notes and system events.
4. **Financial Details** — Tax settings, payment terms, credit limit, currency.

**Key design decisions:**
- Financial activity summary is at the **very top** — visible without scrolling.
- Clicking the "owed" summary opens a filtered list — the summary IS a navigation action.
- Cash in/out bar graph gives a quick visual of payment flow.
- Search and filter **within each tab**, not just at page level.
- Fully mobile-friendly and WCAG accessible.

> *"The contact's main information (key contact details and financial activity summary) is now at the top of the page, so it's available at a glance. Activity and transactional information is grouped into tabs, so you can easily see the contact's financial stance — you no longer need to constantly scroll."*
> — Xero Blog, 2023 redesign announcement

---

## 2. QuickBooks Online — Customer Page

QuickBooks uses a two-column layout with tabs. Its standout pattern — the interactive "Money Bar" — is the most instructive lesson for PMG Hub.

**Information hierarchy:**
1. **Top section** — Customer name, contact info (email, phone, billing address) always visible. Quick-action buttons: *New Transaction*, *Receive Payment*, *Create Statement*.
2. **"Money Bar"** — A row of coloured tiles across the top of the transaction area:
   - Estimates (pending)
   - Unbilled Activity
   - Overdue (invoices past due)
   - Open Invoices (total outstanding)
   - Paid Last 30 Days
   - **Each tile is clickable and filters the transaction list below it.**
3. **Tabbed browser:**
   - *Transaction List* — All documents in date order
   - *Statements* — Generate/view account statements
   - *Customer Details* — Edit profile, terms, tax, billing address

**Key design decisions:**
- The Money Bar doubles as both a summary and a filter — clicking "Overdue" instantly shows only overdue invoices. Summary tiles should be interactive, not decorative.
- "Create Statement" available directly from the customer page.
- QuickBooks shows *when a customer has viewed an invoice* (read receipt).

---

## 3. FreshBooks — Client Page

FreshBooks is praised for its clean, action-oriented design aimed at freelancers and service businesses.

**Information hierarchy:**
1. **Client card (sticky left column)** — Name, company, contact details, billing address, currency, payment terms — always visible while scrolling.
2. **Summary KPIs** — Outstanding invoices count + total, overdue amount, lifetime revenue from client.
3. **Recent Activity panel** — Latest invoices and expenses with status badges.
4. **Tabs:** Invoices, Estimates, Expenses, Projects, Files.
5. **Client Portal link** — Quick-access link to client's self-service view.

**Key design decisions:**
- Lifetime revenue is prominently displayed — reinforces client value.
- Every section has a contextual action button ("New Invoice", "New Estimate") right there.
- Invoice preview is real-time WYSIWYG — client sees exactly what the PDF looks like.
- Clicking an invoice opens a **slide-over panel** — user never leaves the client page.

---

## 4. Zoho Invoice / Zoho Books — Customer Page

Zoho has a more feature-rich approach befitting its SME target market.

**Information hierarchy:**
1. **Profile header** — Customer name, company, currency, credit limit, payment terms, balance due, unused credits. A health indicator shows standing at a glance.
2. **Summary strip** — Outstanding balance, overdue balance, unused credits, total invoiced, total received — all in coloured metric tiles.
3. **Tabs:** Overview (mini-dashboard), Transactions, Comments, History.
4. **Ageing report** — Available directly from the customer page: 0–30, 31–60, 61–90, 90+ days overdue.
5. **Statement of account** — Generated from the customer page with date range picker.

**Key design decisions:**
- Zoho's Overview tab is a mini-dashboard that saves loading a separate page.
- Ageing data is linked to the customer page, not buried in reports.
- Credit limit and unused credits are prominent — important for B2B billing.

---

## 5. Stripe — Customer Page

Stripe is the emerging gold standard for modern fintech interfaces. It uses a split-column layout rather than tabs.

**Layout:**
- **Left column** — Chronological event timeline: all payments, failed charges, refunds, subscription changes in date order.
- **Right column** — Static metadata: name, email, billing address, risk level, associated subscriptions.
- **Header** — Client name, email, Stripe ID. Actions: *Create Invoice*, *Create Payment*, *Actions dropdown*.

**Key design decisions:**
- **Slide-over panels for everything** — Clicking any invoice, payment, or subscription opens an overlay. Users never navigate away from the customer page.
- The split column separates dynamic data (transactions) from static data (contact/config), making each independently scannable.
- The event timeline is the iconic Stripe pattern — every interaction and state change is logged chronologically.

**Lesson:** The slide-over drawer is the gold standard for document interaction. The right column keeps metadata accessible without it competing with the activity feed.

---

## 6. Wave — Customer Page

Wave takes a deliberately minimal approach for micro-businesses.

**Layout:** Single scrollable page — no tabs.
1. **Header** — Name, email, phone, billing address.
2. **Balance due** — Prominently shown in large text.
3. **Transaction list** — Flat, date-sorted list of invoices and payments with status badges.

**Lesson:** Simplicity is a valid design choice, but it has a ceiling. Wave users with moderate transaction volumes quickly hit its limitations. The lack of filtering, ageing, and preview is a known pain point.

---

## 7. Harvest — Client Page

Harvest is a time tracking + invoicing tool widely used by agencies.

**Information hierarchy:**
1. **Client header** — Name, website, currency, time zone, payment terms.
2. **Revenue summary strip** — Total invoiced, total paid, total outstanding. Three numbers, always visible.
3. **Active projects** — List of current projects with hours tracked, budget, and billability.
4. **Invoices tab** — All invoices with status, date, amount, payment date.
5. **Contacts sub-section** — Multiple contacts per client (important for agencies).

**Lesson:** Revenue and project data shown together make the commercial relationship immediately clear. Multi-contact support per client is worth considering for agency/B2B contexts.

---

## 8. Invoice Ninja

Invoice Ninja is an open-source invoicing platform with a clean, task-focused design.

**Layout:** Tab-based navigation.
1. **Overview panel** — Quick health summary: outstanding balance, total paid, next invoice due.
2. **Tabs:** Invoices, Quotes, Payments, Documents.

**Key design decisions:**
- Designed to minimise time from "View Client" to "Send/Edit Invoice."
- Quick actions are always one click.
- No analytics depth — focused purely on document operations.

**Lesson:** Task-oriented simplicity. Every action should be achievable in one click.

---

## 9. HubSpot — Contact Detail Page (CRM Reference)

HubSpot is a CRM, not invoicing software, but its contact page architecture is the reference implementation for client relationship management at scale.

**Layout: Three-panel design**
- **Left panel** — Static identity: name, email, phone, company, owner, tags, custom fields.
- **Centre panel** — Activity feed: chronological timeline of all touchpoints (emails, calls, notes, tasks, deals).
- **Right panel** — Associations and contextual widgets: linked companies, deals, open tickets, attachments, payments.

**Key design decisions:**
- Collapsible panels that **remember layout preferences** between sessions.
- Auto-save on field change — no explicit save button.
- "Hide empty fields" toggle — reduces visual noise.
- Keyboard shortcuts for moving between contacts.
- All associations grouped in one panel rather than spread across tabs.

**Lesson:** Modular card-based layouts give power users flexibility. The three-panel approach clearly separates identity (left), activity (centre), and context (right) — a useful mental model even if not directly applicable to a billing-first product.

---

## Patterns and Trends Across the Industry

### Layout Patterns

| Pattern | Best For | Examples |
|---|---|---|
| **Tab-based** | High document volume; clear separation of types | Xero, QBO, Zoho, Invoice Ninja |
| **Split-column** | Modern fintech; separating activity from metadata | Stripe |
| **Dashboard-style top + tabs** | B2B SaaS with analytics needs | Zoho, FreshBooks |
| **Three-panel CRM** | Full relationship management | HubSpot, Salesforce |
| **Single scroll** | Very low transaction volumes | Wave |

Industry consensus: **Hybrid layout** — dashboard-style top third for KPIs, followed by tabbed interface for document browsing.

### Key Metrics Every Platform Displays

| Metric | Priority | Notes |
|---|---|---|
| Outstanding Balance | 🏆 Critical | "What do they owe?" |
| Overdue Amount | 🏆 Critical | "What's late?" |
| Total Invoiced (Lifetime) | ⭐ High | Account profitability |
| Total Paid | ⭐ High | Payment history at a glance |
| Last Payment Date + Amount | ⭐ High | Recency of activity |
| Ageing Breakdown (30/60/90) | ⭐ High | Risk assessment |
| Health Score / Rating | ⭐ High | At-a-glance client risk |
| Avg. Days to Pay | 📊 Medium | Payment behaviour |
| Quote Conversion Rate | 📊 Medium | Sales effectiveness |
| Collection Efficiency | 📊 Medium | Recovery rate |

### Quick Action Patterns

1. **Persistent action buttons** — Primary actions (New Invoice) stay visible while scrolling.
2. **Slide-over/drawer panels** — Creating or viewing documents in overlays so user never loses client context.
3. **Interactive KPI tiles** — Clicking a summary card filters the list below (QBO Money Bar pattern).
4. **Inline row actions** — Download, email, edit directly in table rows.
5. **Floating batch action bar** — Bottom bar appears when items are selected (our current approach is correct).

### Full Competitor Feature Matrix

| Feature | Xero | QBO | FreshBooks | Zoho | Stripe | Wave | Harvest | **PMG Hub (current)** |
|---|---|---|---|---|---|---|---|---|
| Financial summary at top | ✓ | ✓ | ✓ | ✓ | ✓ | Partial | ✓ | ✗ (below fold) |
| Contact info always visible | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ (hidden) |
| Clickable KPI filters | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Tabbed document browser | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| Slide-over/drawer preview | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ (Dialog) |
| Activity/history feed | ✓ | Partial | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ (collapsed) |
| Ageing breakdown | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Client health score | ✗ | ✗ | ✗ | Partial | ✗ | ✗ | ✗ | ✓ |
| Inline statement generation | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ (3 steps) |
| Bulk PDF generation | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Bulk email dispatch | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Batch operations | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |

---

## UX Principles from Billing/Invoicing Research

1. **Dashboard-first** — A summary dashboard at the top (Jakob's Law) ensures users grasp financial standing without scrolling. The summary should answer: *What does this client owe me? Am I at risk?*

2. **Interactive summaries** — KPI tiles should filter the data below when clicked, not just display static numbers.

3. **Familiarity with PDF previews** — In-page document previews reduce context switching. Slide-over drawers preserve list context better than full-screen modals.

4. **Contact info is always needed** — Every competitor displays email and phone without requiring an edit form interaction. This is table stakes.

5. **Automation reduces manual burden** — Repetitive actions (bulk email, sequential PDF export) should be one click. Users should never manually export-and-email documents one at a time.

6. **Progressive disclosure** — Show critical information by default; hide detailed analytics behind tabs or accordions. This reduces initial overwhelm without removing power features.

7. **Action-oriented design** — "What can I do from here?" should be instantly answerable. Primary actions should be above the fold.

8. **Accessibility** — Color-coded indicators (status, health, ageing) must include text labels, not just color. WCAG AA contrast ratios apply to all metric cards.
