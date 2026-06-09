# Client Billing Workspace and Bulk Document Actions

## 1. Background

While retrieving an invoice for a client, it became clear that the billing module does not currently provide an efficient way to retrieve or manage all billing documents associated with one client.

At present:

- There is no option to download all invoices belonging to a client.
- Multiple invoices or quotations cannot be selected for bulk actions.
- The client detail page shows payments, but does not provide a complete view of the client’s quotations and invoices.
- There is no central client billing workspace showing quotations, invoices, payments, outstanding balances, and statements together.
- Users must navigate separately through the quotation and invoice modules to locate documents for a specific client.

This creates unnecessary administrative work when a client requests:

- All their invoices
- All quotations issued to them
- A statement of account
- Copies of selected billing documents
- A summary of their outstanding balance

The proposed improvement is to introduce a **Client Billing Workspace**, together with reusable bulk-selection and bulk-download functionality.

---

## 2. Main Objectives

The implementation should achieve the following:

1. Allow users to view all billing activity for a selected client.
2. Allow multiple invoices or quotations to be selected.
3. Allow selected documents to be downloaded in bulk.
4. Allow all invoices for a client to be downloaded at once.
5. Allow all quotations for a client to be downloaded at once.
6. Provide a client statement showing invoices, payments, credits, and balances.
7. Provide an efficient document preview without repeatedly opening separate pages.
8. Reuse the same bulk-action system on the main invoice and quotation listing pages.

---

## 3. Proposed Client Detail Page

The client detail page should become the main location for reviewing everything connected to that client.

### Suggested Route

```text
/clients/[clientId]
```

or, if the current application uses an administrative route structure:

```text
/admin/clients/[clientId]
```

### Suggested Page Structure

#### Client Header

The top section should show:

- Client name
- Company or trading name
- Email address
- Telephone number
- Billing address
- Tax or registration information, where applicable
- Current outstanding balance
- Total invoiced
- Total paid
- Overdue amount
- Number of open invoices

Suggested actions:

- Create quotation
- Create invoice
- Record payment
- Generate statement
- Download documents
- Send statement by email

---

## 4. Client Billing Tabs

Use tabs to prevent the page from becoming overcrowded.

Recommended tabs:

```text
Overview | Quotations | Invoices | Payments | Statement
```

### 4.1 Overview Tab

The overview should provide a summary rather than showing every record.

Suggested cards:

- Total quoted
- Total invoiced
- Total paid
- Outstanding balance
- Overdue balance
- Draft quotations
- Draft invoices

Suggested recent activity section:

| Date | Activity | Reference | Amount | Status |
|---|---|---:|---:|---|
| 09 Jun 2026 | Invoice created | INV-0028 | R8,500 | Sent |
| 07 Jun 2026 | Payment recorded | PAY-0014 | R4,000 | Completed |
| 02 Jun 2026 | Quotation accepted | QUO-0032 | R12,500 | Accepted |

### 4.2 Quotations Tab

This tab should show every quotation associated with the client, including drafts.

Suggested columns:

| Select | Quotation No. | Issue Date | Expiry Date | Amount | Status | Actions |
|---|---|---|---|---:|---|---|
| ☐ | QUO-0032 | 02 Jun 2026 | 16 Jun 2026 | R12,500 | Accepted | ⋮ |
| ☐ | QUO-0031 | 28 May 2026 | 11 Jun 2026 | R4,800 | Draft | ⋮ |

Statuses may include:

- Draft
- Sent
- Viewed
- Accepted
- Rejected
- Expired
- Converted

Row actions:

- Preview
- Open
- Edit
- Download PDF
- Email
- Duplicate
- Convert to invoice
- Archive or delete, subject to current business rules

### 4.3 Invoices Tab

This tab should show every invoice associated with the client, including drafts and paid invoices.

Suggested columns:

| Select | Invoice No. | Issue Date | Due Date | Total | Balance | Status | Actions |
|---|---|---|---|---:|---:|---|---|
| ☐ | INV-0028 | 09 Jun 2026 | 09 Jul 2026 | R8,500 | R8,500 | Sent | ⋮ |
| ☐ | INV-0024 | 03 May 2026 | 02 Jun 2026 | R6,000 | R2,000 | Partially paid | ⋮ |
| ☐ | INV-0019 | 04 Apr 2026 | 04 May 2026 | R4,000 | R0 | Paid | ⋮ |

Statuses may include:

