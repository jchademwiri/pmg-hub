import { db } from "../client";
import { quotations, invoices, billingLineItems, billingItems } from "../schema/billing";
import { income } from "../schema/income";
import { divisions } from "../schema/divisions";
import { clients } from "../schema/clients";
import { sql, eq, and, desc, asc, inArray, or } from "drizzle-orm";

// ── Shared types ──────────────────────────────────────────────────────────────

export type LineItemDetail = {
  id: string;
  documentType: string;
  documentId: string;
  sortOrder: number;
  description: string;
  quantity: string;   // numeric from DB — caller converts with Number()
  unitPrice: string;
  vatRate: string;
  lineTotal: string;
  createdAt: Date;
};

// ── Quotation types ───────────────────────────────────────────────────────────

export type QuotationRow = {
  id: string;
  divisionId: string;
  divisionName: string;
  clientId: string | null;
  clientName: string | null;
  documentNumber: string;
  status: string;
  quoteDate: string;
  expiryDate: string | null;
  reference: string | null;
  subtotal: string;
  discountType: string | null;
  discountValue: string | null;
  discountAmount: string;
  vatEnabled: boolean;
  vatAmount: string;
  total: string;
  notes: string | null;
  terms: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type QuotationDetail = QuotationRow & {
  lineItems: LineItemDetail[];
  convertedInvoiceId: string | null;
};

// ── Invoice types ─────────────────────────────────────────────────────────────

export type InvoiceRow = {
  id: string;
  divisionId: string;
  divisionName: string;
  clientId: string | null;
  clientName: string | null;
  documentNumber: string;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  poNumber: string | null;
  quotationId: string | null;
  quotationNumber: string | null;
  incomeId: string | null;
  subtotal: string;
  discountType: string | null;
  discountValue: string | null;
  discountAmount: string;
  vatEnabled: boolean;
  vatAmount: string;
  total: string;
  notes: string | null;
  terms: string | null;
  paidAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type InvoiceDetail = InvoiceRow & {
  lineItems: LineItemDetail[];
};

// ── Statement types ───────────────────────────────────────────────────────────

export type ClientBillingRow = {
  id: string;
  name: string;
  businessName: string | null;
  quoteCount: number;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  lastActivityDate: string | null;
};

export type ClientStatement = {
  client: {
    id: string;
    name: string;
    businessName: string | null;
    email: string | null;
    phone: string | null;
  };
  summary: {
    totalQuoted: number;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    quoteCount: number;
    invoiceCount: number;
    conversionRate: number;
  };
  quotes: QuotationRow[];
  invoices: InvoiceRow[];
};

// ── Billing item types ────────────────────────────────────────────────────────

export type BillingItemRow = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unitLabel: string | null;
  vatApplicable: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type BillingItemDetail = BillingItemRow & {
  usageInvoices: number;
  usageQuotes: number;
};

const VALID_QUOTE_STATUSES = new Set([
  "draft",
  "sent",
  "accepted",
  "declined",
  "cancelled",
  "expired",
  "converted",
]);

let hasQuotationReferenceColumnPromise: Promise<boolean> | null = null;

async function hasQuotationReferenceColumn(): Promise<boolean> {
  if (!hasQuotationReferenceColumnPromise) {
    hasQuotationReferenceColumnPromise = db
      .execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quotations'
            AND column_name = 'reference'
        ) AS "exists"
      `)
      .then((res) => {
        const row = res.rows[0] as { exists?: boolean } | undefined;
        return Boolean(row?.exists);
      })
      .catch(() => false);
  }
  return hasQuotationReferenceColumnPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shared select shape for quotation rows */
function getQuotationRowSelect(includeReference: boolean) {
  return {
    id: quotations.id,
    divisionId: quotations.divisionId,
    divisionName: divisions.name,
    clientId: quotations.clientId,
    clientName: sql<string | null>`COALESCE(${clients.businessName}, ${clients.name})`,
    documentNumber: quotations.documentNumber,
    status: quotations.status,
    quoteDate: sql<string>`${quotations.quoteDate}::text`,
    expiryDate: sql<string | null>`${quotations.expiryDate}::text`,
    reference: includeReference ? quotations.reference : sql<string | null>`NULL::text`,
    subtotal: quotations.subtotal,
    discountType: quotations.discountType,
    discountValue: quotations.discountValue,
    discountAmount: quotations.discountAmount,
    vatEnabled: quotations.vatEnabled,
    vatAmount: quotations.vatAmount,
    total: quotations.total,
    notes: quotations.notes,
    terms: quotations.terms,
    createdBy: quotations.createdBy,
    createdAt: quotations.createdAt,
    updatedAt: quotations.updatedAt,
  };
}

/** Shared select shape for invoice rows */
const invoiceRowSelect = {
  id: invoices.id,
  divisionId: invoices.divisionId,
  divisionName: divisions.name,
  clientId: invoices.clientId,
  clientName: sql<string | null>`COALESCE(${clients.businessName}, ${clients.name})`,
  documentNumber: invoices.documentNumber,
  status: invoices.status,
  invoiceDate: sql<string>`${invoices.invoiceDate}::text`,
  dueDate: sql<string | null>`${invoices.dueDate}::text`,
  poNumber: invoices.poNumber,
  quotationId: invoices.quotationId,
  quotationNumber: sql<string | null>`NULL::text`,
  incomeId: invoices.incomeId,
  subtotal: invoices.subtotal,
  discountType: invoices.discountType,
  discountValue: invoices.discountValue,
  discountAmount: invoices.discountAmount,
  vatEnabled: invoices.vatEnabled,
  vatAmount: invoices.vatAmount,
  total: invoices.total,
  notes: invoices.notes,
  terms: invoices.terms,
  paidAt: invoices.paidAt,
  createdBy: invoices.createdBy,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
};

// ── getAllQuotations ───────────────────────────────────────────────────────────

/**
 * Returns paginated quotation rows joined to divisions (INNER) and clients (LEFT),
 * with optional filters for divisionId, status, clientId, and month (YYYY-MM).
 * Ordered by quote_date DESC, created_at DESC.
 */
export async function getAllQuotations(
  filters?: {
    divisionId?: string;
    status?: string;
    clientId?: string;
    month?: string;
  },
  pageObj?: { page: number; pageSize: number },
): Promise<{ data: QuotationRow[]; total: number; sum: number }> {
  const includeReference = await hasQuotationReferenceColumn();
  const conditions = [];

  if (filters?.divisionId) {
    conditions.push(eq(quotations.divisionId, filters.divisionId));
  }
  if (filters?.status) {
    if (VALID_QUOTE_STATUSES.has(filters.status)) {
      conditions.push(eq(quotations.status, filters.status as any));
    }
  }
  if (filters?.clientId) {
    conditions.push(eq(quotations.clientId, filters.clientId));
  }
  if (filters?.month) {
    conditions.push(sql`TO_CHAR(${quotations.quoteDate}, 'YYYY-MM') = ${filters.month}`);
  }

  const query = db
    .select(getQuotationRowSelect(includeReference))
    .from(quotations)
    .innerJoin(divisions, eq(quotations.divisionId, divisions.id))
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .orderBy(desc(quotations.quoteDate), desc(quotations.createdAt));

  let finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

  const countQuery = db
    .select({
      count: sql<number>`count(*)::int`,
      sum: sql<number>`COALESCE(SUM(${quotations.total}), 0)::numeric`,
    })
    .from(quotations);
  if (conditions.length > 0) countQuery.where(and(...conditions));

  const [totalRes] = await countQuery;
  const total = totalRes?.count ?? 0;
  const sumAmount = Number(totalRes?.sum ?? 0);

  if (pageObj) {
    finalQuery = finalQuery
      .limit(pageObj.pageSize)
      .offset((pageObj.page - 1) * pageObj.pageSize) as any;
  }

  const data = await finalQuery;
  return { data: data as QuotationRow[], total, sum: sumAmount };
}

// ── getAllInvoices ─────────────────────────────────────────────────────────────

/**
 * Returns paginated invoice rows joined to divisions (INNER), clients (LEFT),
 * and quotations (LEFT for quotation document number).
 * outstanding = SUM(total) WHERE status IN ('issued', 'overdue').
 */
export async function getAllInvoices(
  filters?: {
    divisionId?: string;
    status?: string;
    clientId?: string;
    month?: string;
  },
  pageObj?: { page: number; pageSize: number },
): Promise<{ data: InvoiceRow[]; total: number; sum: number; outstanding: number }> {
  const conditions = [];

  if (filters?.divisionId) {
    conditions.push(eq(invoices.divisionId, filters.divisionId));
  }
  if (filters?.status) {
    conditions.push(eq(invoices.status, filters.status as any));
  }
  if (filters?.clientId) {
    conditions.push(eq(invoices.clientId, filters.clientId));
  }
  if (filters?.month) {
    conditions.push(sql`TO_CHAR(${invoices.invoiceDate}, 'YYYY-MM') = ${filters.month}`);
  }

  // Alias quotations for the join
  const q = quotations;

  const query = db
    .select({
      id: invoices.id,
      divisionId: invoices.divisionId,
      divisionName: divisions.name,
      clientId: invoices.clientId,
      clientName: sql<string | null>`COALESCE(${clients.businessName}, ${clients.name})`,
      documentNumber: invoices.documentNumber,
      status: invoices.status,
      invoiceDate: sql<string>`${invoices.invoiceDate}::text`,
      dueDate: sql<string | null>`${invoices.dueDate}::text`,
      poNumber: invoices.poNumber,
      quotationId: invoices.quotationId,
      quotationNumber: sql<string | null>`${q.documentNumber}`,
      incomeId: invoices.incomeId,
      subtotal: invoices.subtotal,
      vatAmount: invoices.vatAmount,
      total: invoices.total,
      notes: invoices.notes,
      terms: invoices.terms,
      paidAt: invoices.paidAt,
      createdBy: invoices.createdBy,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(divisions, eq(invoices.divisionId, divisions.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(q, eq(invoices.quotationId, q.id))
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt));

  let finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

  // Count + sum query (unfiltered outstanding is always across all invoices matching filters)
  const countQuery = db
    .select({
      count: sql<number>`count(*)::int`,
      sum: sql<number>`COALESCE(SUM(${invoices.total}), 0)::numeric`,
      outstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('issued', 'overdue') THEN ${invoices.total} ELSE 0 END), 0)::numeric`,
    })
    .from(invoices);
  if (conditions.length > 0) countQuery.where(and(...conditions));

  const [totalRes] = await countQuery;
  const total = totalRes?.count ?? 0;
  const sumAmount = Number(totalRes?.sum ?? 0);
  const outstanding = Number(totalRes?.outstanding ?? 0);

  if (pageObj) {
    finalQuery = finalQuery
      .limit(pageObj.pageSize)
      .offset((pageObj.page - 1) * pageObj.pageSize) as any;
  }

  const data = await finalQuery;
  return { data: data as InvoiceRow[], total, sum: sumAmount, outstanding };
}

