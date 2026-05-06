# PMG Control Center — Navigation Implementation Plan (Next.js)

Implementation guide for the PMG sidebar + modules in a **Next.js 16+ App
Router** project.

## Current Stack

- Next.js 16.2.1 App Router (`src/app/` directory, RSC by default)
- Server Actions for mutations (`src/app/actions/`)
- Drizzle ORM + PostgreSQL via `@pmg/db` workspace package
- Tailwind CSS 4 + shadcn/ui (radix-vega style, zinc base)
- `lucide-react` 1.7.0 for icons
- Better Auth 1.5.6 with magic link authentication
- Resend 4.8.0 for email delivery
- Recharts 3.8.0 for data visualization

---

## 0. Sidebar Layout

### Current Implementation (Flat List)

The sidebar currently uses a **flat list** of navigation items without grouping:

1. Dashboard
2. Income
3. Expenses
4. Categories (`/expense-categories`)
5. Corporate Ledger
6. Accounts
7. Clients
8. Leads
9. Divisions
10. Snapshots
11. Reports
12. **Users** (super_admin only, in footer)

**Missing:** Billing group (Quotations, Invoices, Statements) and Settings page.

### Target Layout (Grouped & Collapsible)

Collapsible groups, each with a group icon. **Overview renders as a static
(non-collapsible) group** because it contains only one link. **System is
pinned to the bottom**. When collapsed (`collapsible="icon"`), only item icons
render and group headers hide.

| Group             | Group icon         | Items                                                         | Status                          |
|-------------------|--------------------|---------------------------------------------------------------|---------------------------------|
| Overview (static) | `Home`             | Dashboard                                                     | ✅ Exists at `/dashboard`       |
| Finance           | `Banknote`         | Income · Expenses · Categories · Corporate Ledger · Accounts  | ✅ All exist                    |
| Billing           | `FileSpreadsheet`  | Quotations · Invoices · Statements                            | ❌ **Missing — shell pages added** |
| Relationships     | `Network`          | Clients · Leads · Divisions                                   | ✅ All exist                    |
| Insights          | `LineChart`        | Snapshots · Reports                                           | ✅ Both exist                   |
| **System** (bottom) | `Cog`            | Users · Settings                                              | ⚠️ Users ✅, Settings ❌ added  |

**Behavior:**
- Multi-item groups are collapsible via shadcn `<Collapsible>` + chevron rotation.
- Active group auto-expands (matched against `usePathname()`).
- Single-item groups (Overview) render as a plain label without a toggle.
- Active item highlighted via `pathname.startsWith(item.url)`.

### Updated `src/components/layout/app-sidebar.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Banknote, FileSpreadsheet, Network, LineChart, Cog,
  LayoutDashboard, TrendingUp, TrendingDown, Tags, BookOpen, Wallet,
  FileText, Receipt, ScrollText, Users, UserPlus, Building2,
  Camera, BarChart3, Settings, ChevronDown, UserCog, PiggyBank,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SignOutButton } from '@/components/layout/sign-out-button'

type NavItem = { title: string; url: string; icon: React.ElementType }

