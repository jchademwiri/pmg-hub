# Quality of Life & UI Polish Backlog

This document tracks **Quick Wins** and **Medium Effort** tasks specifically designed to improve, polish, and harden the features that are already implemented. It does not contain structural overhauls or new major features.

## Quick Wins (10 - 30 minutes each)

These are isolated, low-risk UI tweaks and code clean-ups that will immediately improve the application's feel.

1. **Centralize Date Formatting (`QW-1`)**
   - **Problem:** There are inline `.toLocaleString('en-ZA', ...)` calls scattered across the billing and reporting modules.
   - **Fix:** Add a `fmtDateTime()` utility to `apps/admin/src/lib/format.ts` and replace the inline calls.
   - **Impact:** Ensures timezone consistency and formatting rules are identical everywhere.

2. **Fix Invoice Sidebar Layout (`QW-2`)**
   - **Problem:** The summary sidebar on the Create Invoice and Create Quote pages does not stick to the top of the screen as the user scrolls down the line items.
   - **Fix:** Add `self-start` to the `lg:sticky` container in `quote-form-client.tsx` and `invoice-form-client.tsx`.

3. **Wrap Action Buttons (`QW-3`)**
   - **Problem:** On medium screen sizes (tablets), the header action buttons on the Invoice Detail and Quote Detail pages break layout or overflow horizontally.
   - **Fix:** Add `flex-wrap` to the action bar container div.

4. **Income Records Table Overflow (`QW-4`)**
   - **Problem:** The Income Records table at the bottom of the Client Statement page breaks its card boundary on small mobile screens.
   - **Fix:** Wrap the table in a `<div className="overflow-x-auto">` container.

5. **Fix "All-Time" Card Headers (`QW-5`)**
   - **Problem:** Certain summary cards (e.g. Total Revenue) read "All-Time" but do not clarify if that includes locked snapshots or only active ledgers.
   - **Fix:** Add tooltips or clarify the text to ensure the user knows exactly what range is being queried.

---

## Medium Effort (1 - 3 hours each)

These tasks involve minor logic updates, Server Action tweaks, or cross-component state management, but are still focused purely on polishing existing flows.

1. **Overdue Invoice Auto-Flagging (`M-1`)**
   - **Problem:** The "Overdue" stat card on the Invoices list page currently shows 0 because the invoice status is not dynamically computed based on the due date.
   - **Fix:** Implement a dynamic compute function or DB job to check if `status === 'issued' && dueDate < new Date()`. Update the UI to reflect the "Overdue" state automatically.

2. **Statement Income Year Filtering (`M-2`)**
   - **Problem:** The `incomeResult` query on the Statement detail page pulls in all-time payments, causing payments from prior years to bleed into the selected year's view.
   - **Fix:** Pass the selected `year` filter into `getAllIncome({ clientId, year })` and restrict the query to the correct PMG financial year (1 March – 28 Feb).

3. **Free-Text Search on Clients and Invoices (`M-3`)**
   - **Problem:** As the number of clients and invoices grows, finding a specific record becomes difficult without pagination or search.
   - **Fix:** Add a Debounced Search Input to the filter bars for Clients and Invoices. Pass the `query` param to the DB query helper and use the `ilike` Drizzle operator.

4. **Mark Paid from Invoice Dropdown (`M-4`)**
   - **Problem:** To mark an invoice as paid, the user currently has to click into the Invoice Detail page.
   - **Fix:** Move the `MarkPaidButton` logic into the action dropdown on the Invoice List table (`invoices-client.tsx`) to allow quick-paying directly from the list.

5. **Unsaved Changes Warning (`M-5`)**
   - **Problem:** Users can accidentally navigate away from the "New Quote" or "New Invoice" form while filling out line items, losing their progress.
   - **Fix:** Implement a `window.onbeforeunload` hook in the client forms if `isDirty` or `lineItems.length > 0`.

6. **Client Detail → New Invoice Shortcut (`M-6`)**
   - **Problem:** Creating a new invoice for a specific client requires going to `/billing/invoices/new` and searching the client dropdown.
   - **Fix:** Add a "Create Invoice" button on the Client Detail page that links to `/billing/invoices/new?clientId=123`. Update `invoice-form-client.tsx` to read the URL parameter and pre-select the client.