- Draft
- Sent
- Viewed
- Partially paid
- Paid
- Overdue
- Void
- Cancelled

Row actions:

- Preview
- Open
- Edit, where permitted
- Download PDF
- Email
- Record payment
- Duplicate
- Mark as sent
- Void
- Delete, where permitted

The existing rule that paid invoices must not be edited or deleted should remain enforced.

### 4.4 Payments Tab

The existing payment information can remain, but it should be connected to the invoices it settled.

Suggested columns:

| Payment Date | Payment Reference | Invoice | Method | Amount | Status |
|---|---|---|---|---:|---|
| 07 Jun 2026 | EFT-7762 | INV-0024 | EFT | R4,000 | Completed |

The invoice number should be clickable and should load the related invoice preview.

### 4.5 Statement Tab

The statement tab should show a complete client account ledger.

Suggested columns:

| Date | Type | Reference | Description | Debit | Credit | Running Balance |
|---|---|---|---|---:|---:|---:|
| 03 May 2026 | Invoice | INV-0024 | Cleaning services | R6,000 | — | R6,000 |
| 07 Jun 2026 | Payment | EFT-7762 | Payment received | — | R4,000 | R2,000 |
| 09 Jun 2026 | Invoice | INV-0028 | Tender preparation | R8,500 | — | R10,500 |

Statement controls:

- Start date
- End date
- Include paid invoices
- Include quotations, normally disabled by default
- Include zero-balance transactions
- Generate PDF
- Download PDF
- Email statement
- Print statement

Quotations should generally not form part of the financial running balance because they are not accounting transactions. They can appear in an optional appendix or activity section.

---

## 5. Master–Detail Document Layout

The requested layout can be implemented as a master–detail interface.

### Desktop Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Client: ABC Trading                                                │
│ Total invoiced: R32,500 | Paid: R20,000 | Outstanding: R12,500    │
├───────────────────────┬────────────────────────────────────────────┤
│ DOCUMENT LIST         │ DOCUMENT PREVIEW                           │
│                       │                                            │
│ ☐ INV-0028            │                                            │
│   09 Jun 2026         │              PDF / HTML                    │
│   R8,500 – Sent       │            Invoice Preview                 │
│                       │                                            │
│ ☐ INV-0024            │                                            │
│   R6,000 – Partial    │                                            │
│                       │                                            │
│ ☐ QUO-0032            │                                            │
│   R12,500 – Accepted  │                                            │
├───────────────────────┴────────────────────────────────────────────┤
│ 3 selected   Download ZIP   Email   Print   Clear Selection        │
└────────────────────────────────────────────────────────────────────┘
```

### Left Panel

The left side should contain:

- Checkboxes
- Document number
- Document type
- Date
- Amount
- Status
- Balance for invoices
- Search
- Filters
- Sorting

Clicking the document number should load the document on the right without navigating away.

### Right Panel

The right side should show:

- Full invoice or quotation preview
- Download button
- Email button
- Print button
- Open full page
- Record payment, for invoices
- Convert to invoice, for accepted quotations
- Previous and next document controls

### Mobile Layout

On smaller screens:

1. Display the document list first.
2. Selecting a document opens a full-screen sheet or drawer.
3. Bulk actions remain available through a sticky bottom action bar.

---

## 6. Bulk Selection Requirements

Bulk selection should be available in:

- Client quotation tab
- Client invoice tab
- Main quotation listing
- Main invoice listing
- Combined client document workspace

### Selection Behaviour

The user should be able to:

- Select one record
- Select several records
- Select all records on the current page
- Select all records matching current filters
- Clear the selection

The interface should clearly distinguish between:

```text
Select all 20 records on this page
```

and:

```text
Select all 143 records matching these filters
```

This prevents users from assuming that the entire filtered result has been selected when only one page is selected.

---

## 7. Proposed Bulk Actions

### Invoice Bulk Actions

Recommended:

- Download selected PDFs
- Download all client invoices
- Email selected invoices
- Print selected invoices
- Mark selected invoices as sent
- Export selected invoice data to CSV
- Archive selected invoices, where permitted

Potential future actions:

- Send payment reminders
- Apply tags
- Assign collection status
- Generate a consolidated invoice pack

Actions such as delete, void, or status changes must validate every selected invoice before execution.

For example:

- Paid invoices cannot be deleted.
- Voided invoices should not be emailed as active invoices.
- Draft invoices may not be included in a client-facing download unless explicitly selected.
- Cross-client selections must not be sent to one recipient.

### Quotation Bulk Actions

Recommended:

- Download selected PDFs
- Download all client quotations
- Email selected quotations
- Print selected quotations
- Export selected quotation data to CSV
- Mark as sent
- Archive selected quotations

Potential future actions:

- Extend expiry date
- Duplicate selected quotations
- Convert accepted quotations to invoices

Bulk conversion should be treated carefully because each quotation may require invoice-specific review.

---

## 8. Download All Invoices

A prominent action should be available on the client page:

```text
Download all invoices
```

Before generating the download, show a small configuration dialog.

### Suggested Options

```text
Download client invoices

