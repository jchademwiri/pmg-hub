import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Printer, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import type { StatementTransaction } from '@/components/billing/document-preview';
import { getClientStatement, getAllIncome } from '@pmg/db';
import { formatZAR, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Statement' };

interface Props {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ year?: string }>;
}

export default async function StatementDetailPage({ params, searchParams }: Props) {
  const { clientId } = await params;
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : undefined;

  const [statement, incomeResult] = await Promise.all([
    getClientStatement(clientId, year ? { year } : undefined),
    getAllIncome({ clientId }),
  ]);

  if (!statement) notFound();

  const { client, summary, quotes, invoices } = statement;

  // ── Build transaction history ─────────────────────────────────────────────
  // Each non-void invoice = debit; each income record for this client = credit
  type TxRaw = { date: string; reference: string; description: string; debit?: number; credit?: number };

  const txRaw: TxRaw[] = [
    ...invoices
      .filter((inv) => inv.status !== 'void')
      .map((inv) => ({
        date: inv.invoiceDate,
        reference: inv.documentNumber,
        description: `${inv.documentNumber} — Invoice`,
        debit: Number(inv.total),
      })),
    ...incomeResult.data.map((inc) => ({
      date: inc.date,
      reference: inc.description ?? 'Payment',
      description: 'Payment received',
      credit: Number(inc.amount),
    })),
  ];

  // Sort by date DESC (newest first), then compute running balance from oldest
  // so balance is accurate, but display newest at top
  txRaw.sort((a, b) => a.date.localeCompare(b.date)); // ASC for balance calc

  let runningBalance = 0;
  const transactions: StatementTransaction[] = txRaw.map((tx) => {
    runningBalance += (tx.debit ?? 0) - (tx.credit ?? 0);
    return {
      date: tx.date,
      reference: tx.reference,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      balance: runningBalance,
    };
  });

  // Reverse to show newest first in the document
  transactions.reverse();

  // ── DocumentPreview props ─────────────────────────────────────────────────
  const now = new Date();
  const periodLabel = year ? String(year) : String(now.getFullYear());

  const docPreviewProps = {
    number: `STMT-${periodLabel}-${(client.businessName ?? client.name).slice(0, 3).toUpperCase()}`,
    status: 'Current',
    issueDate: now.toISOString().split('T')[0]!,
    periodFrom: year ? `${year}-01-01` : `${now.getFullYear()}-01-01`,
    periodTo: year ? `${year}-12-31` : now.toISOString().split('T')[0]!,
    org: { name: 'PMG' },
    client: {
      name: client.businessName ?? client.name,
      email: client.email ?? undefined,
      phone: client.phone ?? undefined,
    },
    transactions,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
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
              Account statement — {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <FileDown className="size-4" />
            Export PDF
          </Button>
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
        {/* Document preview — scrollable on small screens */}
        <div className="lg:col-span-2 overflow-x-auto">
          <DocumentPreview
            type="statement"
            {...docPreviewProps}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Name', value: client.businessName ?? client.name },
                  { label: 'Email', value: client.email ?? '—' },
                  { label: 'Phone', value: client.phone ?? '—' },
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
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Year</span>
                  <span>{periodLabel}</span>
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
                {/* Year filter links */}
                <div className="flex gap-2 flex-wrap">
                  {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                    <Link
                      key={y}
                      href={`/billing/statements/${clientId}?year=${y}`}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted ${
                        String(y) === periodLabel
                          ? 'border-foreground bg-muted font-medium'
                          : 'border-border'
                      }`}
                    >
                      {y}
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Income records section */}
      {incomeResult.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Income Records</CardTitle>
            <p className="text-sm text-muted-foreground">
              Payments posted to the income ledger for this client —{' '}
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatZAR(incomeResult.sum)} total
              </span>
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
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
                    <td className="px-6 py-3 text-muted-foreground">{inc.description ?? '—'}</td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                      +{formatZAR(Number(inc.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
