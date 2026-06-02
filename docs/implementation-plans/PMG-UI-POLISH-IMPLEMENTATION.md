# PMG Control Center - UI Polish: Collapsible Add Forms
**Document version:** 1.0  
**Target codebase:** `pmg-hub` monorepo  
**Implementing agent:** Kilo-Code (VS Code)

---

## Overview

This document standardises the "add record" UX pattern across all data-entry pages. The reference implementation already exists on the **Corporate Ledger** page (`/ledger`). Every other page that currently renders its add-form permanently visible will be updated to match that pattern.

### The Target Pattern (from `/ledger`)

1. Page loads with **only** a header card containing a title and an "Add …" button.
2. Clicking the button reveals a **card-wrapped form** inline below the header.
3. A **Cancel** button hides the form again.
4. On successful submission the form resets and hides automatically.
5. The "Add …" button is disabled while the form is open.

### Pages in scope

| Page | Form component | Bug to fix |
|---|---|---|
| `/income` | `IncomeAddForm` | **Duplicate render** - form rendered twice, remove the second instance |
| `/expenses` | `ExpenseAddForm` | - |
| `/clients` | `ClientAddForm` | - |
| `/leads` | `LeadAddForm` | - |
| `/divisions` | `DivisionAddForm` | - |

---

## Critical Rules for the Implementing Agent

1. **One phase at a time.** Complete all file edits for a phase, then run the build gate, then commit. Do not proceed to the next phase until the build passes.
2. **Do not touch** `apps/admin/src/app/(admin)/ledger/` - it is the reference and must not be modified.
3. **Do not touch** any server actions, DB queries, or `financial.ts` - only UI files change.
4. **Preserve all existing props** passed to form components. Only the visibility / wrapper logic changes.
5. **TypeScript must compile with zero errors** before each commit.
6. Each phase has an explicit **Build Gate** command and a **Git Commit** command. Run them exactly as written.

---

## Phase 1 - Income Page

### Files to edit

#### 1. `apps/admin/src/app/(admin)/income/page.tsx`

**What to change:**
- Convert this server component so its `<IncomeAddForm>` is no longer rendered here at all.
- Instead, render a new client shell component `<IncomePageClient>` that owns the toggle state.
- Remove the **duplicate** `<IncomeAddForm>` render (there are currently two - both must go).
- Keep all data-fetching (`getAllIncome`, `getAllDivisions`, `getAllClients`, `getDistinctIncomeMonths`) in the server component and pass results as props.

**Resulting structure of `page.tsx` (server component):**
```tsx
// apps/admin/src/app/(admin)/income/page.tsx
import type { Metadata } from 'next';
import { getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths } from '@pmg/db';
import { createIncome, updateIncome, deleteIncome } from '@/app/actions/income';
import { FilterBar } from '@/components/income/filter-bar';
import { SetPageTotal } from '@/components/layout/page-header-context';
import { formatZAR } from '@/lib/format';
import IncomePageClient from './income-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Income' };

interface IncomePageProps {
  searchParams: Promise<{ divisionId?: string; month?: string; page?: string }>;
}

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const { divisionId, month, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, divisions, clients, months] = await Promise.all([
    getAllIncome({ divisionId, month }, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllClients(),
    getDistinctIncomeMonths(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="green" />
      <FilterBar
        divisions={divisions}
        months={months}
        currentDivisionId={divisionId}
        currentMonth={month}
      />
      <IncomePageClient
        entries={result.data}
        total={result.total}
        sum={result.sum}
        currentPage={currentPage}
        pageSize={pageSize}
        divisions={divisions}
        clients={clients}
        divisionId={divisionId}
        month={month}
        createAction={createIncome}
        deleteAction={deleteIncome}
        updateAction={updateIncome}
      />
    </div>
  );
}
```

#### 2. Create `apps/admin/src/app/(admin)/income/income-client.tsx` (new file)

This is the new client shell, modelled exactly on `ledger-client.tsx`.

