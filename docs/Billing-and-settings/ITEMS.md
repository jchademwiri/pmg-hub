# Items (Service Catalogue)

The Items section is a reusable catalogue of service-based line items. Items are created once and selected when building invoices or quotes — either from a combobox dropdown or typed as one-off entries. All items are service-based; there is no stock or quantity tracking.

---

## Route Map

| Route | Page | Status |
|---|---|---|
| `/billing/items` | Items catalogue list | 🔜 Shell — wire up data |
| `/billing/items/new` | New item form | 🔜 Shell — wire up form |
| `/billing/items/[id]` | Item detail / edit | 🔜 Shell — wire up data |

---

## `/billing/items` — List

**File:** `src/app/(admin)/billing/items/page.tsx`

Overview of all saved service items.

**Stats row (3 cards)**

| Stat | Icon | Description |
|---|---|---|
| Total Items | Package | All items in the catalogue |
| Active | CheckCircle | Available for selection in forms |
| Archived | Archive | Hidden from selection, retained for history |

Stats are currently hardcoded to `'—'`. Wire to `getAllItems()` aggregates.

**Table columns**

| Column | Notes |
|---|---|
| Name | Short label, links to `/billing/items/{id}` |
| Description | Truncated at ~80 chars |
| Unit Price | `formatZAR(unitPrice)`, right-aligned |
| VAT | "15%" or "Exempt" |
| Status | Badge: Active / Archived |
| Actions | Dropdown: Edit (→ `[id]` page), Archive/Unarchive (archiving sets status=`archived` + isActive=`false`; restoring sets status=`active` + isActive=`true`), Delete |

Shows `EmptyState` with CTA to `/billing/items/new` when no items exist. Includes `Preview mock item →` dev link (remove before production).

**Data to fetch (server component):**
```typescript
const [items, stats] = await Promise.all([
  getAllItems(),
  getItemStats(),   // { total, active, archived }
])
```

---

## `/billing/items/new` — Create

**File:** `src/app/(admin)/billing/items/new/page.tsx`

Single-column form (`max-w-2xl mx-auto`) — one card.

**Item Details card — fields:**

| Field | Notes |
|---|---|
| Name* | Short label used in the combobox dropdown (e.g. "Website Maintenance") |
| Description | Longer text that pre-fills the line item description on invoices/quotes |
| Unit Price* | Default price in ZAR; can be overridden per line item |
| Unit Label | Optional label shown next to quantity (e.g. "hour", "month", "project") |

> **VAT Applicable toggle removed.** VAT is controlled at the document level via the Summary sidebar toggle, not per item. All items are treated as VAT-neutral in the catalogue.

**Actions:** Save Item, Cancel (→ `/billing/items`)

**On submit:** call `createItem(data)` → redirect to `/billing/items/{id}`

---

## `/billing/items/[id]` — Detail / Edit

**File:** `src/app/(admin)/billing/items/[id]/page.tsx`

**URL param:** `id` — the item identifier

Same two-column layout as invoice/quote detail: `lg:col-span-2` content + `col-span-1` sidebar.

**Header:**
- Back → `/billing/items`
- Item name + Status badge
- "Created {createdAt}" subtitle

**Header actions:**
- **Archive / Unarchive** — Archiving an item automatically sets its `status` to `'archived'` **and** `isActive` to `false`. Restoring (unarchiving) automatically sets `status` back to `'active'` **and** `isActive` to `true`. These two fields always move together — no manual toggle needed. Shell shows disabled Archive button
- Delete (Trash2) — disabled in shell. Requires confirmation. Guard: if item has been used on any document, prefer archiving (show warning)

**Main content (left) — Item Details card:**

| Field | Notes |
|---|---|
| Name | Editable text input |
| Description | Editable textarea |
| Unit Price | Editable number input |
| Unit Label | Editable text input (optional) |

> **VAT Applicable toggle removed.** VAT is no longer a per-item setting. It is controlled at the document level.

**Actions:** Save Changes, Cancel (→ `/billing/items`)

**Sidebar (right) — two sticky cards:**

- **Usage card** — "Invoices: N" and "Quotes: N". "Used on N documents in total." Links to most recent documents in v2.
- **Details card** — Status badge, VAT (Applicable / Exempt), Created date

**Data to fetch:**
```typescript
const item = await getItemById(id)
if (!item) notFound()
// Usage counts from item.usageInvoices + item.usageQuotes
```

---

## Using Items in Invoices and Quotes

When a user adds a line item on the quote or invoice create form, the description field is a **combobox** — they must pick an existing item from the catalogue. Free-form one-off entries are **not permitted**.

### Combobox Behaviour

