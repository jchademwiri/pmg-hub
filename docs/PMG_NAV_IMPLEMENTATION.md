# PMG Control Center — Navigation Implementation Plan (Next.js)

Implementation guide for the PMG sidebar + modules in a **Next.js 14+ App
Router** project. Stack assumptions:

- Next.js App Router (`app/` directory, RSC by default)
- Server Actions for mutations
- Drizzle ORM + PostgreSQL (Neon or Supabase Postgres)
- Tailwind + shadcn/ui
- `lucide-react` for icons
- NextAuth (or Clerk/Supabase Auth) for sessions

---

## 0. Sidebar Layout

Collapsible groups, each with a group icon. **Overview renders as a static
(non-collapsible) group** because it contains only one link. **System is
pinned to the bottom**. When collapsed (`collapsible="icon"`), only item icons
render and group headers hide.

| Group           | Group icon       | Items |
|-----------------|------------------|-------|
| Overview (static) | `Home`         | Dashboard |
| Finance         | `Banknote`       | Income · Expenses · Categories · Corporate Ledger · Accounts |
| Billing         | `FileSpreadsheet`| Quotations · Invoices · Statements |
| Relationships   | `Network`        | Clients · Leads · Divisions |
| Insights        | `LineChart`      | Snapshots · Reports |
| **System** (bottom) | `Cog`        | Users · Settings |

Behavior:
- Multi-item groups are collapsible via shadcn `<Collapsible>` + chevron rotation.
- Active group auto-expands (matched against `usePathname()`).
- Single-item groups (Overview) render as a plain label without a toggle.
- Active item highlighted via `pathname.startsWith(item.url)`.

### Reference component (`components/app-sidebar.tsx`)

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Banknote, FileSpreadsheet, Network, LineChart, Cog,
  LayoutDashboard, TrendingUp, TrendingDown, Tags, BookOpen, Wallet,
  FileText, Receipt, ScrollText, Users, UserPlus, Building2,
  Camera, BarChart3, Settings, ChevronDown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const overview: NavItem[]      = [{ title: "Dashboard", url: "/", icon: LayoutDashboard }];