```tsx
'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IncomeAddForm } from '@/components/income/income-add-form';
import { IncomeTable } from '@/components/income/income-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { IncomeRow } from '@pmg/db';

interface IncomePageClientProps {
  entries: IncomeRow[];
  total: number;
  sum: number;
  currentPage: number;
  pageSize: number;
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  divisionId?: string;
  month?: string;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
}

export default function IncomePageClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisions,
  clients,
  divisionId,
  month,
  createAction,
  deleteAction,
  updateAction,
}: IncomePageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Income</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Income
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <IncomeAddForm
            divisions={divisions}
            clients={clients}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {entries.length === 0 && !isAdding ? (
        <EmptyState
          message={
            divisionId || month
              ? 'No income entries match the current filters.'
              : 'No income entries yet.'
          }
          filtered={!!(divisionId || month)}
        />
      ) : (
        <>
          <IncomeTable
            entries={entries}
            divisions={divisions}
            clients={clients}
            deleteAction={deleteAction}
            updateAction={updateAction}
          />
          {total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total} entries
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?page=${currentPage - 1}${divisionId ? `&divisionId=${divisionId}` : ''}${month ? `&month=${month}` : ''}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < total && (
                  <a
                    href={`?page=${currentPage + 1}${divisionId ? `&divisionId=${divisionId}` : ''}${month ? `&month=${month}` : ''}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

> **Note on the `createAction` wrapper:** The client shell wraps `createAction` so it can call `setIsAdding(false)` on success. This is the same technique used in the ledger client. The `IncomeAddForm` already calls the action and shows errors - we just intercept the success path.

### Phase 1 Build Gate

```bash
cd /path/to/pmg-hub
bun run build
```

Expected: **zero TypeScript errors, zero build errors.**

### Phase 1 Git Commit

```bash
git add apps/admin/src/app/\(admin\)/income/
git commit -m "feat(ui): collapsible add form on income page, fix duplicate form render"
```

---

## Phase 2 - Expenses Page

### Files to edit

#### 1. `apps/admin/src/app/(admin)/expenses/page.tsx`

Remove the permanently-visible `<ExpenseAddForm>` and the "Add Expense" `<Button>` from the server component. Replace with a new client shell `<ExpensesPageClient>`.

**Resulting structure of `page.tsx`:**
```tsx
// apps/admin/src/app/(admin)/expenses/page.tsx
import type { Metadata } from 'next';
import {
  getAllExpenses,
  getAllDivisions,
  getAllExpenseCategories,
  getDistinctExpenseMonths,
  getAllClients,
} from '@pmg/db';
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses';
import { ExpenseFilterBar } from '@/components/expenses/expense-filter-bar';
import { SetPageTotal } from '@/components/layout/page-header-context';
import { formatZAR } from '@/lib/format';
import ExpensesPageClient from './expenses-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Expenses' };

interface ExpensePageProps {
  searchParams: Promise<{ divisionId?: string; category?: string; month?: string; page?: string }>;
}

export default async function ExpensePage({ searchParams }: ExpensePageProps) {
  const { divisionId, category, month, page } = await searchParams;
  const filters = {
    divisionId: divisionId || undefined,
    category: category || undefined,
    month: month || undefined,
  };
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, divisions, categoryObjects, months, clients] = await Promise.all([
    getAllExpenses(filters, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllExpenseCategories(),
    getDistinctExpenseMonths(),
    getAllClients(),
  ]);

  const categories = categoryObjects.map((c) => c.name);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="amber" />
      <ExpenseFilterBar
        divisions={divisions}
        categories={categories}
        months={months}
        currentDivisionId={filters.divisionId}
        currentCategory={filters.category}
        currentMonth={filters.month}
      />
      <ExpensesPageClient
        entries={result.data}
        total={result.total}
        sum={result.sum}
        currentPage={currentPage}
        pageSize={pageSize}
        divisions={divisions}
        categories={categories}
        clients={clients}
        divisionId={filters.divisionId}
        category={filters.category}
        month={filters.month}
        createAction={createExpense}
        deleteAction={deleteExpense}
        updateAction={updateExpense}
      />
    </div>
  );
}
```

