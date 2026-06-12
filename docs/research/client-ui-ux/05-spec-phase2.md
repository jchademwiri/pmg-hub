# Implementation Spec — Phase 2: Layout Reorganisation
*PMG Hub | Client Detail Page Redesign*

> **Prerequisite:** Phase 1 must be complete before starting Phase 2.

---

## Overview

Phase 2 restructures the page layout without changing any core logic. The financial dashboard moves from the main layout into a new "Analytics" tab. A new compact `ClientMetricStrip` component replaces the 5-card KPI block. Action buttons move above the tab browser. Estimated effort: 2–3 days.

---

## Constraints — Read Before Starting

- **Do not modify** `ClientFinancialDashboard` component internals — it is moved as-is.
- **Do not touch** the off-screen PDF render container or any bulk operation logic.
- **Do not touch** `page.tsx`.
- **Do not change** existing tab content (Invoices, Quotes, Payments, Statement) — only the surrounding layout changes.
- The existing Dialog preview stays unchanged in this phase — the split-pane is Phase 3.
- All existing props passed into `ClientBillingWorkspace` remain — no prop changes.
- `calculateClientHealth`, `calculateAverageDaysToPay` helper functions are already imported in `client-financial-dashboard.tsx`. Import them into the workspace too via `@/lib/client-billing-helpers`.

---

## Change 1 — Create `ClientMetricStrip` Component

**New file:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-metric-strip.tsx`

This component receives pre-computed values and renders the 4 KPI tiles plus the info row. It has no internal state — all values are computed by the parent workspace.

**Full component:**
```tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ClientMetricStripProps {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueBalance: number;
  healthScore: string;          // 'Excellent' | 'Good' | 'At Risk' | 'Critical'
  avgDaysToPay: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  onFilterChange?: (filter: 'all' | 'paid' | 'outstanding' | 'overdue') => void;
  activeFilter?: 'all' | 'paid' | 'outstanding' | 'overdue';
}

export function ClientMetricStrip({
  totalInvoiced,
  totalPaid,
  outstandingBalance,
  overdueBalance,
  healthScore,
  avgDaysToPay,
  lastPaymentDate,
  lastPaymentAmount,
  onFilterChange,
  activeFilter = 'all',
}: ClientMetricStripProps) {
  const tiles = [
    {
      key: 'all' as const,
      label: 'Total Invoiced',
      value: formatZAR(totalInvoiced),
      activeClass: '',
      valueClass: '',
    },
    {
      key: 'paid' as const,
      label: 'Total Paid',
      value: formatZAR(totalPaid),
      activeClass: 'ring-1 ring-green-500/30',
      valueClass: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'outstanding' as const,
      label: 'Outstanding',
      value: formatZAR(outstandingBalance),
      activeClass: 'ring-1 ring-amber-500/30',
      valueClass: outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : '',
    },
    {
      key: 'overdue' as const,
      label: 'Overdue',
      value: formatZAR(overdueBalance),
      activeClass: 'ring-1 ring-red-500/30',
      valueClass: overdueBalance > 0 ? 'text-red-600 dark:text-red-400' : '',
    },
  ];

  const healthBadgeClass = {
    'Excellent': 'bg-green-500 text-white',
    'Good': 'bg-blue-500 text-white',
    'At Risk': 'bg-orange-500 text-white',
    'Critical': 'bg-red-500 text-white',
  }[healthScore] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="flex flex-col gap-3">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Card
            key={tile.key}
            onClick={() => onFilterChange?.(tile.key)}
            className={cn(
              'shadow-sm border-muted-foreground/10 bg-card transition-all duration-150',
              onFilterChange && 'cursor-pointer hover:border-muted-foreground/30',
              activeFilter === tile.key && tile.activeClass,
            )}
          >
            <CardHeader className="p-3 pb-1">
              <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {tile.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <span className={cn('text-base font-bold tabular-nums', tile.valueClass)}>
                {tile.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground px-0.5">
        <span className="flex items-center gap-1.5">
          Health:
          <Badge className={cn('text-[10px] px-1.5 py-0 font-semibold', healthBadgeClass)}>
            {healthScore}
          </Badge>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          Avg Pay: <span className="font-semibold text-foreground">
            {avgDaysToPay > 0 ? `${avgDaysToPay} days` : 'Immediate'}
          </span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          Last Payment:{' '}
          <span className="font-semibold text-foreground">
            {lastPaymentDate
              ? `${fmtDate(lastPaymentDate)}${lastPaymentAmount ? ` · ${formatZAR(lastPaymentAmount)}` : ''}`
              : 'None recorded'}
          </span>
        </span>
      </div>
    </div>
  );
}
```

---

## Change 2 — Compute Metric Strip Values in the Workspace

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

The workspace already imports `getSASTToday` and `formatZAR`. Add the missing imports and compute the values that `ClientMetricStrip` needs.

**Add to imports:**
```typescript
import { ClientMetricStrip } from './client-metric-strip';
import { calculateClientHealth, calculateAverageDaysToPay } from '@/lib/client-billing-helpers';
```

**Add these computed values** inside the component body, after the existing `const router = ...` and state declarations but before the `useEffect`. Place them together as a clearly labelled block:

```typescript
// ── Metric Strip Computations ──────────────────────────────────────────────
const todayStrWS = getSASTToday();
const activeInvoicesWS = invoices.filter(
  (inv) => inv.status !== 'void' && inv.status !== 'draft' && inv.invoiceDate <= todayStrWS
);
const totalInvoicedWS = activeInvoicesWS.reduce((sum, inv) => sum + Number(inv.total), 0);
const totalPaidWS = (payments?.data ?? []).reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);
const outstandingBalanceWS = activeInvoicesWS.reduce(
  (sum, inv) => sum + (Number(inv.total) - Number(inv.allocatedAmount ?? 0)),
  0
);
const overdueBalanceWS = activeInvoicesWS
  .filter(
    (inv) =>
      (inv.status === 'overdue' || inv.status === 'issued' || inv.status === 'partially_paid') &&
      inv.dueDate &&
      inv.dueDate < todayStrWS
  )
  .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.allocatedAmount ?? 0)), 0);

