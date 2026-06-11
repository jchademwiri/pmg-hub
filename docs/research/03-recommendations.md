# PMG Hub — Client Detail Page Redesign Recommendations
*Based on industry research + current state audit | June 2026*

---

## Design Philosophy

The client detail page should answer three questions in under 3 seconds, without scrolling:
1. What does this client currently owe me?
2. Is anything at risk or overdue?
3. Where are their recent documents?

Everything else is secondary. The redesign keeps all existing functionality but reorganises it so critical information is immediately visible and less-used features are available on demand.

---

## Proposed Layout

```
/relationships/clients/[id]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ZONE A — Identity + Financial Snapshot (always above fold)
─────────────────────────────────────────────────────────
← Back to Clients                        [Edit Details ▼]
Acme Solutions Pty Ltd    [Active]
📧 billing@acme.com  •  📞 +27 82 123 4567

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Invoiced │ │   Paid   │ │ O/S      │ │ Overdue  │
│ R 45,000 │ │ R 38,500 │ │ R 6,500  │ │ R 2,100  │
│          │ │          │ │  ↑amber  │ │  ↑red    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
                           (click to filter)

Health: ⚡ Excellent  ·  Avg Pay: 14 days  ·  Last Payment: 15 May 2025  R 8,500

[+ New Invoice]  [+ New Quote]  [+ Record Payment]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ZONE B — Document Browser (tabs)
─────────────────────────────────────────────────────────
Invoices | Quotes | Payments | Statement | Analytics
─────────────────────────────────────────────────────────

┌─ Document List (40%) ──────┬─ Preview Pane (60%) ──────┐
│  ☐  INV-001  12 Apr  R2k   │                           │
│ ▶  INV-002  05 May  R3k    │   [Invoice Preview]       │
│  ☐  INV-003  01 Jun  R1k   │                           │
│       ↑ 47 days overdue    │  [Print][PDF][Email][Edit]│
└────────────────────────────┴───────────────────────────┘
  ↑ Split pane on ≥lg screens; Dialog on mobile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Appears when checkboxes selected]
3 Selected  ·  [Combined PDF]  [Bulk Email]  [Issue]  [Void]
```

---

## Zone A — Identity + Financial Snapshot

### Header Row

```
← Back to Clients    Acme Solutions Pty Ltd    [Active]    [Edit Details ▼]
📧 billing@acme.com  ·  📞 +27 82 123 4567
```

- Contact info (email, phone) displayed directly below the client name — always visible, no interaction needed.
- "Edit Details" button stays top-right. The collapsible form stays but is fixed to `router.refresh()` after saving (see Bug Fix 1).

### Metric Strip — 4 Tiles

Replace the current 5-card strip with 4 cards. Outstanding and Overdue use colour when non-zero. **All 4 tiles are clickable and filter the active tab's document list.**

| Tile | Colour when active | Click action |
|---|---|---|
| Total Invoiced | neutral | No filter (totals view) |
| Total Paid | green | Filter to paid invoices |
| Outstanding | amber | Filter to issued/unpaid |
| Overdue | red | Filter to overdue only |

Quote Conversion Rate moves to the Analytics tab — it's a sales metric, not a billing action trigger.

### Info Row

```
Health: [Excellent ✓]  ·  Avg Days to Pay: 14 days  ·  Last Payment: 15 May 2025  R 8,500
```

Condenses the Health & Payment Behaviour card into a single line below the metric strip. Avg Days to Pay and Last Payment are the two most operationally relevant figures; Collection Efficiency and Largest Payment move to the Analytics tab.

### Quick Action Buttons

```
[+ New Invoice]  [+ New Quote]  [+ Record Payment]
```

Moved above the tab browser so they are visible without scrolling. New Invoice uses `variant="default"` (filled); the others use `variant="outline"`.

---

## Zone B — Document Browser

### Tab Architecture

