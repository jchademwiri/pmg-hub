import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import type { StatementTransaction } from '@/components/billing/document-preview';
import {
  getClientStatement,
  getAllIncome,
  getStatementYears,
  getDivisionBillingSettings,
  getClientById,
  getMonthPeriodDates,
  getAllDivisions,
  getDb,
  creditNotes,
  creditRefunds,
  getOrganisationSettings,
  eq,
  and,
  sql,
} from '@pmg/db';
import { getClientCreditBalanceV2 } from '@/app/actions/credit-management';
import { formatZAR, fmtDate, getSASTToday } from '@/lib/format';
import { buildOrgProps, determineStatementStatus, buildIncomeInvoiceMap, buildTransactionHistory, adjustOpeningBalance, resolveDivisionBranding, buildBankingProps } from '@/lib/client-billing-helpers';
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
import { SetPageLabel } from '@/components/navigation/page-header-context';
import { SendStatementButton } from '@/components/billing/send-statement-button';

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

  const db = getDb();
  const [statement, incomeResult, availableYears, creditBalance, dbCreditNotes, dbRefunds, orgSettings] = await Promise.all([
    getClientStatement(clientId, monthPeriod ? { monthPeriod } : (year ? { year } : undefined)),
    getAllIncome({ clientId, ...(monthPeriod ? { monthPeriod } : (year ? { year } : {})) }),
    getStatementYears(clientId),
    getClientCreditBalanceV2(clientId),
    db.select().from(creditNotes).where(and(eq(creditNotes.clientId, clientId), sql`${creditNotes.status} != 'void'`)),
    db.select().from(creditRefunds).where(eq(creditRefunds.clientId, clientId)),
    getOrganisationSettings(),
  ]);

  if (!statement) notFound();

  const { client, summary, invoices } = statement;
  const statementPdfParams = new URLSearchParams();
  if (monthPeriod) statementPdfParams.set('monthPeriod', monthPeriod);
  if (year) statementPdfParams.set('year', String(year));
  const statementPdfUrl = `/api/billing/pdf/statement/${clientId}${statementPdfParams.size ? `?${statementPdfParams.toString()}` : ''}`;

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

  const adjustedOpeningBalance = adjustOpeningBalance(
    summary.openingBalance,
    dbCreditNotes,
    dbRefunds,
    periodFrom,
  );

  // Filter credit notes and refunds within the current period
  const filteredNotes = dbCreditNotes.filter(n => {
    const dateStr = n.createdAt.toISOString().split('T')[0];
    return dateStr >= periodFrom && dateStr <= periodTo;
  });

  const filteredRefunds = dbRefunds.filter(r => {
    return r.refundDate >= periodFrom && r.refundDate <= periodTo;
  });

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
    creditNoteId?: string;
    refundId?: string;
  };

  const incomeToInvoiceNumber = buildIncomeInvoiceMap(invoices);

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
    ...filteredNotes
      .filter((n) => n.type !== 'overpayment')
      .map((n) => ({
        date: n.createdAt.toISOString().split('T')[0],
        reference: n.documentNumber,
        description: n.reason ?? 'Credit Note',
        credit: Number(n.amount),
        creditNoteId: n.id,
      })),
    ...filteredRefunds.map((r) => ({
      date: r.refundDate,
      reference: r.reference ?? '-',
      description: r.description ?? 'Credit refund',
      debit: Number(r.amount),
      refundId: r.id,
    })),
  ];

  const transactions = buildTransactionHistory(txRaw, adjustedOpeningBalance);
  const currentBalance = transactions.length > 0 ? transactions[0]!.balance : adjustedOpeningBalance;

  // ── Calculate dynamic status and ageing ──────────────────────────────────
  const docStatus = determineStatementStatus(summary.totalOutstanding, invoices);

  const todayStr = getSASTToday();
  const ageing = { current: 0, days1_14: 0, days15_30: 0, days31_60: 0, days61plus: 0 };
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
      else                      ageing.days61plus += outstanding;
    }
  }

  const outstandingInvoicesList = (statement.outstandingInvoices ?? invoices).filter(inv => {
    if (inv.status !== 'issued' && inv.status !== 'overdue' && inv.status !== 'partially_paid') return false;
    const outstanding = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
    return outstanding > 0;
  }).sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

  const clientRecord = await getClientById(clientId);
  const allDivisions = await getAllDivisions();
  const { divisionName: orgName, effectiveDivisionId } = resolveDivisionBranding(
    clientRecord?.divisionId,
    invoices,
    allDivisions,
  );
  const divSettings = effectiveDivisionId ? await getDivisionBillingSettings(effectiveDivisionId) : null;

  const docPreviewProps = {
    number: `STMT-${monthPeriod ? monthPeriod.toUpperCase() : (year ? year : currentFY)}-${(client.businessName ?? client.name).slice(0, 3).toUpperCase()}`,
    status: docStatus,
    issueDate: now.toISOString().split('T')[0]!,
    periodFrom,
    periodTo,
    org: buildOrgProps(orgName, divSettings, orgSettings, divSettings ? 'Playhouse Media Group' : null),
    client: {
      name: client.businessName ?? client.name,
      email: client.email ?? undefined,
      phone: client.phone ?? undefined,
    },
    banking: buildBankingProps(divSettings),
    transactions,
    ageing,
    balanceDue: currentBalance,
    openingBalance: adjustedOpeningBalance,
  };

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value="Client Statement" />
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {client.businessName ?? client.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Account statement - {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="hidden sm:block">
            <PrintButton 
              documentTitle={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`} 
            />
          </div>
          <SendStatementButton 
            clientId={clientId}
            clientName={client.businessName ?? client.name}
            defaultRecipientEmail={client.email ?? ''}
            statementPdfUrl={statementPdfUrl}
            statementDate={fmtDate(new Date())}
            period={periodLabel}
            totalAmountDue={formatZAR(currentBalance)}
          />
          <ExportPdfButton 
            fileName={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`}
            pdfUrl={statementPdfUrl}
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: 'Total Quoted', value: formatZAR(summary.totalQuoted), colorClass: 'text-muted-foreground' },
          { label: 'Total Invoiced', value: formatZAR(summary.totalInvoiced), colorClass: 'text-foreground' },
          { label: 'Total Paid', value: formatZAR(summary.totalPaid), colorClass: summary.totalPaid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground' },
          {
            label: 'Outstanding',
            value: formatZAR(currentBalance),
            colorClass: currentBalance > 0 ? 'text-red-500 dark:text-red-400' : 'text-foreground',
          },
          {
            label: 'Available Credit',
            value: formatZAR(creditBalance),
            colorClass: creditBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
          },
          {
            label: 'Conversion Rate',
            value: `${Math.round(summary.conversionRate * 100)}%`,
            colorClass: summary.conversionRate > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-foreground',
          },
        ].map((s) => (
          <Card key={s.label} className="p-3 sm:p-4 flex flex-col justify-center gap-1 bg-muted/20 border border-border/50">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{s.label}</p>
            <p className={`text-base sm:text-lg font-bold tabular-nums truncate ${s.colorClass}`}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6 lg:items-start">
        {/* Document preview - visible on desktop only */}
        <div className="hidden lg:block lg:col-span-2 overflow-x-auto">
          <DocumentPreview
            id="printable-area"
            type="statement"
            {...docPreviewProps}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start">
          <Card size="sm" className="hidden lg:block">
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
                  { label: '15+ Days', value: formatZAR(ageing.days15_30 + ageing.days31_60 + ageing.days61plus), highlight: (ageing.days15_30 + ageing.days31_60 + ageing.days61plus) > 0 },
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
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rolling Periods</span>
                  <div className="flex overflow-x-auto scrollbar-none gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap">
                    {[
                      { value: 'current', label: 'Current' },
                      { value: 'previous', label: 'Previous' },
                      { value: 'past3', label: 'Past 3' },
                      { value: 'past6', label: 'Past 6' },
                    ].map((p) => (
                      <Link
                        key={p.value}
                        href={`/billing/statements/${clientId}?monthPeriod=${p.value}`}
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-all ${
                          monthPeriod === p.value
                            ? 'border-primary bg-primary/10 font-semibold text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {p.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fiscal Years</span>
                  <div className="flex overflow-x-auto scrollbar-none gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap">
                    {availableYears.map((y) => (
                      <Link
                        key={y}
                        href={`/billing/statements/${clientId}?year=${y}`}
                        className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-all ${
                          !monthPeriod && String(y) === String(year)
                            ? 'border-primary bg-primary/10 font-semibold text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted'
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

      {/* Mobile Outstanding Invoices */}
      <div className="lg:hidden space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Outstanding Invoices</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Unpaid invoices making up the balance
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          {outstandingInvoicesList.map((inv) => {
            const outstanding = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
            return (
            <div key={inv.id} className="bg-card border rounded-lg p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="font-semibold text-sm truncate max-w-[65%]">{inv.documentNumber}</div>
                <div className="font-bold text-sm shrink-0 text-red-500 dark:text-red-400">
                  {formatZAR(outstanding)}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
                <span className="tabular-nums">Issued: {fmtDate(inv.invoiceDate)}</span>
                <span className="tabular-nums">Due: {fmtDate(inv.dueDate ?? inv.invoiceDate)}</span>
              </div>
            </div>
          )})}
          {outstandingInvoicesList.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8 px-4 border rounded-lg bg-card border-dashed">
              No outstanding invoices.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