const healthWS = calculateClientHealth(invoices, outstandingBalanceWS, overdueBalanceWS);
const avgDaysToPayWS = calculateAverageDaysToPay(invoices);
const sortedPaymentsWS = [...(payments?.data ?? [])].sort((a: any, b: any) =>
  b.date.localeCompare(a.date)
);
const lastPaymentWS = sortedPaymentsWS[0] ?? null;
```

**Add metric strip filter state** with the other `useState` declarations:
```typescript
const [metricFilter, setMetricFilter] = useState<'all' | 'paid' | 'outstanding' | 'overdue'>('all');
```

---

## Change 3 — Restructure the Main JSX Layout

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

The current main `return` renders in this order:
1. Off-screen container
2. Header panel
3. Collapsible edit form
4. `<ClientFinancialDashboard ... />`
5. Quick action buttons strip
6. `<Tabs>` block

**Remove `<ClientFinancialDashboard ... />` from this position entirely.** It will be placed inside the new Analytics tab (Change 4).

**Remove the existing quick action buttons strip** (the `<div className="flex flex-wrap gap-2 items-center">` containing the three Link buttons). It will be re-added inside the header area.

**After the Collapsible edit form block and before the `<Tabs>` block, insert:**
```tsx
{/* Metric Strip */}
<ClientMetricStrip
  totalInvoiced={totalInvoicedWS}
  totalPaid={totalPaidWS}
  outstandingBalance={outstandingBalanceWS}
  overdueBalance={overdueBalanceWS}
  healthScore={healthWS.score}
  avgDaysToPay={avgDaysToPayWS}
  lastPaymentDate={lastPaymentWS?.date ?? null}
  lastPaymentAmount={lastPaymentWS ? Number(lastPaymentWS.amount) : null}
  onFilterChange={setMetricFilter}
  activeFilter={metricFilter}
/>

{/* Quick Actions */}
<div className="flex flex-wrap gap-2 items-center">
  <Button asChild size="sm" variant="default" className="shadow-sm">
    <Link href="/billing/invoices/new">
      <Plus className="size-4 mr-1" /> New Invoice
    </Link>
  </Button>
  <Button asChild size="sm" variant="outline">
    <Link href="/billing/quotes/new">
      <Plus className="size-4 mr-1" /> New Quote
    </Link>
  </Button>
  <Button asChild size="sm" variant="outline" className="border-green-200 hover:bg-green-50/50 dark:border-green-900/50 dark:hover:bg-green-950/20">
    <Link href={`/billing/payments/add?clientId=${client.id}`}>
      <Plus className="size-4 mr-1 text-green-600 dark:text-green-400" /> Record Payment
    </Link>
  </Button>
