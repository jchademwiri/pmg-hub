# Items (Service Catalogue)

The Items section is a reusable catalogue of service-based line items. Items are created once and then selected when building invoices or quotes — either from a dropdown or by typing to search. All items are service-based; there is no stock or quantity tracking.

---

## Route Map

| Route | Page | Type | Status |
|---|---|---|---|
| `/billing/items` | Items list | Server | 🔜 Placeholder |
| `/billing/items/new` | New item form | Server | 🔜 Placeholder |
| `/billing/items/[id]` | Item detail / edit | Server | 🔜 Placeholder |

---

## `/billing/items` — List

**File:** `src/app/(admin)/billing/items/page.tsx`

Overview of all saved service items.

**Stats row (3 cards)**
| Stat | Description |
|---|---|
| Total Items | All items in the catalogue |
| Active | Items available for selection |
| Archived | Items hidden from selection but retained for history |

**Table columns**
- Name
- Description (truncated)
- Unit Price
- VAT Applicable (Yes / No)
- Status (Active / Archived)
- Actions (overflow menu — Edit, Archive, Delete)

Shows `EmptyState` with a CTA to `/billing/items/new` when no items exist.

---

## `/billing/items/new` — Create

**File:** `src/app/(admin)/billing/items/new/page.tsx`

Single-column form for creating a new service item.

**Item Details card**
- Name — short label used in the search dropdown (e.g. "Website Maintenance", "SEO Audit")
- Description — longer description that pre-fills the line item description on an invoice or quote
- Unit Price — default price; can be overridden per line item when invoicing
- VAT Applicable — toggle; defaults to `true` (15% VAT)
- Unit Label — optional label shown next to quantity (e.g. "hour", "month", "project"); defaults to blank

**Actions**
- Save Item
- Cancel

---

## `/billing/items/[id]` — Detail / Edit

**File:** `src/app/(admin)/billing/items/[id]/page.tsx`

**URL param:** `id` — the item identifier

Same form layout as `/billing/items/new`, pre-populated with existing values.

**Header actions**
- Archive / Unarchive — toggles the item's availability in the search dropdown without deleting it
- Delete — permanently removes the item (confirmation required)

**Usage card (sidebar or bottom)**
- Shows how many invoices and quotes this item has been used on
- Links to the most recent documents that include this item

---

## Using Items in Invoices and Quotes

When adding a line item on `/billing/invoices/new`, `/billing/invoices/[id]`, `/billing/quotes/new`, or `/billing/quotes/[id]`, the "Add Line Item" action opens an inline row with an item search field.

### Item Search Field

- Renders as a **combobox** — a text input with a dropdown list
- Typing filters items by name or description (client-side fuzzy match or server search)
- Selecting an item pre-fills the row:
  - **Description** ← item's description
  - **Unit Price** ← item's default unit price
  - **VAT** ← item's VAT applicable flag
- All pre-filled values remain editable on the line item row
- If no matching item is found, the user can type a custom description directly without selecting from the catalogue

### Line Item Row Fields

| Field | Source | Editable |
|---|---|---|
| Description | From selected item (or typed manually) | ✅ Yes |
| Qty | Defaults to `1` | ✅ Yes |
| Unit Price | From selected item | ✅ Yes |
| VAT | From selected item flag | ✅ Yes |
| Amount | Qty × Unit Price (calculated) | ❌ Read-only |

### Behaviour Notes

- Archived items do **not** appear in the search dropdown
- An item can still be typed manually as a one-off line item without saving it to the catalogue
- Changing the description, price, or VAT on a line item does **not** update the catalogue item — it only affects that document

---

## Data Model

```
Item {
  id          String   (cuid)
  name        String   — short display name
  description String?  — default line item description
  unitPrice   Decimal  — default price (ZAR)
  vatApplicable Boolean — default true
  unitLabel   String?  — e.g. "hour", "month", "project"
  status      Enum     — ACTIVE | ARCHIVED
  createdAt   DateTime
  updatedAt   DateTime
}
```

Items are global to the workspace (not per-division). Division-specific VAT rates and currency are applied at the invoice/quote level, not stored on the item.

---

## Implementation Notes

- **Combobox component** — use a `Combobox` built from shadcn/ui `Command` + `Popover`. The trigger is an `Input`-style field; the dropdown renders a filtered list of items. See the shadcn `Combobox` pattern.
- **Search** — for small catalogues, filter client-side from a pre-fetched list. For larger catalogues, debounce and hit a server action or API route.
- **Pre-fill on select** — when an item is selected, call a setter to update the line item row's `description`, `unitPrice`, and `vatApplicable` fields in the form state.
- **One-off items** — if the user types without selecting from the dropdown, treat the input as a plain text description with no catalogue link.
- **Archived items** — filter `status === 'ACTIVE'` in the query used to populate the combobox. Archived items still appear in the item list page and in historical line item data.
- **Deletion guard** — if an item has been used on any invoice or quote, prefer archiving over deletion. Show a warning if the user attempts to delete a used item.
- **All pages are server components** — fetch item data in the page and pass down to client components for the form and combobox interactivity, consistent with the pattern used across `/billing` and `/clients`.