| Tab | Content |
|---|---|
| **Invoices** | Invoice list + split-pane preview. Checkbox selection for bulk ops. |
| **Quotes** | Quotations list + split-pane preview. Checkbox selection. |
| **Payments** | Payments list + receipt preview. Add Receipt # and Days Since columns. |
| **Statement** | Period filter + transactions table + auto-rendered statement in preview pane. |
| **Analytics** | Full `ClientFinancialDashboard` (ageing, health, behaviour, activity feed). |

### Split-Pane Layout (desktop ≥ lg)

On screens ≥ 1024px: 40/60 horizontal split within the tab content area.

- **Left (40%):** Document list table with checkboxes. Clicking a row updates the right pane — no dialog required.
- **Right (60%):** Document preview rendered inline. Action buttons (Print, Export PDF, Email, Edit) live in the preview pane header.
- The currently selected row is highlighted. The first document in the list is selected by default.

On screens < 1024px: Keep the existing Dialog-based approach. The dialog should add Prev/Next navigation buttons to allow stepping through documents without closing and reopening.

### Statement Tab

**Current flow (3 steps):** Tab → Select period → Click "Preview Statement PDF"

**Proposed flow (1 step):** Click the Statement tab → statement automatically renders in the right preview pane using the current effective period.

```
Statement Tab
┌──────────────────────────────────────────────────────────┐
│  [Current Month] [Previous] [Past 3M] [Past 6M] [FY▼]   │
├─────────────────────────────┬────────────────────────────┤
│  Transactions table (left)  │  Statement PDF (right)     │
│  Date / Ref / Debit / Credit│  Auto-renders on tab load  │
│                             │  Updates on period change  │
└─────────────────────────────┴────────────────────────────┘
```

Period change updates the right pane in real time — no button required.

---

## Bug Fixes

### Fix 1 — Edit Form Redirect
**File:** `apps/admin/src/components/clients/client-edit-form.tsx`

```typescript
// Remove this:
router.push('/relationships/clients');

// Replace with:
router.refresh();
```

### Fix 2 — Receipt # Column in Payments Table
**File:** `client-billing-workspace.tsx`, Payments `TabsContent`

```tsx
// Add to TableHeader:
<TableHead>Receipt #</TableHead>

// Add to each TableRow:
<TableCell className="font-mono text-xs text-muted-foreground">
  REC-{entry.id.slice(0, 8).toUpperCase()}
</TableCell>
```

### Fix 3 — Statement Default Period Highlight
```typescript
// Derive effective period — used for all button variant comparisons
const effectivePeriod = statementPeriodParam ?? (!statementYearParam ? 'current' : null);

// In filter buttons:
variant={effectivePeriod === 'current' ? 'default' : 'outline'}
```

---

## Additional UX Improvements

### Days Overdue Column (Invoices Tab)
Add a computed column showing numeric overdue age with colour coding:

```typescript
const daysOverdue = (dueDate: string): number => {
  const diff = new Date(todayStr).getTime() - new Date(dueDate).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
```

Colour thresholds:
- 1–30 days → `text-amber-600`
- 31–60 days → `text-orange-600`
- 61+ days → `text-red-600`

### Activity Feed Default State
Show the most recent 3 events by default (collapsed state), with a "Show all N events" toggle. This gives users immediate context without the accordion being closed by default.

### Bulk Operation Discovery
Add a subtle hint text below the tab bar when the Invoices or Quotes tab is active:
```
"Select rows to batch download or email documents"
```
Disappears after the user has performed their first batch action (persist to localStorage).

---

## Component Changes Summary

### `client-billing-workspace.tsx`
- Add contact info (email, phone) display below client name in header
- Replace 5-card KPI strip with 4-tile interactive metric strip
- Add condensed info row (Health · Avg Pay · Last Payment)
- Move action buttons above tab browser
- Add "Analytics" tab containing `<ClientFinancialDashboard />`
- Remove `ClientFinancialDashboard` from main layout
- Implement split-pane layout for `lg:` screens
- Replace Dialog with `Sheet` (shadcn slide-over drawer) — or keep Dialog with prev/next nav as interim
- Add Receipt # column to Payments tab
- Fix statement default period highlight using `effectivePeriod`
- Auto-render statement in right pane on Statement tab load

