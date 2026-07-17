# 🎯 Deep Mobile UX Audit: PMG Hub

**Audit Date:** July 17, 2026  
**Apps Reviewed:** Admin App (`apps/admin`) · Client Portal (`apps/portal`)  
**Stack:** Next.js · Tailwind CSS · shadcn/ui · Drizzle ORM · Dark Mode-first UI

---

## Table of Contents

1. [Overall UX Scores](#1-overall-ux-scores)
2. [Page-by-Page Audit — Admin App](#2-page-by-page-audit--admin-app)
3. [Page-by-Page Audit — Client Portal](#3-page-by-page-audit--client-portal)
4. [Component Audit](#4-component-audit)
5. [Mobile Dashboard Redesign](#5-mobile-dashboard-redesign)
6. [Navigation Audit](#6-navigation-audit)
7. [Information Hierarchy](#7-information-hierarchy)
8. [Desktop vs Mobile Strategy](#8-desktop-vs-mobile-strategy)
9. [Quick Wins](#9-quick-wins)
10. [Long-Term Improvements](#10-long-term-improvements)

---

## 1. Overall UX Scores

### Admin App

| Category | Score | Notes |
|---|---|---|
| **Mobile Usability** | **5/10** | Desktop sidebar becomes a drawer via shadcn's `SidebarProvider`, but most pages render tables with 6+ columns that require horizontal scrolling on small screens. Content density is overwhelming. |
| **Navigation** | **6/10** | The mobile sidebar drawer works but requires 2 taps minimum to reach any page. Deeply nested collapsible groups (e.g., Billing > Invoices > New) are buried. No bottom nav or quick actions. |
| **Information Hierarchy** | **4/10** | The dashboard loads **3 chart widgets, 4 KPI cards, an aging grid, division revenue, leads summary, project schedule, and expense breakdown** — all on one page. On mobile, this is an endless vertical scroll of dense financials. |
| **Accessibility** | **6/10** | Good contrast ratios and semantic HTML. Touch targets on some links are too small (< 44px). No focus management on mobile sidebar. |
| **Performance Perception** | **7/10** | Server components load fast, but heavy chart components (Recharts) and data tables can feel sluggish on mobile. |
| **Ease of Use** | **5/10** | Staff checking quick statuses are forced to parse full datasets. Most views assume desktop-level screen real estate. |
| **Overall Experience** | **5.5/10** | Functionally complete but not optimized for mobile workflows. The "squish desktop into mobile" approach shows throughout. |

### Client Portal

| Category | Score | Notes |
|---|---|---|
| **Mobile Usability** | **7/10** | Card-based layouts translate better to mobile. The dashboard uses summary cards and progress bars effectively. Tables on invoices/quotes pages require horizontal scrolling. |
| **Navigation** | **6.5/10** | Hamburger menu with a full-height drawer. No bottom navigation bar for one-handed use. Missing a quick "FAB" for core actions. |
| **Information Hierarchy** | **8/10** | The dashboard does a good job of prioritizing: outstanding balance, payment progress, recent invoices/quotes. Clients understand status quickly. |
| **Accessibility** | **7/10** | Good contrast. Would benefit from larger touch targets on invoice rows. |
| **Performance Perception** | **8/10** | Lightweight pages, fast loads. Tables with moderate row counts render quickly. |
| **Ease of Use** | **7/10** | Banking-app-like clarity on the dashboard. Invoice and quote pages still use `<table>` elements that require zooming on mobile. |
| **Overall Experience** | **7.3/10** | Solid foundation with the right data priorities. Needs mobile-specific layout patterns and better touch interactions. |

---

## 2. Page-by-Page Audit — Admin App

### Dashboard (`/dashboard`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Financial overview: YTD summaries, KPIs, aging report, budget chart, division revenue, leads, project schedule, expenses |
| **Mobile Pain Points** | • 4 KPI cards + aging grid + chart + division table + leads + project summary + expenses = **one massive scroll**<br>• Recharts `ResponsiveContainer` charts are tiny and unreadable on mobile<br>• Period tabs (Current/Previous/YTD) add complexity without mobile-optimized layout<br>• KPI sparkline SVGs at `w-16 sm:w-20` are too small to be useful<br>• "Close Month" wizard-dialog is heavy on mobile |
| **Desktop Strengths** | Rich financial overview with drill-down. 4-column KPI grid is ideal on desktop. |
| **Mobile Recommendations** | **Completely redesign the mobile dashboard.** See Section 5. Hide charts, aging grids, expense breakdowns behind "Analytics" tab. Show only: Today's Tasks, Urgent Alerts, Simple KPI strip (Revenue/Expenses/Profit in cards only). |
| **Info to Remove on Mobile** | • Budget area chart (hide behind `hidden md:block`)<br>• Aging report grid (move to Billing page)<br>• Expense breakdown by division<br>• Sparkline SVGs in KPI cards (hidden on small screens)<br>• Monthly financial series chart |
| **Info to Prioritize** | • **Project schedule summary** (who is on track, who is at risk)<br>• **Overdue alerts** (red-highlighted)<br>• **Pending approvals count**<br>• **Quick actions grid** (2×2 buttons)<br>• **Notifications/updates feed** |
| **Suggested Redesign** | "The Daily Briefing" — see Section 5 |

### Billing → Invoices (`/billing/invoices`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Full invoice management: list, filter, create, edit, issue, void |
| **Mobile Pain Points** | • Accordion layout by month works okay, but each accordion renders a full `<table>` with columns: document #, client, issue date, due date, amount, status<br>• **Header section is heavy**: page title + description + StatusFilter dropdown + "New Invoice" button + 3 metrics cards<br>• "New Invoice" form link opens a complex multi-field form — not mobile-friendly |
| **Desktop Strengths** | Accordion by month with inline summary badges is a strong desktop pattern. |
| **Mobile Recommendations** | • Convert invoice tables to **stacked cards**: show only document #, amount, status badge, and client name<br>• Move the 3 metrics cards (Total Invoiced/Collected/Outstanding) into a compact horizontal scroll<br>• Collapse the StatusFilter into a bottom sheet filter |
| **Info to Prioritize** | • Overdue invoices first (red highlight)<br>• Unpaid invoice count<br>• Quick "Create Invoice" button at bottom |

### Billing → Quotes (`/billing/quotes`)

Similar pattern to invoices. Tables with 6+ columns. Same recommendation: convert to card-based list on mobile.

### Relationships → Clients (`/relationships/clients`)

| Aspect | Assessment |
|---|---|
| **Mobile Pain Points** | Uses a `<ClientsPageClient>` component — likely wraps a table with income counts. Full desktop table on mobile. |
| **Mobile Recommendations** | • Show clients as cards: Name, Status (Active/Inactive badge), Quick Action button<br>• Hide income/count columns on mobile<br>• Add search/filter at top |

### Projects → List (`/projects/list`)

| Aspect | Assessment |
|---|---|
| **Mobile Pain Points** | Full table with progress bars, statuses, references. Too many columns. |
| **Mobile Recommendations** | • Card layout: Project name, status badge, progress bar, deadline date<br>• Swipeable horizontal scroll for adjacent screens<br>• "Add Project" FAB |

### Projects → Details (`/projects/[id]`)

| Aspect | Assessment |
|---|---|
| **Mobile Pain Points** | Tab-based layout with checklist, schedule, timeline. Tabs are wide pills — readable but dense. Forms for editing are complex. |
| **Mobile Recommendations** | • Show project status, client, division, deadline as a hero card<br>• Replace tabs with a bottom-anchored tab bar or collapsible sections<br>• Read-only on mobile for most fields; recommend desktop for editing |

### Settings (`/settings/*`)

| Aspect | Assessment |
|---|---|
| **Mobile Pain Points** | Side nav within settings (`settings-nav.tsx`), multi-section pages. Form-heavy. |
| **Mobile Recommendations** | • Settings are inherently administrative — hide complex sections on mobile<br>• Only show user profile, security quick actions<br>• Full settings management → desktop only |

### Insights → Snapshots (`/insights/snapshots`)

| Aspect | Assessment |
|---|---|
| **Mobile Pain Points** | Heavy data cockpit with charts and financial tables. |
| **Mobile Recommendations** | • Hide behind `hidden md:block` wrapper<br>• Show only "last closed month" card with key totals<br>• Full analysis on desktop |

---

## 3. Page-by-Page Audit — Client Portal

### Dashboard (`/dashboard`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Billing overview: outstanding balance, payment progress, recent invoices/quotes |
| **Mobile Handling** | ✅ Already good! Cards stack vertically, progress bar is readable, stats grid goes single-column on mobile.<br>❌ 4 stat cards at the top still show on mobile with full detail — could be more compact.<br>❌ Invoice/Quote lists use `<div>` which works well, but tap targets are on the Link text only, not the full row. |
| **Mobile Recommendations** | • **Hero section**: Big outstanding balance with "Pay Now" button<br>• **Progress ring** for main project (visual)<br>• **Collapse** the "Recent Quotes" section — show only if pending quotes exist<br>• **Widen touch targets** to entire card/row |
| **Suggested Redesign** | "The Command Center" — see Section 5 |

### Invoices (`/invoices`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Full invoice list with pill-tab filters (All/Unpaid/Paid/Overdue), `<table>` display |
| **Mobile Pain Points** | • **Uses `<table>` with `overflow-x-auto`** — forces horizontal scroll on mobile<br>• Columns: Invoice #, Issue Date, Due Date, Amount, Status — 5 columns on a 375px screen is too many<br>• Premium pill tabs are good but take up vertical space |
| **Desktop Strengths** | Table works well on desktop with full column visibility. |
| **Mobile Recommendations** | • Replace `<table>` with **cards**: show only Invoice #, Amount, Status badge<br>• Show Issue Date as secondary text, hide Due Date unless overdue<br>• Each card is a link to detail page<br>• Move filters to a sticky bottom sheet |

### Quotes (`/quotes`)

Identical pattern to invoices. Same recommendations: cards instead of tables, larger touch targets, consolidated status badges.

### Statements (`/statements`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Full statement of account with aging summary, transaction ledger, period selector |
| **Mobile Pain Points** | • The entire statement is rendered as a printable card — very dense on mobile<br>• Aging summary grid (5 columns) on mobile wraps to 2×3 layout, but could be simpler<br>• Ledger table has 5 columns with horizontal scroll<br>• Header/logo/payment-info blocks take up a lot of vertical space before the actual data |
| **Mobile Recommendations** | • Show only a **summary card** on mobile: total outstanding, quick aging breakdown as bars or numbers<br>• Full statement → "Download PDF" button on mobile<br>• Hide the printable statement layout behind a "View Statement" toggle<br>• Period selector pills work well — keep those |

### Projects (`/projects`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Client-specific project list with progress tracking |
| **Mobile Handling** | ✅ Uses a `ProjectsListClient` component — likely renders cards or list items. Progress data passed separately. |
| **Mobile Recommendations** | • Show project cards with: Name, Status, Progress bar (visual), Deadline<br>• Color-code status (Green=On Track, Amber=At Risk, Red=Overdue)<br>• Keep it simple — clients primarily check "is my project on time?" |

### Profile (`/profile`)

| Aspect | Assessment |
|---|---|
| **Current Purpose** | Client profile with editable name/phone, account manager details |
| **Mobile Handling** | ✅ Already good! Clean card layout, two-column grid collapses to single on mobile. Contact info is well formatted.<br>❌ "Account Manager" sidebar card on desktop is pushed below on mobile — acceptable but could be collapsed into a button. |
| **Mobile Recommendations** | • Minimal changes needed — this page works well on mobile<br>• Consider collapsing Account Manager into an expandable section to reduce vertical scroll |

### Credit Notes (`/credits`)

Not audited in detail (not read), but should follow same card-based pattern as invoices/quotes.

---

## 4. Component Audit

### Cards (`Card` component)

| Status | Recommendation |
|---|---|
| **Current** | Used throughout both apps. `Card`, `CardHeader`, `CardContent`, `CardTitle`. Clean design. |
| **Mobile** | Stacks vertically on small screens. Working well.<br>❌ Some cards use `size="sm"` prop with padding `p-5` — could be tighter on mobile. |
| **Recommendation** | Add a `mobile` prop or use responsive padding. `p-3 md:p-5` for tighter mobile spacing. |

### Tables (`Table` component and raw `<table>` elements)

| Status | Recommendation |
|---|---|
| **Current** | Both apps use native `<table>` elements with `overflow-x-auto`. `Table` component in packages/ui. shadcn Table component in admin. |
| **Mobile** | ❌ **This is the biggest mobile UX problem.** Tables with 5+ columns force horizontal scrolling on mobile. The `overflow-x-auto` pattern is a band-aid, not a solution. |
| **Recommendation** | **Replace all tables on mobile with stacked cards.** Each row becomes a card showing 3-4 key fields. Secondary fields are hidden. "Tap to expand" for details. |

### Forms (`Field`, `Input`, `Select`, `Textarea`)

| Status | Recommendation |
|---|---|
| **Current** | Standard shadcn form components. Well built. |
| **Mobile** | Forms work but are designed for desktop — multi-column layouts and large forms.<br>❌ Date inputs use text fields with `YYYY-MM-DD` format — no native date picker on mobile. |
| **Recommendation** | • Force single-column on mobile<br>• Use `type="date"` for native date pickers<br>• Large touch targets (`min-h-11`)<br>• Break multi-step wizards into separate screens |

### Dialogs (`Dialog`, `AlertDialog`, `Sheet`)

| Status | Recommendation |
|---|---|
| **Current** | Uses shadcn Dialog (centered popup) and Sheet (slide-in panel). |
| **Mobile** | Dialogs work but centered modals are hard to interact with one-handed on large phones.<br>❌ "Close Month" wizard uses a Dialog — complex multi-step in a modal is painful on mobile. |
| **Recommendation** | • Replace modals with **bottom sheets** on mobile (use `Sheet` with `side="bottom"`) |

### Navigation — Admin Sidebar (`Sidebar`)

| Status | Recommendation |
|---|---|
| **Current** | Full shadcn sidebar with `SidebarProvider`. Desktop: persistent left sidebar. Mobile: transforms into a Sheet (drawer) via `useIsMobile()` hook. Collapsible groups for navigation sections. |
| **Mobile** | ✅ The automatic mobile drawer is functional.<br>❌ **Too deep.** User must: tap hamburger → open drawer → find section → tap item → navigate. For quick checks, this is 2+ taps too many.<br>❌ Drawer width is `18rem` (288px) — decent but could be full-width on mobile for better tap targets. |
| **Recommendation** | • **Add Bottom Navigation Bar** for the 4 most-used routes: Dashboard, Projects, Billing, Tasks<br>• Keep sidebar drawer for secondary routes<br>• Full-width drawer on mobile |

### Navigation — Client Portal Sidebar (`PortalShell`)

| Status | Recommendation |
|---|---|
| **Current** | Desktop: collapsible sidebar (64px/256px). Mobile: hamburger menu opens full-height drawer. 7 nav items. |
| **Mobile** | ✅ Drawer design is clean and usable.<br>❌ 7 nav items in a list requires scrolling on smaller phones.<br>❌ Bottom-positioned sign out button requires scrolling to reach. |
| **Recommendation** | • **Replace with Bottom Navigation Bar** with 4-5 items: Dashboard, Projects, Billing (combines Invoices/Quotes/Statements), Profile<br>• Move less-frequent items (Credit Notes, Settings) into a "More" sheet or keep in drawer |

### Tabs (Pill tabs and shadcn Tabs)

| Status | Recommendation |
|---|---|
| **Current** | Portal uses pill-style `<Link>` tabs (good). Admin uses shadcn `Tabs` component. |
| **Mobile** | ✅ Portal pill tabs are mobile-friendly with good touch targets.<br>❌ Admin `Tabs` with horizontal `TabsList` can overflow on small screens. |
| **Recommendation** | • Portal: keep pill tabs. Good pattern.<br>• Admin: wrap `TabsList` in `overflow-x-auto` or use scrollable tabs pattern |

### Badges (`Badge`)

| Status | Recommendation |
|---|---|
| **Current** | Used extensively for invoice/quote status, project status, lead status. Works well. |
| **Mobile** | ✅ Badges are appropriately sized with clear color coding. |
| **Recommendation** | No changes needed. |

### Charts (`Chart`, Recharts components)

| Status | Recommendation |
|---|---|
| **Current** | Admin uses Recharts (`ComposedChart`, `Bar`, `Line`, `ResponsiveContainer`) for budget charts, division area charts, expense breakdowns. |
| **Mobile** | ❌ **Impractical on mobile.** The budget chart at `h-64` with 3 series is impossible to read on a 375px screen. Sparkline SVGs at `w-16` (64px) are decorative at best. |
| **Recommendation** | • **Hide all complex charts on mobile** (`hidden md:block`)<br>• Show only basic metric cards with delta indicators<br>• Consider simplified mini-charts if charts are essential |

### Timelines (`Timeline`)

Not deeply audited. Likely used in project views. Should collapse to linear list on mobile.

### Progress Indicators (`Progress`)

| Status | Recommendation |
|---|---|
| **Current** | Used in leads summary and payment progress bar. Works well. |
| **Mobile** | ✅ Clean and readable. |
| **Recommendation** | No changes needed. Can be used more broadly on mobile dashboards. |

---

## 5. Mobile Dashboard Redesign

### Admin Mobile Dashboard: "The Daily Briefing"

**Target:** Optimized for productivity & triage — staff can understand their day in 5 seconds.

```
┌──────────────────────────────┐
│ 👋 Good morning, [Name]      │  ← Quick greeting
│ Tue, 17 July 2026            │
├──────────────────────────────┤
│ 🚨  2 Tenders Overdue        │  ← Alert ribbon (red)
│ ⚠️  1 Client at Risk         │     (high-priority only)
├──────────────────────────────┤
│ ┌────────┐ ┌────────┐        │
│ │ 📋 Log │ │ ✅     │        │  ← 2×2 Quick Action Grid
│ │ Update │ │Approve │        │
│ └────────┘ └────────┘        │
│ ┌────────┐ ┌────────┐        │
│ │ ➕ New │ │ 📊     │        │
│ │ Invoice│ │Reports │        │
│ └────────┘ └────────┘        │
├──────────────────────────────┤
│ Revenue    R 125,000  ▲ 12%  │  ← KPI Strip (compact)
│ Expenses   R  45,000  ▼ 3%   │     Only 3 key metrics
│ Profit     R  80,000  ▲ 8%   │     No charts, no sparklines
├──────────────────────────────┤
│ 📋 My Focus Today            │
│ ┌────────────────────────┐   │
│ │ Project A  ●●●●○ 80%  │   │  ← Swipeable carousel
│ │ Due: 22 Jul            │   │     of active projects
│ ├────────────────────────┤   │
│ │ Project B  ●●●○○ 60%  │   │
│ │ Due: 05 Aug            │   │
│ └────────────────────────┘   │
│  ← swipe for more →          │
├──────────────────────────────┤
│ 💰 Outstanding Invoices       │
│ R 25,000 across 3 invoices   │  ← Compact billing widget
│ [View Billing →]             │
├──────────────────────────────┤
│ [Bottom Nav: Home | Tasks |   │
│  Projects | Menu]             │
└──────────────────────────────┘
```

**Key Changes from Current:**
- 80% of current dashboard content is hidden on mobile
- No charts. No aging grids. No expense breakdowns.
- Everything visible is actionable within 1-2 taps
- "Analytics" tab reveals full desktop-style dashboard when needed

### Client Mobile Dashboard: "The Command Center"

**Target:** Optimized for clarity & confidence — clients understand status in 5 seconds.

```
┌──────────────────────────────┐
│ PMG Client Portal           │  ← Header with account name
│ [Active Account] badge       │
├──────────────────────────────┤
│ Outstanding Balance          │
│        R 45,230              │  ← Hero section
│       [Pay Now] [Statement]  │     Big, bold, actionable
├──────────────────────────────┤
│ Project Progress             │
│  ┌──────┐                    │
│  │   ●  │  Project Alpha     │  ← Visual progress ring
│  │ 75%  │  Phase 3/4         │     Banking-app style
│  └──────┘                    │
│  Due: 28 July 2026           │
├──────────────────────────────┤
│ ⚡ Action Required           │
│ ┌────────────────────────┐   │
│ │ 📄 Quote #Q-2024-0056 │   │  ← Only shown when pending
│ │ needs your approval   │   │     Otherwise hidden
│ │ [Review Now →]        │   │
│ └────────────────────────┘   │
├──────────────────────────────┤
│ Recent Activity              │
│ ┌────────────────────────┐   │
│ │ 📎 Document uploaded   │   │  ← Twitter-style feed
│ │ by TenderEdge - 2h ago │   │     Latest updates
│ ├────────────────────────┤   │
│ │ 📄 Phase 1 complete    │   │
│ │ by PMG Team - 1d ago   │   │
│ ├────────────────────────┤   │
│ │ 💰 Payment of R15,000 │   │
│ │ received - 3d ago      │   │
│ └────────────────────────┘   │
├──────────────────────────────┤
│ Payment Progress            │
│ ████████████░░░░ 75% Paid    │  ← Compact progress bar
│ Paid: R33,750 of R45,000    │
├──────────────────────────────┤
│ [Bottom Nav: Home | Projects │
│  | Billing | Profile]        │
└──────────────────────────────┘
```

**Key Changes from Current:**
- Quotes section only visible when there are pending quotes
- Project progress ring gives instant visual status
- Activity feed replaces static history lists
- "Recent Quotes" and "Recent Invoices" are moved to their respective tab pages
- Payment progress stays — clients need this transparency

---

## 6. Navigation Audit

### Admin App

| Current Pattern | Mobile Issue | Recommendation |
|---|---|---|
| Persistent sidebar → hamburger drawer | 2+ taps to reach any page | **Add Bottom Navigation Bar** with 4-5 tabs: Dashboard, Projects, Billing, Tasks, Menu |
| Collapsible side groups | Deep nesting requires tapping through groups | Flatten mobile nav: show only most-used items in bottom bar; secondary items in a "More" menu |
| Sidebar closes on navigation | Good behavior | Keep this |
| Breadcrumbs in TopNav | Breadcrumbs are truncated on small screens | Hide breadcrumbs on mobile; show only page title |
| Close Month wizard (Dialog) | Multi-step dialog hard on mobile | Convert to bottom sheet or entire page |

**Proposed Bottom Navigation Bar (Admin Mobile):**
```
[Dashboard] [Projects] [Billing] [Tasks] [Menu ▸]
```
- **Dashboard**: The Daily Briefing
- **Projects**: Project list with status overview
- **Billing**: Consolidated billing (invoices/quotes/payments)
- **Tasks**: Today's tasks and pending approvals
- **Menu**: Hamburger-style drawer with full sidebar navigation

### Client Portal

| Current Pattern | Mobile Issue | Recommendation |
|---|---|---|
| Hamburger menu → full drawer | 7 items in list, requires scrolling | **Add Bottom Navigation Bar** with: Home, Projects, Billing, Profile |
| Desktop collapsible sidebar | Works but not one-hand friendly | Replace mobile nav entirely |
| Drawer has sign-out at bottom | Requires scrolling | Move "More" to bottom nav overflow |

**Proposed Bottom Navigation Bar (Portal Mobile):**
```
[Home] [Projects] [Billing] [Profile]
```
- **Home**: Dashboard (The Command Center)
- **Projects**: Project list with progress
- **Billing**: Invoice/Quote/Statement hub (combines 3 current nav items)
- **Profile**: Account info, settings, download center

### Additional Navigation Patterns

| Pattern | Recommendation |
|---|---|
| **Floating Action Button (FAB)** | Add persistent FAB on both apps for core quick actions. Admin: "Quick Update" / Portal: "Contact Us" |
| **Sticky Action Bars** | Keep key actions (Pay Now, Approve, Download) visible at bottom of scroll |
| **Collapsible Sections** | Replace accordion-within-tables pattern with collapsible cards |
| **Progressive Disclosure** | Show summaries first, tap for details |

---

## 7. Information Hierarchy

### Admin App — Per Screen

| Screen | Must Always Be Visible | Secondary (1 tap) | Advanced (Desktop/Hidden) |
|---|---|---|---|
| **Dashboard** | Alerts, today's tasks, active project count, overdue count | Quick action grid, KPI strip, project carousel | Charts, aging report, expense breakdown, budget analysis |
| **Invoices** | Overdue invoice count, total outstanding, quick "New" button | Invoice list (cards), monthly summaries | Full table columns (All), aging detail |
| **Clients** | Active client count, search bar | Client cards (name, status, quick action) | Income history, full client table |
| **Projects** | At-risk/overdue count, active projects | Project cards (status, progress, deadline) | Timeline, budget, detailed editing |
| **Settings** | User profile, security quick actions | Full settings list | Bulk user management, data exports |

### Client Portal — Per Screen

| Screen | Must Always Be Visible | Secondary (1 tap) | Advanced (Desktop/Hidden) |
|---|---|---|---|
| **Dashboard** | Outstanding balance, project progress, urgent actions | Recent activity feed, payment progress | Full invoice list, quote history |
| **Invoices** | Unpaid/overdue count, total outstanding | Invoice cards (number, amount, status) | Due dates, full line items, PDF |
| **Quotes** | Pending approval count | Quote cards (number, amount, status) | Expiry dates, line items |
| **Statements** | Total outstanding, "Download PDF" | Ageing summary bars | Full transaction ledger |
| **Projects** | Current project phase, overall progress | Project details, timeline | Task list, document downloads |

---

## 8. Desktop vs Mobile Strategy

### The Golden Rule

> **Desktop is the workspace. Mobile is the remote control.**

| Dimension | Desktop | Mobile |
|---|---|---|
| **Primary Use** | Creating, editing, managing data | Viewing status, approving, quick updates |
| **Information Density** | High — show all columns, charts, data | Low — show only essential 3-4 data points |
| **Data Entry** | Full forms, multi-field input | Minimal input; prefer voice, dropdowns, toggles |
| **Navigation** | Full sidebar with all routes | Bottom nav with 4-5 core routes + overflow menu |
| **Charts & Analytics** | Full interactive charts with tooltips | Hidden or simplified to single-number KPIs |
| **Tables** | Sortable, filterable, multi-column | Stacked cards with "tap to expand" |
| **Editing** | Inline editing, complex wizards | Read-only or basic status changes |
| **Actions** | Bulk actions, multi-select | Single item actions in context |
| **Printing** | Statement/invoice/document print | "Download PDF" button |

### Implementation Strategy

1. **Detect mobile**: Use existing `useIsMobile()` hook (admin) and matchMedia queries
2. **Conditionally render**: Wrap complex components in `<div className="hidden md:block">` 
3. **Server-side aware**: Use responsive CSS rather than client-side hooks where possible
4. **Mobile-first components**: Create mobile-specific variants of key components (e.g., `MobileDashboard.tsx`, `MobileInvoiceCard.tsx`)
5. **No feature parity**: Don't try to show everything on mobile. Accept that some features are desktop-only

---

## 9. Quick Wins (Ranked by Impact)

### 🔴 High Impact (< 1 day each)

| # | Change | Effort | Impact | Files |
|---|---|---|---|---|
| 1 | **Hide complex charts on mobile**: Wrap `DivisionAreaChart`, `budgetChartSeries`, `expenseSnapshot` in `hidden md:block` | 30 min | ★★★★★ | `dashboard-shell.tsx` |
| 2 | **Replace invoice tables with cards on mobile**: All invoice/quote list pages use cards instead of `<table>` on small screens | 2-3 hrs | ★★★★★ | Portal invoices, quotes, admin invoices |
| 3 | **Increase touch targets**: Ensure all links/buttons are min `44×44px`. Make entire card row clickable, not just text | 1 hr | ★★★★☆ | Portal dashboard card lists |
| 4 | **Add `pb-24` to mobile layouts**: Prevent content being hidden behind OS home bar / Safari chrome | 15 min | ★★★★☆ | Root layouts |
| 5 | **Simplify KPI cards on mobile**: Remove sparkline SVGs from KPI cards on small screens | 30 min | ★★★☆☆ | `kpi-grid.tsx` |
| 6 | **Collapse aging report on mobile**: Show only total outstanding with count, hide individual buckets | 30 min | ★★★☆☆ | `aging-report-grid.tsx` |
| 7 | **Increase body text to 16px minimum**: Prevent iOS auto-zoom on input focus | 15 min | ★★★☆☆ | `globals.css` |

### 🟡 Medium Impact (1-2 days each)

| # | Change | Effort | Impact |
|---|---|---|---|
| 8 | Migrate admin invoices page to card-based mobile layout | 1 day | ★★★★★ |
| 9 | Add FAB (Floating Action Button) for core actions on both apps | 1 day | ★★★★☆ |
| 10 | Replace mobile dialogs with bottom sheets (using shadcn `Sheet` with `side="bottom"`) | 1-2 days | ★★★★☆ |
| 11 | Add bottom navigation bar to client portal | 1-2 days | ★★★★★ |
| 12 | Simplify admin dashboard mobile view (hide 80% of content) | 1 day | ★★★★★ |

### 🟢 Small Wins (< 30 min each)

| # | Change | Impact |
|---|---|---|
| 13 | Add `overscroll-behavior: contain` to sidebar drawer to prevent pull-to-refresh conflicts | ★★★☆☆ |
| 14 | Add `-webkit-overflow-scrolling: touch` for smoother scroll on iOS | ★★★☆☆ |
| 15 | Reduce card padding on mobile (`p-4 md:p-6`) | ★★☆☆☆ |
| 16 | Add `safe-area-inset-bottom` padding to bottom-anchored elements | ★★★☆☆ |

---

## 10. Long-Term Improvements

### 1. ✅ Mobile-Specific Dashboards (2-3 weeks)

Create completely separate mobile dashboard components:

- **Admin**: `apps/admin/src/components/dashboard/mobile-dashboard.tsx` — The Daily Briefing
- **Portal**: `apps/portal/src/components/dashboard/mobile-dashboard.tsx` — The Command Center

Use the `useIsMobile()` hook to switch between desktop and mobile dashboard.

### 2. Bottom Navigation Implementation (1 week)

Implement a shared `BottomNav` component in `packages/ui`:

```tsx
// packages/ui/src/components/BottomNav/BottomNav.tsx
interface BottomNavItem {
  label: string
  href: string
  icon: React.ComponentType
  badge?: number // for notification counts
}
```

Integrate into both apps with app-specific nav items.

### 3. PWA Capabilities (1-2 weeks)

- Add `manifest.json` for "Install to Home Screen"
- Service Worker for offline caching of dashboard data
- Push notifications (Web Push API)

### 4. Offline Support (2-3 weeks)

- Cache latest project status in localStorage for instant load
- Offline indicator when connection drops
- Queue simple actions (status updates) for sync when online

### 5. Skeleton Screens (1 week)

Replace loading spinners with skeleton screens that match the mobile card layout:

```tsx
// Skeleton that matches invoice card layout
<InvoiceCardSkeleton />
```

### 6. Native-Feeling Interactions (1-2 weeks)

- Pull-to-refresh on data lists
- Swipe-to-delete on list items
- Long-press context menus
- Haptic feedback for key actions (device-capability check)

### 7. Bottom Sheets for All Modals (1 week)

Convert all mobile `Dialog` instances to `Sheet` with `side="bottom"`:

```tsx
// Instead of:
<Dialog><DialogContent>...</DialogContent></Dialog>

// Use:
<Sheet><SheetContent side="bottom">...</SheetContent></Sheet>
```

### 8. Dashboard Personalization (2-3 weeks)

Allow admin users to customize their mobile dashboard:

- Pin favorite projects
- Reorder KPI cards
- Toggle widget visibility
- Save preference to user settings

### 9. Push Notifications (2 weeks)

- Web Push for urgent tender updates
- Invoice overdue reminders
- Project milestone notifications
- Compliance document expiry warnings

### 10. Mobile-First Compliance Features (1 week)

Since compliance tracking was recently added (`compliance.ts`, `ComplianceReminderEmail.tsx`), ensure:
- Mobile view for expiring documents (card list)
- Quick "Upload Document" from phone camera
- Expiry countdown badges

---

## Summary

### Admin App — Key Findings

| Area | Current Score | Target Score |
|---|---|---|
| Mobile Usability | 5/10 | 8/10 |
| Navigation | 6/10 | 8/10 |
| Info Hierarchy | 4/10 | 8/10 |
| Overall | 5.5/10 | 8/10 |

**Biggest win**: Simplify the dashboard to "The Daily Briefing" pattern. Hide all charts, aging reports, and expense breakdowns on mobile.

### Client Portal — Key Findings

| Area | Current Score | Target Score |
|---|---|---|
| Mobile Usability | 7/10 | 9/10 |
| Navigation | 6.5/10 | 9/10 |
| Info Hierarchy | 8/10 | 9/10 |
| Overall | 7.3/10 | 9/10 |

**Biggest win**: Add bottom navigation bar and convert tables to cards. The portal is already close to a banking-app feel — these final touches will get it there.

### Cross-Cutting Recommendations

1. **Bottom navigation** for both apps — this is the single highest-impact change
2. **Replace tables with cards** on all mobile list views
3. **Hide charts and complex analytics** on admin mobile
4. **Mobile-specific dashboards** — completely separate from desktop
