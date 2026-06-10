# Client Detail Page — Deep Research Report

> **Date:** June 10, 2026
> **Purpose:** Research how leading invoicing and accounting applications design their client/customer detail pages, analyze patterns, and provide actionable recommendations for improving the PMG Hub client detail page.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Competitor Analysis](#2-competitor-analysis)
   - [FreshBooks](#21-freshbooks)
   - [QuickBooks Online](#22-quickbooks-online)
   - [Xero](#23-xero)
   - [Stripe](#24-stripe)
   - [Wave Accounting](#25-wave-accounting)
   - [Zoho Invoice](#26-zoho-invoice)
   - [HubSpot (CRM Approach)](#27-hubspot-crm-approach)
   - [Invoice Ninja](#28-invoice-ninja)
3. [Industry Design Patterns](#3-industry-design-patterns)
   - [Layout Patterns](#31-layout-patterns)
   - [Information Architecture](#32-information-architecture)
   - [Key Metrics Displayed](#33-key-metrics-displayed)
   - [Quick Action Patterns](#34-quick-action-patterns)
   - [Navigation Patterns](#35-navigation-patterns)
4. [Information Hierarchy Best Practices](#4-information-hierarchy-best-practices)
5. [Current PMG Admin Implementation Analysis](#5-current-pmg-admin-implementation-analysis)
6. [Recommendations for PMG Hub](#6-recommendations-for-pmg-hub)
   - [Proposed Layout](#61-proposed-layout)
   - [Recommended Changes](#62-recommended-changes)
   - [Priority Order](#63-priority-order)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Executive Summary

Client detail pages in invoicing and accounting software serve a dual purpose: they must give finance teams an **immediate snapshot of financial health** while also providing **deep transactional auditing capabilities**. The industry has converged on several proven design patterns that balance density with clarity.

**Key Findings:**
- **Tab-based navigation** with a dashboard-like KPI strip at top is the dominant pattern among established players (Xero, QuickBooks, Zoho).
- **Stripe's split-column layout** (transaction timeline left, metadata sidebar right) is the emerging gold standard for modern fintech apps.
- **Slide-over panels/modals** for document viewing (instead of page navigation) is the critical UX pattern — users should never leave the client context.
- **Real-time financial metrics** (outstanding balance, overdue amount, ageing) pinned to the top of the page is table stakes.

---

## 2. Competitor Analysis

### 2.1 FreshBooks

| Aspect | Detail |
|--------|--------|
| **Layout** | Clean sidebar + main content area. Client list on left, detail on right. |
| **Header** | Client name, main contact person, "Edit" button. Quick actions: "New Invoice," "New Estimate," "New Expense." |
| **Metrics** | Outstanding Balance, Overdue Amount, Year-to-Date revenue — all at top. |
| **Tabs** | Overview (dashboard summary), Invoices, Estimates, Projects (time tracking), Payments, Expenses. |
| **Key Pattern** | "Recent Activity" feed combined with financial summaries. Highlights outstanding hours/unbilled work for project-based invoicing. |
| **Document View** | Clicking an invoice opens a slide-over panel — user never leaves the client page. |

**Unique:** Heavy focus on project-based billing; shows unbilled hours prominently.

---

### 2.2 QuickBooks Online

| Aspect | Detail |
|--------|--------|
| **Layout** | Multi-column dashboard approach. Data-heavy. |
| **Header** | Client name, contact status, high-level action buttons ("New Transaction," "Receive Payment"). |
| **Metrics** | "Money Bar" style cards: Open Invoices, Overdue, Paid (Last 30 Days). |
| **Tabs** | Transaction List (core), Customer Details (profile/billing addresses), Notes/Attachments. |
| **Document View** | Slide-over panels for creating new transactions without leaving the page. |
| **Key Pattern** | The "Money Bar" (colored cards) doubles as a filter for the transaction list below. |

**Unique:** Filter-driven transaction list — clicking a Money Bar card filters the table.
**Lesson:** Summary cards should interact with the data below, not just display static numbers.

---

### 2.3 Xero

| Aspect | Detail |
|--------|--------|
| **Layout** | Functional and minimalist. Treats "customer" and "supplier" roles equally well. |
| **Header** | Contact name + "Options" button (Edit, Archive, Delete). |
| **Metrics** | Outstanding (receivables) and Overdue balances at top. |
| **Tabs** | Details (contact info), Activity (transactions), Notes, History. |
| **Document View** | Inline — opens within the page context. |
| **Key Pattern** | The "Activity" tab shows invoices, quotes, and payments in chronological timeline with status badges. |

**Unique:** Unified contact profile for both customer and supplier roles.
**Lesson:** A single chronological activity feed reduces context switching.

---

### 2.4 Stripe

| Aspect | Detail |
|--------|--------|
| **Layout** | Modern two-column UI. Developer and payment-heavy focus. |
| **Header** | Client name, email, ID string. Actions: "Create Invoice," "Create Payment," "Actions" dropdown. |
| **Metrics** | Total Revenue, Subscriptions, Balance in top-right area. |
| **Navigation** | No tabs — uses a single view with left/right split. |
| **Document View** | Slide-over panels for EVERYTHING. Clicking an invoice or payment opens an overlay. |
| **Key Pattern** | Left column: chronological timeline/event log (payments, failures, subscription updates). Right column: metadata (status, email, billing address, risk level). |

**Unique:** The "Logs/Timeline" view is the iconic Stripe pattern. Right column reserved for utility actions so user doesn't lose their place.
**Lesson:** The split-column layout (transactions left, metadata right) is the most efficient for scanning. Slide-over panels are the gold standard.

---

### 2.5 Wave Accounting

| Aspect | Detail |
|--------|--------|
| **Layout** | Very clean, sparse. Aimed at micro-businesses. |
| **Header** | Client contact info + simple "Edit" action. |
| **Tabs** | Invoices, Estimates, Payments. |
| **Focus** | Customer Profile data (billing/shipping addresses) emphasized for light, simplified invoicing. |

**Lesson:** Simpler is better for smaller businesses. Don't overwhelm with data they don't need.

---

### 2.6 Zoho Invoice

| Aspect | Detail |
|--------|--------|
| **Layout** | Tabular and structured. CRM-lite interface. |
| **Header** | Large client name + "Statements" and "Transactions" action buttons. |
| **Metrics** | Receivables summary at top: Current, 30, 60, 90 days overdue. |
| **Tabs** | Overview, Transactions, Mails, Comments, History. |
| **Unique Feature** | Client Portal interactions — you can see if a client viewed an invoice, commented, or made a partial payment. |

**Lesson:** The ageing receivables summary (30/60/90 day buckets) is essential and should be prominent.

---

### 2.7 HubSpot (CRM Approach)

| Aspect | Detail |
|--------|--------|
| **Layout** | Classic three-column "Command Center." |
| **Left Sidebar** | Static core details (Name, Title, Phone, Email, Company). Drag-and-drop customizable. |
| **Middle Column** | Activity Feed — chronological timeline of all touchpoints. |
| **Right Sidebar** | Contextual widgets/cards: associated Deals, Tickets, Attachments. |
| **Pattern** | Highly modular and customizable. Strong progressive disclosure. |

**Lesson:** Modular/card-based layouts give flexibility. Activity feed should be a chronological record of ALL interactions, not just financial.

---

### 2.8 Invoice Ninja

| Aspect | Detail |
|--------|--------|
| **Layout** | Clean tab-based navigation. |
| **Overview Panel** | Quick health score summary: Outstanding balance, Total paid, next invoice due. |
| **Tabs** | Invoices, Quotes, Payments, Documents. |
| **Pattern** | Designed to reduce time from "View Client" to "Send/Edit Invoice." |

**Lesson:** Quick actions should be obvious and one-click. Never bury "New Invoice" behind a menu.

---

## 3. Industry Design Patterns

### 3.1 Layout Patterns

| Pattern | Description | Best For | Examples |
|---------|-------------|----------|----------|
| **Tab-based** | Horizontal tabs switch between content sections | High-density content (invoices, quotes, payments, statements) | QuickBooks, Zoho, Xero, Invoice Ninja |
| **Single-scroll** | All content on one page, sections separated by spacing | Smaller data volumes; holistic view needed | Wave, FreshBooks (lightweight) |
| **Split-column** | Two columns: main content + metadata sidebar | Modern fintech; separating dynamic from static data | Stripe |
| **Dashboard-style** | Widget-based with charts and KPIs | High-level overviews with decision-making focus | HubSpot, Salesforce |
| **Three-column CRM** | Left metadata, center activity feed, right widgets | Full CRM integration | HubSpot, Salesforce |

**Industry Consensus:** Hybrid layouts dominate enterprise SaaS — dashboard-style top third for KPIs/metrics, followed by tabbed interface for deep-dive details.

### 3.2 Information Architecture

```
┌─────────────────────────────────────────────────┐
│  HEADER: Client Name | Status | Quick Actions   │
├─────────────────────────────────────────────────┤
│  KPI STRIP: Outstanding | Overdue | Total Billed│
│             Last Payment | Health Score          │
├─────────────────────────────────────────────────┤
│  TAB NAVIGATION: Invoices | Quotes | Payments   │
│                  Statement | Activity            │
├─────────────────────────────────────────────────┤
│  TAB CONTENT:                                   │
│  ┌──────────────────────────────────────────┐   │
│  │  List/Table of items + preview panel     │   │
│  │  (slide-over or split-pane)              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 3.3 Key Metrics Displayed

Every leading app displays these metrics prominently:

| Metric | Priority | Where | Why |
|--------|----------|-------|-----|
| **Outstanding Balance** | 🏆 Critical | Top KPI strip | Answers "what do they owe?" |
| **Overdue Amount** | 🏆 Critical | Top KPI strip | Answers "what's late?" |
| **Total Invoiced (Lifetime)** | ⭐ High | Top KPI strip | Account profitability |
| **Total Paid** | ⭐ High | Top KPI strip | Payment history at a glance |
| **Last Payment Date + Amount** | ⭐ High | KPI strip or health card | Recency of payment activity |
| **Ageing Breakdown (30/60/90)** | ⭐ High | Secondary card | Risk assessment |
| **Health Score / Rating** | ⭐ High | Health card | At-a-glance client risk |
| **Quote Conversion Rate** | 📊 Medium | Secondary card | Sales effectiveness |
| **Avg. Days to Pay** | 📊 Medium | Health card | Payment behavior |
| **Collection Efficiency** | 📊 Medium | Health card | Recovery rate |

### 3.4 Quick Action Patterns

1. **Persistent Action Bar** — Primary actions stay visible even when scrolling (QuickBooks, Xero)
2. **Slide-over Panels** — Creating/editing documents in overlays so user never leaves client context (Stripe, FreshBooks)
3. **Inline Row Actions** — Download, edit buttons directly in table rows
4. **Floating Action Bar** — Bottom bar appears when items are selected for batch operations (our current approach is good)
5. **Contextual "..." Menus** — Secondary actions hidden behind meatball menus

Common quick actions across all apps:
- **New Invoice** (always top, always prominent)
- **New Quote/Estimate**
- **Record Payment**
- **Email Statement**
- **Send Reminder**
- **View Statement**

### 3.5 Navigation Patterns

| Pattern | Description | Examples |
|---------|-------------|----------|
| **Horizontal Tabs** | Tab bar below header | QuickBooks, Xero, Zoho |
| **Vertical Tabs/Sidebar** | Left sidebar navigation | HubSpot, Salesforce |
| **Segment Control** | Pills/pills at top | Stripe (minimal) |
| **Icon Tabs** | Icon-only on mobile | FreshBooks (responsive) |

**Best Practice:** Horizontal tabs with clear labels and active indicators (underline or pill) — used by most apps because they're instantly scannable.

---

## 4. Information Hierarchy Best Practices

The industry has converged on this hierarchy:

### Level 1: The Header (Global Context)
- Client name (largest text on page)
- Active/Disabled badge
- Breadcrumb → Back to Clients
- Quick action buttons (New Invoice, New Quote, Record Payment)
- Edit/Details toggle

### Level 2: The Financial Pulse (KPI Strip)
- The user should know in **one glance** whether this client is financially healthy
- Must include: Outstanding, Overdue, Last Payment
- Should include: Total Invoiced, Total Paid, Health Score
- Use color coding: red for overdue, green for paid, amber for outstanding

### Level 3: Contextual Navigation (Tabs)
- Switch between different document types
- Each tab maintains the same layout: list + preview
- Active tab should have a clear visual indicator (underline, background color)

### Level 4: The Transaction Layer (Content)
- Document list/table with sortable columns
- Preview panel (slide-over drawer) for viewing document details
- Batch operations (select, bulk download, bulk email)
- Inline actions (print, email, edit)

---

## 5. Current PMG Admin Implementation Analysis

### What We Have Now

Our current client detail page at `apps/admin/src/app/(admin)/relationships/clients/[id]/` is **well-architected** with strong patterns:

**Strengths:**
- ✅ **Split-pane preview** via Dialog — modal preview of invoices/quotes/payments
- ✅ **Tab-based navigation** (Invoices, Quotes, Payments, Statement)
- ✅ **Financial KPI dashboard** with 5 summary cards
- ✅ **Ageing analysis** with visual bar and breakdown
- ✅ **Health score system** (Excellent/Good/At Risk/Critical)
- ✅ **Activity feed** (collapsible, shows last 10 events)
- ✅ **Quick actions** (New Invoice, New Quote, Record Payment)
- ✅ **Batch operations** with floating action bar (Combined PDF, Bulk Email, Issue, Void)
- ✅ **Collapsible edit form** for client details
- ✅ **Statement period filters** (current month, previous month, past 3/6 months, fiscal year)
- ✅ **Off-screen PDF rendering** for bulk document generation

**Weaknesses / Opportunities for Improvement:**

| Issue | Impact | Suggested Fix |
|-------|--------|---------------|
| ❌ **No contact info at top** — phone, email, address not visible without opening edit form | Users must dig for basic contact info | Add a contact info card/section visible at all times |
| ❌ **Preview is a full Dialog** — not a slide-over/drawer | Loses page context; feels heavy | Convert to a slide-over panel (right-side drawer) |
| ❌ **KPI cards are static** — don't filter the lists below | Missed opportunity for interactive filtering | Make cards clickable to filter the active tab's list |
| ❌ **Activity feed is collapsed by default** | Critical insight is hidden | Show last 3-5 events by default, expand for more |
| ❌ **No timeline view** — activity is a text list | Hard to see the flow of events at a glance | Add a visual timeline component |
| ❌ **No inline editing** — edit form requires expanding a section | Extra clicks to update simple fields | Add inline editing for email, phone, status toggle |
| ❌ **No Last Payment Date in KPI strip** | Missing key metric | Add to health card or KPI strip |
| ❌ **Statement tab doesn't integrate with preview naturally** | Separate UX from other tabs | Make statement preview consistent with other tabs |
| ❌ **Mobile responsive could be better** — tables don't stack as cards | Poor mobile UX | Add responsive card view for tables |

---

## 6. Recommendations for PMG Hub

### 6.1 Proposed Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🏠 Back to Clients                                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Client Name        [Active]    [Edit Details  ▼]    │    │
│  │  📧 email@client.com  📞 +27 82 123 4567             │    │
│  │                                                       │    │
│  │  [📄 New Invoice] [📋 New Quote] [💰 Record Payment]  │    │
│  └──────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐          │
│  │Total │ │ Paid │ │ O/S  │ │Over- │ │Health    │          │
│  │Invd  │ │      │ │      │ │due   │ │Score     │          │
│  │R150k │ │R90k  │ │R60k  │ │R12k  │ │⚡Good    │          │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘          │
├──────────────────────────────────────────────────────────────┤
│  [Invoices] [Quotes] [Payments] [Statement] [Activity]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Document List ────────────────────┐  ┌─ Preview Panel ┐ │
│  │  ☑ #INV-001   01 Jun  R15,000 Due │  │  (Slide-over   │ │
│  │  ☐ #INV-002   15 May  R22,500 Pd  │  │   or inline)   │ │
│  │  ☐ #INV-003   01 Apr  R10,000 O/S │  │               │ │
│  │  ☐ #INV-004   15 Mar  R30,000 O/D │  │               │ │
│  └────────────────────────────────────┘  └───────────────┘ │
│                                                              │
│  ┌─ Batch Action Bar (appears when items selected) ───────┐ │
│  │  3 Selected  [Combined PDF] [Bulk Email] [Issue] [Void]│ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Recommended Changes

#### Phase 1 — Quick Wins (Low Effort, High Impact)

1. **Show contact info in the header**
   - Display email, phone, and business name always visible below the client name
   - No need to expand edit form to see basic contact details

2. **Make activity feed expanded by default (show top 3-5 events)**
   - Users need this context immediately
   - Keep the "Show All" toggle for full feed

3. **Add "Last Payment" to the KPI strip or health card**
   - Replace or augment the "Largest Single Payment" metric with "Last Payment Date + Amount"

4. **Make KPI cards clickable to filter the active tab**
   - Clicking "Overdue" card should filter invoices to show only overdue ones
   - Clicking "Outstanding" should show issued/unpaid invoices

#### Phase 2 — UX Improvements (Medium Effort)

5. **Convert document preview from Dialog to Slide-over Drawer**
   - Use a right-side drawer (`Sheet` component from shadcn/ui) instead of a modal dialog
   - Preserves the list context — user can still see the table behind the drawer
   - Faster interaction feel

6. **Add a visual timeline to the Activity tab**
   - Replace the text list with a vertical timeline with visual indicators
   - Group events by date
   - Color-code by type (green for payments, amber for invoices, blue for quotes)

7. **Add ageing summary in the Statement tab preview**
   - Show the ageing breakdown (Current, 1-30, 31-60, 61+) directly in the statement preview

8. **Add "Days Overdue" column to the invoices table**
   - Show number of days overdue for overdue invoices
   - Color-code: yellow (1-30), orange (31-60), red (61+)

#### Phase 3 — Advanced (Higher Effort)

9. **Inline editing for client details**
   - Allow direct editing of email, phone, and name without expanding the edit form
   - Use `contentEditable` or inline form fields with auto-save

10. **Responsive card view for tables on mobile**
    - Convert table rows into stacked cards when screen is narrow
    - Each card shows: document number, amount, status, date

11. **Quick action dropdown in table rows**
    - Add "..." button at the end of each row with: Print, Email, Edit, View
    - Reduces clicks for common actions

12. **Statement tab inline ageing chart**
    - Move the ageing visualization into the statement tab itself (not just the dashboard)
    - Consistent layout: ageing chart above the transaction table

#### Simplification Strategy — Doing Less Better

A core goal of this redesign is to create a **simpler** page, not just a more feature-rich one. Here's how we keep it simple:

**What to keep minimal:**
- **Consolidate KPI cards from 5 to 3 primary cards** (Outstanding, Overdue, Last Payment) — move Total Invoiced and Total Paid into a secondary row or tooltip detail. Too many numbers compete for attention.
- **Merge the collapsible edit form with inline contact display** — instead of a large expandable form, show email/phone as static text below the name with an inline edit icon. The full edit form only opens when the user clicks "Edit All Details."
- **Reduce tab visual weight** — use an underline-only active state (already done) and hide tab labels that have zero items (e.g., no Payments tab if no payments exist).

**What to hide behind progressive disclosure:**
- Full activity feed remains collapsible (show top 3 by default, not all 10)
- Detailed ageing breakdown lives in the Statement tab, not duplicated on the main page
- Color-coded indicators (red/green/amber) must always be accompanied by text labels (e.g., "Overdue" + red dot, not just red) for accessibility
- Batch operation buttons only appear when items are selected (already implemented)

**What to add with care:**
- Every new feature we propose should pass the "does this reduce clicks for a common task?" test
- If a feature serves an edge case (e.g., bulk email), it should be discoverable but not visually prominent
- The proposed slide-over drawer is actually a *simplification* — it keeps the user on one view instead of navigating between pages

### 6.3 Priority Order

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Show contact info in header | Very Low | High |
| P0 | Expand activity feed by default (show 3-5) | Very Low | Medium |
| P0 | Add Last Payment to KPI strip | Low | Medium |
| P1 | Clickable KPI card filters | Medium | High |
| P1 | Slide-over drawer for preview | Medium | High |
| P1 | Visual timeline for activity | Medium | High |
| P2 | Days Overdue column | Low | Medium |
| P2 | Ageing in statement preview | Low | Medium |
| P2 | Inline editing for contact fields | Medium | Medium |
| P3 | Responsive card view | High | Medium |
| P3 | Quick action dropdowns in rows | Medium | Low |

---

## 7. Implementation Roadmap

### Immediate (Next Sprint)

- [ ] Add client contact info (email, phone) to the header area in `client-billing-workspace.tsx`
- [ ] Show last 3-5 activity events by default instead of collapsed
- [ ] Add "Last Payment Date" and "Last Payment Amount" to the health card

### Short-term (Next 2 Sprints)

- [ ] Make KPI cards interactive — clicking filters the active tab's list
- [ ] Convert `Dialog` to `Sheet` (shadcn drawer) for document preview
- [ ] Replace activity text list with a visual timeline component
- [ ] Add "Days Overdue" column with color coding

### Medium-term (Next Month)

- [ ] Add ageing visualization to the statement tab
- [ ] Implement inline editing for email/phone fields
- [ ] Add responsive card views for all tables

---

## Appendix: Quick Reference — Competitor Snapshot

| Feature | FreshBooks | QuickBooks | Xero | Stripe | Wave | Zoho | Ours |
|---------|------------|------------|------|--------|------|------|------|
| Tab-based nav | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| KPI cards at top | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Slide-over preview | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ (Dialog) |
| Activity timeline | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ (collapsed) |
| Ageing breakdown | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Health score | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quick actions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Batch operations | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Contact info visible | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (hidden) |
| Inline editing | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Statement filter | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Responsive card view | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

### Accessibility Considerations

Several recommendations rely on color for meaning. To ensure the page is accessible:
- All color-coded badges (status, health score) must also include text labels
- Ageing bar segments should have tooltips showing the amount and percentage
- Status icons should have `aria-label` attributes
- Contrast ratios for metric cards should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

*Research conducted June 2026 by analyzing the following apps: FreshBooks, QuickBooks Online, Xero, Stripe Dashboard, Wave Accounting, Zoho Invoice, HubSpot CRM, Invoice Ninja, Fiverr Workspace/AND CO, Sage Business Cloud, and Salesforce Lightning Experience. Industry best practices sourced from UX research publications (Nielsen Norman Group, UX Design.cc, Baymard Institute).*