#### 2. Create `apps/admin/src/app/(admin)/expenses/expenses-client.tsx` (new file)

```tsx
'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseAddForm } from '@/components/expenses/expense-add-form';
import { ExpenseTable } from '@/components/expenses/expense-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { ExpenseRow } from '@pmg/db';

interface ExpensesPageClientProps {
  entries: ExpenseRow[];
  total: number;
  sum: number;
  currentPage: number;
  pageSize: number;
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  divisionId?: string;
  category?: string;
  month?: string;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
}

export default function ExpensesPageClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisions,
  categories,
  clients,
  divisionId,
  category,
  month,
  createAction,
  deleteAction,
  updateAction,
}: ExpensesPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Expenses</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <ExpenseAddForm
            divisions={divisions}
            categories={categories}
            clients={clients}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {entries.length === 0 && !isAdding ? (
        <EmptyState
          message={
            divisionId || category || month
              ? 'No expense entries match the current filters.'
              : 'No expense entries yet.'
          }
          filtered={!!(divisionId || category || month)}
        />
      ) : (
        <>
          <ExpenseTable
            entries={entries}
            divisions={divisions}
            categories={categories}
            clients={clients}
            deleteAction={deleteAction}
            updateAction={updateAction}
          />
          {total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total} entries
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?page=${currentPage - 1}${divisionId ? `&divisionId=${divisionId}` : ''}${category ? `&category=${category}` : ''}${month ? `&month=${month}` : ''}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < total && (
                  <a
                    href={`?page=${currentPage + 1}${divisionId ? `&divisionId=${divisionId}` : ''}${category ? `&category=${category}` : ''}${month ? `&month=${month}` : ''}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### Phase 2 Build Gate

```bash
bun run build
```

Expected: **zero TypeScript errors, zero build errors.**

### Phase 2 Git Commit

```bash
git add apps/admin/src/app/\(admin\)/expenses/
git commit -m "feat(ui): collapsible add form on expenses page"
```

---

## Phase 3 - Clients Page

### Files to edit

#### 1. `apps/admin/src/app/(admin)/clients/page.tsx`

Remove the permanently-visible `<ClientAddForm>` and the "Add Client" `<Button>`. Replace with `<ClientsPageClient>`.

**Resulting structure of `page.tsx`:**
```tsx
// apps/admin/src/app/(admin)/clients/page.tsx
import type { Metadata } from 'next';
import { getClientsWithIncomeCount } from '@pmg/db';
import { createClient, deleteClient, toggleClientActive } from '@/app/actions/clients';
import { ClientsTable } from '@/components/clients/clients-table';
import { EmptyState } from '@/components/ui/empty-state';
import ClientsPageClient from './clients-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const clients = await getClientsWithIncomeCount();

  return (
    <ClientsPageClient
      clients={clients}
      createAction={createClient}
      deleteAction={deleteClient}
      toggleActiveAction={toggleClientActive}
    />
  );
}
```

#### 2. Create `apps/admin/src/app/(admin)/clients/clients-client.tsx` (new file)

```tsx
'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientAddForm } from '@/components/clients/client-add-form';
import { ClientsTable } from '@/components/clients/clients-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { ClientWithIncomeCount } from '@pmg/db';

interface ClientsPageClientProps {
  clients: ClientWithIncomeCount[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function ClientsPageClient({
  clients,
  createAction,
  deleteAction,
  toggleActiveAction,
}: ClientsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Clients</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Client
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <ClientAddForm
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {clients.length === 0 && !isAdding ? (
        <EmptyState message="No clients yet." />
      ) : (
        <ClientsTable
          clients={clients}
          deleteAction={deleteAction}
          toggleActiveAction={toggleActiveAction}
        />
      )}
    </div>
  );
}
```

> **Note:** The existing `ClientAddForm` uses `formRef.current?.reset()` on success internally. The wrapper's `setIsAdding(false)` on the outer shell triggers after the action resolves without error, so both the form reset and the hide happen correctly.

### Phase 3 Build Gate

```bash
bun run build
```

Expected: **zero TypeScript errors, zero build errors.**

