import 'server-only';

import {
  and,
  creditNotes,
  creditRefunds,
  creditApplications,
  invoices,
  eq,
  getAllIncome,
  getClientById,
  getClientStatement,
  getDb,
  getDivisionBillingSettings,
  getAllDivisions,
  getIncomeAllocations,
  getIncomeById,
  getInvoiceById,
  getMonthPeriodDates,
  getOrganisationSettings,
  getQuotationById,
  sql,
} from '@pmg/db';
import { generateReceiptNumber } from '@pmg/utils';
import React from 'react';

import {
  InvoicePdfDocument,
  QuotePdfDocument,
  StatementPdfDocument,
  ReceiptPdfDocument,
  CreditNotePdfDocument,
  renderDocumentToPdf,
  resolveDivisionTheme,
  getLogoDataUri,
} from './pdf';

import { fmtDate, getSASTParts, getSASTToday } from './format';
import { calculateAgeing } from './billing-ageing';
import {
  buildOrgProps,
  determineStatementStatus,
  buildTransactionHistory,
  adjustOpeningBalance,
  resolveDivisionBranding,
  buildBankingProps,
  formatStatementNumber,
  formatPaymentReference,
  formatRefundReference,
  buildCreditNoteDivisionMap,
  computeStatementPeriodTotals,
} from './client-billing-helpers';

type BillingPdfType = 'invoice' | 'quote' | 'statement' | 'receipt' | 'credit-note' | 'credit_note';

