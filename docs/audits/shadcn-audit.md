# PMG Control Center - shadcn/ui Component Audit
**Date:** May 2026

---

## Currently Installed Components

| Component | File |
|---|---|
| Avatar | `ui/avatar.tsx` |
| Badge | `ui/badge.tsx` |
| Breadcrumb | `ui/breadcrumb.tsx` |
| Button | `ui/button.tsx` |
| Card | `ui/card.tsx` |
| Chart | `ui/chart.tsx` |
| Collapsible | `ui/collapsible.tsx` |
| ConfirmDialog *(custom wrapper)* | `ui/confirm-dialog.tsx` |
| Dialog | `ui/dialog.tsx` |
| DropdownMenu | `ui/dropdown-menu.tsx` |
| EmptyState *(custom)* | `ui/empty-state.tsx` |
| Field *(custom)* | `ui/field.tsx` |
| Input | `ui/input.tsx` |
| Label | `ui/label.tsx` |
| Progress | `ui/progress.tsx` |
| ScrollArea | `ui/scroll-area.tsx` |
| Select | `ui/select.tsx` |
| Separator | `ui/separator.tsx` |
| Sheet | `ui/sheet.tsx` |
| Sidebar | `ui/sidebar.tsx` |
| Skeleton | `ui/skeleton.tsx` |
| Sonner (Toast) | `ui/sonner.tsx` |
| Table | `ui/table.tsx` |
| Tooltip | `ui/tooltip.tsx` |

### ❌ Not Installed (need to add)

| Component | Install Command | Needed For |
|---|---|---|
| **Textarea** | `npx shadcn@latest add textarea` | Notes/Terms fields in 4 files |
| **Switch** | `npx shadcn@latest add switch` | VAT toggle in 2 files |

---

## Issues by Priority

---

## 🔴 High Priority

### H-1 - `window.confirm()` → `ConfirmDialog` (7 instances)

A `ConfirmDialog` component already exists at `ui/confirm-dialog.tsx` with a `confirm()` imperative helper and `ConfirmProvider`. None of the destructive actions use it - they all use the native browser dialog which is unstyled and ignores the app's dark theme.

| File | Action | Current |
|---|---|---|
| `components/billing/void-invoice-button.tsx` | Void invoice | `window.confirm()` |
| `components/billing/mark-paid-button.tsx` | Mark invoice paid | `window.confirm()` |
| `components/billing/convert-to-invoice-button.tsx` | Convert quote to invoice | `window.confirm()` |
| `billing/quotes/quotes-client.tsx` | Delete quote from list | `window.confirm()` |
| `billing/invoices/invoices-client.tsx` | Void invoice from list | `window.confirm()` |
| `billing/quotes/[id]/quote-detail-actions.tsx` | Delete draft quote | `window.confirm()` |
| `billing/items/[id]/item-edit-client.tsx` | Delete billing item | `window.confirm()` |

**Fix:** Replace each `window.confirm(...)` with the existing `confirm()` helper:
```tsx
// Before
if (!window.confirm('Void this invoice? This cannot be undone.')) return;

// After
const ok = await confirm({
  title: 'Void Invoice',
  description: 'This cannot be undone.',
  confirmText: 'Void',
  variant: 'destructive',
});
if (!ok) return;
```
Ensure `ConfirmProvider` wraps the layout (check `app/(admin)/layout.tsx`).

---

### H-2 - Native `<textarea>` → shadcn `Textarea` (8 instances across 5 files)

**Install required:** `npx shadcn@latest add textarea`

| File | Fields |
|---|---|
| `billing/quotes/new/quote-form-client.tsx` | Notes, Terms & Conditions |
| `billing/invoices/new/invoice-form-client.tsx` | Notes, Terms & Conditions |
| `settings/billing/billing-settings-client.tsx` | Invoice Notes, Quote Notes/Terms |
| `billing/items/[id]/item-edit-client.tsx` | Description |
| `billing/items/new/item-form-client.tsx` | Description |

**Fix:**
```tsx
// Before
<textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="Optional notes for the client..."
  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ..."
/>

// After
import { Textarea } from '@/components/ui/textarea'
<Textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="Optional notes for the client..."
/>
```

---

### H-3 - Custom VAT toggle → shadcn `Switch` (2 instances)

**Install required:** `npx shadcn@latest add switch`

Both `quote-form-client.tsx` and `invoice-form-client.tsx` have a hand-rolled toggle using a `<button>` wrapping two `<div>`s with manual `translate-x` animation. This duplicates what `Switch` provides.

| File | Location |
|---|---|
| `billing/quotes/new/quote-form-client.tsx` | Summary sidebar, VAT (15%) row |
| `billing/invoices/new/invoice-form-client.tsx` | Summary sidebar, VAT (15%) row |

**Fix:**
```tsx
// Before
<button type="button" onClick={() => setVatEnabled((v) => !v)} ...>
  <div className={`relative h-5 w-9 rounded-full transition-colors ${vatEnabled ? 'bg-primary' : 'bg-input'}`}>
    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${vatEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </div>
</button>

// After
import { Switch } from '@/components/ui/switch'
<Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
```

---

## 🟡 Medium Priority

### M-1 - Native `<label>` → shadcn `Label` (widespread)

