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
import { formatZAR, fmtDate } from '@/lib/format';
import { PrintButton } from '@/components/billing/print-button';

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

  const monthPeriod = (monthPeriodParam === 'current' || monthPeriodParam === 'previous' || monthPeriodParam === 'past3')
    ? monthPeriodParam
    : undefined;

  // Mutual exclusivity: if monthPeriod is active, year is ignored/undefined
  const year = monthPeriod 
    ? undefined 
    : (yearParam ? parseInt(yearParam, 10) : currentFY);

  const [statement, incomeResult, availableYears] = await Promise.all([
    getClientStatement(clientId, monthPeriod ? { monthPeriod } : (year ? { year } : undefined)),
    getAllIncome({ clientId, ...(monthPeriod ? { monthPeriod } : (year ? { year } : {})) }),
    getStatementYears(clientId),
  ]);

  if (!statement) notFound();

  const { client, summary, invoices } = statement;

  // ── Build transaction history ─────────────────────────────────────────────
  // Each non-void invoice = debit; each income record for this client = credit
  type TxRaw = { date: string; reference: string; description: string; debit?: number; credit?: number };

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
      })),
    ...incomeResult.data.map((inc) => ({
      date: inc.date,
      reference: incomeToInvoiceNumber.get(inc.id) ?? '-',
      description: 'Payment received',
      credit: Number(inc.amount),
    })),
  ];

  txRaw.sort((a, b) => a.date.localeCompare(b.date)); // ASC

  const transactions: StatementTransaction[] = txRaw.map((tx) => {
    return {
      date: tx.date,
      reference: tx.reference,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
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

  const ageing = { current: 0, days1_14: 0, days15_30: 0, days31_60: 0, days61_90: 0, days91_120: 0 };
  const _now = new Date();
  for (const inv of invoices) {
    if (inv.status === 'issued' || inv.status === 'overdue') {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const diffTime = _now.getTime() - due.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0)        ageing.current    += Number(inv.total);
      else if (diffDays <= 14)  ageing.days1_14   += Number(inv.total);
      else if (diffDays <= 30)  ageing.days15_30  += Number(inv.total);
      else if (diffDays <= 60)  ageing.days31_60  += Number(inv.total);
      else if (diffDays <= 90)  ageing.days61_90  += Number(inv.total);
      else                      ageing.days91_120 += Number(inv.total);
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
          <PrintButton documentTitle={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`} />
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

          <Card size="sm">
            <CardHeader>
              <CardTitle>Statement Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium text-foreground">{periodLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quotes</span>
                  <span>{summary.quoteCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoices</span>
                  <span>{summary.invoiceCount}</span>
                </div>
                
                <Separator className="my-1" />
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rolling Periods</span>
                  <div className="flex flex-col gap-1">
                    {[
                      { value: 'current', label: 'Current Month' },
                      { value: 'previous', label: 'Previous Month' },
                      { value: 'past3', label: 'Past 3 Months' },
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
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Income Records</CardTitle>
              <p className="text-sm text-muted-foreground">
                Payments posted to the income ledger for this client -{' '}
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatZAR(incomeResult.sum)} total
                </span>
              </p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Division</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeResult.data.map((inc) => (
                    <tr key={inc.id} className="border-b last:border-0">
                      <td className="px-6 py-3 tabular-nums text-muted-foreground">{fmtDate(inc.date)}</td>
                      <td className="px-6 py-3">{inc.divisionName}</td>
                      <td className="px-6 py-3 text-muted-foreground">{inc.description ?? '-'}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                        +{formatZAR(Number(inc.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