### `client-financial-dashboard.tsx`
- No structural changes. Moved wholesale into the Analytics tab.
- Optional: show top 3 activity events by default instead of collapsed.

### `client-edit-form.tsx`
- Fix: `router.push('/relationships/clients')` → `router.refresh()`

---

## Phased Implementation Plan

### Phase 1 — Bug Fixes & Quick Wins (1–2 days)
- [ ] Fix edit form redirect (`router.refresh()`)
- [ ] Add contact info (email/phone) to header
- [ ] Add Receipt # column to payments table
- [ ] Fix statement default period visual state

### Phase 2 — Layout Reorganisation (2–3 days)
- [ ] Create compact `ClientMetricStrip` component (4 tiles + info row)
- [ ] Move `ClientFinancialDashboard` into new "Analytics" tab
- [ ] Elevate action buttons above tab browser
- [ ] Show top 3 activity events by default

### Phase 3 — Interactive Preview (2–3 days)
- [ ] Implement split-pane layout on `lg:` screens
- [ ] Add slide-over `Sheet` drawer as an option (or prev/next in Dialog for mobile)
- [ ] Auto-select first document in list on tab load
- [ ] Statement auto-preview in right pane

### Phase 4 — Interactive KPI Tiles (1–2 days)
- [ ] Make KPI tiles clickable to filter the active tab's list
- [ ] Add filter state to invoices and quotes tabs
- [ ] Visual active-filter indicator

### Phase 5 — Polish (1–2 days)
- [ ] "Days Overdue" column with colour coding
- [ ] Bulk ops discovery hint text
- [ ] Responsive card view for tables on mobile
- [ ] Keyboard navigation (j/k for next/prev document)
- [ ] Empty state improvements per tab

---

## What NOT to Change

| Component | Reason |
|---|---|
| Bulk PDF generation system | Unique differentiator — no major competitor has this |
| Bulk email system | Same — sequential queue and progress dialog are correct |
| URL-driven state | `?tab=invoices&invoiceId=xxx` deep links are well-implemented |
| `DocumentPreview` component | Renders correctly |
| Server data fetching (page.tsx) | Parallel Promise.all pattern is good |
| `BillingStatusBadge` | Well-implemented |
| Statement ageing calculation | Logic is correct and sophisticated |
| Off-screen canvas PDF system | Works — fragile but not worth rewriting yet |

---

## Competitive Positioning After Redesign

| Feature | Xero | QBO | FreshBooks | Zoho | **PMG Hub (after)** |
|---|---|---|---|---|---|
| Financial snapshot above fold | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contact info always visible | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clickable KPI filters | ✓ | ✓ | ✗ | ✗ | ✓ |
| Tabbed document browser | ✓ | ✓ | ✓ | ✓ | ✓ |
| Slide-over/drawer preview | ✗ | ✓ | ✓ | ✗ | ✓ |
| Ageing breakdown | ✓ | ✓ | ✗ | ✓ | ✓ |
| Client health score | ✗ | ✗ | ✗ | Partial | ✓ |
| Bulk PDF generation | ✗ | ✗ | ✗ | ✗ | ✓ |
| Bulk email dispatch | ✗ | ✗ | ✗ | ✗ | ✓ |
| Split-pane browser | ✗ | ✗ | ✗ | ✗ | ✓ |
| Activity timeline | ✓ | Partial | ✓ | ✓ | ✓ |
| Statement inline | ✓ | ✓ | ✗ | ✓ | ✓ |
| Days overdue column | ✗ | ✓ | ✗ | ✓ | ✓ |