Date range:
[ All dates ▼ ]

Statuses:
☑ Paid
☑ Partially paid
☑ Sent
☑ Overdue
☐ Draft
☐ Void

File format:
● ZIP containing individual PDFs
○ Combined PDF

Naming:
ClientName_Invoices_2026-06-09.zip
```

### Recommended Default

Use a ZIP file containing individual PDFs.

Example:

```text
ABC-Trading_Invoices_2026-06-09.zip
├── INV-0019_ABC-Trading.pdf
├── INV-0024_ABC-Trading.pdf
└── INV-0028_ABC-Trading.pdf
```

A ZIP archive is preferable because:

- Each invoice remains a separate document.
- Individual invoice numbers remain visible.
- The client can extract or forward specific invoices.
- It avoids creating one extremely large PDF.
- It reduces complexity around mixed page sizes and rendering.

A combined PDF can be provided as a secondary option.

---

## 9. Download All Quotations

The same workflow should be available for quotations:

```text
Download all quotations
```

Filters should include:

- Date range
- Draft
- Sent
- Accepted
- Rejected
- Expired
- Converted

Draft quotations should be excluded from client-facing downloads by default.

---

## 10. Combined Client Document Pack

A further action could allow invoices and quotations to be downloaded together.

```text
Create document pack
```

Options:

```text
Documents to include:
☑ Invoices
☑ Quotations
☐ Statement
☐ Payment receipts

Date range:
[ 01 Jan 2026 ] to [ 09 Jun 2026 ]

Output:
● ZIP archive
○ Combined PDF
```

The ZIP could be structured as:

```text
ABC-Trading_Billing-Pack_2026-06-09.zip
├── Invoices/
│   ├── INV-0019.pdf
│   └── INV-0024.pdf
├── Quotations/
│   ├── QUO-0031.pdf
│   └── QUO-0032.pdf
├── Payments/
│   └── RECEIPT-0014.pdf
└── Statement/
    └── ABC-Trading_Statement.pdf
```

---

## 11. Data and Query Requirements

The client detail page should not retrieve quotations, invoices, payments, and statement records through unrelated front-end requests without coordination.

Create a dedicated client billing service or query layer.

### Suggested Queries

```ts
getClientBillingSummary(clientId)
getClientInvoices(clientId, filters, pagination)
getClientQuotations(clientId, filters, pagination)
getClientPayments(clientId, filters, pagination)
getClientStatement(clientId, dateRange)
getClientDocumentCounts(clientId)
```

### Billing Summary Response

```ts
type ClientBillingSummary = {
  totalQuoted: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueBalance: number;
  draftInvoiceCount: number;
  openInvoiceCount: number;
  draftQuotationCount: number;
};
```

### Important Query Rules

All records must be filtered by:

- Current organisation or tenant
- Client ID
- User permissions
- Archived state, where applicable

The server must never trust a client ID supplied by the browser without validating that the user is authorised to access that client.

---

## 12. Database Review

The implementation should first confirm that every billing document has a reliable client relationship.

Expected relationships:

```text
clients.id
  ├── quotations.clientId
  ├── invoices.clientId
  └── payments.clientId or payments.invoiceId
```

### Required Checks

- Every invoice must have a non-null `clientId`.
- Every quotation must have a non-null `clientId`.
- Payments should link to an invoice where the payment is invoice-specific.
- Unallocated client payments should still link directly to the client.
- The client relationship must be scoped to the same organisation.
- Existing legacy records without a client should be identified and corrected.

### Recommended Indexes

```sql
CREATE INDEX invoices_client_id_idx
ON invoices(client_id);

CREATE INDEX quotations_client_id_idx
ON quotations(client_id);

CREATE INDEX payments_client_id_idx
ON payments(client_id);

