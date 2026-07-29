# Fix: invoice excluded from its own attached statement when sent from draft

## Context

When a user emails a brand-new invoice (status `draft`) via the "Email Invoice" dialog with
"Attach Current Client Statement" checked (the default for invoices), the attached statement
PDF understates what the client owes — it's missing the very invoice being sent. This is
because of an ordering problem: the statement PDF is compiled *before* the invoice's status
flips from `draft` to `issued`, and the statement query explicitly excludes `draft` invoices.
The user asked us to confirm the bug and recommend the correct flow.

**Confirmed root cause**, verified by direct reads (not just agent reports):

1. `apps/admin/src/components/billing/universal-email-dialog.tsx` `handleSend()`:
   - Step 1 (~L226-228): compiles the invoice's own PDF.
   - Step 2 (~L232-242): compiles the **statement PDF** via `GET /api/billing/pdf/statement/{clientId}?monthPeriod=current` (URL built in `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx:134` — only `clientId` + `monthPeriod`, no invoice id).
   - Step 3 (~L266): calls `sendDocumentEmailAction(...)` with both pre-built PDFs.
2. `apps/admin/src/app/actions/email-delivery.ts` `sendDocumentEmailAction` sends the email first, and only on success flips status (L409-415):
   ```js
   if (invoice.status === 'draft') {
     await db.update(invoices).set({ status: 'issued', updatedAt: new Date() }).where(eq(invoices.id, documentId));
   }
   ```
3. The statement PDF is built by `buildStatementPdfData` (`packages/billing/src/server-billing-pdf.ts`) → `getClientStatement` (`packages/db/src/queries/billing.ts:877`), which filters out `draft` invoices at **four** sites: L901 (main invoice list), L978/L984 (global outstanding totals), L1068 (period credit totals), L1134 (`outstandingInvoices` ageing sub-query, via `inArray(status, ['issued','overdue','partially_paid'])`).

Because step 2 runs while the invoice is still `draft`, it's invisible to its own statement —
`totalOutstanding`, `totalInvoiced`, and the ageing table are all short by that invoice's amount.
The invoice's **own standalone PDF** has no status filter and is unaffected — only the
aggregated statement attachment is wrong.

(Workaround that already avoids the bug: clicking the separate "Issue Invoice" button, which
flips `draft → issued` *and* posts an AR/Revenue journal entry via `postInvoiceIssueJournalEntry`,
before emailing separately.)

## Approach chosen: force-include the in-flight invoice in the statement read, don't reorder the send flow

Two approaches were evaluated:

- **Reorder (flip status before building PDFs, roll back on send failure)** — rejected. The
  existing `issueInvoice()` action doesn't just flip status; it posts a Dr AR / Cr Revenue
  journal entry and checks the accounting period is open. Doing that *before* confirming the
  email sent means a failed send would need to roll back both the status *and* the journal
  entry (possibly failing if the period has since closed) — a much bigger, riskier change than
  the bug warrants. Duplicating just the bare status flip earlier would perpetuate an existing
  status/journal inconsistency and require new rollback logic that doesn't exist today.
- **Force-include the specific invoice in the statement query (chosen)** — confined entirely to
  a read path. No email-send timing changes, no new failure/rollback surface: if the send fails,
  nothing in the DB has changed, exactly like today.

## Implementation

**1. `packages/db/src/queries/billing.ts` — `getClientStatement`**
- Extend the `filters` param: `{ year?; monthPeriod?; includeInvoiceId?: string }`.
- Add two small helpers and use them in place of the raw filters:
  ```ts
  function activeInvoiceStatusSql(includeInvoiceId?: string) {
    return includeInvoiceId
      ? sql`(${invoices.status} NOT IN ('draft', 'void') OR (${invoices.id} = ${includeInvoiceId} AND ${invoices.status} = 'draft'))`
      : sql`${invoices.status} NOT IN ('draft', 'void')`;
  }
  function outstandingInvoiceStatusCondition(includeInvoiceId?: string) {
    return includeInvoiceId
      ? or(inArray(invoices.status, ['issued', 'overdue', 'partially_paid']), and(eq(invoices.id, includeInvoiceId), eq(invoices.status, 'draft')))
      : inArray(invoices.status, ['issued', 'overdue', 'partially_paid']);
  }
  ```