`Label` is already installed at `ui/label.tsx`. Across the entire app, form fields use raw `<label className="text-sm font-medium">` instead. This matters for consistent focus styling and accessibility.

**Affected files (all use the same pattern):**
- `components/clients/client-add-form.tsx` - 4 labels
- `components/clients/client-edit-form.tsx` - 4 labels
- `components/income/income-add-form.tsx` - 5 labels
- `components/income/income-edit-form.tsx` - 5 labels
- `components/expenses/expense-add-form.tsx` - 6 labels
- `components/expenses/expense-edit-form.tsx` - 5 labels
- `components/ledger/ledger-add-form.tsx` - 4 labels
- `components/ledger/ledger-edit-form.tsx` - 4 labels
- `components/divisions/division-add-form.tsx` - 1 label
- `components/users/invite-form.tsx` - 3 labels
- `components/leads/lead-add-form.tsx` - 1 label
- `components/leads/lead-notes-form.tsx` - 1 label
- `billing/quotes/new/quote-form-client.tsx` - 6 labels
- `billing/invoices/new/invoice-form-client.tsx` - 6 labels
- `settings/billing/billing-settings-client.tsx` - multiple labels
- `components/accounts/account-card.tsx` - 3 labels

**Fix:**
```tsx
// Before
<label htmlFor="client-name" className="text-sm font-medium">Name</label>

// After
import { Label } from '@/components/ui/label'
<Label htmlFor="client-name">Name</Label>
```

---

### M-2 - Pagination links → `Button` with `asChild` (2 files)

Quotes and invoices list pages use raw `<Link>` with manual border/hover classes for pagination instead of the Button component.

| File | Location |
|---|---|
| `billing/quotes/quotes-client.tsx` | Previous / Next pagination |
| `billing/invoices/invoices-client.tsx` | Previous / Next pagination |

**Fix:**
```tsx
// Before
<Link href={buildHref(currentPage - 1)} className="rounded-md border px-3 py-1 text-sm hover:bg-muted transition-colors">
  Previous
</Link>

// After
<Button variant="outline" size="sm" asChild>
  <Link href={buildHref(currentPage - 1)}>Previous</Link>
</Button>
```

---

### M-3 - Custom card-like divs → shadcn `Card` (1 file)

`clients-client.tsx` uses raw `<div className="bg-card p-4 rounded-xl border border-border shadow-sm">` for the page header and the collapsible add-form container instead of the `Card` component.

| File | Instances |
|---|---|
| `relationships/clients/clients-client.tsx` | 2 (header div, form container div) |

**Fix:** Replace both with `<Card><CardHeader>` / `<CardContent>` as appropriate.

---

### M-4 - Custom inline badges → shadcn `Badge` (2 files)

`Badge` is already installed. Two places use custom `<span>` with hardcoded colour classes instead.

| File | Field | Current |
|---|---|---|
| `finance/accounts/[account]/page.tsx` | Credit / Debit type column | Custom `<span>` with `bg-green-500/15` / `bg-amber-500/15` |
| `billing/statements/[clientId]/page.tsx` | Transaction type | Custom `<span>` with inline colour classes |

**Fix:**
```tsx
// Before
<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
  row.type === 'credit' ? 'bg-green-500/15 text-green-500' : 'bg-amber-500/15 text-amber-500'
}`}>
  {row.type}
</span>

// After
import { Badge } from '@/components/ui/badge'
<Badge variant={row.type === 'credit' ? 'default' : 'secondary'}>{row.type}</Badge>
```

---

## 🟢 Already Correct

| Area | Status |
|---|---|
| All `<button>` elements | ✅ Using shadcn `Button` |
| All `<input>` elements | ✅ Using shadcn `Input` |
| All `<select>` elements | ✅ Using shadcn `Select` (fixed in Rev 6) |
| All tables | ✅ Using shadcn `Table` |
| All dropdowns | ✅ Using shadcn `DropdownMenu` |
| All modals | ✅ Using shadcn `Dialog` |
| All tooltips | ✅ Using shadcn `Tooltip` |
| All toasts | ✅ Using `sonner` via shadcn |
| Billing status badges | ✅ Custom `BillingStatusBadge` (intentional, semantic colours) |
| Document preview badges | ✅ Custom `StatusPill` (intentional, print-safe colours) |

---

## Summary

### Components to Install
```bash
npx shadcn@latest add textarea
npx shadcn@latest add switch
```

### Change Count by Priority

| Priority | Issues | Files Affected |
|---|---|---|
| 🔴 High | 3 issues, 17 instances | 9 files |
| 🟡 Medium | 4 issues, ~60 instances | ~18 files |
| 🟢 None | - | - |

### Recommended Order
1. Install `Textarea` + `Switch` (2 commands, 5 min)
2. Replace VAT toggles with `Switch` - 2 files (15 min)
3. Replace `<textarea>` with `Textarea` - 5 files (20 min)
4. Replace `window.confirm()` with `confirm()` helper - 7 files (30 min)
5. Replace `<label>` with `Label` - 16 files (1 hour, low risk, high volume)
6. Replace pagination links with `Button asChild` - 2 files (10 min)
7. Replace custom card divs - 1 file (10 min)
8. Replace custom inline badges - 2 files (10 min)

---

*Generated: May 2026 - PMG Control Center shadcn/ui Audit*
