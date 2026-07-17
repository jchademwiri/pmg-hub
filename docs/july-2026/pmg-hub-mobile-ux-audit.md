# PMG Hub — Deep Mobile UX Audit (Admin App & Client Portal)

**Repo:** `jchademwiri/pmg-hub` · **Stack:** Next.js, Tailwind CSS, shadcn/ui, TypeScript, Drizzle ORM
**Auditor:** Claude (Anthropic) — commissioned by Jacob Chademwiri
**Method:** This audit is grounded in the actual `dev`-branch source — sidebar/nav shells, dashboard pages, list/table pages, and shared UI primitives were read directly (not guessed from screenshots). Where a finding generalizes from one file to a pattern used repo-wide (e.g. "every list page uses this table component"), that's stated explicitly. A prior general UI/UX audit already exists at `docs/pmg-hub-admin-ux-audit.md` and has been implemented; this audit is scoped specifically to **mobile intent**, which that pass did not address.

---

## Scope note

A monorepo this size has 40–60+ routes per app. Auditing every route with page-by-page rigor would produce a document nobody reads. Instead, this audit goes deep on the **highest-traffic, highest-risk screens** (dashboards, navigation shell, the invoice/billing list pattern, the project/tender pattern) and treats those as representative of every other list/detail page built the same way — which, having read the code, they are: this codebase is consistent, so a fix to the shared `<Table>` component or the dashboard shell propagates everywhere. Section 2 covers these representative pages in depth; Section 3 covers the shared components that every other page inherits from.

---

# PART A — ADMIN APP

## A.1 Overall UX Score

| Dimension | Score | Why |
|---|---|---|
| Mobile usability | 4/10 | Sidebar/nav collapses correctly into a Sheet drawer (shadcn `Sidebar` handles this well), but every content page — dashboard, invoices, quotes — renders the *exact same desktop layout* at narrower width. No page asks "what does staff actually need to do here, on a phone, standing on site?" |
| Navigation | 6/10 | The collapsible-group sidebar with active-state highlighting is genuinely well built and works fine as a drawer. It's a *desktop information architecture* (7+ groups, nested items) wearing a mobile costume — one-handed reachability wasn't a design input. |
| Information hierarchy | 3/10 | The dashboard is one long scroll of 6 equally-weighted rows (KPIs → aging → budget chart → division/leads → project schedule → expense breakdown). Nothing is flagged as "look at this first." A recharts area chart and a full aging-bucket grid load before the thing an on-site PM actually opens the app for: *is my project on track, and did that invoice get paid.* |
| Accessibility | 5/10 | Default shadcn `Button` height is `h-9` (36px) — under the 44px touch-target guideline — used for every row action, dropdown trigger, and inline button across the app. Keyboard/focus handling is actually good (invoice rows use an accessible absolute-positioned `<Link>` overlay pattern rather than `onClick` div soup). |
| Performance perception | 5/10 | Dashboard fires ~14 parallel data queries (`Promise.all` of YTD, MoM, aging, budget series, division revenue, leads, project schedule, rates) before rendering anything — no streaming, no skeleton per-section. On a mobile connection this is a long blank-to-full-dashboard jump. |
| Ease of use | 4/10 | For desktop admin work this is a strong app. For "quick check from the job site," a staff member has to load a full financial dashboard, scroll past charts to find project status. |
| **Overall** | **4.5/10** | A well-engineered desktop admin tool that has been made *responsive* (nothing breaks, tables scroll) but not *mobile-intentional* (nothing is reprioritized for the mobile use case). |

## A.2 Page-by-Page Audit (representative pages)