### Phase 3 Git Commit

```bash
git add apps/admin/src/app/\(admin\)/clients/
git commit -m "feat(ui): collapsible add form on clients page"
```

---

## Phase 4 - Leads Page

### Files to edit

#### 1. `apps/admin/src/app/(admin)/leads/page.tsx`

Remove the permanently-visible `<LeadAddForm>` and the "Add Lead" `<Button>`. Replace with `<LeadsPageClient>`. Keep `<LeadStatusTabs>` and `<LeadsFilterBar>` in the server component.

**Resulting structure of `page.tsx`:**
```tsx
// apps/admin/src/app/(admin)/leads/page.tsx
import type { Metadata } from 'next';
import {
  getAllLeads,
  getLeadCountsByStatus,
  getAllDivisions,
  getDistinctLeadSources,
} from '@pmg/db';
import { createLead, deleteLead } from '@/app/actions/leads';
import { LeadStatusTabs } from '@/components/leads/lead-status-tabs';
import { LeadsFilterBar } from '@/components/leads/leads-filter-bar';
import LeadsPageClient from './leads-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leads' };

interface LeadsPageProps {
  searchParams: Promise<{ status?: string; divisionId?: string; source?: string }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { status, divisionId, source } = await searchParams;

  const [entries, counts, divisions, sources] = await Promise.all([
    getAllLeads({ status, divisionId, source }),
    getLeadCountsByStatus(),
    getAllDivisions(),
    getDistinctLeadSources(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <LeadStatusTabs
        counts={counts}
        currentStatus={status}
        currentDivisionId={divisionId}
        currentSource={source}
      />
      <LeadsFilterBar
        divisions={divisions}
        sources={sources}
        currentDivisionId={divisionId}
        currentSource={source}
        currentStatus={status}
      />
      <LeadsPageClient
        entries={entries}
        divisions={divisions}
        status={status}
        divisionId={divisionId}
        source={source}
        createAction={createLead}
        deleteAction={deleteLead}
      />
    </div>
  );
}
```

#### 2. Create `apps/admin/src/app/(admin)/leads/leads-client.tsx` (new file)

```tsx
'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadAddForm } from '@/components/leads/lead-add-form';
import { LeadsTable } from '@/components/leads/leads-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { LeadRow } from '@pmg/db';

interface LeadsPageClientProps {
  entries: LeadRow[];
  divisions: { id: string; name: string }[];
  status?: string;
  divisionId?: string;
  source?: string;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

export default function LeadsPageClient({
  entries,
  divisions,
  status,
  divisionId,
  source,
  createAction,
  deleteAction,
}: LeadsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Leads</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <LeadAddForm
            divisions={divisions}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {entries.length === 0 && !isAdding ? (
        <EmptyState
          message={
            status || divisionId || source
              ? 'No leads match the current filters.'
              : 'No leads yet.'
          }
          filtered={!!(status || divisionId || source)}
        />
      ) : (
        <LeadsTable entries={entries} deleteAction={deleteAction} />
      )}
    </div>
  );
}
```

### Phase 4 Build Gate

```bash
bun run build
```

Expected: **zero TypeScript errors, zero build errors.**

### Phase 4 Git Commit

```bash
git add apps/admin/src/app/\(admin\)/leads/
git commit -m "feat(ui): collapsible add form on leads page"
```

---

## Phase 5 - Divisions Page

### Files to edit

#### 1. `apps/admin/src/app/(admin)/divisions/page.tsx`

Remove the permanently-visible `<DivisionAddForm>` and the "Add Division" `<Button>`. Replace with `<DivisionsPageClient>`.

**Resulting structure of `page.tsx`:**
```tsx
// apps/admin/src/app/(admin)/divisions/page.tsx
import type { Metadata } from 'next';
import { getDivisionsWithStats } from '@pmg/db';
import {
  createDivision,
  updateDivision,
  deleteDivision,
  toggleDivisionActive,
} from '@/app/actions/divisions';
import DivisionsPageClient from './divisions-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Divisions' };

export default async function DivisionsPage() {
  const divisions = await getDivisionsWithStats();

  return (
    <DivisionsPageClient
      divisions={divisions}
      createAction={createDivision}
      updateAction={updateDivision}
      deleteAction={deleteDivision}
      toggleActiveAction={toggleDivisionActive}
    />
  );
}
```