CREATE INDEX payments_invoice_id_idx
ON payments(invoice_id);
```

For a multi-tenant system, composite indexes may be preferable:

```sql
CREATE INDEX invoices_org_client_idx
ON invoices(organization_id, client_id);

CREATE INDEX quotations_org_client_idx
ON quotations(organization_id, client_id);
```

Date and status indexes may also be useful for large datasets:

```sql
CREATE INDEX invoices_client_status_date_idx
ON invoices(client_id, status, issue_date);
```

---

## 13. PDF Generation Architecture

Bulk download should reuse the existing invoice and quotation PDF generation logic.

Avoid creating a separate PDF template specifically for bulk downloads.

Recommended separation:

```text
Document data loader
        ↓
Invoice/quotation view model
        ↓
Reusable PDF renderer
        ↓
Single PDF download or bulk archive service
```

Suggested functions:

```ts
generateInvoicePdf(invoiceId)
generateQuotationPdf(quotationId)
generateStatementPdf(clientId, options)
generateBillingDocumentZip(documentIds)
```

This ensures the PDF downloaded individually is identical to the PDF included in the ZIP.

---

## 14. Bulk Download Backend Flow

### Request

```ts
POST /api/billing/documents/bulk-download
```

Example body:

```json
{
  "clientId": "client_123",
  "documents": [
    {
      "type": "invoice",
      "id": "invoice_001"
    },
    {
      "type": "invoice",
      "id": "invoice_002"
    },
    {
      "type": "quotation",
      "id": "quote_004"
    }
  ],
  "output": "zip"
}
```

### Server Flow

1. Authenticate the user.
2. Resolve the current organisation.
3. Validate access to the selected client.
4. Validate every selected document.
5. Confirm each document belongs to the client and organisation.
6. Exclude or reject inaccessible documents.
7. Generate each PDF using the existing renderer.
8. Add PDFs to an archive.
9. Stream or return the generated ZIP.
10. Record the action in the audit log.

### Response Handling

For small selections, the archive can be streamed directly.

For very large selections, introduce a practical limit, for example:

```text
Maximum 100 documents per bulk download
```

The precise limit should be based on the PDF rendering method and hosting limits.

---

## 15. Bulk Email Behaviour

Bulk email requires stricter controls than bulk download.

### Same Client

When all selected documents belong to one client:

- Use the client’s billing email.
- Allow the email address to be reviewed.
- Attach selected PDFs.
- Allow the subject and message to be edited.
- Show the total attachment size before sending.

### Multiple Clients

When documents from different clients are selected:

- Never attach all documents to one email.
- Generate one email per client.
- Show a confirmation such as:

```text
12 documents will be sent in 5 separate emails.
```

This is essential to prevent one client receiving another client’s invoices.

---

## 16. Statement Rules

The statement should be based on posted financial transactions.

### Include

- Issued invoices
- Debit adjustments
- Credit notes
- Payments
- Refunds
- Opening balance, when applicable

### Exclude from Balance

- Draft invoices
- Draft quotations
- Sent quotations
- Rejected quotations
- Expired quotations

### Statement Balance Formula

```text
Opening balance
+ invoices and debit adjustments
- payments and credits
= closing balance
```

### Statement Header

The PDF should show:

- Organisation name and logo
- Organisation contact and banking details
- Client name
- Client billing address
- Statement period
- Statement date
- Opening balance
- Closing balance
- Amount currently due
- Amount overdue

### Age Analysis

Add an optional ageing summary:

| Current | 1–30 Days | 31–60 Days | 61–90 Days | 90+ Days |
|---:|---:|---:|---:|---:|
| R8,500 | R2,000 | R0 | R0 | R0 |

---

## 17. Filters and Search

Both the client workspace and main listing pages should support:

### Invoice Filters

- Search by invoice number
- Status
- Issue-date range
- Due-date range
- Paid or unpaid
- Overdue only
- Amount range
- Draft or issued
- Division, where applicable

### Quotation Filters

- Search by quotation number
- Status
- Issue-date range
- Expiry-date range
- Converted or not converted
- Amount range
- Division

### Combined Documents Filter

- All documents
- Invoices only
- Quotations only
- Statements
- Payment receipts

Filters should be represented in the URL where practical:

```text
/clients/client_123?tab=invoices&status=overdue&page=2
```

This allows the page state to survive refreshes and makes filtered views shareable.

---

## 18. Recommended Components

A reusable component structure could include:

```text
components/
└── billing/
    ├── client-billing-workspace.tsx
    ├── billing-summary-cards.tsx
    ├── document-master-detail.tsx
    ├── document-list-panel.tsx
    ├── document-preview-panel.tsx
    ├── document-selection-toolbar.tsx
    ├── invoice-table.tsx
    ├── quotation-table.tsx
    ├── payment-table.tsx
    ├── statement-table.tsx
    ├── bulk-download-dialog.tsx
    ├── bulk-email-dialog.tsx
    └── generate-statement-dialog.tsx