### Dashboard (`/dashboard`)
- **Current purpose:** Financial + operational command center — YTD/MoM/current-month tabs, KPI grid (revenue, expenses, PMG share, profit pool), AR aging buckets, a revenue/expense/budget area chart, division revenue + leads side-by-side, project schedule summary, expense breakdown.
- **Mobile pain points:** All 6 rows render unconditionally and in the same order as desktop. The KPI grid drops from 4 to 2 columns but still shows all four financial metrics with sparklines — useful for a bookkeeper, not for "am I on track today." The area chart (`DivisionAreaChart`, ~300 lines, recharts) is a genuinely desktop-analytical artifact; recharts touch interaction (tooltips on tap) is materially worse than hover. Nothing on this screen answers "what needs my attention right now" — there's no urgent-items or notifications surface at all in the current dashboard data model.
- **Desktop strengths:** The tab system (Current/Previous/YTD) with computed deltas and the aging-bucket grid are well designed and information-dense in a good way — for someone who actually needs that density.
- **Mobile recommendations:** Reorder around *task*, not *report*. Lead with a compact "Today" strip (open urgent items, projects at risk, invoices going overdue this week) — data the DB layer already computes elsewhere (`getProjectsAtRisk`, `getAgingReport`) but isn't surfaced first. Collapse the area chart and division/leads breakdown behind a "View full report →" link to a desktop-oriented `/reports` route, rather than inlining them.
- **Information to remove on mobile:** The area chart, the division-revenue/leads two-column row, and the expense-breakdown row — none are decision-relevant on a phone; all are exploratory/analytical.
- **Information to prioritize:** Profit pool + revenue as single numbers (not full 4-KPI grid), aging "61+ days" bucket only (the one that requires action), project schedule summary, a to-do-style list of at-risk projects.
- **Suggested redesign:** A single-column mobile dashboard: alert strip → 2 KPI numbers → "Needs attention" list (at-risk projects, overdue invoices) → "Today's projects" → link out to full analytics. See Section A.4 for a concrete layout.

