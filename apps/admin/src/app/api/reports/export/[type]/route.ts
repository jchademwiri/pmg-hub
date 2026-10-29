import { NextResponse } from 'next/server';
import {
  getAllInvoices,
  getAllIncome,
  getAllExpenses,
  getAllDivisions,
  getClientById,
  getOrganisationSettings,
  getDb,
  paymentAllocations,
  creditNotes,
  creditApplications,
  invoices,
  sql,
  eq,
  and,
} from '@pmg/db';
import {
  renderDeclarativeInvoicesReport,
  renderDeclarativePaymentsReport,
  renderDeclarativeExpensesReport,
  renderDeclarativeClientSummaryReport,
  type InvoiceReportRow,
  type PaymentReportRow,
  type ExpenseReportRow,
  type ClientSummaryRow,
  type ClientSummaryValueColumn,
} from '@pmg/accounting/server-accounting-pdf';
import { buildOrgProps } from '@pmg/billing/client-billing-helpers';
import { fmtDate, fmtDateLong } from '@pmg/billing/format';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ReportExportType = 'invoices' | 'payments' | 'expenses';

function isReportExportType(val: string): val is ReportExportType {
  return val === 'invoices' || val === 'payments' || val === 'expenses';
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n');
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'all'
  );
}

function buildPeriodLabel(startDate?: string, endDate?: string): string {
  if (startDate && endDate) {
    return `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
  }
  if (startDate) {
    return `From ${fmtDate(startDate)}`;
  }
  if (endDate) {
    return `Up to ${fmtDate(endDate)}`;
  }
  return 'All Time';
}

function buildDateRangeFileSuffix(startDate?: string, endDate?: string): string {
  if (startDate && endDate) return `${startDate}-to-${endDate}`;
  if (startDate) return `from-${startDate}`;
  if (endDate) return `until-${endDate}`;
  return 'all-time';
}

function formatInvoiceStatusLabel(status?: string): string | undefined {
  if (!status || status === 'all') return undefined;
  if (status === 'all_active') return 'Active (Excl. Draft & Void)';
  if (status === 'only_outstanding' || status === 'unpaid_and_not_fully_paid') {
    return 'Unpaid & Not Fully Paid';
  }
  if (status === 'unpaid') return 'Unpaid Only';
  if (status === 'partially_paid' || status === 'not_fully_paid') {
    return 'Not Fully Paid (Partially Paid)';
  }
  if (status === 'written_off') return 'Written Off';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Collapses detail rows into one row per client: record count plus summed
 * monetary values. Sorted by the headline value (largest first).
 */
function groupRowsByClient<T extends { clientName: string }>(
  rows: T[],
  valueGetters: ((row: T) => number)[],
  headlineIndex: number,
): ClientSummaryRow[] {
  const map = new Map<string, ClientSummaryRow>();
  for (const row of rows) {
    const key = row.clientName;
    let entry = map.get(key);
    if (!entry) {
      entry = { clientName: key, count: 0, values: valueGetters.map(() => 0) };
      map.set(key, entry);
    }
    entry.count += 1;
    valueGetters.forEach((get, i) => {
      entry!.values[i] = (entry!.values[i] ?? 0) + get(row);
    });
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      (b.values[headlineIndex] ?? 0) - (a.values[headlineIndex] ?? 0) ||
      a.clientName.localeCompare(b.clientName),
  );
}

type ClientSummaryConfig = {
  type: ReportExportType;
  title: string;
  reportNumber: string;
  countLabel: string;
  valueColumns: ClientSummaryValueColumn[];
  headlineIndex: number;
  groupedRows: ClientSummaryRow[];
  summary: Record<string, number>;
  filterLabel?: string;
};

type ReportContext = {
  format: 'pdf' | 'csv' | 'json';
  disposition: 'inline' | 'attachment';
  org: ReturnType<typeof buildOrgProps>;
  periodLabel: string;
  clientScopeLabel: string;
  divisionLabel?: string;
  generatedAt: string;
  clientSlug: string;
  dateSuffix: string;
};

async function respondClientSummary(cfg: ClientSummaryConfig, ctx: ReportContext) {
  if (ctx.format === 'json') {
    return NextResponse.json({
      type: cfg.type,
      grouped: true,
      periodLabel: ctx.periodLabel,
      clientScopeLabel: ctx.clientScopeLabel,
      divisionLabel: ctx.divisionLabel || 'All Divisions',
      filterLabel: cfg.filterLabel,
      countLabel: cfg.countLabel,
      valueColumns: cfg.valueColumns,
      headlineIndex: cfg.headlineIndex,
      summary: cfg.summary,
      groupedRows: cfg.groupedRows,
      rows: [],
    });
  }

  if (ctx.format === 'csv') {
    const headers = ['Client', cfg.countLabel, ...cfg.valueColumns.map((c) => `${c.label} (ZAR)`)];
    const csvRows: (string | number)[][] = cfg.groupedRows.map((r) => [
      r.clientName,
      r.count,
      ...r.values.map((v) => v.toFixed(2)),
    ]);
    const totalCount = cfg.groupedRows.reduce((acc, r) => acc + r.count, 0);
    csvRows.push([
      `TOTAL (${cfg.groupedRows.length} clients)`,
      totalCount,
      ...cfg.valueColumns.map((_, i) =>
        cfg.groupedRows.reduce((acc, r) => acc + (r.values[i] ?? 0), 0).toFixed(2),
      ),
    ]);
    const fileName = `${cfg.type}-by-client-${ctx.clientSlug}-${ctx.dateSuffix}.csv`;
    return new NextResponse(toCsv(headers, csvRows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const pdfBuffer = await renderDeclarativeClientSummaryReport({
    title: cfg.title,
    reportNumber: cfg.reportNumber,
    countLabel: cfg.countLabel,
    valueColumns: cfg.valueColumns,
    headlineIndex: cfg.headlineIndex,
    rows: cfg.groupedRows,
    org: ctx.org,
    periodLabel: ctx.periodLabel,
    clientScopeLabel: ctx.clientScopeLabel,
    divisionLabel: ctx.divisionLabel,
    filterLabel: cfg.filterLabel,
    generatedAt: ctx.generatedAt,
  });
  const fileName = `${cfg.type}-by-client-${ctx.clientSlug}-${ctx.dateSuffix}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${ctx.disposition}; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { type } = await params;
  if (!isReportExportType(type)) {
    return NextResponse.json({ error: 'Unknown report export type.' }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'pdf').toLowerCase() as 'pdf' | 'csv' | 'json';
  const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';

  const rawClientId = url.searchParams.get('clientId') || 'all';
  const rawDivisionId = url.searchParams.get('divisionId') || 'all';
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const statusParam = url.searchParams.get('status') || 'all_active';
  const categoryParam = url.searchParams.get('category') || 'all';

  const divisionId = rawDivisionId !== 'all' ? rawDivisionId : undefined;

  const [allDivisions, orgSettings, clientRecord] = await Promise.all([
    getAllDivisions(),
    getOrganisationSettings(),
    rawClientId !== 'all' && rawClientId !== 'unassigned'
      ? getClientById(rawClientId)
      : Promise.resolve(null),
  ]);

  const selectedDivision = divisionId
    ? (allDivisions.find((d) => d.id === divisionId) ?? null)
    : null;
  const divisionLabel = selectedDivision?.name;

  const clientScopeLabel =
    rawClientId === 'all'
      ? 'All Clients'
      : rawClientId === 'unassigned'
        ? 'General (No Client)'
        : clientRecord
          ? clientRecord.businessName || clientRecord.name
          : 'Selected Client';

  const periodLabel = buildPeriodLabel(startDate, endDate);
  const generatedAt = fmtDateLong(new Date());
  const org = buildOrgProps(
    selectedDivision?.name || 'Playhouse Media Group (Pty) Ltd',
    null,
    orgSettings,
  );

  const clientSlug = slugify(clientScopeLabel);
  const dateSuffix = buildDateRangeFileSuffix(startDate, endDate);

  // Grouping by client only makes sense when the report spans all clients.
  const groupByClient = url.searchParams.get('groupBy') === 'client' && rawClientId === 'all';
  const ctx: ReportContext = {
    format,
    disposition,
    org,
    periodLabel,
    clientScopeLabel,
    divisionLabel,
    generatedAt,
    clientSlug,
    dateSuffix,
  };

  // ── 1. INVOICES REPORT ──────────────────────────────────────────────────────
  if (type === 'invoices') {
    const clientIdFilter =
      rawClientId !== 'all' && rawClientId !== 'unassigned' ? rawClientId : undefined;

    const excludeDraftVoid = statusParam === 'all_active';
    const onlyOutstanding =
      statusParam === 'only_outstanding' || statusParam === 'unpaid_and_not_fully_paid';
    const specificStatus =
      statusParam !== 'all' &&
      statusParam !== 'all_active' &&
      statusParam !== 'only_outstanding' &&
      statusParam !== 'unpaid_and_not_fully_paid'
        ? statusParam
        : undefined;

    const invResult = await getAllInvoices(
      {
        divisionId,
        clientId: clientIdFilter,
        invoiceDateFrom: startDate,
        invoiceDateTo: endDate,
        excludeDraftVoid,
        onlyOutstanding,
        status: specificStatus,
      },
      { page: 1, pageSize: 10000 },
    );

    const rows: InvoiceReportRow[] = invResult.data.map((inv) => {
      const total = Number(inv.total ?? 0);
      const subtotal = Number(inv.subtotal ?? 0);
      const vatAmount = Number(inv.vatAmount ?? 0);
      const allocated = Number(inv.allocatedAmount ?? 0);
      const writeOff = Number(inv.writeOffAmount ?? 0);
      const isPayableStatus =
        inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'partially_paid';
      const outstanding = isPayableStatus ? Math.max(0, total - allocated - writeOff) : 0;

      return {
        documentNumber: inv.documentNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        clientName: inv.clientName || 'Unknown Client',
        divisionName: inv.divisionName,
        status: inv.status,
        subtotal,
        vatAmount,
        total,
        paidAmount: allocated,
        outstandingAmount: outstanding,
      };
    });

    const totalInvoiced = rows.reduce((acc, r) => acc + r.total, 0);
    const totalPaid = rows.reduce((acc, r) => acc + r.paidAmount, 0);
    const totalOutstanding = rows.reduce((acc, r) => acc + r.outstandingAmount, 0);
    const statusFilterLabel = formatInvoiceStatusLabel(statusParam);

    if (groupByClient) {
      return respondClientSummary(
        {
          type: 'invoices',
          title: 'Client Balances Report',
          reportNumber: `INV-CLT-${new Date().getFullYear()}`,
          countLabel: 'Invoices',
          valueColumns: [
            { label: 'Invoiced' },
            { label: 'Paid', tone: 'success' },
            { label: 'Balance Due', tone: 'danger' },
          ],
          headlineIndex: 2,
          groupedRows: groupRowsByClient(
            rows,
            [(r) => r.total, (r) => r.paidAmount, (r) => r.outstandingAmount],
            2,
          ),
          summary: { count: rows.length, totalInvoiced, totalPaid, totalOutstanding },
          filterLabel: statusFilterLabel,
        },
        ctx,
      );
    }

    if (format === 'json') {
      return NextResponse.json({
        type: 'invoices',
        periodLabel,
        clientScopeLabel,
        divisionLabel: divisionLabel || 'All Divisions',
        statusFilterLabel: statusFilterLabel || 'All Statuses',
        summary: {
          count: rows.length,
          totalInvoiced,
          totalPaid,
          totalOutstanding,
        },
        rows,
      });
    }

    if (format === 'csv') {
      const showClientCol = rawClientId === 'all';
      const headers = showClientCol
        ? ['Date', 'Invoice #', 'Client', 'Status', 'Total (ZAR)', 'Paid (ZAR)', 'Balance (ZAR)']
        : ['Date', 'Invoice #', 'Status', 'Total (ZAR)', 'Paid (ZAR)', 'Balance (ZAR)'];
      const csvRows: (string | number | null)[][] = rows.map((r) =>
        showClientCol
          ? [
              r.invoiceDate,
              r.documentNumber,
              r.clientName,
              r.status,
              r.total.toFixed(2),
              r.paidAmount.toFixed(2),
              r.outstandingAmount.toFixed(2),
            ]
          : [
              r.invoiceDate,
              r.documentNumber,
              r.status,
              r.total.toFixed(2),
              r.paidAmount.toFixed(2),
              r.outstandingAmount.toFixed(2),
            ],
      );
      csvRows.push(
        showClientCol
          ? [
              `TOTAL (${rows.length})`,
              '',
              clientScopeLabel,
              '',
              totalInvoiced.toFixed(2),
              totalPaid.toFixed(2),
              totalOutstanding.toFixed(2),
            ]
          : [
              `TOTAL (${rows.length})`,
              '',
              '',
              totalInvoiced.toFixed(2),
              totalPaid.toFixed(2),
              totalOutstanding.toFixed(2),
            ],
      );

      const csvBody = toCsv(headers, csvRows);
      const fileName = `invoices-report-${clientSlug}-${dateSuffix}.csv`;
      return new NextResponse(csvBody, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const pdfBuffer = await renderDeclarativeInvoicesReport(
      rows,
      org,
      periodLabel,
      clientScopeLabel,
      divisionLabel,
      statusFilterLabel,
      generatedAt,
    );
    const fileName = `invoices-report-${clientSlug}-${dateSuffix}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // ── 2. PAYMENTS REPORT ──────────────────────────────────────────────────────
  if (type === 'payments') {
    const clientIdFilter =
      rawClientId !== 'all' && rawClientId !== 'unassigned' ? rawClientId : undefined;

    const incResult = await getAllIncome(
      {
        divisionId,
        clientId: clientIdFilter,
        startDate,
        endDate,
      },
      { page: 1, pageSize: 10000 },
    );

    const db = getDb();
    const incomeIds = incResult.data.map((r) => r.id);

    const [directAllocs, creditAllocs] =
      incomeIds.length > 0
        ? await Promise.all([
            db
              .select({
                incomeId: paymentAllocations.incomeId,
                invoiceNumber: invoices.documentNumber,
              })
              .from(paymentAllocations)
              .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
              .where(sql`${paymentAllocations.incomeId} IN ${incomeIds}`),
            db
              .select({
                incomeId: creditNotes.originalPaymentId,
                invoiceNumber: invoices.documentNumber,
              })
              .from(creditApplications)
              .innerJoin(creditNotes, eq(creditNotes.id, creditApplications.creditNoteId))
              .innerJoin(invoices, eq(invoices.id, creditApplications.invoiceId))
              .where(
                and(
                  sql`${creditNotes.originalPaymentId} IN ${incomeIds}`,
                  sql`${creditNotes.status} != 'void'`,
                ),
              ),
          ])
        : [[], []];

    const allocInvoicesMap = new Map<string, Set<string>>();

    for (const a of directAllocs) {
      if (!allocInvoicesMap.has(a.incomeId)) allocInvoicesMap.set(a.incomeId, new Set());
      allocInvoicesMap.get(a.incomeId)!.add(a.invoiceNumber);
    }

    for (const c of creditAllocs) {
      if (!c.incomeId) continue;
      if (!allocInvoicesMap.has(c.incomeId)) allocInvoicesMap.set(c.incomeId, new Set());
      allocInvoicesMap.get(c.incomeId)!.add(c.invoiceNumber);
    }

    const rows: PaymentReportRow[] = incResult.data.map((inc) => {
      const amount = Number(inc.amount ?? 0);
      const invSet = allocInvoicesMap.get(inc.id);
      const allocatedInvoices = invSet ? Array.from(invSet).join(', ') : '';

      return {
        date: inc.date,
        clientName: inc.clientName || 'General / Non-Client',
        divisionName: inc.divisionName,
        description: inc.description || '',
        allocatedInvoices,
        amount,
      };
    });

    const totalReceived = rows.reduce((acc, r) => acc + r.amount, 0);

    if (groupByClient) {
      return respondClientSummary(
        {
          type: 'payments',
          title: 'Payments by Client',
          reportNumber: `PAY-CLT-${new Date().getFullYear()}`,
          countLabel: 'Payments',
          valueColumns: [{ label: 'Total Received', tone: 'success' }],
          headlineIndex: 0,
          groupedRows: groupRowsByClient(rows, [(r) => r.amount], 0),
          summary: { count: rows.length, totalReceived },
        },
        ctx,
      );
    }

    if (format === 'json') {
      return NextResponse.json({
        type: 'payments',
        periodLabel,
        clientScopeLabel,
        divisionLabel: divisionLabel || 'All Divisions',
        summary: {
          count: rows.length,
          totalReceived,
        },
        rows,
      });
    }

    if (format === 'csv') {
      const showClientCol = rawClientId === 'all';
      const headers = showClientCol
        ? ['Date', 'Client', 'Reference / Invoice', 'Amount (ZAR)']
        : ['Date', 'Reference / Invoice', 'Amount (ZAR)'];
      const csvRows: (string | number | null)[][] = rows.map((r) =>
        showClientCol
          ? [r.date, r.clientName, r.allocatedInvoices || r.description, r.amount.toFixed(2)]
          : [r.date, r.allocatedInvoices || r.description, r.amount.toFixed(2)],
      );
      csvRows.push(
        showClientCol
          ? [`TOTAL (${rows.length})`, clientScopeLabel, '', totalReceived.toFixed(2)]
          : [`TOTAL (${rows.length})`, '', totalReceived.toFixed(2)],
      );

      const csvBody = toCsv(headers, csvRows);
      const fileName = `payments-report-${clientSlug}-${dateSuffix}.csv`;
      return new NextResponse(csvBody, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const pdfBuffer = await renderDeclarativePaymentsReport(
      rows,
      org,
      periodLabel,
      clientScopeLabel,
      divisionLabel,
      generatedAt,
    );
    const fileName = `payments-report-${clientSlug}-${dateSuffix}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // ── 3. EXPENSES REPORT ──────────────────────────────────────────────────────
  const clientIdFilter = rawClientId !== 'all' ? rawClientId : undefined;
  const categoryFilter = categoryParam !== 'all' ? categoryParam : undefined;

  const expResult = await getAllExpenses(
    {
      divisionId,
      clientId: clientIdFilter,
      category: categoryFilter,
      startDate,
      endDate,
    },
    { page: 1, pageSize: 10000 },
  );

  const rows: ExpenseReportRow[] = expResult.data.map((exp) => ({
    date: exp.date,
    category: exp.category,
    clientId: exp.clientId,
    clientName: exp.clientName || 'General (No Client)',
    divisionName: exp.divisionName,
    description: exp.description || '',
    hasReceipt: Boolean(exp.receiptUrl),
    amount: Number(exp.amount ?? 0),
  }));

  const totalExpenses = rows.reduce((acc, r) => acc + r.amount, 0);

  if (groupByClient) {
    return respondClientSummary(
      {
        type: 'expenses',
        title: 'Expenses by Client',
        reportNumber: `EXP-CLT-${new Date().getFullYear()}`,
        countLabel: 'Expenses',
        valueColumns: [{ label: 'Total Expenses', tone: 'danger' }],
        headlineIndex: 0,
        groupedRows: groupRowsByClient(rows, [(r) => r.amount], 0),
        summary: { count: rows.length, totalExpenses },
        filterLabel: categoryFilter,
      },
      ctx,
    );
  }

  if (format === 'json') {
    return NextResponse.json({
      type: 'expenses',
      periodLabel,
      clientScopeLabel,
      divisionLabel: divisionLabel || 'All Divisions',
      categoryFilterLabel: categoryFilter || 'All Categories',
      summary: {
        count: rows.length,
        totalExpenses,
      },
      rows,
    });
  }

  if (format === 'csv') {
    const showClientCol = rawClientId === 'all';
    const headers = showClientCol
      ? ['Date', 'Category', 'Client', 'Description', 'Amount (ZAR)']
      : ['Date', 'Category', 'Description', 'Amount (ZAR)'];
    const csvRows: (string | number | null)[][] = rows.map((r) =>
      showClientCol
        ? [r.date, r.category, r.clientName, r.description, r.amount.toFixed(2)]
        : [r.date, r.category, r.description, r.amount.toFixed(2)],
    );
    csvRows.push(
      showClientCol
        ? [
            `TOTAL (${rows.length})`,
            categoryFilter || 'All Categories',
            clientScopeLabel,
            '',
            totalExpenses.toFixed(2),
          ]
        : [
            `TOTAL (${rows.length})`,
            categoryFilter || 'All Categories',
            '',
            totalExpenses.toFixed(2),
          ],
    );

    const csvBody = toCsv(headers, csvRows);
    const fileName = `expenses-report-${clientSlug}-${dateSuffix}.csv`;
    return new NextResponse(csvBody, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const pdfBuffer = await renderDeclarativeExpensesReport(
    rows,
    org,
    periodLabel,
    clientScopeLabel,
    divisionLabel,
    categoryFilter,
    generatedAt,
  );
  const fileName = `expenses-report-${clientSlug}-${dateSuffix}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