// ── getQuotationById ──────────────────────────────────────────────────────────

/**
 * Returns a single quotation with its line items and the converted invoice id
 * (if the quote has been converted), or null if not found.
 */
export async function getQuotationById(id: string): Promise<QuotationDetail | null> {
  const includeReference = await hasQuotationReferenceColumn();
  const rows = await db
    .select(getQuotationRowSelect(includeReference))
    .from(quotations)
    .innerJoin(divisions, eq(quotations.divisionId, divisions.id))
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .where(eq(quotations.id, id));

  if (rows.length === 0) return null;
  const row = rows[0] as QuotationRow;

  // Fetch line items sorted by sort_order
  const lineItems = await db
    .select()
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, "quote"),
        eq(billingLineItems.documentId, id),
      ),
    )
    .orderBy(asc(billingLineItems.sortOrder));

  // Reverse lookup: find the invoice that was converted from this quote
  const convertedInvoiceRows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.quotationId, id))
    .limit(1);

  const convertedInvoiceId = convertedInvoiceRows[0]?.id ?? null;

  return {
    ...row,
    lineItems: lineItems as LineItemDetail[],
    convertedInvoiceId,
  };
}

// ── getInvoiceById ────────────────────────────────────────────────────────────

/**
 * Returns a single invoice with its line items and the source quotation number,
 * or null if not found.
 */