const overview: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
]
const finance: NavItem[] = [
  { title: 'Income',           url: '/income',             icon: TrendingUp },
  { title: 'Expenses',         url: '/expenses',           icon: TrendingDown },
  { title: 'Categories',       url: '/expense-categories', icon: Tags },
  { title: 'Corporate Ledger', url: '/ledger',             icon: BookOpen },
  { title: 'Accounts',         url: '/accounts',           icon: PiggyBank },
]
const billing: NavItem[] = [
  { title: 'Quotations', url: '/billing/quotes',     icon: FileText },
  { title: 'Invoices',   url: '/billing/invoices',   icon: Receipt },
  { title: 'Statements', url: '/billing/statements', icon: ScrollText },
]
const relationships: NavItem[] = [
  { title: 'Clients',   url: '/clients',   icon: Users },
  { title: 'Leads',     url: '/leads',     icon: UserPlus },
  { title: 'Divisions', url: '/divisions', icon: Building2 },
]
const insights: NavItem[] = [
  { title: 'Snapshots', url: '/snapshots', icon: Camera },
  { title: 'Reports',   url: '/reports',   icon: BarChart3 },
]
const system: NavItem[] = [
  { title: 'Users',    url: '/users',    icon: UserCog },
  { title: 'Settings', url: '/settings', icon: Settings },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const isActive = (url: string) => pathname.startsWith(url)

  const renderMenu = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <Link href={item.url} className="flex items-center gap-2">
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )

  const renderStaticGroup = (label: string, GroupIcon: React.ElementType, items: NavItem[]) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="flex items-center gap-2">
          <GroupIcon className="size-3.5" />
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
    </SidebarGroup>
  )

  const renderCollapsibleGroup = (label: string, GroupIcon: React.ElementType, items: NavItem[]) => {
    const hasActive = items.some((i) => isActive(i.url))
    if (collapsed) {
      return (
        <SidebarGroup>
          <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
        </SidebarGroup>
      )
    }
    return (
      <Collapsible defaultOpen={hasActive} className="group/collapsible">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-foreground">
              <span className="flex items-center gap-2">
                <GroupIcon className="size-3.5" />
                {label}
              </span>
              <ChevronDown className="size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    )
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link href="/dashboard" className="flex flex-col gap-0.5 px-2 py-3 hover:opacity-80 transition-opacity">
          <span className="text-sidebar-foreground/50 text-xs uppercase tracking-widest">PMG</span>
          <span className="text-sidebar-foreground text-sm font-semibold">Control Center</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {renderStaticGroup('Overview', Home, overview)}
        {renderCollapsibleGroup('Finance', Banknote, finance)}
        {renderCollapsibleGroup('Billing', FileSpreadsheet, billing)}
        {renderCollapsibleGroup('Relationships', Network, relationships)}
        {renderCollapsibleGroup('Insights', LineChart, insights)}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-1">
          {renderCollapsibleGroup('System', Cog, system)}
          <div className="mx-2 h-px bg-sidebar-border" />
          <div className="px-2 py-2 flex flex-col gap-2">
            <div>
              <span className="text-sidebar-foreground text-sm font-medium">{user.name}</span>
              <span className="text-sidebar-foreground/50 text-xs block">{user.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Note:** The System group replaces the old conditional `super_admin` check for Users.
Access control for admin-only pages is enforced at the page/action level, not the nav.

### `src/components/layout/top-nav.tsx` — Route Labels to Update

Add billing routes to `ROUTE_LABELS`:

```ts
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/income':             'Income',
  '/expenses':           'Expenses',
  '/expense-categories': 'Categories',
  '/ledger':             'Corporate Ledger',
  '/accounts':           'Accounts',
  '/billing/quotes':     'Quotations',
  '/billing/invoices':   'Invoices',
  '/billing/statements': 'Statements',
  '/clients':            'Clients',
  '/leads':              'Leads',
  '/divisions':          'Divisions',
  '/snapshots':          'Financial Snapshots',
  '/reports':            'Reports & Insights',
  '/users':              'Users',
  '/settings':           'Settings',
}
```

### Current Admin Layout (`src/app/(admin)/layout.tsx`)

No changes needed — layout already uses `AppSidebar` with `SidebarProvider`.

---

## 1. Conventions

- **Routes**: `src/app/(admin)/<segment>/page.tsx`. Nested e.g.
  `src/app/(admin)/billing/quotes/page.tsx`.
- **Data layer**:
  - **Reads** in Server Components via `@pmg/db` package functions.
  - **Writes** as Server Actions → `src/app/actions/<area>.ts` (`"use server"`).
- **Schema**: Managed in `packages/db/` workspace package.
- **UI primitives**: Module-specific components in `src/components/<module>/`.
- **Money**: `src/lib/format.ts` → `formatZAR(amount)`.
- **List page anatomy**: metrics → filters (search params) → table → row actions.
- **Cache**: use `revalidatePath()` / `revalidateTag()` after mutating Server Actions.

### Full Route Map

```
src/app/(admin)/
  layout.tsx                          ✅ Admin layout with sidebar + auth guard
  dashboard/page.tsx                  ✅ Dashboard
  income/page.tsx                     ✅ Income tracking
  expenses/page.tsx                   ✅ Expense tracking
  expense-categories/page.tsx         ✅ Expense categories
  ledger/page.tsx                     ✅ Corporate ledger
  accounts/page.tsx                   ✅ Accounts
  billing/                            ❌ → shell pages added
    quotes/page.tsx
    quotes/new/page.tsx
    quotes/[id]/page.tsx
    invoices/page.tsx
    invoices/new/page.tsx
    invoices/[id]/page.tsx
    statements/page.tsx
    statements/[clientId]/page.tsx
  clients/page.tsx                    ✅ Client management
  leads/page.tsx                      ✅ Lead management
  divisions/page.tsx                  ✅ Division management
  snapshots/page.tsx                  ✅ Financial snapshots
  reports/page.tsx                    ✅ Reports & insights
  users/page.tsx                      ✅ User management
  settings/page.tsx                   ❌ → shell page added
```

---

## 2. Overview

### `/dashboard` — Dashboard

**Status:** ✅ **Implemented**

- KPI cards (revenue, expenses, profit pool, outstanding)
- Revenue by division chart (Recharts, `"use client"` wrapper)
- Budget tracking cards
- Close month button
- Components in `src/components/dashboard/`

---

## 3. Finance

### `/income` — Income Tracking

**Status:** ✅ **Implemented**

- Table of incoming payments with filters (month, division, account, source)
- Will be auto-populated when invoices are marked PAID (billing phase)
- Actions in `src/app/actions/income.ts`
- Components in `src/components/income/`

### `/expenses` — Expense Tracking

**Status:** ✅ **Implemented**

- Table of outgoing payments with filters (category, account, division, month)
- Actions in `src/app/actions/expenses.ts`
- Components in `src/components/expenses/`

### `/expense-categories` — Categories

**Status:** ✅ **Implemented** (route is `/expense-categories`, not `/categories`)

- Category management with color coding
- Components in `src/components/expense-categories/`

### `/ledger` — Corporate Ledger

**Status:** ✅ **Implemented**

- Consolidated income + expense view across divisions with running balance
- Actions in `src/app/actions/ledger.ts`
- Components in `src/components/ledger/`

### `/accounts` — Account Management

**Status:** ✅ **Implemented**

- Bank, cash, and virtual account tracking
- Components in `src/components/accounts/`
- Actions in `src/app/actions/account-withdrawal.ts`

---

## 4. Billing *(Next build phase)*

### `/billing/quotes` — Quotations

**Status:** 🔲 **Shell page created**

- List + metrics (total quotes, value, conversion rate)
- Filters via search params (status, client, division, date range)
- Row link → `[id]/page.tsx`

### `/billing/quotes/new` — New Quotation

**Status:** 🔲 **Shell page created**

- Client component form against `createQuotation` server action
- Dynamic line items with live totals (subtotal, VAT, total)
- After insert → `redirect("/billing/quotes/" + id)`

### `/billing/quotes/[id]` — Quote Detail

**Status:** 🔲 **Shell page created**

- Status workflow: DRAFT → SENT → ACCEPTED → DECLINED → CANCELLED
- **Convert to invoice** action → `convertQuoteToInvoice(id)`
- Edit mode when DRAFT; read-only otherwise

### `/billing/invoices` — Invoices

**Status:** 🔲 **Shell page created**

- List + metrics (Outstanding, Overdue, Paid, total invoiced)
- Filters (status, client, division, date range)

### `/billing/invoices/new` — New Invoice

**Status:** 🔲 **Shell page created**

- Direct invoice creation (not from quote)
- Same line items form as quotation

### `/billing/invoices/[id]` — Invoice Detail

**Status:** 🔲 **Shell page created**

- Issue · mark paid · void actions
- Marking paid auto-inserts an `income` row in the same DB transaction
- Edits locked when status is PAID or VOID

### `/billing/statements` — Client Statements

**Status:** 🔲 **Shell page created**

- Per-client summary list

### `/billing/statements/[clientId]` — Client Statement Detail

**Status:** 🔲 **Shell page created**

- All quotes + invoices + payments for a client
- Outstanding balance and aging breakdown

### Components to Build (`src/components/billing/`)

- `quote-form.tsx` — Quotation form with dynamic line items
- `invoice-form.tsx` — Invoice form with dynamic line items
- `line-items-form.tsx` — Reusable line items editor (qty, unit price, tax rate, total)
- `status-badge.tsx` — Quote/invoice status display
- `billing-table.tsx` — Reusable table for quotes/invoices
- `convert-to-invoice-button.tsx` — Quote → invoice conversion
- `mark-paid-button.tsx` — Invoice payment action
- `billing-metrics.tsx` — KPI cards for billing list pages

### Server Actions to Build (`src/app/actions/`)

- `billing-quotes.ts` — `createQuotation`, `updateQuotation`, `sendQuotation`,
  `acceptQuotation`, `declineQuotation`, `cancelQuotation`, `convertQuoteToInvoice`
- `billing-invoices.ts` — `createInvoice`, `issueInvoice`, `markInvoicePaid`,
  `voidInvoice` (paid auto-inserts income row in same transaction)
- `billing-statements.ts` — `getClientStatement`

### Server Action Template

```ts
// src/app/actions/billing-quotes.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@pmg/db'
import { getSessionOrRedirect } from '@/lib/auth'

const LineSchema = z.object({
  description: z.string().min(1).max(500),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
})

const QuoteSchema = z.object({
  clientId: z.string().uuid(),
  divisionId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  lines: z.array(LineSchema).min(1).max(100),
})

export async function createQuotation(input: unknown) {
  await getSessionOrRedirect()
  const data = QuoteSchema.parse(input)
  const db = getDb()

  // TODO: implement once billing schema is in @pmg/db
  // const id = await db.transaction(async (tx) => { ... })

  revalidatePath('/billing/quotes')
  redirect(`/billing/quotes/new`) // update to /billing/quotes/${id} after schema
}
```

---

## 5. Relationships

### `/clients` — Client Management

**Status:** ✅ **Implemented**

- Client directory with add/edit
- Actions in `src/app/actions/clients.ts`
- Components in `src/components/clients/`
- **Future:** link to quotes, invoices, statement once billing is live

### `/leads` — Lead Management

**Status:** ✅ **Implemented**

- Pipeline with status tabs (New, Contacted, Qualified, Won, Lost)
- `convertLeadToClient(id)` action
- Actions in `src/app/actions/leads.ts`
- Components in `src/components/leads/`

### `/divisions` — Division Management

**Status:** ✅ **Implemented**

- CRUD divisions; each stores document number prefix for billing
- Actions in `src/app/actions/divisions.ts`
- Components in `src/components/divisions/`

---

## 6. Insights

### `/snapshots` — Financial Snapshots

**Status:** ✅ **Implemented**

- Period-end snapshots triggered by Close Month on dashboard
- Automated via cron at `/api/cron/snapshot`
- Actions in `src/app/actions/snapshots.ts`

### `/reports` — Reports & Analytics

**Status:** ✅ **Implemented**

- Expense by category, MoM comparison, profit pool, revenue by division
- CSV export
- Components in `src/components/reports/`
- Actions in `src/app/actions/reports.ts`
- **Future:** AR Aging (requires billing), VAT report, P&L statement

---

## 7. System *(pinned to sidebar bottom)*

### `/users` — User Management

**Status:** ✅ **Implemented**

- Team members with role badges (super_admin, admin, viewer)
- Invitation system via magic link
- Role stored on user record via Better Auth `additionalFields`
- Actions in `src/app/actions/users.ts`
- Components in `src/components/users/`

### `/settings` — System Settings

**Status:** 🔲 **Shell page created**

**Planned sections:**
- Company profile (name, address, contact, logo)
- Document numbering (prefixes per division, sequences)
- Tax settings (VAT rate, registration number)
- Branding (colors, logo, email templates)

---

## 8. Database Schema Notes

Schema lives in `packages/db/`. Billing tables to add:

```
quotations           (id, number, client_id, division_id, status, subtotal, tax, total, notes, terms, issued_at, expires_at)
invoices             (id, number, client_id, division_id, status, subtotal, tax, total, due_date, po_number, quotation_id?, income_id?)
billing_line_items   (id, parent_kind, parent_id, description, qty, unit_price, tax_rate, total)
document_sequences   (year, prefix, kind, last_number)   -- atomic numbering
```

Enums: `quote_status` (DRAFT, SENT, ACCEPTED, DECLINED, CANCELLED),
`invoice_status` (DRAFT, ISSUED, PAID, VOID, OVERDUE).

`getNextDocumentNumber()` runs inside a DB transaction with
`SELECT ... FOR UPDATE` on `document_sequences` to prevent duplicate numbers.

---

## 9. Build Order

1. **Phase 0** *(done)* — Core finance, relationships, insights, users.
2. **Phase 1** — Billing schema in `@pmg/db` + `getNextDocumentNumber`.
3. **Phase 2** — `/billing/quotes` end-to-end (form, actions, detail, status workflow).
4. **Phase 3** — `/billing/invoices` + income auto-insert on paid.
5. **Phase 4** — `/billing/statements` per-client view.
6. **Phase 5** — `/settings` company profile + document numbering.
7. **Phase 6** — AR Aging report, VAT report, P&L in `/reports`.

Shell pages for all billing routes and settings already exist so navigation
never breaks while modules come online.