- Replace the raw `NOT IN ('draft','void')` conditions at L901, L978, L984, L1068 with
  `activeInvoiceStatusSql(filters?.includeInvoiceId)`, and the `inArray(...)` at L1134 with
  `outstandingInvoiceStatusCondition(filters?.includeInvoiceId)`.
- Leave the prior-period conditions (L1026, L1035, used only for opening-balance-before-period
  math) unchanged — an invoice being emailed today can never predate the statement's period
  start, so including it there would be a no-op anyway. Add a one-line comment noting this.
- Before the final `return`, correct the *displayed* status for the force-included row so
  ageing calculations (which check the literal `status` string, not just row presence) work:
  ```ts
  const outstandingInvoicesFinal = filters?.includeInvoiceId
    ? outstandingInvoices.map((inv) =>
        inv.id === filters.includeInvoiceId && inv.status === 'draft'
          ? { ...inv, status: 'issued' }
          : inv,
      )
    : outstandingInvoices;
  ```
  and return `outstandingInvoices: outstandingInvoicesFinal as InvoiceRow[]`.

**2. `packages/billing/src/server-billing-pdf.ts`**
- Widen the `filters` type on `buildStatementPdfData` and `generateBillingPdf` to include
  `includeInvoiceId?: string`. Both already forward the whole `filters` object straight into
  `getClientStatement`, so no other logic change is needed here.

**3. `apps/admin/src/app/api/billing/pdf/[type]/[id]/route.ts`**
- Parse an optional `includeInvoiceId` query param (basic UUID-shape check, same pattern as the
  existing `year` param validation) and forward it into `filters` only when `type === 'statement'`.
- No extra cross-client check needed: the condition is always ANDed with
  `eq(invoices.clientId, clientId)` from the route's own `id`, so a mismatched invoice id for a
  different client simply can't match any row.

**4. `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx`**
- The actual activation point — update L134:
  ```ts
  const statementPdfUrl = invoice.clientId
    ? `/api/billing/pdf/statement/${invoice.clientId}?monthPeriod=current&includeInvoiceId=${invoice.id}`
    : undefined;
  ```
- For consistency, also pass `{ includeInvoiceId: invoice.id }` to the `getClientStatement` call
  at L54 (feeds the hidden DOM fallback path `#printable-statement-area`) — low-impact since this
  fallback only renders when `statementPdfUrl` is falsy (i.e. no `clientId`), but keeps both paths
  aligned.

**Confirmed unaffected, no changes needed:**
- `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx` and
  `.../billing/statements/page.tsx` — standalone statement view never passes `includeInvoiceId`;
  keeps excluding all drafts as before.
- `apps/admin/src/app/(admin)/relationships/clients/[id]/page.tsx` — same, unaffected.
- `getClientsWithBillingActivity` — a separate raw-SQL function for the statements list page,
  out of scope.

## Edge cases

- Other unrelated draft invoices for the same client stay excluded — the OR-override only ever
  matches `invoices.id = includeInvoiceId`.
- A `void` invoice can never be force-included — the override requires `status = 'draft'` in
  addition to the id match.
- Concurrent sends of two different draft invoices for the same client: each request's
  statement only force-includes its own invoice, not the other — an acceptable, non-regressing
  limitation.
- Failed email send: no DB state changes occur either way (draft stays draft), so there's
  nothing to roll back — same as current behavior.
- The statement PDF's transaction rows don't print a per-row status label, so a force-included
  `draft`-turned-`issued` row won't visibly say "DRAFT" next to a real dollar figure.

## Verification

1. Run the type check / build for `packages/db`, `packages/billing`, and `apps/admin` to confirm
   the widened `filters` types thread through cleanly.
2. Manually test: create a new invoice as draft, open it, use "Email Invoice" with "Attach
   Current Client Statement" checked, and confirm the attached statement PDF's total/outstanding
   figures include the new invoice's amount.
3. Confirm the standalone `/billing/statements/[clientId]` page still excludes an unsent draft
   invoice for that client (regression check for the "unaffected" call sites).
4. Confirm a client with two separate draft invoices: sending invoice A's email includes only A
   (not B) in A's attached statement.