export async function getInvoiceById(id: string): Promise<InvoiceDetail | null> {
  const rows = await db
    .select({
      id: invoices.id,
      divisionId: invoices.divisionId,
      divisionName: divisions.name,
      clientId: invoices.clientId,
      clientName: sql<string | null>`COALESCE(${clients.businessName}, ${clients.name})`,
      documentNumber: invoices.documentNumber,
      status: invoices.status,
      invoiceDate: sql<string>`${invoices.invoiceDate}::text`,
      dueDate: sql<string | null>`${invoices.dueDate}::text`,
      poNumber: invoices.poNumber,
      quotationId: invoices.quotationId,
      quotationNumber: sql<string | null>`${quotations.documentNumber}`,
      incomeId: invoices.incomeId,
      subtotal: invoices.subtotal,
      vatAmount: invoices.vatAmount,
      total: invoices.total,
      notes: invoices.notes,
      terms: invoices.terms,
      paidAt: invoices.paidAt,
      createdBy: invoices.createdBy,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(divisions, eq(invoices.divisionId, divisions.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(quotations, eq(invoices.quotationId, quotations.id))
    .where(eq(invoices.id, id));

  if (rows.length === 0) return null;
  const row = rows[0] as InvoiceRow;

  const lineItems = await db
    .select()
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, "invoice"),
        eq(billingLineItems.documentId, id),
      ),
    )
    .orderBy(asc(billingLineItems.sortOrder));

  return {
    ...row,
    lineItems: lineItems as LineItemDetail[],
  };
}

// ── getClientStatement ────────────────────────────────────────────────────────

/**
 * Returns a full client statement including summary totals, all quotes, and
 * all invoices for the given client. Optionally filtered by year.
 * conversionRate = accepted quotes / sent quotes (0 if no sent quotes).
 */
export async function getClientStatement(
  clientId: string,
  filters?: { year?: number },
): Promise<ClientStatement | null> {
  const includeReference = await hasQuotationReferenceColumn();
  // Fetch client
  const clientRows = await db
    .select({
      id: clients.id,
      name: clients.name,
      businessName: clients.businessName,
      email: clients.email,
      phone: clients.phone,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  if (clientRows.length === 0) return null;
  const client = clientRows[0]!;

  // Build year filter condition
  const quoteYearCondition = filters?.year
    ? sql`EXTRACT(YEAR FROM ${quotations.quoteDate}) = ${filters.year}`
    : undefined;
  const invoiceYearCondition = filters?.year
    ? sql`EXTRACT(YEAR FROM ${invoices.invoiceDate}) = ${filters.year}`
    : undefined;

  // Fetch quotes
  const quoteConditions = [eq(quotations.clientId, clientId)];
  if (quoteYearCondition) quoteConditions.push(quoteYearCondition);

  const quoteRows = await db
    .select(getQuotationRowSelect(includeReference))
    .from(quotations)
    .innerJoin(divisions, eq(quotations.divisionId, divisions.id))
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .where(and(...quoteConditions))
    .orderBy(desc(quotations.quoteDate));

  // Fetch invoices
  const invoiceConditions = [eq(invoices.clientId, clientId)];
  if (invoiceYearCondition) invoiceConditions.push(invoiceYearCondition);

  const invoiceRows = await db
    .select({
      id: invoices.id,
      divisionId: invoices.divisionId,
      divisionName: divisions.name,
      clientId: invoices.clientId,
      clientName: sql<string | null>`COALESCE(${clients.businessName}, ${clients.name})`,
      documentNumber: invoices.documentNumber,
      status: invoices.status,
      invoiceDate: sql<string>`${invoices.invoiceDate}::text`,
      dueDate: sql<string | null>`${invoices.dueDate}::text`,
      poNumber: invoices.poNumber,
      quotationId: invoices.quotationId,
      quotationNumber: sql<string | null>`${quotations.documentNumber}`,
      incomeId: invoices.incomeId,
      subtotal: invoices.subtotal,
      vatAmount: invoices.vatAmount,
      total: invoices.total,
      notes: invoices.notes,
      terms: invoices.terms,
      paidAt: invoices.paidAt,
      createdBy: invoices.createdBy,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(divisions, eq(invoices.divisionId, divisions.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(quotations, eq(invoices.quotationId, quotations.id))
    .where(and(...invoiceConditions))
    .orderBy(desc(invoices.invoiceDate));

  // Compute summary
  const totalQuoted = quoteRows.reduce((s, r) => s + Number(r.total), 0);
  const totalInvoiced = invoiceRows.reduce((s, r) => s + Number(r.total), 0);
  const totalPaid = invoiceRows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.total), 0);
  const totalOutstanding = invoiceRows
    .filter((r) => r.status === "issued" || r.status === "overdue")
    .reduce((s, r) => s + Number(r.total), 0);

  const sentCount = quoteRows.filter((r) => r.status === "sent" || r.status === "accepted" || r.status === "declined" || r.status === "converted").length;
  const acceptedCount = quoteRows.filter((r) => r.status === "accepted" || r.status === "converted").length;
  const conversionRate = sentCount > 0 ? acceptedCount / sentCount : 0;

  return {
    client,
    summary: {
      totalQuoted,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      quoteCount: quoteRows.length,
      invoiceCount: invoiceRows.length,
      conversionRate,
    },
    quotes: quoteRows as QuotationRow[],
    invoices: invoiceRows as InvoiceRow[],
  };
}

// ── getClientsWithBillingActivity ─────────────────────────────────────────────

/**
 * Returns all clients that have at least one quotation OR one invoice.
 * Each row includes aggregate billing stats.
 */
export async function getClientsWithBillingActivity(): Promise<ClientBillingRow[]> {
  const result = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.business_name AS "businessName",
      COALESCE(q.quote_count, 0)::int AS "quoteCount",
      COALESCE(inv.invoice_count, 0)::int AS "invoiceCount",
      COALESCE(inv.total_invoiced, 0)::numeric AS "totalInvoiced",
      COALESCE(inv.total_paid, 0)::numeric AS "totalPaid",
      COALESCE(inv.total_outstanding, 0)::numeric AS "totalOutstanding",
      GREATEST(q.last_quote_date, inv.last_invoice_date)::text AS "lastActivityDate"
    FROM clients c
    LEFT JOIN (
      SELECT
        client_id,
        COUNT(*)::int AS quote_count,
        MAX(quote_date) AS last_quote_date
      FROM quotations
      GROUP BY client_id
    ) q ON q.client_id = c.id
    LEFT JOIN (
      SELECT
        client_id,
        COUNT(*)::int AS invoice_count,
        MAX(invoice_date) AS last_invoice_date,
        COALESCE(SUM(total), 0) AS total_invoiced,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status IN ('issued', 'overdue') THEN total ELSE 0 END), 0) AS total_outstanding
      FROM invoices
      GROUP BY client_id
    ) inv ON inv.client_id = c.id
    WHERE q.client_id IS NOT NULL OR inv.client_id IS NOT NULL
    ORDER BY GREATEST(q.last_quote_date, inv.last_invoice_date) DESC NULLS LAST
  `);

  return (result.rows as any[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    businessName: r.businessName as string | null,
    quoteCount: Number(r.quoteCount),
    invoiceCount: Number(r.invoiceCount),
    totalInvoiced: Number(r.totalInvoiced),
    totalPaid: Number(r.totalPaid),
    totalOutstanding: Number(r.totalOutstanding),
    lastActivityDate: r.lastActivityDate as string | null,
  }));
}

// ── getAllItems ────────────────────────────────────────────────────────────────

/**
 * Returns billing catalogue items. Defaults to active items only.
 * Ordered by name ASC.
 */
export async function getAllItems(
  filters?: { status?: "active" | "archived" },
): Promise<BillingItemRow[]> {
  const statusFilter = filters?.status ?? "active";

  const data = await db
    .select()
    .from(billingItems)
    .where(eq(billingItems.status, statusFilter as any))
    .orderBy(asc(billingItems.name));

  return data as BillingItemRow[];
}

// ── getItemById ───────────────────────────────────────────────────────────────

/**
 * Returns a single billing item with usage counts (how many line items reference
 * this item by matching description + unit_price), or null if not found.
 *
 * Note: billing_line_items has no FK to billing_items (polymorphic design).
 * Usage is approximated by matching on description. For exact tracking, a
 * billing_item_id column should be added to billing_line_items in v2.
 */
export async function getItemById(id: string): Promise<BillingItemDetail | null> {
  const rows = await db
    .select()
    .from(billingItems)
    .where(eq(billingItems.id, id));

  if (rows.length === 0) return null;
  const item = rows[0]!;

  // Count usage in invoice line items
  const invoiceUsageResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, "invoice"),
        eq(billingLineItems.description, item.name),
      ),
    );

  // Count usage in quote line items
  const quoteUsageResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, "quote"),
        eq(billingLineItems.description, item.name),
      ),
    );

  return {
    ...(item as BillingItemRow),
    usageInvoices: invoiceUsageResult[0]?.count ?? 0,
    usageQuotes: quoteUsageResult[0]?.count ?? 0,
  };
}

// ── getActiveItems ────────────────────────────────────────────────────────────

/**
 * Returns active billing items for use in line item selectors.
 * Only active items are returned — archived items cannot be selected.
 */
export async function getActiveItems(): Promise<
  { id: string; name: string; description: string | null; unitPrice: string; unitLabel: string | null }[]
> {
  return db
    .select({
      id: billingItems.id,
      name: billingItems.name,
      description: billingItems.description,
      unitPrice: billingItems.unitPrice,
      unitLabel: billingItems.unitLabel,
    })
    .from(billingItems)
    .where(eq(billingItems.status, 'active' as any))
    .orderBy(asc(billingItems.name));
}

// ── getUnlinkedIncomeForClient ─────────────────────────────────────────────────

/**
 * Returns income records for a given client that are NOT already linked to an
 * invoice (i.e. no invoice has income_id = this income row's id).
 * Used by the "Link Payment" flow to let you attach an existing income record
 * to a historical invoice without creating a duplicate.
 */
export async function getUnlinkedIncomeForClient(
  clientId: string,
): Promise<{ id: string; date: string; description: string | null; amount: string }[]> {
  // Subquery: all income IDs already linked to an invoice
  const linkedIds = db
    .select({ incomeId: invoices.incomeId })
    .from(invoices)
    .where(sql`${invoices.incomeId} IS NOT NULL`);

  const rows = await db
    .select({
      id: income.id,
      date: sql<string>`${income.date}::text`,
      description: income.description,
      amount: income.amount,
    })
    .from(income)
    .where(
      and(
        eq(income.clientId, clientId),
        sql`${income.id} NOT IN (${linkedIds})`,
      ),
    )
    .orderBy(desc(income.date));

  return rows as { id: string; date: string; description: string | null; amount: string }[];
}

// ── Settings queries ──────────────────────────────────────────────────────────

import { organisationSettings, divisionBillingSettings } from "../schema/billing";
import type {
  OrganisationSettings,
  DivisionBillingSettings,
} from "../schema/billing";

export type { OrganisationSettings, DivisionBillingSettings };

/**
 * Returns the single organisation settings row, or null if not yet saved.
 */
export async function getOrganisationSettings(): Promise<OrganisationSettings | null> {
  const rows = await db.select().from(organisationSettings).limit(1);
  return rows[0] ?? null;
}

/**
 * Returns billing settings for a specific division, or null if not yet saved.
 */
export async function getDivisionBillingSettings(
  divisionId: string,
): Promise<DivisionBillingSettings | null> {
  const rows = await db
    .select()
    .from(divisionBillingSettings)
    .where(eq(divisionBillingSettings.divisionId, divisionId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns billing settings for all divisions as a map keyed by divisionId.
 */
export async function getAllDivisionBillingSettings(): Promise<
  Record<string, DivisionBillingSettings>
> {
  const rows = await db.select().from(divisionBillingSettings);
  return Object.fromEntries(rows.map((r) => [r.divisionId, r]));
}