#### 2. Create `apps/admin/src/app/(admin)/divisions/divisions-client.tsx` (new file)

```tsx
'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DivisionAddForm } from '@/components/divisions/division-add-form';
import { DivisionsTable } from '@/components/divisions/divisions-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { DivisionRow } from '@pmg/db';

interface DivisionsPageClientProps {
  divisions: DivisionRow[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function DivisionsPageClient({
  divisions,
  createAction,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: DivisionsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Divisions</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Division
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <DivisionAddForm
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {divisions.length === 0 && !isAdding ? (
        <EmptyState message="No divisions yet." />
      ) : (
        <DivisionsTable
          divisions={divisions}
          updateAction={updateAction}
          deleteAction={deleteAction}
          toggleActiveAction={toggleActiveAction}
        />
      )}
    </div>
  );
}
```

### Phase 5 Build Gate

```bash
bun run build
```

Expected: **zero TypeScript errors, zero build errors.**

### Phase 5 Git Commit

```bash
git add apps/admin/src/app/\(admin\)/divisions/
git commit -m "feat(ui): collapsible add form on divisions page"
```

---

## Phase 6 - Ledger Page Label Fix

The current `ledger-client.tsx` has one small inconsistency - the button label says **"Add Withdrawal"** but should say **"Add Ledger Entry"** to match the new terminology.

### Files to edit

#### `apps/admin/src/app/(admin)/ledger/ledger-client.tsx`

Find and replace:
```tsx
// BEFORE
<Button onClick={() => setIsAdding(true)} disabled={isAdding}>
  <Plus className="h-4 w-4 mr-2" /> Add Withdrawal
</Button>

// AFTER
<Button onClick={() => setIsAdding(true)} disabled={isAdding}>
  <Plus className="h-4 w-4 mr-2" /> Add Ledger Entry
</Button>
```

### Phase 6 Build Gate

```bash
bun run build
```

Expected: **zero TypeScript errors, zero build errors.**

### Phase 6 Git Commit

```bash
git add apps/admin/src/app/\(admin\)/ledger/ledger-client.tsx
git commit -m "fix(ui): correct ledger page button label from 'Add Withdrawal' to 'Add Ledger Entry'"
```

---

## Summary of All Changes

| Phase | Files created | Files modified | Bug fixed |
|---|---|---|---|
| 1 - Income | `income/income-client.tsx` | `income/page.tsx` | ✅ Duplicate `<IncomeAddForm>` removed |
| 2 - Expenses | `expenses/expenses-client.tsx` | `expenses/page.tsx` | - |
| 3 - Clients | `clients/clients-client.tsx` | `clients/page.tsx` | - |
| 4 - Leads | `leads/leads-client.tsx` | `leads/page.tsx` | - |
| 5 - Divisions | `divisions/divisions-client.tsx` | `divisions/page.tsx` | - |
| 6 - Ledger fix | - | `ledger/ledger-client.tsx` | ✅ Wrong button label corrected |

**Total new files:** 5  
**Total modified files:** 6  
**Total commits:** 6

---

## Pattern Reference Card

Every client shell follows this identical structure. Copy this if you need to apply the same pattern to any future page:

```tsx
'use client';
import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
// ... import your AddForm, Table, EmptyState

export default function XxxPageClient({ ..., createAction, ... }) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">

      {/* 1. Header card - always visible */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Page Title</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Thing
        </Button>
      </div>

      {/* 2. Collapsible form - only when isAdding */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <XxxAddForm
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false); // hide on success
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* 3. Table or empty state */}
      {entries.length === 0 && !isAdding ? (
        <EmptyState message="Nothing yet." />
      ) : (
        <XxxTable ... />
      )}

    </div>
  );
}
```

---

*End of document. Implement phases sequentially. Build must pass before each commit.*
