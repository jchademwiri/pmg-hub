import { db } from "../client";
import { quotations, invoices, billingLineItems, billingItems, paymentAllocations } from "../schema/billing";
import { income } from "../schema/income";
import { divisions } from "../schema/divisions";
import { clients } from "../schema/clients";
import { sql, eq, and, desc, asc, inArray, or } from "drizzle-orm";

// ── Shared types ──────────────────────────────────────────────────────────────

export type LineItemDetail = {
  id: string;
  documentType: string;
  documentId: string;
  itemId: string | null;
  itemName: string | null;
  sortOrder: number;
  description: string;
  quantity: string;   // numeric from DB - caller converts with Number()
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
  clientEmail: string | null;
  clientPhone: string | null;
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
  clientEmail: string | null;
  clientPhone: string | null;
  documentNumber: string;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  reference: string | null;
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
  allocatedAmount?: string;
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
    openingBalance: number;
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
    clientEmail: clients.email,
    clientPhone: clients.phone,
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
  clientEmail: clients.email,
  clientPhone: clients.phone,
  documentNumber: invoices.documentNumber,
  status: invoices.status,
  invoiceDate: sql<string>`${invoices.invoiceDate}::text`,
  dueDate: sql<string | null>`${invoices.dueDate}::text`,
  reference: invoices.reference,
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

function getSASTParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1; // 0-indexed
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

export function getMonthPeriodDates(monthPeriod: 'current' | 'previous' | 'past3' | 'past6') {
  const { year, month } = getSASTParts();
  let startDate: string;
  let endDate: string;

  const formatDateISO = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  if (monthPeriod === 'current') {
    startDate = formatDateISO(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    endDate = formatDateISO(year, month, lastDay);
  } else if (monthPeriod === 'previous') {
    const prevDateStart = new Date(year, month - 1, 1);
    const prevDateEnd = new Date(year, month, 0);
    startDate = formatDateISO(prevDateStart.getFullYear(), prevDateStart.getMonth(), prevDateStart.getDate());
    endDate = formatDateISO(prevDateEnd.getFullYear(), prevDateEnd.getMonth(), prevDateEnd.getDate());
  } else if (monthPeriod === 'past3') {
    const firstDay = new Date(year, month - 2, 1);
    startDate = formatDateISO(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate());
    const lastDay = new Date(year, month + 1, 0).getDate();
    endDate = formatDateISO(year, month, lastDay);
  } else {
    const firstDay = new Date(year, month - 5, 1);
    startDate = formatDateISO(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate());
    const lastDay = new Date(year, month + 1, 0).getDate();
    endDate = formatDateISO(year, month, lastDay);
  }

  return { startDate, endDate };
}

// ── getAllQuotations ───────────────────────────────────────────────────────────

/**
 * Returns paginated quotation rows joined to divisions (INNER) and clients (LEFT),
 * with optional filters for divisionId, status, clientId, month (YYYY-MM), year, and monthPeriod.
 * Ordered by quote_date DESC, created_at DESC.
 */
export async function getAllQuotations(
  filters?: {
    divisionId?: string;
    status?: string;
    clientId?: string;
    month?: string;
    year?: number;
    monthPeriod?: 'current' | 'previous' | 'past3' | 'past6';
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
  if (filters?.year) {
    const start = `${filters.year}-03-01`;
    const end = `${filters.year + 1}-03-01`;
    conditions.push(sql`${quotations.quoteDate} >= ${start} AND ${quotations.quoteDate} < ${end}`);
  }
  if (filters?.monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(filters.monthPeriod);
    conditions.push(sql`${quotations.quoteDate} >= ${startDate} AND ${quotations.quoteDate} <= ${endDate}`);
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
    year?: number;
    monthPeriod?: 'current' | 'previous' | 'past3' | 'past6';
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
  if (filters?.year) {
    const start = `${filters.year}-03-01`;
    const end = `${filters.year + 1}-03-01`;
    conditions.push(sql`${invoices.invoiceDate} >= ${start} AND ${invoices.invoiceDate} < ${end}`);
  }
  if (filters?.monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(filters.monthPeriod);
    conditions.push(sql`${invoices.invoiceDate} >= ${startDate} AND ${invoices.invoiceDate} <= ${endDate}`);
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
      reference: invoices.reference,
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
      allocatedAmount: sql<string>`COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = ${invoices.id}), 0)::text`,
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
      outstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('issued', 'overdue', 'partially_paid') THEN ${invoices.total} - COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = ${invoices.id}), 0) ELSE 0 END), 0)::numeric`,
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

  // Fetch line items sorted by sort_order, keeping the saved description and catalogue name separate.
  const lineItems = await db
    .select({
      id: billingLineItems.id,
      documentType: billingLineItems.documentType,
      documentId: billingLineItems.documentId,
      itemId: billingLineItems.itemId,
      itemName: billingItems.name,
      sortOrder: billingLineItems.sortOrder,
      description: billingLineItems.description,
      quantity: billingLineItems.quantity,
      unitPrice: billingLineItems.unitPrice,
      vatRate: billingLineItems.vatRate,
      lineTotal: billingLineItems.lineTotal,
      createdAt: billingLineItems.createdAt,
    })
    .from(billingLineItems)
    .leftJoin(billingItems, eq(billingLineItems.itemId, billingItems.id))
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
      clientEmail: clients.email,
      clientPhone: clients.phone,
      documentNumber: invoices.documentNumber,
      status: invoices.status,
      invoiceDate: sql<string>`${invoices.invoiceDate}::text`,
      dueDate: sql<string | null>`${invoices.dueDate}::text`,
      reference: invoices.reference,
      quotationId: invoices.quotationId,
      quotationNumber: sql<string | null>`${quotations.documentNumber}`,
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
      allocatedAmount: sql<string>`COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = ${invoices.id}), 0)::text`,
    })
    .from(invoices)
    .innerJoin(divisions, eq(invoices.divisionId, divisions.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(quotations, eq(invoices.quotationId, quotations.id))
    .where(eq(invoices.id, id));

  if (rows.length === 0) return null;
  const row = rows[0] as InvoiceRow;

  const lineItems = await db
    .select({
      id: billingLineItems.id,
      documentType: billingLineItems.documentType,
      documentId: billingLineItems.documentId,
      itemId: billingLineItems.itemId,
      itemName: billingItems.name,
      sortOrder: billingLineItems.sortOrder,
      description: billingLineItems.description,
      quantity: billingLineItems.quantity,
      unitPrice: billingLineItems.unitPrice,
      vatRate: billingLineItems.vatRate,
      lineTotal: billingLineItems.lineTotal,
      createdAt: billingLineItems.createdAt,
    })
    .from(billingLineItems)
    .leftJoin(billingItems, eq(billingLineItems.itemId, billingItems.id))
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
  filters?: { year?: number; monthPeriod?: 'current' | 'previous' | 'past3' | 'past6' },
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

  // Build filter conditions
  const quoteConditions = [eq(quotations.clientId, clientId)];
  const invoiceConditions = [
    eq(invoices.clientId, clientId),
    sql`${invoices.status} NOT IN ('draft', 'void')`,
    sql`${invoices.invoiceDate} <= timezone('Africa/Johannesburg', now())::date`
  ];
  const incomeConditions = [eq(income.clientId, clientId)];
  let statementBalanceCutoff: string | null = null;
  let periodStartDate: string | null = null;

  if (filters?.monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(filters.monthPeriod);
    statementBalanceCutoff = endDate;
    periodStartDate = startDate;
    quoteConditions.push(sql`${quotations.quoteDate} >= ${startDate} AND ${quotations.quoteDate} <= ${endDate}`);
    invoiceConditions.push(sql`${invoices.invoiceDate} >= ${startDate} AND ${invoices.invoiceDate} <= ${endDate}`);
    incomeConditions.push(sql`${income.date} >= ${startDate} AND ${income.date} <= ${endDate}`);
  } else if (filters?.year) {
    const startDate = `${filters.year}-03-01`;
    const endDateExclusive = `${filters.year + 1}-03-01`;
    statementBalanceCutoff = endDateExclusive;
    periodStartDate = startDate;
    quoteConditions.push(sql`${quotations.quoteDate} >= ${startDate} AND ${quotations.quoteDate} < ${endDateExclusive}`);
    invoiceConditions.push(sql`${invoices.invoiceDate} >= ${startDate} AND ${invoices.invoiceDate} < ${endDateExclusive}`);
    incomeConditions.push(
      sql`${income.date} >= ${startDate}`,
      sql`${income.date} < ${endDateExclusive}`
    );
  }

  // Fetch quotes
  const quoteRows = await db
    .select(getQuotationRowSelect(includeReference))
    .from(quotations)
    .innerJoin(divisions, eq(quotations.divisionId, divisions.id))
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .where(and(...quoteConditions))
    .orderBy(desc(quotations.quoteDate));

  // Fetch invoices (excluding draft and void)
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
      reference: invoices.reference,
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
      allocatedAmount: sql<string>`COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = ${invoices.id}), 0)::text`,
    })
    .from(invoices)
    .innerJoin(divisions, eq(invoices.divisionId, divisions.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(quotations, eq(invoices.quotationId, quotations.id))
    .where(and(...invoiceConditions))
    .orderBy(desc(invoices.invoiceDate));

  // Compute balance for "Amount Due" as of the statement period end.
  const globalInvoiceConditions = [
    eq(invoices.clientId, clientId),
    sql`${invoices.status} NOT IN ('draft', 'void')`,
    sql`${invoices.invoiceDate} <= timezone('Africa/Johannesburg', now())::date`
  ];
  const globalIncomeConditions = [eq(income.clientId, clientId)];

  if (statementBalanceCutoff) {
    if (filters?.year) {
      globalInvoiceConditions.push(sql`${invoices.invoiceDate} < ${statementBalanceCutoff}`);
      globalIncomeConditions.push(sql`${income.date} < ${statementBalanceCutoff}`);
    } else {
      globalInvoiceConditions.push(sql`${invoices.invoiceDate} <= ${statementBalanceCutoff}`);
      globalIncomeConditions.push(sql`${income.date} <= ${statementBalanceCutoff}`);
    }
  }

  const globalInvoicedRes = await db
    .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)::numeric` })
    .from(invoices)
    .where(and(...globalInvoiceConditions));
  
  const globalPaidRes = await db
    .select({ total: sql<number>`COALESCE(SUM(${income.amount}), 0)::numeric` })
    .from(income)
    .where(and(...globalIncomeConditions));

  const globalInvoiced = Number(globalInvoicedRes[0]?.total ?? 0);
  const globalPaid = Number(globalPaidRes[0]?.total ?? 0);
  const totalOutstanding = globalInvoiced - globalPaid;

  // Compute opening balance (balance prior to the statement period)
  let openingBalance = 0;
  if (periodStartDate) {
    const priorInvoiceConditions = [
      eq(invoices.clientId, clientId),
      sql`${invoices.status} NOT IN ('draft', 'void')`,
      sql`${invoices.invoiceDate} < ${periodStartDate}`,
    ];
    const priorIncomeConditions = [
      eq(income.clientId, clientId),
      sql`${income.date} < ${periodStartDate}`,
    ];

    const [priorInvoicedRes, priorPaidRes] = await Promise.all([
      db
        .select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)::numeric` })
        .from(invoices)
        .where(and(...priorInvoiceConditions)),
      db
        .select({ total: sql<number>`COALESCE(SUM(${income.amount}), 0)::numeric` })
        .from(income)
        .where(and(...priorIncomeConditions)),
    ]);

    const priorInvoiced = Number(priorInvoicedRes[0]?.total ?? 0);
    const priorPaid = Number(priorPaidRes[0]?.total ?? 0);
    openingBalance = priorInvoiced - priorPaid;
  }

  // Compute period summary
  const totalQuoted = quoteRows.reduce((s, r) => s + Number(r.total), 0);
  const totalInvoiced = invoiceRows.reduce((s, r) => s + Number(r.total), 0);
  
  // For period paid, we sum income records in that period
  const periodPaidRes = await db
    .select({ total: sql<number>`COALESCE(SUM(${income.amount}), 0)::numeric` })
    .from(income)
    .where(and(...incomeConditions));
  const totalPaid = Number(periodPaidRes[0]?.total ?? 0);

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
      openingBalance,
      quoteCount: quoteRows.length,
      invoiceCount: invoiceRows.length,
      conversionRate,
    },
    quotes: quoteRows as QuotationRow[],
    invoices: invoiceRows as InvoiceRow[],
  };
}

export async function getClientsWithBillingActivity(filters?: { year?: number }): Promise<ClientBillingRow[]> {
  const year = filters?.year;
  const start = year ? `${year}-03-01` : null;
  const end = year ? `${year + 1}-03-01` : null;

  const quoteFilter = year ? sql`WHERE quote_date >= ${start} AND quote_date < ${end}` : sql``;
  const invoiceFilter = year
    ? sql`WHERE invoice_date >= ${start} AND invoice_date < ${end} AND invoice_date <= timezone('Africa/Johannesburg', now())::date`
    : sql`WHERE invoice_date <= timezone('Africa/Johannesburg', now())::date`;
  const incomeFilter = year ? sql`WHERE date >= ${start} AND date < ${end}` : sql``;

  const result = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.business_name AS "businessName",
      COALESCE(q.quote_count, 0)::int AS "quoteCount",
      COALESCE(inv.invoice_count, 0)::int AS "invoiceCount",
      COALESCE(inv.total_invoiced, 0)::numeric AS "totalInvoiced",
      COALESCE(inc.total_paid, 0)::numeric AS "totalPaid",
      (COALESCE(inv.total_invoiced, 0) - COALESCE(inc.total_paid, 0))::numeric AS "totalOutstanding",
      GREATEST(q.last_quote_date, inv.last_invoice_date)::text AS "lastActivityDate"
    FROM clients c
    LEFT JOIN (
      SELECT
        client_id,
        COUNT(*)::int AS quote_count,
        MAX(quote_date) AS last_quote_date
      FROM quotations
      ${quoteFilter}
      GROUP BY client_id
    ) q ON q.client_id = c.id
    LEFT JOIN (
      SELECT
        client_id,
        COUNT(*)::int AS invoice_count,
        MAX(invoice_date) AS last_invoice_date,
        COALESCE(SUM(CASE WHEN status NOT IN ('draft', 'void') THEN total ELSE 0 END), 0) AS total_invoiced
      FROM invoices
      ${invoiceFilter}
      GROUP BY client_id
    ) inv ON inv.client_id = c.id
    LEFT JOIN (
      SELECT
        client_id,
        COALESCE(SUM(amount), 0) AS total_paid
      FROM income
      ${incomeFilter}
      GROUP BY client_id
    ) inc ON inc.client_id = c.id
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
 * this catalogue item), or null if not found.
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
        eq(billingLineItems.itemId, id),
      ),
    );

  // Count usage in quote line items
  const quoteUsageResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, "quote"),
        eq(billingLineItems.itemId, id),
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
 * Only active items are returned - archived items cannot be selected.
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

/**
 * Returns distinct financial years for a client from their invoices and income.
 * A date of 2025-01-15 falls into the 2024 financial year (since FY starts Mar 1).
 */
export async function getStatementYears(clientId: string): Promise<number[]> {
  const invYears = await db.execute(sql`
    SELECT DISTINCT
      EXTRACT(YEAR FROM (invoice_date - INTERVAL '2 months')) AS year
    FROM invoices
    WHERE client_id = ${clientId}
  `);
  const incYears = await db.execute(sql`
    SELECT DISTINCT
      EXTRACT(YEAR FROM (date - INTERVAL '2 months')) AS year
    FROM income
    WHERE client_id = ${clientId}
  `);

  const years = new Set<number>();
  for (const r of invYears.rows) years.add(Number(r.year));
  for (const r of incYears.rows) years.add(Number(r.year));

  const { year: sastYear, month: sastMonth } = getSASTParts();
  const currentFY = sastMonth < 2 ? sastYear - 1 : sastYear;
  years.add(currentFY); // Always include current FY

  return Array.from(years).sort((a, b) => b - a);
}

// ── Aging report ──────────────────────────────────────────────────────────────

export type AgingBucket = 'current' | '1_14' | '15_30' | '31_60' | '61_plus';

export type AgingRow = {
  bucket: AgingBucket;
  label: string;
  total: number;
  count: number;
};

const AGING_BUCKETS: AgingBucket[] = ['current', '1_14', '15_30', '31_60', '61_plus'];

const AGING_LABELS: Record<AgingBucket, string> = {
  current:  'Current',
  '1_14':   '1–14 days',
  '15_30':  '15–30 days',
  '31_60':  '31–60 days',
  '61_plus': '61+ days',
};

/**
 * Returns the aging report for all outstanding invoices (status = 'issued' or
 * 'overdue') across 5 buckets. Buckets with no invoices are returned with
 * total = 0 and count = 0.
 *
 * Bucket rules:
 *   current   dueDate >= today
 *   1_14      1–14 days past due
 *   15_30     15–30 days past due
 *   31_60     31–60 days past due
 *   61_plus   61+ days past due
 */
export async function getAgingReport(): Promise<AgingRow[]> {
  const result = await db.execute(sql`
    SELECT
      CASE
        WHEN due_date >= timezone('Africa/Johannesburg', now())::date                             THEN 'current'
        WHEN timezone('Africa/Johannesburg', now())::date - due_date BETWEEN 1  AND 14           THEN '1_14'
        WHEN timezone('Africa/Johannesburg', now())::date - due_date BETWEEN 15 AND 30           THEN '15_30'
        WHEN timezone('Africa/Johannesburg', now())::date - due_date BETWEEN 31 AND 60           THEN '31_60'
        ELSE '61_plus'
      END                                                         AS bucket,
      COUNT(*)::int                                               AS count,
      COALESCE(SUM(invoices.total - COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = invoices.id), 0)), 0) AS total
    FROM invoices
    WHERE status IN ('issued', 'overdue', 'partially_paid')
      AND due_date IS NOT NULL
      AND invoice_date <= timezone('Africa/Johannesburg', now())::date
    GROUP BY bucket
  `);

  const map = Object.fromEntries(
    (result.rows as { bucket: string; total: string; count: number }[]).map((r) => [
      r.bucket,
      { total: Number(r.total), count: Number(r.count) },
    ]),
  );

  return AGING_BUCKETS.map((bucket) => ({
    bucket,
    label: AGING_LABELS[bucket],
    total: map[bucket]?.total ?? 0,
    count: map[bucket]?.count ?? 0,
  }));
}

