import { db } from '../client';
import { recurringInvoices, recurringLineItems, recurringExpenses } from '../schema/recurring';
import { divisions } from '../schema/divisions';
import { clients } from '../schema/clients';
import { billingItems } from '../schema/billing';
import { eq, and, desc, asc, sql, inArray, lte } from 'drizzle-orm';

export type RecurringInvoiceRow = {
  id: string;
  divisionId: string;
  divisionName: string;
  clientId: string;
  clientName: string;
  clientBusinessName: string | null;
  clientEmail: string | null;
  reference: string | null;
  status: 'active' | 'paused' | 'cancelled';
  frequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  billingCycleDay: number;
  dueDaysOffset: number;
  autoSendEmail: boolean;
  subtotal: string;
  discountType: string | null;
  discountValue: string | null;
  discountAmount: string;
  vatEnabled: boolean;
  vatAmount: string;
  total: string;
  notes: string | null;
  terms: string | null;
  lastRunDate: string | null;
  nextRunDate: string;
  endDate: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type RecurringInvoiceDetail = RecurringInvoiceRow & {
  lineItems: {
    id: string;
    itemId: string | null;
    itemName: string | null;
    sortOrder: number;
    description: string;
    quantity: string;
    unitPrice: string;
    discountType: string | null;
    discountValue: string | null;
    discountAmount: string;
    vatRate: string;
    lineTotal: string;
  }[];
};

export type RecurringExpenseRow = {
  id: string;
  divisionId: string;
  divisionName: string;
  vendorName: string;
  category: string;
  frequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  amount: string;
  billingCycleDay: number;
  nextDueDate: string;
  lastPaidDate: string | null;
  status: 'active' | 'paused' | 'cancelled';
  clientId: string | null;
  clientName: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
};

/**
 * Fetches all recurring inbound invoices (retainers/hosting).
 */
export async function getAllRecurringInvoices(filters?: {
  status?: 'active' | 'paused' | 'cancelled';
  divisionId?: string;
}): Promise<RecurringInvoiceRow[]> {
  const conditions = [];
  if (filters?.status) conditions.push(eq(recurringInvoices.status, filters.status));
  if (filters?.divisionId) conditions.push(eq(recurringInvoices.divisionId, filters.divisionId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: recurringInvoices.id,
      divisionId: recurringInvoices.divisionId,
      divisionName: divisions.name,
      clientId: recurringInvoices.clientId,
      clientName: clients.name,
      clientBusinessName: clients.businessName,
      clientEmail: clients.email,
      reference: recurringInvoices.reference,
      status: recurringInvoices.status,
      frequency: recurringInvoices.frequency,
      billingCycleDay: recurringInvoices.billingCycleDay,
      dueDaysOffset: recurringInvoices.dueDaysOffset,
      autoSendEmail: recurringInvoices.autoSendEmail,
      subtotal: recurringInvoices.subtotal,
      discountType: recurringInvoices.discountType,
      discountValue: recurringInvoices.discountValue,
      discountAmount: recurringInvoices.discountAmount,
      vatEnabled: recurringInvoices.vatEnabled,
      vatAmount: recurringInvoices.vatAmount,
      total: recurringInvoices.total,
      notes: recurringInvoices.notes,
      terms: recurringInvoices.terms,
      lastRunDate: sql<string | null>`${recurringInvoices.lastRunDate}::text`,
      nextRunDate: sql<string>`${recurringInvoices.nextRunDate}::text`,
      endDate: sql<string | null>`${recurringInvoices.endDate}::text`,
      createdBy: recurringInvoices.createdBy,
      createdAt: recurringInvoices.createdAt,
      updatedAt: recurringInvoices.updatedAt,
    })
    .from(recurringInvoices)
    .innerJoin(divisions, eq(divisions.id, recurringInvoices.divisionId))
    .innerJoin(clients, eq(clients.id, recurringInvoices.clientId))
    .where(where)
    .orderBy(asc(recurringInvoices.nextRunDate), desc(recurringInvoices.createdAt));

  return rows as RecurringInvoiceRow[];
}

/**
 * Fetches a single recurring invoice with line items.
 */
export async function getRecurringInvoiceById(id: string): Promise<RecurringInvoiceDetail | null> {
  const [header] = await db
    .select({
      id: recurringInvoices.id,
      divisionId: recurringInvoices.divisionId,
      divisionName: divisions.name,
      clientId: recurringInvoices.clientId,
      clientName: clients.name,
      clientBusinessName: clients.businessName,
      clientEmail: clients.email,
      reference: recurringInvoices.reference,
      status: recurringInvoices.status,
      frequency: recurringInvoices.frequency,
      billingCycleDay: recurringInvoices.billingCycleDay,
      dueDaysOffset: recurringInvoices.dueDaysOffset,
      autoSendEmail: recurringInvoices.autoSendEmail,
      subtotal: recurringInvoices.subtotal,
      discountType: recurringInvoices.discountType,
      discountValue: recurringInvoices.discountValue,
      discountAmount: recurringInvoices.discountAmount,
      vatEnabled: recurringInvoices.vatEnabled,
      vatAmount: recurringInvoices.vatAmount,
      total: recurringInvoices.total,
      notes: recurringInvoices.notes,
      terms: recurringInvoices.terms,
      lastRunDate: sql<string | null>`${recurringInvoices.lastRunDate}::text`,
      nextRunDate: sql<string>`${recurringInvoices.nextRunDate}::text`,
      endDate: sql<string | null>`${recurringInvoices.endDate}::text`,
      createdBy: recurringInvoices.createdBy,
      createdAt: recurringInvoices.createdAt,
      updatedAt: recurringInvoices.updatedAt,
    })
    .from(recurringInvoices)
    .innerJoin(divisions, eq(divisions.id, recurringInvoices.divisionId))
    .innerJoin(clients, eq(clients.id, recurringInvoices.clientId))
    .where(eq(recurringInvoices.id, id))
    .limit(1);

  if (!header) return null;

  const lines = await db
    .select({
      id: recurringLineItems.id,
      itemId: recurringLineItems.itemId,
      itemName: billingItems.name,
      sortOrder: recurringLineItems.sortOrder,
      description: recurringLineItems.description,
      quantity: recurringLineItems.quantity,
      unitPrice: recurringLineItems.unitPrice,
      discountType: recurringLineItems.discountType,
      discountValue: recurringLineItems.discountValue,
      discountAmount: recurringLineItems.discountAmount,
      vatRate: recurringLineItems.vatRate,
      lineTotal: recurringLineItems.lineTotal,
    })
    .from(recurringLineItems)
    .leftJoin(billingItems, eq(billingItems.id, recurringLineItems.itemId))
    .where(eq(recurringLineItems.recurringInvoiceId, id))
    .orderBy(asc(recurringLineItems.sortOrder));

  return {
    ...header,
    lineItems: lines as RecurringInvoiceDetail['lineItems'],
  };
}

/**
 * Fetches all recurring outbound vendor subscriptions (Claude, Antigravity, Hetzner VPS).
 */
export async function getAllRecurringExpenses(filters?: {
  status?: 'active' | 'paused' | 'cancelled';
  divisionId?: string;
}): Promise<RecurringExpenseRow[]> {
  const conditions = [];
  if (filters?.status) conditions.push(eq(recurringExpenses.status, filters.status));
  if (filters?.divisionId) conditions.push(eq(recurringExpenses.divisionId, filters.divisionId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: recurringExpenses.id,
      divisionId: recurringExpenses.divisionId,
      divisionName: divisions.name,
      vendorName: recurringExpenses.vendorName,
      category: recurringExpenses.category,
      frequency: recurringExpenses.frequency,
      amount: recurringExpenses.amount,
      billingCycleDay: recurringExpenses.billingCycleDay,
      nextDueDate: sql<string>`${recurringExpenses.nextDueDate}::text`,
      lastPaidDate: sql<string | null>`${recurringExpenses.lastPaidDate}::text`,
      status: recurringExpenses.status,
      clientId: recurringExpenses.clientId,
      clientName: clients.name,
      notes: recurringExpenses.notes,
      createdBy: recurringExpenses.createdBy,
      createdAt: recurringExpenses.createdAt,
      updatedAt: recurringExpenses.updatedAt,
    })
    .from(recurringExpenses)
    .innerJoin(divisions, eq(divisions.id, recurringExpenses.divisionId))
    .leftJoin(clients, eq(clients.id, recurringExpenses.clientId))
    .where(where)
    .orderBy(asc(recurringExpenses.nextDueDate), desc(recurringExpenses.createdAt));

  return rows as RecurringExpenseRow[];
}