```

Suggested server-side services:

```text
lib/
└── billing/
    ├── client-billing-queries.ts
    ├── document-access.ts
    ├── bulk-download.ts
    ├── statement-service.ts
    ├── invoice-pdf.ts
    ├── quotation-pdf.ts
    └── document-file-names.ts
```

The exact paths should follow the current project conventions.

---

## 19. Selection State Design

Selection should be based on stable record IDs, not row indexes.

```ts
type SelectedDocument = {
  id: string;
  type: "invoice" | "quotation" | "statement" | "receipt";
  clientId: string;
};
```

A map or set is preferable:

```ts
const selectedDocuments = new Map<string, SelectedDocument>();
```

Use a composite key to avoid invoice and quotation ID collisions:

```ts
const key = `${document.type}:${document.id}`;
```

Selection should be cleared when:

- The user changes client
- The user signs out
- A completed bulk action removes selected records from the current view

Selection should not unexpectedly disappear when:

- Moving between pagination pages
- Opening and closing a preview
- Changing sort order

---

## 20. Permissions

Bulk actions should follow the same authorisation rules as individual actions.

Suggested permissions:

```text
billing.invoice.view
billing.invoice.download
billing.invoice.email
billing.invoice.edit
billing.invoice.delete

billing.quotation.view
billing.quotation.download
billing.quotation.email
billing.quotation.edit
billing.quotation.delete

billing.statement.view
billing.statement.generate
billing.statement.email
```

The interface may hide unauthorised actions, but the server must still enforce every permission.

---

## 21. Audit Logging

The following actions should be logged:

- Client statement generated
- Statement downloaded
- Statement emailed
- Invoice downloaded
- Multiple invoices downloaded
- Quotation downloaded
- Multiple quotations downloaded
- Document pack generated
- Bulk email sent
- Bulk status changed

Example audit entry:

```json
{
  "action": "billing.documents.bulk_downloaded",
  "clientId": "client_123",
  "documentCount": 8,
  "documentTypes": {
    "invoice": 6,
    "quotation": 2
  },
  "performedBy": "user_456",
  "performedAt": "2026-06-09T10:30:00+02:00"
}
```

Do not store the full PDF or ZIP in the audit record.

---

## 22. Error Handling

The interface should provide clear outcomes.

Examples:

```text
8 documents downloaded successfully.
```

```text
6 documents were downloaded. Two draft invoices were excluded.
```

```text
The selected invoice no longer exists or you no longer have access to it.
```

```text
The archive could not be generated. No documents were downloaded.
```

For partial failures, show exactly which records failed and why.

Do not silently omit documents.

---

## 23. Empty States

### No Invoices

```text
No invoices have been created for this client.

