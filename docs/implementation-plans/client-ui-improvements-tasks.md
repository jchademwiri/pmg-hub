# Client UI Improvements — Task List & Implementation Tracker

This document tracks the tasks required to implement the Client Billing Workspace and Bulk Invoice Operations as specified in the [Complete Implementation Plan](file:///D:/websites/pmg-hub/docs/client-ui-improvements.md).

---

### 💡 Recommendations Incorporated
- **Combined PDF Generation:** Generates a single, combined multi-page PDF document sequentially instead of downloading a ZIP to prevent browser crash/memory issues.
- **Partial Failure Resiliency:** Bulk actions show granular status (Success/Error) and support retry loops.
- **Date Range Selector:** Interactive statement filtering instead of a hardcoded current FY default.
- **Adaptive Mobile Layout:** Clean metrics wrapping to preserve vertical space on mobile viewport sizes.

---

- [x] Confirm existing `html2canvas` and `jspdf` libraries are available and imported correctly in client components (no new external packages are required).

---

## 📂 Phase 1: Client Page Tabs & Basic Navigation
*Goal: Replace the single income table with basic tabbed tables for Quotes, Invoices, Payments, and Statement.*

- [x] **Data Fetching Overhaul**
  - Update `apps/admin/src/app/(admin)/relationships/clients/[id]/page.tsx` to load quotes, invoices, and payments in parallel:
    ```typescript
    const [client, quotes, invoices, payments] = await Promise.all([
      getClientById(id),
      getAllQuotations({ clientId: id }),
      getAllInvoices({ clientId: id }),
      getAllIncome({ clientId: id }),
    ]);
    ```
- [x] **Tabbed Navigation Component**
  - Create the container workspace client component: `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`.
  - Set up Shadcn `<Tabs>` with tabs for:
    - **Quotations** (using a simple data table of quotes)
    - **Invoices** (using a simple data table of invoices)
    - **Payments** (re-using the existing income/payments table)
    - **Statement** (container for Statement PDF view with a **custom Date Range picker** option rather than just a static Current FY default)
- [x] **Basic Mobile Handling**
  - Verify that tab tables adapt properly to viewport sizes, and ensure list rows on mobile link directly to document detail pages.

---

## ⚡ Phase 2: Bulk Selection Infrastructure & Server Actions
*Goal: Set up the UI selection state and backend action endpoints for bulk operations.*

- [x] **Server Actions (`apps/admin/src/app/actions/billing-invoices.ts`)**
  - [x] Implement `bulkIssueInvoices(ids: string[])` action:
    - Perform bulk update on eligible drafts.
    - Wrap in a transaction or perform sequential updates; return success count and failure array.
  - [x] Implement `bulkVoidInvoices(ids: string[])` action:
    - Perform bulk update on eligible issued/draft invoices.
    - Include confirmation/permission check on each record.
- [x] **Table Checkbox State (`apps/admin/src/app/(admin)/billing/invoices/invoices-client.tsx` / `client-billing-workspace.tsx`)**
  - Add a select-all checkbox in the table header.
  - Add individual row checkboxes.
  - Track selected invoice IDs in a React `Set<string>`.
- [x] **Floating Action Bar (`client-billing-workspace.tsx`)**
  - Create the floating bar component (shown when selection > 0).
  - Display actions: Download Combined PDF, Bulk Email, Issue Selected, Void Selected.
  - Hook up "Issue" and "Void" buttons to the server actions with confirmation dialogs.

---

## 📊 Phase 3: Client Financial Dashboard
*Goal: Build the financial metrics strip, ageing bar, client health score, and relative activity feed.*

- [x] **Dashboard Utilities (`apps/admin/src/lib/`)**
  - [x] Create `client-health.ts`:
    - Pure utility `calculateClientHealth(invoices, payments)` returning `Excellent`, `Good`, `At Risk`, or `Critical`.
  - [x] Create `client-activity.ts`:
    - Pure utility `buildActivityFeed(quotes, invoices, payments)` to merge and sort the last 10 activities by date.
- [x] **Dashboard Components (`apps/admin/src/app/(admin)/relationships/clients/[id]/`)**
  - [x] Create `client-financial-dashboard.tsx` as the main wrapper.
  - [x] Create KPI strip showing: Outstanding Balance, Total Paid, Total Invoiced, Overdue Balance, and Quote Conversion Rate (using `KpiCard` patterns). **Ensure dashboard cards wrap or collapse cleanly on mobile layouts (< 1024px).**
  - [x] Create `client-ageing-bar.tsx` displaying the stacked horizontal ageing bar (Current, 1-30, 31-60, 61+ days overdue).
  - [x] Create `client-health-score.tsx` to render the colored health badge.
  - [x] Create `client-activity-feed.tsx` to list the recent 10 activity events with nice icons and time-ago strings.

---

## 🖥️ Phase 4: Split-Pane Document Browser
*Goal: Provide a split-pane layout to preview and manage documents inline without navigating away.*

- [x] **Split-Pane Layout Container**
  - Implement the split-pane grid layout inside `client-billing-workspace.tsx`.
  - Configure left pane (document lists with tabs + bulk checkboxes) and right pane (live preview).
  - Collapse right pane on screen widths `< 1024px`.
- [x] **Left-Pane List (`client-billing-workspace.tsx`)**
  - Render list tabs for Invoices and Quotations.
  - Bind selection changes to update `selectedDocId` and `selectedDocType` in parent state.
- [x] **Right-Pane Preview Pane (`client-billing-workspace.tsx` / `DocumentPreview`)**
  - Embed the existing `DocumentPreview` component.
  - Re-render previews immediately when `selectedDocId`/`selectedDocType` changes.
  - Port document action buttons (Issue, Mark Paid, Void, Email, Print) to render inside the header of the preview pane.

---

## 📬 Phase 5: Bulk PDF & Email Operations
*Goal: Implement client-side PDF rendering, multi-page PDF compilation, and sequential automated emailing.*

- [x] **Client-Side Bulk PDF Downloader (`client-billing-workspace.tsx`)**
  - Implement a **queued generator** that mounts `DocumentPreview` off-screen, converts to canvas/PDF **sequentially (one-by-one)** rather than in parallel. Append each canvas capture to a single combined `jsPDF` instance, and trigger a browser save of the single compiled PDF file.
  - Display a progress spinner indicating how many documents are generated (e.g. `Generating 3 of 10...`).
- [x] **Sequential Bulk Email Action**
  - Trigger `sendDocumentEmailAction` sequentially for selected invoices.
  - Provide a progress dialog showing per-invoice status (Sending, Success, Error) to handle rate limiting and support **graceful partial failures** (with retry action for failed emails).

---

## 🔍 Verification & Testing

- [x] Verify that document selection and bulk download works for up to 20 invoices.
- [x] Confirm no regression on the standard single-document detail routes (`/billing/invoices/[id]`).
- [x] Test the mobile viewport collapse and check that links navigate to standalone pages correctly.
- [x] Verify financial metrics and ageing buckets match the global reports for test clients.
