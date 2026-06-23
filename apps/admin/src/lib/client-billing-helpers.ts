import type { InvoiceDetail, QuotationDetail, InvoiceRow, QuotationRow } from '@pmg/db';
import { getDocumentLogoUrl } from '@/lib/document-logo';
import { formatOrgAddress } from '@/lib/format';

export interface OrgPreviewProps {
  name: string;
  logoUrl: string;
  divisionOf?: string;
  registrationNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  salesRep?: string;
}

/**
 * Determine the display status for a client statement based on outstanding balance
 * and whether any invoices are overdue.
 */
export function determineStatementStatus(
  totalOutstanding: number,
  invoices: { status: string }[],
): 'Paid' | 'Outstanding' | 'Overdue' {
  if (totalOutstanding <= 0) return 'Paid';
  const hasOverdue = invoices.some(i => i.status === 'overdue');
  return hasOverdue ? 'Overdue' : 'Outstanding';
}

/**
 * Build a chronological transaction history with running balance.
 * Takes raw transaction items, sorts them by date ASC, computes a running
 * balance from the opening balance, then reverses to show newest first.
 * Preserves any additional fields on the items (e.g. invoiceId, paymentId).
 */
export function buildTransactionHistory<
  T extends { date: string; debit?: number; credit?: number },
>(
  items: T[],
  openingBalance: number,
): (T & { balance: number })[] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  let balance = openingBalance;
  const withBalance = sorted.map((item) => {
    balance = balance + (item.debit ?? 0) - (item.credit ?? 0);
    return { ...item, balance };
  });
  return withBalance.reverse();
}

/**
 * Adjust an opening balance by deducting credit notes and adding refunds
 * that fall before the statement period. Overpayment-type credit notes are
 * excluded from the adjustment since they represent unallocated payments.
 */
export function adjustOpeningBalance(
  baseBalance: number | null | undefined,
  creditNotes: { createdAt: { toISOString(): string }; type: string; amount: number | string }[],
  refunds: { refundDate: string; amount: number | string }[],
  periodFrom: string,
): number {
  let balance = Number(baseBalance ?? 0);
  for (const note of creditNotes) {
    const date = note.createdAt.toISOString().split('T')[0];
    if (date < periodFrom && note.type !== 'overpayment') {
      balance -= Number(note.amount);
    }
  }
  for (const refund of refunds) {
    if (refund.refundDate < periodFrom) {
      balance += Number(refund.amount);
    }
  }
  return balance;
}

/**
 * Build a map of incomeId → invoice document number for cross-referencing payments in statements.
 */
export function buildIncomeInvoiceMap(
  invoices: { incomeId?: string | null; documentNumber: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const inv of invoices) {
    if (inv.incomeId) map.set(inv.incomeId, inv.documentNumber);
  }
  return map;
}

export interface DivisionBrandingResult {
  /** Resolved division name to display on the statement */
  divisionName: string;
  /** The effective division ID to use for loading billing settings */
  effectiveDivisionId: string | null;
}

/**
 * Resolve the division branding for a statement by chaining through:
 * 1. An invoice that belongs to the client's linked division (its divisionName
 *    is the most specific and should override the division list lookup)
 * 2. The linked division name from the divisions list
 * 3. The first invoice's division name
 * 4. A configured default fallback name
 *
 * Also computes the effective division ID (linked ?? first invoice) for use
 * in loading billing settings.
 */
export function resolveDivisionBranding(
  linkedDivisionId: string | null | undefined,
  invoices: { divisionId?: string | null; divisionName: string }[],
  allDivisions?: { id: string; name: string }[],
  defaultName: string = 'Playhouse Media Group',
): DivisionBrandingResult {
  const linkedId = linkedDivisionId ?? null;
  const firstInvoiceDivId = invoices.length > 0 ? (invoices[0]!.divisionId ?? null) : null;
  const effectiveDivisionId = linkedId ?? firstInvoiceDivId;

  // Try linked invoice first (its divisionName is the most authoritative)
  const linkedInvoice = invoices.find((inv) => inv.divisionId === linkedId);
  const linkedDivName = linkedId && allDivisions
    ? allDivisions.find((d) => d.id === linkedId)?.name
    : undefined;

  const divisionName = linkedInvoice?.divisionName
    ?? linkedDivName
    ?? invoices[0]?.divisionName
    ?? defaultName;

  return { divisionName, effectiveDivisionId };
}

/**
 * Build a DocumentPreview org object from division + org-level settings.
 * Falls back through the chain: division sales rep → org settings → undefined.
 */
export function buildOrgProps(
  divisionName: string,
  divSettings?: { salesRepEmail?: string | null; salesRepPhone?: string | null; divisionWebsite?: string | null; salesRepName?: string | null } | null,
  orgSettings?: { registrationNumber?: string | null; vatNumber?: string | null; email?: string | null; phone?: string | null; website?: string | null; addressStreet?: string | null; addressCity?: string | null; addressPostal?: string | null } | null,
  /** Pass `null` to suppress the "A division of..." line entirely; omit or pass `undefined` to use the default `'Playhouse Media Group'` */
  divisionOf?: string | null,
): OrgPreviewProps {
  return {
    name: divisionName,
    logoUrl: getDocumentLogoUrl(divisionName),
    divisionOf: divisionOf !== null ? (divisionOf ?? 'Playhouse Media Group') : undefined,
    registrationNumber: orgSettings?.registrationNumber ?? undefined,
    vatNumber: orgSettings?.vatNumber ?? undefined,
    email: divSettings?.salesRepEmail ?? orgSettings?.email ?? undefined,
    phone: divSettings?.salesRepPhone ?? orgSettings?.phone ?? undefined,
    website: divSettings?.divisionWebsite ?? orgSettings?.website ?? undefined,
    address: formatOrgAddress(orgSettings),
    salesRep: divSettings?.salesRepName ?? undefined,
  };
}