Create the first invoice to begin tracking the client’s account.
[Create invoice]
```

### No Quotations

```text
No quotations have been prepared for this client.
[Create quotation]
```

### No Statement Activity

```text
There are no posted transactions for the selected period.
```

### No Search Results

```text
No invoices match the selected filters.
[Clear filters]
```

---

## 24. Performance Considerations

The client page should not load every full invoice and every line item during the initial request.

### Initial Load

Load:

- Billing summary
- Paginated document metadata
- Payment summary
- Document counts

Do not initially load:

- Full PDF files
- Every invoice line item
- Every quotation line item
- Every historical statement transaction

Load full document data only when the user selects a document for preview.

Recommended pagination:

```text
20–50 rows per page
```

PDF previews should be cached where the existing architecture safely permits it.

---

## 25. Accessibility and Usability

The implementation should include:

- Keyboard-selectable rows
- Proper labels for checkboxes
- Visible selected-row states
- Screen-reader announcements when selection counts change
- Keyboard navigation between documents
- Confirmation dialogs for destructive actions
- Loading indicators during ZIP generation
- Disabled action buttons when no records are selected
- Tooltips explaining unavailable actions

Avoid placing critical actions only inside hover menus.

---

## 26. Proposed Delivery Phases

### Phase 1: Data and Client Relationships

- Confirm invoice-to-client relationship.
- Confirm quotation-to-client relationship.
- Confirm payment-to-client and payment-to-invoice relationships.
- Identify orphaned billing documents.
- Add or review relevant database indexes.
- Implement client billing query services.

### Phase 2: Client Billing Tabs

- Add Overview, Quotations, Invoices, Payments, and Statement tabs.
- Add summary cards.
- Add invoice and quotation tables.
- Add filters, search, sorting, and pagination.
- Link payment records to invoice previews.

### Phase 3: Master–Detail Preview

- Build document list panel.
- Build preview panel.
- Load selected document without navigating away.
- Add responsive mobile drawer.
- Add next and previous document navigation.

### Phase 4: Bulk Selection

- Add row checkboxes.
- Add page selection and filtered selection.
- Add selection toolbar.
- Persist selection through pagination.
- Add validation for mixed-client selections.

### Phase 5: Bulk Downloads

- Add selected invoice download.
- Add selected quotation download.
- Add download-all client invoices.
- Add download-all client quotations.
- Add ZIP generation.
- Add filename sanitisation.
- Add audit logging.

### Phase 6: Statements

- Add statement query and running-balance calculation.
- Add date filters.
- Add age analysis.
- Add statement PDF.
- Add download, print, and email actions.

### Phase 7: Bulk Email and Document Packs

- Add client-specific bulk email.
- Group multi-client selections by client.
- Add attachment-size validation.
- Add combined client billing pack.
- Add payment receipts where supported.

---

## 27. Acceptance Criteria

### Client Detail

- Opening a client displays invoices associated only with that client.
- Draft, sent, paid, partially paid, and overdue invoices are visible.
- Opening a client displays quotations associated only with that client.
- Payments remain visible and link to their related invoices.
- Billing totals reconcile with the displayed records.

### Preview

- Clicking an invoice number loads the invoice preview.
- Clicking a quotation number loads the quotation preview.
- Previewing does not clear selected rows.
- The preview supports download and print actions.

### Bulk Selection

- Multiple invoices can be selected.
- Multiple quotations can be selected.
- Selection remains when moving between pages.
- The user can select all matching filtered records.
- Available actions update according to the selected document types.

### Downloads

- Selected invoices download as a ZIP.
- Selected quotations download as a ZIP.
- All invoices for a client can be downloaded.
- Draft documents are excluded by default from client-facing packs.
- Every filename includes the document number.
- Documents belonging to another client or organisation cannot be downloaded.

### Statements

- A client statement can be generated for a date range.
- The statement includes invoices and payments.
- The running balance is accurate.
- Draft records do not affect the statement balance.
- The statement can be downloaded and emailed.

---

## 28. Recommended MVP Scope

For the first implementation, prioritise:

1. Client tabs for invoices, quotations, and payments.
2. Master–detail document preview.
3. Multi-row selection.
4. Download selected documents as ZIP.
5. Download all invoices for a client.
6. Download all quotations for a client.
7. Generate and download a client statement.

Defer the following until the core workflow is stable:

- Bulk email across several clients
- Combined PDF output
- Scheduled statements
- Automatic monthly statement delivery
- Payment receipt packs
- Advanced ageing reports

---

## 29. Coding Agent Task Prompt

```md
# Task: Add Client Billing Workspace, Bulk Document Selection, Bulk Downloads, and Statements

Audit the existing client, invoice, quotation, payment, PDF-generation,
and billing data-access code before implementing changes.

## Problem

The application currently does not provide an efficient way to:

- View all invoices belonging to one client.
- View all quotations belonging to one client.
- Select multiple invoices or quotations.
- Download selected documents in bulk.
- Download all invoices for a client.
- Download all quotations for a client.
- Generate a complete client statement.
- Preview client billing documents from the client detail page.

The client detail page currently shows payment information, but it does
not provide a complete view of quotations and invoices created or drafted
for the client.

## Required Outcome

Create a central Client Billing Workspace on the client detail page.

Use tabs:

- Overview
- Quotations
- Invoices
- Payments
- Statement

## Client Header

Display:

- Client name and contact information
- Total quoted
- Total invoiced
- Total paid
- Outstanding balance
- Overdue balance
- Open invoice count