</div>
```

---

## Change 4 — Add Analytics Tab

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

**In the `<TabsList>` block**, add a fifth tab trigger after "Statement":
```tsx
<TabsTrigger value="analytics" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">
  Analytics
</TabsTrigger>
```

**In the `<CardHeader>` of the document browser card**, update the `CardTitle` text to handle the analytics tab:
```tsx
<CardTitle className="text-sm font-semibold capitalize">
  {activeTab === 'analytics' ? 'Client Analytics' : activeTab}
</CardTitle>
<CardDescription className="text-xs">
  {activeTab === 'statement'
    ? 'Configure and preview the client account statement'
    : activeTab === 'analytics'
    ? 'Full financial health, ageing analysis, and billing activity'
    : 'Select documents to view or batch process'}
</CardDescription>
```

**In the `<CardContent>` block, after the Statement `TabsContent` and before the closing `</CardContent>`, add:**
```tsx
{/* ANALYTICS TAB */}
<TabsContent value="analytics" className="m-0 p-4">
  <ClientFinancialDashboard
    invoices={invoices}
    quotes={quotes}
    payments={payments.data}
  />
</TabsContent>
```

**Update the `onValueChange` handler on `<Tabs>`** to handle the new tab value. In the existing switch-like logic inside `onValueChange`, add a case for `analytics`:
```typescript
} else if (val === 'analytics') {
  // No document selection change needed for analytics tab
  setSelectedInvoiceIds(new Set());
  setSelectedQuoteIds(new Set());
  setIsPreviewOpen(false);
}
```

---

## Change 5 — Show Top 3 Activity Events by Default

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-financial-dashboard.tsx`

**Locate the `useState` for activity expansion:**
```typescript
const [isActivityExpanded, setIsActivityExpanded] = useState(false);
```

**Change the default to `true`:**
```typescript
const [isActivityExpanded, setIsActivityExpanded] = useState(true);
```

**Locate the `activityEvents.map(...)` block** inside the expanded content. Currently it maps all events. Slice to the first 5 by default, with a "show all" toggle:

Add a second state variable:
```typescript
const [showAllActivity, setShowAllActivity] = useState(false);
```

**Modify the map to respect the limit:**
```tsx
{(showAllActivity ? activityEvents : activityEvents.slice(0, 5)).map((evt) => (
  // ... existing event row JSX unchanged ...
))}
{activityEvents.length > 5 && (
  <button
    onClick={() => setShowAllActivity(!showAllActivity)}
    className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 self-start"
  >
    {showAllActivity ? 'Show less' : `Show all ${activityEvents.length} events`}
  </button>
)}
```

---

## Summary Checklist

```
Phase 2 — Complete when all boxes are checked:

[x] New file: client-metric-strip.tsx
    - 4 KPI tiles: Total Invoiced, Total Paid, Outstanding, Overdue
    - Info row: Health badge · Avg Pay · Last Payment
    - onFilterChange prop accepted (wired up in Phase 4)
    - activeFilter prop accepted (visual ring on active tile)
    - Renders correctly with all null/zero values

[x] client-billing-workspace.tsx — Metric strip computations
    - ClientMetricStrip and helper imports added
    - All 6 computed values derived correctly
    - metricFilter state declared

[x] client-billing-workspace.tsx — Layout
    - ClientFinancialDashboard removed from main layout body
    - Quick action buttons removed from old position
    - Metric strip renders between collapsible form and tabs
    - Quick action buttons render below metric strip
    - Page no longer shows full dashboard before the tab browser

[x] client-billing-workspace.tsx — Analytics tab
    - "Analytics" TabsTrigger added to TabsList
    - TabsContent for analytics renders ClientFinancialDashboard
    - CardHeader description handles analytics tab
    - onValueChange handles 'analytics' tab value

[x] client-financial-dashboard.tsx — Activity feed
    - Activity accordion expanded by default
    - First 5 events shown by default
    - "Show all N events" / "Show less" toggle works
```