export interface ActivityEvent {
  id: string;
  type: 'invoice' | 'quote' | 'payment';
  title: string;
  description: string;
  amount?: number;
  date: string;
  status: string;
  docNumber: string;
}

/**
 * Calculates average days to pay for a client's paid invoices
 */
export function calculateAverageDaysToPay(invoices: InvoiceDetail[]): number {
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paidAt && inv.invoiceDate);
  if (paidInvoices.length === 0) return 0;

  let totalDays = 0;
  for (const inv of paidInvoices) {
    const start = new Date(inv.invoiceDate);
    const end = new Date(inv.paidAt!);
    const diff = Math.max(0, end.getTime() - start.getTime());
    totalDays += Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return Math.round(totalDays / paidInvoices.length);
}

/**
 * Computes client health rating based on payment behavior and overdue balances
 */
export function calculateClientHealth(
  invoices: InvoiceDetail[],
  outstandingBalance: number,
  overdueBalance: number
): { score: 'Excellent' | 'Good' | 'At Risk' | 'Critical'; color: string } {
  const avgDays = calculateAverageDaysToPay(invoices);
  
  // Check if any invoice is > 90 days overdue
  const today = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const criticalOverdue = invoices.some(inv => {
    if (inv.status === 'overdue' && inv.dueDate) {
      return new Date(inv.dueDate) < ninetyDaysAgo;
    }
    return false;
  });

  if (criticalOverdue || (outstandingBalance > 0 && overdueBalance / outstandingBalance >= 0.8)) {
    return { score: 'Critical', color: 'red' };
  }

  if (overdueBalance > 0 && (overdueBalance / outstandingBalance > 0.2 || avgDays > 45)) {
    return { score: 'At Risk', color: 'orange' };
  }

  if (overdueBalance > 0 || avgDays > 30) {
    return { score: 'Good', color: 'blue' };
  }

  return { score: 'Excellent', color: 'green' };
}

/**
 * Synthesizes the last 10 activity events from quotes, invoices, and payments in memory
 */
export function buildActivityFeed(
  quotes: QuotationDetail[],
  invoices: InvoiceDetail[],
  payments: any[]
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Add invoices
  for (const inv of invoices) {
    // Invoice Created
    events.push({
      id: `inv-create-${inv.id}`,
      type: 'invoice',
      title: 'Invoice Raised',
      description: `Invoice ${inv.documentNumber} raised for ${inv.reference ?? 'services'}`,
      amount: Number(inv.total),
      date: inv.createdAt ? new Date(inv.createdAt).toISOString() : inv.invoiceDate,
      status: inv.status,
      docNumber: inv.documentNumber,
    });

    // Invoice Paid
    if (inv.status === 'paid' && inv.paidAt) {
      events.push({
        id: `inv-paid-${inv.id}`,
        type: 'payment',
        title: 'Invoice Paid',
        description: `Invoice ${inv.documentNumber} was fully paid`,
        amount: Number(inv.total),
        date: new Date(inv.paidAt).toISOString(),
        status: 'paid',
        docNumber: inv.documentNumber,
      });
    }

    // Invoice Voided
    if (inv.status === 'void') {
      events.push({
        id: `inv-void-${inv.id}`,
        type: 'invoice',
        title: 'Invoice Voided',
        description: `Invoice ${inv.documentNumber} was voided`,
        date: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : inv.invoiceDate,
        status: 'void',
        docNumber: inv.documentNumber,
      });
    }
  }

  // Add quotes
  for (const quote of quotes) {
    events.push({
      id: `quote-create-${quote.id}`,
      type: 'quote',
      title: 'Quotation Created',
      description: `Quote ${quote.documentNumber} created`,
      amount: Number(quote.total),
      date: quote.createdAt ? new Date(quote.createdAt).toISOString() : quote.quoteDate,
      status: quote.status,
      docNumber: quote.documentNumber,
    });

    if (quote.status === 'accepted') {
      events.push({
        id: `quote-accept-${quote.id}`,
        type: 'quote',
        title: 'Quotation Accepted',
        description: `Quote ${quote.documentNumber} was accepted by client`,
        amount: Number(quote.total),
        date: quote.updatedAt ? new Date(quote.updatedAt).toISOString() : quote.quoteDate,
        status: 'accepted',
        docNumber: quote.documentNumber,
      });
    }
  }

  // Add payments (income history entries)
  for (const pay of payments) {
    events.push({
      id: `payment-${pay.id}`,
      type: 'payment',
      title: 'Payment Received',
      description: pay.description ?? 'Client payment recorded',
      amount: Number(pay.amount),
      date: new Date(pay.date + 'T12:00:00').toISOString(), // Keep date stable
      status: 'success',
      docNumber: pay.id.slice(0, 8),
    });
  }

  // Sort DESC
  return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
}