Add actions:

- Create quotation
- Create invoice
- Record payment
- Generate statement
- Download documents

## Quotations Tab

Show all quotations associated with the client, including drafts.

Columns:

- Selection checkbox
- Quotation number
- Issue date
- Expiry date
- Total
- Status
- Actions

Support:

- Search
- Status filtering
- Date filtering
- Sorting
- Pagination
- Preview
- Download
- Email
- Edit where permitted
- Convert to invoice where permitted

## Invoices Tab

Show all invoices associated with the client, including drafts.

Columns:

- Selection checkbox
- Invoice number
- Issue date
- Due date
- Total
- Outstanding balance
- Status
- Actions

Support:

- Search
- Status filtering
- Date filtering
- Overdue filter
- Sorting
- Pagination
- Preview
- Download
- Email
- Record payment
- Edit only where permitted

Paid invoices must remain non-editable and non-deletable.

## Master–Detail Preview

On desktop, use a split layout:

- Left panel: document list
- Right panel: selected document preview

Clicking an invoice or quotation number must load the document in the
preview panel without navigating away.

The preview should include:

- Download
- Print
- Email
- Open full page
- Record payment for invoices
- Convert to invoice for eligible quotations

On mobile, open the preview in a drawer or full-screen sheet.

## Bulk Selection

Implement reusable row selection for invoice and quotation tables.

Support:

- Select one
- Select multiple
- Select all on current page
- Select all matching current filters
- Clear selection
- Preserve selection across pagination

Use stable record IDs, not row indexes.

## Bulk Actions

Invoices:

- Download selected PDFs
- Download all invoices for the current client
- Email selected invoices
- Print selected invoices
- Export selected invoice data to CSV

Quotations:

- Download selected PDFs
- Download all quotations for the current client
- Email selected quotations
- Print selected quotations
- Export selected quotation data to CSV

Do not perform destructive actions unless every selected record passes
the current business rules.

## Bulk Download

Use the existing invoice and quotation PDF-rendering logic.

Do not create separate bulk PDF templates.

Default output:

- ZIP archive containing one PDF per selected document.

Example:

ClientName_Invoices_2026-06-09.zip

Each file must include its document number:

- INV-0028_ClientName.pdf
- QUO-0032_ClientName.pdf

Before generating a client-wide download, allow filters for:

- Date range
- Document status
- Include or exclude drafts
- Include or exclude void or archived records

Exclude drafts from client-facing downloads by default.

Validate server-side that every selected document belongs to:

- The current organisation
- The selected client
- A record the authenticated user may access

## Statement Tab

Create a client account statement showing:

- Invoice transactions
- Payments
- Credits
- Refunds or adjustments where supported
- Debit amount
- Credit amount
- Running balance

Provide:

- Start date
- End date
- Opening balance
- Closing balance
- Outstanding amount
- Overdue amount
- Optional age analysis
- PDF download
- Print
- Email

Draft invoices and quotations must not affect the statement balance.

Quotations may be shown only in an optional activity appendix.

## Data Access

Create or update reusable server-side functions such as:

- getClientBillingSummary
- getClientInvoices
- getClientQuotations
- getClientPayments
- getClientStatement
- generateBillingDocumentZip

Ensure all data is scoped by organisation and client.

Review database indexes for:

- invoices by organisation and client
- quotations by organisation and client
- payments by organisation and client
- payments by invoice

## Audit Log

Record:

- Bulk downloads
- Statement generation
- Statement downloads
- Statement emails
- Bulk invoice emails
- Bulk quotation emails

Do not store PDF or ZIP binary data in the audit log.

## Error Handling

Provide clear messages for:

- Missing documents
- Inaccessible documents
- Mixed-client selections
- PDF generation failures
- Partial bulk failures
- Empty result sets

Do not silently exclude failed records.

## Performance

Do not load every invoice and quotation line item during the initial
client-page request.

Initially load only:

- Summary totals
- Paginated document metadata
- Counts
- Payment summaries

Load full document details only when a preview is requested.

## Deliverables

Before coding, produce:

1. Current-state audit
2. Files and routes affected
3. Database changes required
4. Component plan
5. Server-action or API plan
6. PDF and ZIP generation plan
7. Permission and security review
8. Testing plan

Then implement the work in logical phases.

Do not duplicate existing billing, table, PDF, email, permission, or
audit-log utilities. Reuse and extend the current architecture.
```