const finance: NavItem[]       = [
  { title: "Income",           url: "/income",     icon: TrendingUp },
  { title: "Expenses",         url: "/expenses",   icon: TrendingDown },
  { title: "Categories",       url: "/categories", icon: Tags },
  { title: "Corporate Ledger", url: "/ledger",     icon: BookOpen },
  { title: "Accounts",         url: "/accounts",   icon: Wallet },
];
const billing: NavItem[]       = [
  { title: "Quotations", url: "/billing/quotes",     icon: FileText },
  { title: "Invoices",   url: "/billing/invoices",   icon: Receipt },
  { title: "Statements", url: "/billing/statements", icon: ScrollText },
];
const relationships: NavItem[] = [
  { title: "Clients",   url: "/clients",   icon: Users },
  { title: "Leads",     url: "/leads",     icon: UserPlus },
  { title: "Divisions", url: "/divisions", icon: Building2 },
];
const insights: NavItem[]      = [
  { title: "Snapshots", url: "/snapshots", icon: Camera },
  { title: "Reports",   url: "/reports",   icon: BarChart3 },
];
const system: NavItem[]        = [
  { title: "Users",    url: "/users",    icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  const renderMenu = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <Link href={item.url} className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const renderGroup = (
    label: string,
    GroupIcon: typeof Home,
    items: NavItem[],
    options: { collapsible?: boolean } = { collapsible: true },
  ) => {
    if (collapsed) {
      return (
        <SidebarGroup>
          <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
        </SidebarGroup>
      );
    }
    // Single-item groups (e.g. Overview) render as a static label — no toggle.
    if (options.collapsible === false) {
      return (
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <GroupIcon className="h-3.5 w-3.5" />
            {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
        </SidebarGroup>
      );
    }
    const hasActive = items.some((i) => isActive(i.url));
    return (
      <Collapsible defaultOpen={hasActive} className="group/collapsible">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-foreground">
              <span className="flex items-center gap-2">
                <GroupIcon className="h-3.5 w-3.5" />
                {label}
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">{/* logo */}</SidebarHeader>
      <SidebarContent>
        {renderGroup("Overview",      Home,             overview, { collapsible: false })}
        {renderGroup("Finance",       Banknote,         finance)}
        {renderGroup("Billing",       FileSpreadsheet,  billing)}
        {renderGroup("Relationships", Network,          relationships)}
        {renderGroup("Insights",      LineChart,        insights)}
        <div className="mt-auto">
          {renderGroup("System", Cog, system)}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
```

### Root layout (`app/layout.tsx`)

```tsx
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-14 flex items-center gap-2 border-b px-3 sticky top-0 z-10 bg-background/80 backdrop-blur">
                <SidebarTrigger />
              </header>
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
```

---

## 1. Conventions

- **Routes**: `app/<segment>/page.tsx`. Nested e.g. `app/billing/quotes/page.tsx`,
  `app/billing/quotes/[id]/page.tsx`, `app/billing/quotes/new/page.tsx`.
- **Data layer**:
  - **Reads** in Server Components → `lib/queries/<area>.ts` (Drizzle).
  - **Writes** as Server Actions → `lib/actions/<area>.ts` (`"use server"`).
- **Schema**: `lib/db/schema/<area>.ts`, exported via `lib/db/schema/index.ts`.
- **UI primitives**: shared `<PageHeader>`, `<MetricCard>`, `<StatusBadge>`
  in `components/billing/`.
- **Money**: `lib/format.ts` → `fmt(amount, currency = "ZAR")`.
- **List page anatomy**: metrics → filters (search params) → table → row link to detail.
- **Cache**: use `revalidatePath()` / `revalidateTag()` after mutating Server Actions.

Required folders:

```
app/
  layout.tsx
  page.tsx                     // Dashboard
  income/page.tsx
  expenses/page.tsx
  categories/page.tsx
  ledger/page.tsx
  accounts/page.tsx
  billing/
    quotes/page.tsx
    quotes/new/page.tsx
    quotes/[id]/page.tsx
    invoices/page.tsx
    invoices/[id]/page.tsx
    statements/page.tsx
    statements/[clientId]/page.tsx
  clients/page.tsx
  clients/[id]/page.tsx
  leads/page.tsx
  divisions/page.tsx
  snapshots/page.tsx
  reports/page.tsx
  users/page.tsx
  settings/page.tsx
components/
  app-sidebar.tsx
  billing/{page-header,status-badge,line-items-form,...}.tsx
  ui/...                       // shadcn
lib/
  db/{client.ts, schema/*.ts}
  queries/{billing.ts, finance.ts, ...}
  actions/{billing-quotes.ts, billing-invoices.ts, ...}
  format.ts
  document-numbers.ts
```

---

## 2. Overview

### `/` — Dashboard (`app/page.tsx`)
- Server Component. KPI cards (revenue, expenses, outstanding, paid),
  revenue-by-division chart (`recharts`, in a `"use client"` wrapper), recent
  invoices/quotes.
- Period tabs: Current Month · Previous Month · Year to Date · All-Time
  via `?period=` search param.
- Queries: `getDashboardSummary({ period })`,
  `getRevenueByDivision({ period })`.

---

## 3. Finance

### `/income`
- Table of incoming payments. Filters via search params
  (`?month=&division=&account=&source=`).
- Auto-populated when an invoice is marked **PAID** (Phase 2 link).
- Actions: `createIncome`, `updateIncome`, `deleteIncome`.

### `/expenses`
- Table of outgoing payments. Filters: category, account, division, month.
- Actions: `createExpense`, `updateExpense`, `deleteExpense`.

### `/categories`
- Tabs: Income vs Expense. Tree (parent → child) with color tag.
- Actions: `upsertCategory`, `deleteCategory`.

### `/ledger` — Corporate Ledger
- Read-only consolidated income + expense across divisions, with running balance.
- Query: `getLedger({ from, to, divisionId? })`.

### `/accounts`
- Bank · cash · virtual accounts. `app/accounts/[id]/page.tsx` shows
  transactions and reconciled balance.
- Queries: `listAccounts`, `getAccount(id)`, `getAccountTransactions(id)`.

---

## 4. Billing  *(MVP focus — Phases 0–3)*

### `/billing/quotes`
- List + metrics. Filters via search params. Row link → `[id]/page.tsx`.

### `/billing/quotes/new`
- Client component form using `useFormState` against `createQuotation` server
  action. Dynamic line items, live totals (subtotal, VAT, total).
- After insert → `redirect("/billing/quotes/" + id)` from the action.

### `/billing/quotes/[id]`
- Status workflow: DRAFT → SENT → ACCEPTED → DECLINED → CANCELLED.
- Action: **Convert to invoice** → `convertQuoteToInvoice(id)` →
  `revalidatePath("/billing/invoices")` + redirect.

### `/billing/invoices`
- List + metrics (Outstanding, Overdue, Paid, total invoiced).

### `/billing/invoices/[id]`
- Issue · mark paid · void. Marking paid auto-inserts an `income` row in
  the same DB transaction.
- Lock edits when status is PAID or VOID.

### `/billing/statements`
- Per-client summary. `[clientId]/page.tsx` shows quotes + invoices + payments
  and outstanding balance.

---

## 5. Relationships

### `/clients`
- Directory: name, contact, division, totals, outstanding.
- `[id]/page.tsx`: profile, quotes, invoices, statement link.

### `/leads`
- Pipeline (kanban or table): New · Contacted · Qualified · Won · Lost.
- Action: `convertLeadToClient(id)`.

### `/divisions`
- CRUD divisions. Each stores **document number prefix** consumed by
  `getNextDocumentNumber()`.

---

## 6. Insights

### `/snapshots`
- Period-end financial snapshots. Cron via Vercel Cron or Supabase pg_cron
  hitting an authenticated route handler `/api/cron/snapshot`.

### `/reports`
- Tabs: Revenue · AR Aging · VAT · P&L (basic). CSV/PDF export post-MVP.

---

## 7. System  *(pinned to sidebar bottom)*

### `/users`
- Team members + role badges. Roles in a separate `user_roles` table — never
  store role on profile/users. Use a `has_role(uid, role)` SECURITY DEFINER fn
  for RLS / authorization checks.

### `/settings`
- Sections: Company profile · Document numbering · Tax (VAT) · Branding.

---

## 8. Database Schema (Drizzle)

`lib/db/schema/billing.ts`, etc. Tables to create:

```
divisions            (id, name, prefix, color)
clients              (id, name, contact, email, phone, division_id)
leads                (id, name, contact, stage, division_id, client_id?)
accounts             (id, name, kind, opening_balance, division_id)
categories           (id, name, kind, parent_id, color)
income               (id, date, amount, account_id, category_id, source, invoice_id?, division_id)
expenses             (id, date, amount, account_id, category_id, vendor, division_id)
quotations           (id, number, client_id, division_id, status, subtotal, tax, total, notes, terms, issued_at, expires_at)
invoices             (id, number, client_id, division_id, status, subtotal, tax, total, due_date, po_number, quotation_id?, income_id?)
billing_line_items   (id, parent_kind, parent_id, description, qty, unit_price, tax_rate, total)
document_sequences   (year, prefix, kind, last_number)   -- atomic numbering
snapshots            (id, period, totals_json, created_at)
user_roles           (id, user_id, role)                  -- enum: admin, member
```

Enums: `quote_status`, `invoice_status`, `app_role`.

`getNextDocumentNumber()` lives in `lib/document-numbers.ts` and runs inside a
DB transaction with `SELECT ... FOR UPDATE` on `document_sequences` to prevent
duplicate numbers.

---

## 9. Server Action template

```ts
// lib/actions/billing-quotes.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { quotations, billingLineItems } from "@/lib/db/schema";
import { getNextDocumentNumber } from "@/lib/document-numbers";
import { requireUser } from "@/lib/auth";

const QuoteSchema = z.object({
  clientId: z.string().uuid(),
  divisionId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  lines: z.array(z.object({
    description: z.string().min(1).max(500),
    qty: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    taxRate: z.number().min(0).max(100),
  })).min(1).max(100),
});

export async function createQuotation(input: unknown) {
  await requireUser();
  const data = QuoteSchema.parse(input);

  const id = await db.transaction(async (tx) => {
    const number = await getNextDocumentNumber(tx, { kind: "quote", divisionId: data.divisionId });
    const subtotal = data.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const tax      = data.lines.reduce((s, l) => s + l.qty * l.unitPrice * (l.taxRate / 100), 0);
    const [row] = await tx.insert(quotations).values({
      number, clientId: data.clientId, divisionId: data.divisionId,
      status: "DRAFT", subtotal, tax, total: subtotal + tax,
      notes: data.notes, terms: data.terms,
    }).returning({ id: quotations.id });
    await tx.insert(billingLineItems).values(
      data.lines.map((l) => ({
        parentKind: "quote", parentId: row.id, ...l,
        total: l.qty * l.unitPrice * (1 + l.taxRate / 100),
      }))
    );
    return row.id;
  });

  revalidatePath("/billing/quotes");
  redirect(`/billing/quotes/${id}`);
}
```

---

## 10. Build Order

1. **Phase 0** — Schema, Drizzle migrations, `getNextDocumentNumber`, base queries.
2. **Phase 1** — `/billing/quotes` end-to-end.
3. **Phase 2** — `/billing/invoices` + income auto-insert.
4. **Phase 3** — `/billing/statements`.
5. **Phase 4** — Finance pages.
6. **Phase 5** — Relationships.
7. **Phase 6** — Insights + `/users`, `/settings`.

Each phase ships independently; sidebar shells already exist so navigation
never breaks while modules come online.