### Invoices list (`/billing/invoices`)
- **Current purpose:** Paginated table of all invoices with status filter, per-row actions (view/issue/void via dropdown).
- **Mobile pain points:** An 8-column `<table>` (Invoice #, Reference, Client, Issue Date, Due Date, Amount, Status, action menu) inside a horizontally-scrolling container. It doesn't break — the base `Table` component wraps in `overflow-x-auto` — but a finance person on a phone has to scroll sideways to see amount and status together, which is exactly the information they came for. Row height and the `MoreHorizontal` icon-only action button (`size-8`, 32px) are both under comfortable tap size.
- **Desktop strengths:** Dense, scannable, accessible row-click via absolute `<Link>` overlay is a nice pattern that avoids nested-interactive-element a11y bugs.
- **Mobile recommendations:** Replace the table with a card-list on mobile: one card per invoice — invoice #, client, amount and status badge on one line, due date as a secondary line, tap-to-view. This is a standard responsive-table-to-cards transform and is low effort since the data shape doesn't change.
- **Information to remove on mobile:** Reference field (rarely the primary lookup key), issue date (due date matters more for "is this overdue").
- **Information to prioritize:** Client name, amount, status (paid/overdue color already exists via `BillingStatusBadge` — reuse it), due date.
- **Suggested redesign:** Card list + sticky filter chips (status) at the top, matching the pattern already used well in the *Portal* app's invoice tab pills (see Part B) — genuinely, borrow that component back into Admin.

### Projects / Scheduling overview (`/projects`)
- **Current purpose:** Workload view (planned/in-progress), at-risk detection, overlap detection, upcoming entries with progress %, filterable by client/division.
- **Desktop strengths:** Already card-based (`ProjectSummaryCard`), which travels to mobile far better than the invoice table does — this is the one dashboard row that's closest to "mobile-ready" today.
- **Mobile recommendations:** This is the page to promote, not redesign — it's close to what a staff member actually wants on-site ("what's active, what's at risk, what's overdue"). Recommend making a trimmed version of this exact card list the mobile dashboard's primary content (see A.4).

## A.3 Component Audit

| Component | Assessment | Mobile-specific recommendation |
|---|---|---|
| `Table` / `TableRow` (shared, used by invoices, quotes, and likely every other list page) | Correctly wrapped in `overflow-x-auto`, so it "works," but horizontal scroll on a data table is a workaround, not a mobile design. Row action button is icon-only at 32px. | Build a `<DataList>` companion component: same data, renders as a table `md:` and up, cards below `md`. Bump action buttons to `size-9`+ on mobile. |
| `Button` (shadcn base) | Default size is `h-9` (36px) — below 44px touch-target guidance — used everywhere: dropdown triggers, row actions, form submits. | Add a `size="touch"` variant (44px min-height) and apply it to any button that's a primary mobile action (row actions, form submit, sidebar footer buttons). |
| `Sidebar` (shadcn, `AppSidebar`) | Genuinely well implemented — auto-collapses to an off-canvas Sheet on mobile (`useSidebar().isMobile`), closes itself on navigation (`handleNavigate`). This is the strongest mobile-native piece of the admin app. | No change needed structurally; just trim what's inside it for mobile (see Navigation Audit). |
| `TopNav` (breadcrumb + theme toggle) | Fixed `px-6` padding regardless of viewport, `h-13` sticky header. No search, no notification bell, no quick-action affordance at all — on mobile this real estate is pure chrome. | Reduce to `px-4` on mobile; use the freed header space for a notifications/urgent-items icon, since there's currently no in-app notification surface at all. |
| `KpiCard` / `KpiGrid` | Responsive typography scaling (`text-base sm:text-lg lg:text-xl xl:text-2xl`) is thoughtfully done. Grid drops to 2 columns on mobile — reasonable, but still shows all 4 KPIs + sparklines, which is more density than a glance-check needs. | On mobile, show 2 KPIs by default (Revenue, Profit Pool) with the rest behind a "Show all" toggle. |
| `AgingReportGrid` | Card-per-bucket, `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` — this is a good responsive pattern, one of the better ones in the codebase. | Keep as-is; consider showing only "current" + the worst overdue bucket by default on mobile, full 5-bucket grid behind a tap. |
| `DivisionAreaChart` (recharts) | Desktop analytical chart, ~300 lines. No evidence of a simplified mobile variant or touch-optimized tooltip handling. | Don't try to make recharts touch-great — hide this behind a "View chart" link on mobile rather than force-rendering it. |
| Dialogs / `ConfirmProvider` | Used well for destructive actions (void invoice) — good pattern to keep. | Verify dialog width is `w-full` capped with margin on small viewports, not a fixed desktop px width (worth a quick manual check in Storybook/browser devtools). |

## A.4 Mobile Dashboard Redesign — Admin

Data already computed by the backend (`getProjectsAtRisk`, `getAgingReport`, `getProjectScheduleSummary`, `getCurrentWorkload`) supports this without new queries:

```
┌─────────────────────────────┐
│  Good morning, Jacob          │  ← greeting + date, replaces chart-first opener
│  3 projects need attention →  │  ← urgent strip, tap → filtered project list
├─────────────────────────────┤
│  Revenue          Profit Pool │  ← 2 KPIs only, "Show more" reveals Expenses/PMG Share
│  R xxx,xxx        R xxx,xxx   │
├─────────────────────────────┤
│  ⚠ Needs Attention             │
│  • Project X — 3 days overdue │  ← from getProjectsAtRisk
│  • Invoice #123 — 45 days     │  ← from getAgingReport 61+ bucket
├─────────────────────────────┤
│  Today's Projects              │  ← from getCurrentWorkload / in-progress
│  [card] [card] [card]          │
├─────────────────────────────┤
│  View full analytics →         │  ← link out to desktop-style /dashboard/full
└─────────────────────────────┘
```
Avoid: the area chart, the division/leads two-column comparison, the expense breakdown — all exploratory, all desktop.

## A.5 Navigation Audit — Admin
- Keep the Sheet-drawer sidebar (it's correctly built), but the drawer currently surfaces every desktop group (Overview, Projects, Billing, Finance, Accounting, Settings, Advanced, System) — a lot to scan one-handed. Recommend a **bottom nav bar with 4–5 items** (Dashboard, Projects, Billing, Notifications, More) for the mobile viewport specifically, with the full sidebar accessible via "More," rather than asking a one-handed user to scroll a long collapsible list.
- No floating action button exists anywhere; the most common mobile action (mark a task/project complete, per the stated use case) is buried in an "Other Actions" dropdown on the project detail page. A sticky bottom action bar on project detail (mobile only) for "Mark Complete" would directly serve the stated `Confirming task completion` use case.
- `TopNav`'s breadcrumb is a two-level desktop IA pattern; on mobile a simple back chevron + page title reads faster than parent > child breadcrumbs.

## A.6 Information Hierarchy — Admin (Dashboard)
- **Must always be visible:** urgent/at-risk items, today's active projects, revenue + profit at a glance.
- **Secondary (one tap away):** full KPI grid (all 4 metrics), aging buckets beyond the worst one, recent activity.
- **Advanced (desktop-focused / behind expansion):** area chart, division-by-division revenue/expense comparison, full YTD tab analytics, bulk table views.

## A.7 Desktop vs Mobile Strategy — Admin
Desktop keeps the current dashboard, full tables, tab-based period comparisons, and bulk table actions exactly as built — this is legitimately good desktop UX and shouldn't be diluted. Mobile gets: the redesigned dashboard above, card-list versions of every table page, a bottom nav, and read-only detail views for anything not in the explicit "mobile mainly used for" list (heavy data entry — new invoices, tender documents, compliance edits — should deep-link out to "please use desktop" messaging rather than cram a form onto a phone).

## A.8 Quick Wins — Admin (ranked by impact)
1. **Card-list variant for the invoice/quote tables** (highest impact — this is the page staff most likely open mid-day for a billing check).
2. **Bump `Button` touch targets** for row-action icon buttons from 32px to 40–44px minimum.
3. **Reorder dashboard rows** so the project-schedule and aging-alert content comes before the area chart, even before any mobile-specific card work — pure JSX reordering.
4. **Reduce `TopNav` padding** on mobile (`px-6` → `px-4`) and drop the two-level breadcrumb to a single back-chevron + title under a breakpoint.
5. **Cap KPI grid to 2 cards by default on mobile** with a "show all 4" toggle.

## A.9 Long-Term Improvements — Admin
- A genuinely separate `/mobile` (or viewport-conditional) dashboard data contract, so mobile isn't just CSS-hiding desktop data but requesting a lighter payload (fewer parallel queries → faster TTFB on cellular).
- Push notifications for the "urgent items" the brief calls out (nothing in the current codebase sends any push/in-app notification — this is a bigger gap than layout).
- PWA install prompt + offline shell for "check status with no signal on site."
- Skeleton screens per dashboard section instead of one all-or-nothing loading state (the `Promise.all` of 14 queries currently blocks the whole page).

---

# PART B — CLIENT PORTAL

## B.1 Overall UX Score

| Dimension | Score | Why |
|---|---|---|
| Mobile usability | 6/10 | Meaningfully better than Admin — the dashboard is already card/list-based, not table-first, and reads well on a narrow screen. The invoice *list* page, however, reverts to a raw `<table>`. |
| Navigation | 5/10 | Custom off-canvas drawer + hamburger, correctly implemented (backdrop, `X` close, focus doesn't trap oddly). But it's a top-of-screen hamburger pattern — for a "banking app" feel the brief explicitly asks for, a bottom tab bar (as most banking apps use) would match user expectation better than a drawer. |
| Information hierarchy | 6/10 | Dashboard already leads with the payment-reminder banner (excellent — this is exactly "what does a client need to see in 5 seconds") then stats grid then payment-progress bar then recent invoices/quotes. This is the most mobile-intentional screen in either app. |
| Accessibility | 5/10 | Same shadcn `Button` 36px issue doesn't universally apply here (portal mostly uses custom `<Link>`/`<button>` styling rather than the shared `Button`), but several custom buttons (tab pills, sign-out) are still under 44px. Icon-only `Menu`/`X` buttons for opening/closing the drawer have no visible focus ring styling evident in the source. |
| Performance perception | 6/10 | Dashboard does sequential-feeling but reasonably scoped queries (invoices + quotes + allocations for one client, not the whole org) — lighter than Admin's dashboard. |
| Ease of use | 6/10 | Genuinely close to "banking app" already on the dashboard. Undermined by the invoice list, quotes, and (implied, same pattern) statements/credits pages likely reusing the same raw-table approach. |
| **Overall** | **5.7/10** | The portal's dashboard is the best mobile-intentional screen in the whole product. The list pages behind "View all" links don't live up to it. |

## B.2 Page-by-Page Audit (representative pages)

### Dashboard (`/dashboard`)
- **Current purpose:** At-a-glance billing relationship summary — outstanding balance, paid-to-date, total invoiced, pending quotes, payment-progress bar, recent invoices/quotes lists.
- **Mobile pain points:** Genuinely few. The 4-stat grid is `grid-cols-1 sm:2 lg:4` — full-width stacked cards on phone, which is correct (unlike Admin's 2-up KPI grid that keeps everything visible at once, cramped). The payment-reminder banner only shows conditionally (`outstandingBalance > 0`) — good, no chrome when there's nothing to say.
- **Desktop strengths:** N/A — this screen is designed mobile-first already, arguably better than its desktop layout uses the extra width well.
- **Mobile recommendations:** The brief specifically wants "current tender stage" and "compliance expiry reminders" surfaced on the dashboard — neither exists in the current dashboard data (only invoices/quotes are queried; no query against projects/tenders or compliance-document tables appears in this page). This is a data-completeness gap more than a layout gap.
- **Information to remove on mobile:** Nothing structurally — this page is already lean.
- **Information to prioritize:** Add a "Project Progress" or "Current Tender Stage" card above or alongside the financial stats, and a compliance/document-expiry reminder card, both explicitly requested in the brief's client-dashboard priorities but currently absent from the query set.
- **Suggested redesign:** Insert a project-status card between the reminder banner and the stats grid; add a compliance-expiry banner using the same conditional-banner pattern already used for payment reminders (reuse, don't reinvent).

### Invoices list (`/invoices`)
- **Current purpose:** Filterable (All/Unpaid/Paid/Overdue pill tabs) invoice table with remaining-balance sub-line for partial payments.
- **Mobile pain points:** Reverts to a raw 5-column `<table>` with `px-6` cell padding — on a 375px viewport this table is comfortably wider than the screen; a client checking "did they receive my payment" has to scroll sideways, which directly contradicts the brief's "banking app: fast, simple, minimal" goal. This is the single biggest gap between stated intent and shipped code in the Portal.
- **Desktop strengths:** The pill-tab filter (All/Unpaid/Paid/Overdue with counts) is an excellent pattern — clear, scannable, good touch size already (`px-3 py-1.5`, close to acceptable).
- **Mobile recommendations:** Convert straight to a card list: invoice # + status badge on top line, amount (+ remaining balance if partial) prominent, issue/due date as a smaller secondary line. The dashboard's "Recent Invoices" list rows (`divide-y`, `flex items-center justify-between`) are *already* exactly the right pattern — literally reuse that component here instead of the `<table>`.
- **Information to remove on mobile:** Issue date can move to secondary/collapsed; due date matters more (drives urgency).
- **Information to prioritize:** Status, amount, remaining balance.
- **Suggested redesign:** Same component as the dashboard's recent-invoices list, just showing the full filtered set with the existing pill tabs above it.

### Quotes / Statements / Credit Notes (inferred pattern)
- Not individually inspected line-by-line, but given the shared page structure (`Card` + raw `<table>` inside `CardContent className="p-0"`) visible in Invoices, these very likely share the identical table-on-mobile problem. Treat the Invoices fix as the template and apply it to all four list pages (Invoices, Quotes, Statements, Credit Notes) for consistency.

## B.3 Component Audit — Portal

| Component | Assessment | Mobile-specific recommendation |
|---|---|---|
| `PortalShell` desktop sidebar / mobile drawer | Well implemented — collapsible desktop rail, separate mobile drawer with backdrop and its own nav list (some duplication between the two, but functionally solid). | For "banking app" feel specifically, consider a bottom tab bar (Dashboard, Projects, Invoices, More) instead of/alongside the hamburger — bottom nav is the dominant convention in finance apps and better serves one-handed use than a top-left hamburger. |
| Header (`h-16`, business name + "Active Account" pill) | The "Active Account" status pill is a nice trust signal (matches "clarity, confidence, transparency" guiding principle) but takes header space that could instead hold a notification bell for compliance/expiry alerts. | Replace/augment the status pill with a notification icon on mobile; keep the pill on desktop where space isn't constrained. |
| Raw `<table>` (Invoices, likely Quotes/Statements/Credits) | Not the shared shadcn `Table` — hand-rolled per page, meaning the fix isn't a one-place component change; each page needs the same card-list treatment applied individually (or the pattern refactored into a shared `<DataList>` component and reused). | Extract a shared `InvoiceLikeList` component (used already, informally, by the dashboard's recent-invoices block) and use it for the full list pages too. |
| Payment-reminder banner | Excellent conditional-disclosure pattern — only renders when relevant, good touch target on its CTA. | Reuse this exact component/pattern for compliance-expiry and document-outstanding reminders, which the brief calls for but which don't currently exist as a data source or UI element. |
| Tab pills (Invoice status filter) | Good touch size, clear active state, count badges are a nice density signal. | No change needed — this is one of the better mobile-native components in either app. |

## B.4 Mobile Dashboard Redesign — Client Portal

The current dashboard is close; the redesign is additive, not a rebuild:

```
┌─────────────────────────────┐
│  ⚠ Payment Reminder (if any)  │  ← already exists, keep as-is
├─────────────────────────────┤
│  📁 Project Progress          │  ← NEW: current tender/project stage,
│     Tender Stage: Evaluation  │     requires wiring in project/tender data
│     ▓▓▓▓▓▓▓░░░ 68%            │
├─────────────────────────────┤
│  Outstanding    Paid to Date  │  ← existing 4-stat grid, keep 1-col stack
│  Total Invoiced Pending Quotes│
├─────────────────────────────┤
│  Payment Progress ▓▓▓▓░ 82%   │  ← existing, keep
├─────────────────────────────┤
│  📋 Compliance Reminders       │  ← NEW: expiry/outstanding-document alerts
├─────────────────────────────┤
│  Recent Invoices →             │  ← existing, keep
│  Recent Quotes →               │  ← existing, keep
└─────────────────────────────┘
```
The two "NEW" blocks are the brief's explicitly-requested content (tender stage, compliance reminders) that the current `getPortalSessionOrRedirect` + invoice/quote-only query set doesn't yet supply — this is the one place where the fix is a backend data gap, not a frontend layout gap.

## B.5 Navigation Audit — Client Portal
- Current: top-left hamburger → full-screen drawer. Functionally fine, but requires a reach-to-top-corner gesture that's the least thumb-friendly navigation pattern on a large phone.
- Recommend: **bottom tab bar** with 4 items — Dashboard, Projects, Invoices, More (Quotes/Statements/Credits/Profile folded into "More") — directly matching the "banking app" framing in the brief. This is the single highest-leverage navigation change for the portal specifically, since clients are stated to be mobile-primary.
- Keep the desktop collapsible rail exactly as-is; the bottom bar is additive for `<md` viewports only.

## B.6 Information Hierarchy — Client Portal
- **Must always be visible:** outstanding balance (already is), payment reminder banner (already is), project/tender stage (missing today — add).
- **Secondary:** recent invoices/quotes previews (already correctly one-tap-away via "View all").
- **Advanced/desktop:** full invoice/quote/statement tables, detailed document history — these are already gated behind desktop-appropriate full-table views once the mobile card-list fix lands.

## B.7 Desktop vs Mobile Strategy — Client Portal
Desktop keeps full tables and document history exactly as built. Mobile gets: card-list conversions of every table page, a bottom tab bar, and the two new dashboard modules (project stage, compliance reminders). Downloading completed documents (explicitly called out as a mobile use case) should remain a single tap from both the dashboard and the relevant list — verify this is wired to a direct download rather than an intermediate desktop-oriented viewer.

## B.8 Quick Wins — Client Portal (ranked by impact)
1. **Convert the Invoices (and likely Quotes/Statements/Credits) `<table>` to the dashboard's existing card-list pattern** — highest impact, and the target component already exists in the same codebase (`recentInvoices.map` block on the dashboard), so this is a genuine copy-and-adapt, not new design work.
2. **Add a bottom tab bar for `<md` viewports** alongside the existing drawer.
3. **Bump icon-only header buttons (`Menu`, `X`, sign-out) to a consistent 44px hit area.**
4. **Reduce/replace the "Active Account" pill with a notification affordance** on mobile.

## B.9 Long-Term Improvements — Client Portal
- Wire project/tender-stage and compliance-expiry data into the dashboard (backend gap, not UI).
- Push notifications for invoice-issued, payment-received, document-expiring — matches "Receiving compliance reminders" and "Seeing expiry notifications" directly from the brief's stated client scenarios; nothing in the current codebase appears to send these.
- PWA installability so the portal can sit on a client's home screen like an actual banking app.
- Personalization: let a client pin which project they most want surfaced first if they have multiple active engagements with PMG.

---

# Cross-App Summary

| | Admin | Client Portal |
|---|---|---|
| Biggest single mobile problem | Dashboard shows the full analytical/financial view unconditionally, no task-first reordering | Invoices (and sibling list pages) revert to a raw table despite the dashboard proving the team already knows how to build mobile-good card lists |
| Best existing mobile pattern | Sidebar → Sheet drawer (shadcn, auto-mobile-aware) | Dashboard: conditional reminder banner + recent-activity list rows |
| Fastest fix | Reorder dashboard sections, no new components | Reuse the dashboard's list-row component on the full Invoices page |
| Biggest structural gap | No notifications/urgent-items surface exists anywhere in the app | No project/tender-stage or compliance-expiry data reaches the dashboard at all |

**Guiding principle, restated with evidence:** the Admin app's engineering quality is real (accessible link-overlay tables, well-built collapsible sidebar, active-rate-aware financial calcs) — the gap is entirely about *what's shown first and how much of it*, not *whether it renders*. The Portal is closer to "banking app" than Admin is to "productivity tool," and the fastest path for both is propagating the good patterns each app *already contains* to the pages that don't yet use them, before reaching for any new component library or design system work.