type PdfLineItem = {
  itemName?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

type PdfTransaction = {
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
};

type PdfAgeing = {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61plus: number;
};

type PdfDocumentData = {
  type: BillingPdfType;
  statementType?: 'activity' | 'outstanding';
  title: string;
  number: string;
  status: string;
  issueDate: string;
  dueDateLabel?: string;
  dueDate?: string | null;
  periodFrom?: string;
  periodTo?: string;
  org: {
    name: string;
    divisionOf?: string;
    registrationNumber?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    salesRep?: string;
    logoDataUri?: string | null;
  };
  client: {
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  reference?: string | null;
  lineItems?: PdfLineItem[];
  allocations?: {
    invoiceNumber: string;
    invoiceDate?: string;
    amount: number;
  }[];
  transactions?: PdfTransaction[];
  openingBalance?: number;
  ageing?: PdfAgeing;
  notes?: string | null;
  terms?: string | null;
  banking?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
  totals?: {
    subtotal?: number;
    discount?: number;
    vat?: number;
    total?: number;
    paid?: number;
    writtenOff?: number;
    balanceDue?: number;
  };
  creditDetails?: {
    creditType?: string;
    originalInvoiceNumber?: string | null;
  };
};

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

function safeNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

async function buildInvoicePdfData(id: string): Promise<PdfDocumentData | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;
  const settings = await getDivisionBillingSettings(invoice.divisionId);
  const orgSettings = await getOrganisationSettings();

  const total = safeNumber(invoice.total);
  const paid =
    invoice.status === 'paid' ? total : Math.min(total, safeNumber(invoice.allocatedAmount));
  const writtenOff = safeNumber(invoice.writeOffAmount);
  const balanceDue = Math.max(0, total - paid - writtenOff);
  const showPaymentSummary =
    paid > 0 ||
    writtenOff > 0 ||
    invoice.status === 'paid' ||
    invoice.status === 'partially_paid' ||
    invoice.status === 'written_off';

  return {
    type: 'invoice',
    title: safeNumber(invoice.vatAmount) > 0 ? 'Tax Invoice' : 'Invoice',
    number: invoice.documentNumber,
    status: statusLabel(invoice.status),
    issueDate: invoice.invoiceDate,
    dueDateLabel: 'Due Date',
    dueDate: invoice.dueDate,
    reference: invoice.reference,
    org: buildOrgProps(invoice.divisionName, settings, orgSettings),
    client: {
      name: invoice.clientName ?? 'No client',
      email: invoice.clientEmail,
      phone: invoice.clientPhone,
    },
    lineItems: invoice.lineItems.map((line) => ({
      itemName: line.itemName || null,
      description: line.description,
      qty: safeNumber(line.quantity),
      unitPrice: safeNumber(line.unitPrice),
      amount:
        line.lineTotal != null
          ? safeNumber(line.lineTotal)
          : safeNumber(line.quantity) * safeNumber(line.unitPrice),
    })),
    notes: invoice.notes ?? settings?.invoiceNotes ?? undefined,
    terms: invoice.terms,
    banking: buildBankingProps(settings),
    totals: {
      subtotal: safeNumber(invoice.subtotal),
      discount: safeNumber(invoice.discountAmount),
      vat: safeNumber(invoice.vatAmount),
      total,
      paid: showPaymentSummary ? paid : undefined,
      writtenOff: writtenOff > 0 ? writtenOff : undefined,
      balanceDue: showPaymentSummary ? balanceDue : undefined,
    },
  };
}

async function buildQuotePdfData(id: string): Promise<PdfDocumentData | null> {
  const quote = await getQuotationById(id);
  if (!quote) return null;
  const settings = await getDivisionBillingSettings(quote.divisionId);
  const orgSettings = await getOrganisationSettings();

  return {
    type: 'quote',
    title: 'Quotation',
    number: quote.documentNumber,
    status: statusLabel(quote.status),
    issueDate: quote.quoteDate,
    dueDateLabel: 'Expiry Date',
    dueDate: quote.expiryDate,
    reference: quote.reference,
    org: buildOrgProps(quote.divisionName, settings, orgSettings),
    client: {
      name: quote.clientName ?? 'No client',
      email: quote.clientEmail,
      phone: quote.clientPhone,
    },
    lineItems: quote.lineItems.map((line) => ({
      itemName: line.itemName || null,
      description: line.description,
      qty: safeNumber(line.quantity),
      unitPrice: safeNumber(line.unitPrice),
      amount:
        line.lineTotal != null
          ? safeNumber(line.lineTotal)
          : safeNumber(line.quantity) * safeNumber(line.unitPrice),
    })),
    notes: quote.notes ?? settings?.quoteNotes,
    terms: quote.terms,
    banking: buildBankingProps(settings),
    totals: {
      subtotal: safeNumber(quote.subtotal),
      discount: safeNumber(quote.discountAmount),
      vat: safeNumber(quote.vatAmount),
      total: safeNumber(quote.total),
    },
  };
}

async function buildReceiptPdfData(id: string): Promise<PdfDocumentData | null> {
  const payment = await getIncomeById(id);
  if (!payment) return null;
  const [settings, allocations, orgSettings, clientRecord] = await Promise.all([
    getDivisionBillingSettings(payment.divisionId),
    getIncomeAllocations(id),
    getOrganisationSettings(),
    payment.clientId ? getClientById(payment.clientId) : Promise.resolve(null),
  ]);

  const paymentAmount = safeNumber(payment.amount);
  const totalAllocated = allocations.reduce((sum, a) => sum + safeNumber(a.amount), 0);
  const unallocated = Math.max(0, paymentAmount - totalAllocated);

  const businessName = clientRecord?.businessName;
  const contactName = clientRecord?.name;
  const displayName = businessName || contactName || payment.clientName || 'Client';
  const displayContact =
    businessName && contactName && businessName !== contactName ? contactName : undefined;
  const clientAddress = [
    clientRecord?.billingAddress,
    clientRecord?.city,
    clientRecord?.province,
    clientRecord?.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    type: 'receipt',
    title: 'Receipt',
    number: generateReceiptNumber(payment.id, payment.divisionName),
    status: 'Paid',
    issueDate: payment.date,
    org: buildOrgProps(payment.divisionName, settings, orgSettings),
    client: {
      name: displayName,
      contactName: displayContact,
      email: clientRecord?.email,
      phone: clientRecord?.phone,
      address: clientAddress || undefined,
    },
    reference: payment.description,
    allocations: allocations.map((alloc) => {
      let invDate = alloc.invoiceDate;
      if (!invDate && alloc.createdAt) {
        invDate =
          alloc.createdAt instanceof Date
            ? alloc.createdAt.toISOString().split('T')[0]
            : String(alloc.createdAt).split('T')[0];
      }
      return {
        invoiceNumber: alloc.invoiceNumber,
        invoiceDate: invDate || undefined,
        amount: safeNumber(alloc.amount),
      };
    }),
    lineItems: allocations.map((alloc) => ({
      itemName: alloc.invoiceNumber,
      description: alloc.invoiceDate || '',
      qty: 1,
      unitPrice: safeNumber(alloc.amount),
      amount: safeNumber(alloc.amount),
    })),
    transactions: allocations.length
      ? allocations.map((allocation) => ({
          date:
            allocation.createdAt instanceof Date
              ? allocation.createdAt.toISOString()
              : String(allocation.createdAt),
          reference: allocation.invoiceNumber,
          description: 'Invoice allocation',
          credit: safeNumber(allocation.amount),
          balance: 0,
        }))
      : [
          {
            date: payment.date,
            reference: '-',
            description: payment.description ?? 'Unallocated payment / retainer',
            credit: paymentAmount,
            balance: 0,
          },
        ],
    totals: {
      paid: paymentAmount,
      balanceDue: unallocated,
    },
    notes: `This is an official payment receipt issued by ${payment.divisionName}.`,
  };
}

async function buildCreditNotePdfData(id: string): Promise<PdfDocumentData | null> {
  const db = getDb();
  const [note] = await db.select().from(creditNotes).where(eq(creditNotes.id, id)).limit(1);
  if (!note) return null;

  const [clientRecord, settings, orgSettings, apps, originalInvoice] = await Promise.all([
    getClientById(note.clientId),
    getDivisionBillingSettings(note.divisionId),
    getOrganisationSettings(),
    db
      .select({
        id: creditApplications.id,
        amount: creditApplications.amount,
        appliedAt: creditApplications.appliedAt,
        invoiceNumber: invoices.documentNumber,
      })
      .from(creditApplications)
      .innerJoin(invoices, eq(invoices.id, creditApplications.invoiceId))
      .where(eq(creditApplications.creditNoteId, id)),
    note.originalInvoiceId
      ? db
          .select({ documentNumber: invoices.documentNumber })
          .from(invoices)
          .where(eq(invoices.id, note.originalInvoiceId))
          .limit(1)
          .then((res) => res[0]?.documentNumber ?? null)
      : Promise.resolve(null),
  ]);

  const allDivisions = await getAllDivisions();
  const division = allDivisions.find((d) => d.id === note.divisionId);
  const divisionName = division?.name ?? 'Playhouse Media Group';

  const totalAmount = safeNumber(note.amount);
  const amountRemaining = safeNumber(note.amountRemaining);
  const amountApplied = Math.max(0, totalAmount - amountRemaining);

  const issueDateStr =
    note.createdAt instanceof Date
      ? note.createdAt.toISOString().split('T')[0]
      : String(note.createdAt).split('T')[0];
  const expiresDateStr = note.expiresAt
    ? note.expiresAt instanceof Date
      ? note.expiresAt.toISOString().split('T')[0]
      : String(note.expiresAt).split('T')[0]
    : null;

  return {
    type: 'credit-note',
    title: 'Credit Note',
    number: note.documentNumber,
    status: statusLabel(note.status),
    issueDate: issueDateStr,
    dueDate: expiresDateStr,
    reference: originalInvoice ? `Invoice: ${originalInvoice}` : note.reason,
    org: buildOrgProps(divisionName, settings, orgSettings),
    client: {
      name: clientRecord?.businessName ?? clientRecord?.name ?? 'Client',
      email: clientRecord?.email,
      phone: clientRecord?.phone,
    },
    lineItems: apps.map((app) => ({
      itemName: app.invoiceNumber,
      description:
        app.appliedAt instanceof Date
          ? app.appliedAt.toISOString().split('T')[0]
          : String(app.appliedAt).split('T')[0],
      qty: 1,
      unitPrice: safeNumber(app.amount),
      amount: safeNumber(app.amount),
    })),
    notes: note.reason,
    totals: {
      total: totalAmount,
      balanceDue: amountRemaining,
      paid: amountApplied,
    },
    creditDetails: {
      creditType:
        note.type === 'overpayment'
          ? 'Advance Payment'
          : note.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      originalInvoiceNumber: originalInvoice,
    },
  };
}

async function buildStatementPdfData(
  clientId: string,
  filters?: {
    year?: number;
    monthPeriod?: 'current' | 'previous' | 'past3' | 'past6';
    statementType?: 'activity' | 'outstanding';
    includeDraftInvoiceId?: string;
    divisionId?: string;
  },
): Promise<PdfDocumentData | null> {
  const statement = await getClientStatement(clientId, filters);
  if (!statement) return null;
  const db = getDb();
  const orgSettings = await getOrganisationSettings();

  const creditConditions = [
    eq(creditNotes.clientId, clientId),
    sql`${creditNotes.status} != 'void'`,
  ];
  if (filters?.divisionId) {
    creditConditions.push(eq(creditNotes.divisionId, filters.divisionId));
  }

  const [incomeResult, dbCreditNotes, dbRefunds] = await Promise.all([
    getAllIncome({ clientId, ...filters }),
    db
      .select()
      .from(creditNotes)
      .where(and(...creditConditions)),
    filters?.divisionId
      ? db
          .select({
            id: creditRefunds.id,
            creditNoteId: creditRefunds.creditNoteId,
            clientId: creditRefunds.clientId,
            amount: creditRefunds.amount,
            refundDate: creditRefunds.refundDate,
            refundMethod: creditRefunds.refundMethod,
            reference: creditRefunds.reference,
            description: creditRefunds.description,
            createdBy: creditRefunds.createdBy,
            createdAt: creditRefunds.createdAt,
          })
          .from(creditRefunds)
          .innerJoin(creditNotes, eq(creditNotes.id, creditRefunds.creditNoteId))
          .where(
            and(
              eq(creditRefunds.clientId, clientId),
              eq(creditNotes.divisionId, filters.divisionId),
            ),
          )
      : db.select().from(creditRefunds).where(eq(creditRefunds.clientId, clientId)),
  ]);

  const { year: currentYear, month } = getSASTParts();
  const currentFY = month < 2 ? currentYear - 1 : currentYear;
  let periodFrom: string;
  let periodTo: string;
  if (filters?.monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(filters.monthPeriod);
    periodFrom = startDate;
    periodTo = endDate;
  } else {
    const y = filters?.year ?? currentFY;
    periodFrom = `${y}-03-01`;
    const nextFYStart = new Date(y + 1, 2, 1);
    const lastDayOfFY = new Date(nextFYStart.getTime() - 24 * 60 * 60 * 1000);
    periodTo = `${lastDayOfFY.getFullYear()}-${String(lastDayOfFY.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfFY.getDate()).padStart(2, '0')}`;
  }

  const openingBalance = adjustOpeningBalance(
    statement.summary.openingBalance,
    dbCreditNotes,
    dbRefunds,
    periodFrom,
  );

  // Resolve branding first: payment/refund reference numbers are division-prefixed.
  const clientRecord = await getClientById(clientId);
  const allDivisions = await getAllDivisions();
  const linkedDivisionId = filters?.divisionId ?? clientRecord?.divisionId;
  const { divisionName, effectiveDivisionId } = resolveDivisionBranding(
    linkedDivisionId,
    statement.invoices,
    allDivisions,
  );
  const settings = effectiveDivisionId
    ? await getDivisionBillingSettings(effectiveDivisionId)
    : null;

  const creditNoteDivisionById = buildCreditNoteDivisionMap(dbCreditNotes, allDivisions);

  let transactions: PdfTransaction[];
  let finalBalance: number;
  let periodInvoiced = 0;
  let periodPaid = 0;

  if (filters?.statementType === 'outstanding') {
    const outstandingInvoices =
      statement.outstandingInvoices ??
      statement.invoices.filter((i) => {
        const balance = safeNumber(i.total) - safeNumber(i.allocatedAmount);
        return balance > 0 && i.status !== 'void' && i.status !== 'written_off';
      });

    transactions = outstandingInvoices.map((invoice) => ({
      date: invoice.invoiceDate,
      reference: invoice.documentNumber,
      description: invoice.reference ?? 'Invoice',
      debit: safeNumber(invoice.total),
      credit: safeNumber(invoice.allocatedAmount),
      balance: safeNumber(invoice.total) - safeNumber(invoice.allocatedAmount),
    }));

    // Sort transactions by date ascending (oldest first)
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    finalBalance = transactions.reduce((sum, tx) => sum + (tx.balance ?? 0), 0);
    ({ totalInvoiced: periodInvoiced, totalPaid: periodPaid } =
      computeStatementPeriodTotals(transactions));
  } else {
    const raw = [
      ...statement.invoices
        .filter((invoice) => invoice.status !== 'void')
        .map((invoice) => ({
          date: invoice.invoiceDate,
          reference: invoice.documentNumber,
          description: invoice.reference ?? 'Invoice',
          debit: safeNumber(invoice.total),
          credit: undefined,
        })),
      ...incomeResult.data.map((payment) => ({
        date: payment.date,
        reference: formatPaymentReference(payment.id, payment.divisionName || divisionName),
        description: 'Payment received',
        debit: undefined,
        credit: safeNumber(payment.amount),
      })),
      ...dbCreditNotes
        .filter((note) => {
          const date =
            note.createdAt instanceof Date
              ? note.createdAt.toISOString().split('T')[0]
              : String(note.createdAt).split('T')[0];
          return note.type !== 'overpayment' && date >= periodFrom && date <= periodTo;
        })
        .map((note) => {
          const dateStr =
            note.createdAt instanceof Date
              ? note.createdAt.toISOString().split('T')[0]
              : String(note.createdAt).split('T')[0];
          return {
            date: dateStr,
            reference: note.documentNumber,
            description: note.reason ?? 'Credit Note',
            debit: undefined,
            credit: safeNumber(note.amount),
            kind: 'credit_note' as const,
          };
        }),
      ...dbRefunds
        .filter((refund) => refund.refundDate >= periodFrom && refund.refundDate <= periodTo)
        .map((refund) => ({
          date: refund.refundDate,
          reference: formatRefundReference(
            refund.id,
            refund.reference,
            creditNoteDivisionById.get(refund.creditNoteId) ?? divisionName,
          ),
          description: refund.description ?? 'Credit refund',
          debit: safeNumber(refund.amount),
          credit: undefined,
          kind: 'refund' as const,
        })),
    ];

    const built = buildTransactionHistory(raw, openingBalance);
    transactions = built;
    ({ totalInvoiced: periodInvoiced, totalPaid: periodPaid } =
      computeStatementPeriodTotals(built));
    finalBalance =
      transactions.length > 0 ? (transactions[0]!.balance ?? openingBalance) : openingBalance;
  }

  const asOfDate = periodTo || statement.periodTo || getSASTToday();
  const ageing = calculateAgeing(statement.outstandingInvoices ?? statement.invoices, asOfDate);

  const status = determineStatementStatus(statement.summary.totalOutstanding, statement.invoices);

  // Calculate earliest due date among unpaid invoices
  let earliestDueDate: string | undefined;
  const unpaidWithDueDates = (statement.outstandingInvoices ?? statement.invoices)
    .filter(
      (i) => i.dueDate && i.status !== 'paid' && i.status !== 'void' && i.status !== 'written_off',
    )
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  if (unpaidWithDueDates.length > 0) {
    earliestDueDate = unpaidWithDueDates[0]!.dueDate!;
  }

  const isOutstanding = filters?.statementType === 'outstanding';

  return {
    type: 'statement',
    statementType: filters?.statementType ?? 'activity',
    title:
      filters?.statementType === 'outstanding' ? 'Statement of Outstanding Invoices' : 'Statement',
    number: formatStatementNumber({
      clientName: statement.client.name,
      businessName: statement.client.businessName,
      monthPeriod: filters?.monthPeriod,
      year: filters?.year,
      currentFY,
    }),
    status,
    issueDate: getSASTToday(),
    dueDate: earliestDueDate,
    periodFrom: isOutstanding ? undefined : periodFrom,
    periodTo,
    org: buildOrgProps(
      divisionName,
      settings,
      orgSettings,
      settings ? 'Playhouse Media Group' : null,
    ),
    banking: buildBankingProps(settings),
    client: {
      name: statement.client.businessName ?? statement.client.name,
      email: statement.client.email,
      phone: statement.client.phone,
    },
    transactions,
    openingBalance: isOutstanding ? 0 : openingBalance,
    ageing,
    totals: {
      subtotal: isOutstanding ? periodInvoiced : periodInvoiced + openingBalance,
      paid: periodPaid,
      balanceDue: finalBalance,
    },
  };
}

async function renderDeclarativeBillingPdf(data: PdfDocumentData): Promise<Buffer> {
  const theme = resolveDivisionTheme(data.org.name);
  const logoDataUri = data.org.logoDataUri || getLogoDataUri(data.org.name);
  const org = {
    ...data.org,
    logoDataUri,
  };

  let element: React.ReactElement;

  if (data.type === 'invoice') {
    element = React.createElement(InvoicePdfDocument, {
      data: {
        invoiceNumber: data.number,
        status: data.status,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        dueDateLabel: data.dueDateLabel,
        reference: data.reference,
        org,
        client: data.client,
        items: (data.lineItems || []).map((item) => ({
          itemName: item.itemName,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        totals: data.totals || {},
        banking: data.banking,
        notes: data.notes,
        terms: data.terms,
      },
    });
  } else if (data.type === 'quote') {
    element = React.createElement(QuotePdfDocument, {
      data: {
        quoteNumber: data.number,
        status: data.status,
        issueDate: data.issueDate,
        expiryDate: data.dueDate,
        reference: data.reference,
        org,
        client: data.client,
        items: (data.lineItems || []).map((item) => ({
          itemName: item.itemName,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        totals: data.totals || {},
        banking: data.banking,
        notes: data.notes,
        terms: data.terms,
      },
    });
  } else if (data.type === 'statement') {
    element = React.createElement(StatementPdfDocument, {
      data: {
        statementNumber: data.number,
        statementType: data.statementType,
        status: data.status,
        periodFrom: data.periodFrom,
        periodTo: data.periodTo,
        dueDate: data.dueDate ?? undefined,
        org,
        client: data.client,
        openingBalance: data.openingBalance,
        totalDue: data.totals?.balanceDue,
        transactions: (data.transactions || []).map((tx) => ({
          date: tx.date,
          reference: tx.reference,
          description: tx.description,
          debit: tx.debit,
          credit: tx.credit,
          balance: tx.balance,
        })),
        ageing: data.ageing,
        banking: data.banking,
        terms: data.terms,
      },
    });
  } else if (data.type === 'receipt') {
    const amount = data.totals?.paid || 0;
    const allocationsList =
      data.allocations && data.allocations.length > 0
        ? data.allocations
        : (data.lineItems || []).map((item) => ({
            invoiceNumber: item.itemName || item.description,
            invoiceDate: item.itemName && item.description ? item.description : undefined,
            amount: item.amount,
          }));
    const totalAllocated = allocationsList.reduce((sum, item) => sum + item.amount, 0);
    const unallocated = data.totals?.balanceDue ?? Math.max(0, amount - totalAllocated);

    element = React.createElement(ReceiptPdfDocument, {
      data: {
        receiptNumber: data.number,
        paymentDate: data.issueDate,
        reference: data.reference,
        amount,
        unallocated,
        org,
        client: data.client,
        allocations: allocationsList,
        notes: data.notes,
      },
    });
  } else if (data.type === 'credit-note' || data.type === 'credit_note') {
    element = React.createElement(CreditNotePdfDocument, {
      data: {
        creditNoteNumber: data.number,
        status: data.status,
        issueDate: data.issueDate,
        expiresDate: data.dueDate,
        type: data.creditDetails?.creditType || 'Credit Note',
        reason: data.notes,
        originalInvoiceNumber: data.creditDetails?.originalInvoiceNumber,
        amount: data.totals?.total || 0,
        amountRemaining: data.totals?.balanceDue || 0,
        amountApplied: data.totals?.paid || 0,
        org,
        client: data.client,
        applications: (data.lineItems || []).map((item) => ({
          invoiceNumber: item.itemName || '',
          appliedDate: item.description,
          amount: item.amount,
        })),
        notes: data.notes,
      },
    });
  } else {
    throw new Error(`Unsupported declarative PDF document type: ${data.type}`);
  }

  const uint8 = await renderDocumentToPdf(element, { theme });
  return Buffer.from(uint8);
}

export async function generateBillingPdf(
  type: BillingPdfType,
  id: string,
  filters?: {
    year?: number;
    monthPeriod?: 'current' | 'previous' | 'past3' | 'past6';
    statementType?: 'activity' | 'outstanding';
    includeDraftInvoiceId?: string;
    divisionId?: string;
  },
) {
  const data =
    type === 'invoice'
      ? await buildInvoicePdfData(id)
      : type === 'quote'
        ? await buildQuotePdfData(id)
        : type === 'receipt'
          ? await buildReceiptPdfData(id)
          : type === 'credit-note' || type === 'credit_note'
            ? await buildCreditNotePdfData(id)
            : await buildStatementPdfData(id, filters);

  if (!data) return null;

  const fileName = `${data.title}-${data.number}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '-');
  const buffer = await renderDeclarativeBillingPdf(data);

  return {
    fileName,
    buffer,
  };
}