- Renders as a text input with a dropdown list (shadcn `Command` + `Popover` pattern)
- Typing filters items by name or description (client-side from a pre-fetched list for small catalogues)
- Selecting an item pre-fills the row:
  - **Description** ← item's description
  - **Unit Price** ← item's default unit price
- All pre-filled values remain editable on the row — changing them does not update the catalogue item
- If no matching item is found, the user must create one in `/billing/items/new` first — no ad-hoc entries
- Archived items do **not** appear in the dropdown

### Line Item Row Fields

| Field | Source | Editable |
|---|---|---|
| Description | From selected item | ✅ Yes (can refine wording per document) |
| Qty | Defaults to 1 | ✅ Yes |
| Unit Price | From selected item | ✅ Yes |
| Line Total | Qty × Unit Price — calculated | ❌ Read-only |

> **VAT per line item removed.** VAT is no longer a per-row field. It is applied globally via the document-level VAT toggle in the Summary sidebar.

---

## Database Schema

```typescript
// packages/db/src/schema/billing.ts (add to existing billing schema)

export const billingItems = pgTable('billing_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  description:  text('description'),
  unitPrice:    numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  unitLabel:    text('unit_label'),              // e.g. 'hour', 'month', 'project'
  // vatApplicable removed — VAT is controlled at the document level, not per item
  status:       text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  isActive:     boolean('is_active').notNull().default(true),
  // status and isActive always move together:
  //   archive  → status='archived', isActive=false
  //   restore  → status='active',   isActive=true
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  index('billing_items_status_idx').on(t.status),
  index('billing_items_name_idx').on(t.name),
])

export type BillingItem    = typeof billingItems.$inferSelect
export type NewBillingItem = typeof billingItems.$inferInsert
```

Items are global to the workspace (not per-division). VAT is applied at the invoice/quote level via the document-level VAT toggle, not stored on the item.

---

## Query Functions

```typescript
// packages/db/src/queries/billing.ts

getAllItems(filters?: { status?: 'active' | 'archived' }): Promise<BillingItem[]>
// Returns all items, default filter: status = 'active'. Sorted by name ASC.

getItemById(id: string): Promise<BillingItemDetail | null>
// Returns item + usageInvoices count + usageQuotes count

getItemStats(): Promise<{ total: number; active: number; archived: number }>

// For the combobox in forms:
getActiveItems(): Promise<{ id: string; name: string; description: string | null; unitPrice: string; vatApplicable: boolean }[]>
```

---

## Server Actions

```typescript
// apps/admin/src/app/actions/billing-items.ts
'use server'

createItem(data: CreateItemInput): Promise<{ error?: string; id?: string }>
updateItem(id: string, data: UpdateItemInput): Promise<{ error?: string }>
archiveItem(id: string): Promise<{ error?: string }>
  // Sets status → 'archived' AND isActive → false (always together)
unarchiveItem(id: string): Promise<{ error?: string }>
  // Sets status → 'active' AND isActive → true (always together)
deleteItem(id: string): Promise<{ error?: string }>       // guard: no usage on documents

// Zod schemas:
const ItemSchema = z.object({
  name:          z.string().min(1).max(200),
  description:   z.string().max(2000).optional().nullable(),
  unitPrice:     z.coerce.number().min(0),
  unitLabel:     z.string().max(50).optional().nullable(),
  // vatApplicable removed — VAT is document-level
})
```

---

## Implementation Notes

- **VAT toggle removed from items.** The `vatApplicable` field and its toggle are no longer part of the item form or detail page. VAT is controlled at the document level via the Summary sidebar toggle on quotes and invoices.
- **Archive/restore auto-sets `isActive`.** `archiveItem` must set both `status = 'archived'` and `isActive = false` in the same update. `unarchiveItem` must set both `status = 'active'` and `isActive = true`. These two fields are always in sync — never update one without the other.
- **Combobox** is built from shadcn `Command` + `Popover`. Pre-fetch active items at page load via `getActiveItems()` and filter client-side for small catalogues.
- **All line items on quotes and invoices must come from the catalogue.** The combobox does not allow free-form text entry — users must select an existing active item. Archived items do not appear in the dropdown.
- **Deletion guard** — if an item has been used on any `billing_line_items` row, show a warning and suggest archiving instead.
- **`itemId` on line items** — the current `billing_line_items` schema does not store an `itemId` FK. This is intentional for v1. Add `itemId uuid nullable FK → billing_items` in v2 to enable usage tracking and the Usage card.
- **Unit label** — shown in the quantity column of the line items table (e.g. "5 hours" instead of "5"). Display as `{qty} {unitLabel}` when `unitLabel` is set.
- **Archived items** appear in the items list page but not in the combobox dropdown. They still appear in historical line item data.
- **`updatedAt`** is application-managed — set explicitly on every update.
- Dev preview link (`Preview mock item →`) should be removed before production.
