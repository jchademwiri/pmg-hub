import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import type { StatementTransaction } from '@/components/billing/document-preview';
import { getClientStatement, getAllIncome, getStatementYears, getDivisionBillingSettings, getClientById, getMonthPeriodDates } from '@pmg/db';
import { getDocumentLogoUrl } from '@/lib/document-logo';
import { formatZAR, fmtDate, getSASTToday } from '@/lib/format';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) return { title: 'Statement' };
  
  const clientName = client.businessName ?? client.name;
  return { title: `Statement - ${clientName}` };
}

interface Props {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ year?: string; monthPeriod?: string }>;
}

export default async function StatementDetailPage({ params, searchParams }: Props) {
  const { clientId } = await params;
  const { year: yearParam, monthPeriod: monthPeriodParam } = await searchParams;

  const now = new Date();
  const currentFY = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

  const isMonthPeriodValid = monthPeriodParam === 'current' || 
                             monthPeriodParam === 'previous' || 
                             monthPeriodParam === 'past3' || 
                             monthPeriodParam === 'past6';

  // Default to 'current' monthPeriod if neither monthPeriod nor year filter is specified in URL
  const monthPeriod = isMonthPeriodValid
    ? monthPeriodParam
    : (!yearParam ? 'current' : undefined);

  // Mutual exclusivity: if monthPeriod is active, year is ignored/undefined
  const year = monthPeriod 
    ? undefined 
    : (yearParam ? parseInt(yearParam, 10) : undefined);

  const [statement, incomeResult, availableYears] = await Promise.all([
    getClientStatement(clientId, monthPeriod ? { monthPeriod } : (year ? { year } : undefined)),
    getAllIncome({ clientId, ...(monthPeriod ? { monthPeriod } : (year ? { year } : {})) }),
    getStatementYears(clientId),
  ]);

  if (!statement) notFound();

  const { client, summary, invoices } = statement;

  // ── Build transaction history ─────────────────────────────────────────────
  // Each non-void invoice = debit; each income record for this client = credit
  type TxRaw = {
    date: string;
    reference: string;
    description: string;
    debit?: number;
    credit?: number;
    invoiceId?: string;
    paymentId?: string;
  };

  // Build a map of incomeId → invoice document number for cross-referencing payments
  const incomeToInvoiceNumber = new Map<string, string>();
  for (const inv of invoices) {
    if (inv.incomeId) incomeToInvoiceNumber.set(inv.incomeId, inv.documentNumber);
  }

  const txRaw: TxRaw[] = [
    ...invoices
      .filter((inv) => inv.status !== 'void')
      .map((inv) => ({
        date: inv.invoiceDate,
        reference: inv.documentNumber,
        description: inv.reference ?? 'Invoice',
        debit: Number(inv.total),
        invoiceId: inv.id,
      })),
    ...incomeResult.data.map((inc) => ({
      date: inc.date,
      reference: incomeToInvoiceNumber.get(inc.id) ?? '-',
      description: 'Payment received',
      credit: Number(inc.amount),
      paymentId: inc.id,
    })),
  ];

  txRaw.sort((a, b) => a.date.localeCompare(b.date)); // ASC

  let currentBalance = summary.openingBalance;
  const transactions: StatementTransaction[] = txRaw.map((tx) => {
    currentBalance = currentBalance + (tx.debit ?? 0) - (tx.credit ?? 0);
    return {
      date: tx.date,
      reference: tx.reference,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      balance: currentBalance,
      invoiceId: tx.invoiceId,
      paymentId: tx.paymentId,
    };
  });

  // Reverse to show newest first in the document
  transactions.reverse();

  // ── Calculate dynamic status and ageing ──────────────────────────────────
  let docStatus = 'Paid';
  if (summary.totalOutstanding > 0) {
    const hasOverdue = invoices.some(i => i.status === 'overdue');
    docStatus = hasOverdue ? 'Overdue' : 'Outstanding';
  }

  const todayStr = getSASTToday();
  const ageing = { current: 0, days1_14: 0, days15_30: 0, days31_60: 0, days61_90: 0, days91_120: 0 };
  for (const inv of (statement.outstandingInvoices ?? invoices)) {
    if (inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'partially_paid') {
      const dueStr = inv.dueDate ?? inv.invoiceDate;
      const tDate = new Date(todayStr);
      const dDate = new Date(dueStr);
      const diffTime = tDate.getTime() - dDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const outstanding = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
      if (outstanding <= 0) continue;

      if (diffDays <= 0)        ageing.current    += outstanding;
      else if (diffDays <= 14)  ageing.days1_14   += outstanding;
      else if (diffDays <= 30)  ageing.days15_30  += outstanding;
      else if (diffDays <= 60)  ageing.days31_60  += outstanding;
      else if (diffDays <= 90)  ageing.days61_90  += outstanding;
      else                      ageing.days91_120 += outstanding;
    }
  }

  // ── DocumentPreview props ─────────────────────────────────────────────────
  let periodLabel = '';
  if (monthPeriod === 'current') {
    periodLabel = 'Current Month';
  } else if (monthPeriod === 'previous') {
    periodLabel = 'Previous Month';
  } else if (monthPeriod === 'past3') {
    periodLabel = 'Past 3 Months';
  } else if (monthPeriod === 'past6') {
    periodLabel = 'Past 6 Months';
  } else {
    periodLabel = `FY ${year}`;
  }

  let periodFrom = '';
  let periodTo = '';
  if (monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(monthPeriod);
    periodFrom = startDate;
    periodTo = endDate;
  } else {
    const y = year ?? currentFY;
    periodFrom = `${y}-03-01`;
    const nextFYStart = new Date(y + 1, 2, 1);
    const lastDayOfFY = new Date(nextFYStart.getTime() - 24 * 60 * 60 * 1000);
    periodTo = `${lastDayOfFY.getFullYear()}-${String(lastDayOfFY.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfFY.getDate()).padStart(2, '0')}`;
  }

  const primaryDivisionId = invoices[0]?.divisionId;
  const divSettings = primaryDivisionId ? await getDivisionBillingSettings(primaryDivisionId) : null;
  const orgName = invoices[0]?.divisionName ?? 'PMG';

  const docPreviewProps = {
    number: `STMT-${monthPeriod ? monthPeriod.toUpperCase() : (year ? year : currentFY)}-${(client.businessName ?? client.name).slice(0, 3).toUpperCase()}`,
    status: docStatus,
    issueDate: now.toISOString().split('T')[0]!,
    periodFrom,
    periodTo,
    org: {
      name: orgName,
      logoUrl: getDocumentLogoUrl(orgName),
      divisionOf: divSettings ? 'Playhouse Media Group' : undefined,
      email: divSettings?.salesRepEmail ?? undefined,
      phone: divSettings?.salesRepPhone ?? undefined,
      website: divSettings?.divisionWebsite ?? undefined,
      salesRep: divSettings?.salesRepName ?? undefined,
      bankName: divSettings?.bankName ?? undefined,
      accountName: divSettings?.bankAccountName ?? undefined,
      accountNumber: divSettings?.bankAccountNumber ?? undefined,
      branchCode: divSettings?.bankBranchCode ?? undefined,
    },
    client: {
      name: client.businessName ?? client.name,
      email: client.email ?? undefined,
      phone: client.phone ?? undefined,
    },
    transactions,
    ageing,
    balanceDue: summary.totalOutstanding,
    openingBalance: summary.openingBalance,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/statements">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h2 className="text-lg font-semibold">
              {client.businessName ?? client.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Account statement - {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <PrintButton 
            label="Print"
            documentTitle={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`} 
          />
          <ExportPdfButton 
            fileName={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`}
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total Quoted', value: formatZAR(summary.totalQuoted) },
          { label: 'Total Invoiced', value: formatZAR(summary.totalInvoiced) },
          { label: 'Total Paid', value: formatZAR(summary.totalPaid) },
          {
            label: 'Outstanding',
            value: formatZAR(summary.totalOutstanding),
            highlight: summary.totalOutstanding > 0,
          },
          {
            label: 'Conversion Rate',
            value: `${Math.round(summary.conversionRate * 100)}%`,
          },
        ].map((s) => (
          <Card key={s.label} size="sm">
            <CardHeader>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  'highlight' in s && s.highlight ? 'text-red-500' : ''
                }`}
              >
                {s.value}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview - scrollable on small screens */}
        <div className="lg:col-span-2 overflow-x-auto">
          <DocumentPreview
            type="statement"
            {...docPreviewProps}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Name', value: client.businessName ?? client.name },
                  { label: 'Email', value: client.email ?? '-' },
                  { label: 'Phone', value: client.phone ?? '-' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="text-sm">{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ageing Breakdown Card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Ageing Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Current', value: formatZAR(ageing.current) },
                  { label: '1–14 Days', value: formatZAR(ageing.days1_14), highlight: ageing.days1_14 > 0 },
                  { label: '15–30 Days', value: formatZAR(ageing.days15_30), highlight: ageing.days15_30 > 0 },
                  { label: '31–60 Days', value: formatZAR(ageing.days31_60), highlight: ageing.days31_60 > 0 },
                  { label: '61–90 Days', value: formatZAR(ageing.days61_90), highlight: ageing.days61_90 > 0 },
                  { label: '91–120 Days', value: formatZAR(ageing.days91_120), highlight: ageing.days91_120 > 0 },
                ].map((bucket) => (
                  <div key={bucket.label} className="flex justify-between items-center text-sm py-0.5 border-b border-border/40 last:border-b-0">
                    <span className="text-muted-foreground">{bucket.label}</span>
                    <span className={`font-semibold tabular-nums ${bucket.highlight ? 'text-red-500 font-bold' : 'text-foreground'}`}>
                      {bucket.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3">
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rolling Periods</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: 'current', label: 'Current' },
                      { value: 'previous', label: 'Previous' },
                      { value: 'past3', label: 'Past 3' },
                      { value: 'past6', label: 'Past 6' },
                    ].map((p) => (
                      <Link
                        key={p.value}
                        href={`/billing/statements/${clientId}?monthPeriod=${p.value}`}
                        className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-all hover:bg-muted ${
                          monthPeriod === p.value
                            ? 'border-foreground bg-muted font-medium text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>{p.label}</span>
                        {monthPeriod === p.value && (
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fiscal Years</span>
                  <div className="flex gap-2 flex-wrap">
                    {availableYears.map((y) => (
                      <Link
                        key={y}
                        href={`/billing/statements/${clientId}?year=${y}`}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-all hover:bg-muted ${
                          !monthPeriod && String(y) === String(year)
                            ? 'border-foreground bg-muted font-medium text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        FY {y}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Income records section */}
      {incomeResult.data.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Income Records</h3>
            <p className="text-sm text-muted-foreground">
              Payments posted to the income ledger for this client -{' '}
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatZAR(incomeResult.sum)} total
              </span>
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeResult.data.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell className="pl-6 tabular-nums text-muted-foreground">{fmtDate(inc.date)}</TableCell>
                  <TableCell>{inc.divisionName}</TableCell>
                  <TableCell className="text-muted-foreground">{inc.description ?? '-'}</TableCell>
                  <TableCell className="text-right pr-6 tabular-nums font-medium text-green-600 dark:text-green-400">
                    +{formatZAR(Number(inc.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
