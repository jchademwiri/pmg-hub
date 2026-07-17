import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, invoices, paymentAllocations, divisions, divisionBillingSettings, income } from '@pmg/db';
import { eq, and, ne, desc, inArray } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { PrintButton } from '@/components/print-button';
import Link from 'next/link';

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
}

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function StatementsPage({ searchParams }: PageProps) {
  const { client } = await getPortalSessionOrRedirect();
  const { period } = await searchParams;
  const db = getDb();

  const currentPeriod = period || 'all';

  // Fetch all non-draft, non-void invoices
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.clientId, client.id),
        ne(invoices.status, 'draft'),
        ne(invoices.status, 'void')
      )
    )
    .orderBy(desc(invoices.invoiceDate));

  // Fetch all recorded payments (income)
  const allPayments = await db
    .select()
    .from(income)
    .where(eq(income.clientId, client.id))
    .orderBy(desc(income.date));

  // Get the division of the most recent invoice to use for branding/logo
  const lastInvoice = allInvoices[0];
  let division = null;
  let divSettings = null;

  if (lastInvoice) {
    const [fetchedDivision] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, lastInvoice.divisionId))
      .limit(1);
    division = fetchedDivision;

    const [fetchedSettings] = await db
      .select()
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, lastInvoice.divisionId))
      .limit(1);
    divSettings = fetchedSettings;
  }

  if (!division) {
    const [firstDivision] = await db
      .select()
      .from(divisions)
      .limit(1);
    division = firstDivision;

    if (firstDivision) {
      const [firstSettings] = await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, firstDivision.id))
        .limit(1);
      divSettings = firstSettings;
    }
  }

  // Fetch payment allocations for these invoices to calculate remaining balances
  const invoiceIds = allInvoices.map((inv) => inv.id);
  const allocations = invoiceIds.length > 0
    ? await db
        .select()
        .from(paymentAllocations)
        .where(inArray(paymentAllocations.invoiceId, invoiceIds))
    : [];

  const allocationMap = new Map<string, number>();
  allocations.forEach((alloc) => {
    const current = allocationMap.get(alloc.invoiceId) || 0;
    allocationMap.set(alloc.invoiceId, current + parseFloat(alloc.amount));
  });

  const getInvoiceBalance = (inv: typeof invoices.$inferSelect) => {
    const paid = allocationMap.get(inv.id) || 0;
    const total = parseFloat(inv.total);
    return Math.max(0, total - paid);
  };

  // Compute Ageing (based on all invoices, representing true account state)
  const today = new Date();
  let current = 0;
  let age30 = 0;
  let age60 = 0;
  let age90 = 0;

  allInvoices.forEach((inv) => {
    if (['paid', 'void'].includes(inv.status)) return;

    const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
    const diffMs = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const amt = getInvoiceBalance(inv);

    if (diffDays <= 0) {
      current += amt;
    } else if (diffDays <= 30) {
      age30 += amt;
    } else if (diffDays <= 60) {
      age60 += amt;
    } else {
      age90 += amt;
    }
  });

  const totalOutstanding = current + age30 + age60 + age90;

  // Build Chronological Ledger
  type LedgerTransaction = {
    id: string;
    date: Date;
    type: 'invoice' | 'payment';
    reference: string;
    amount: number;
    status?: string;
  };

  const ledger: LedgerTransaction[] = [];

  allInvoices.forEach((inv) => {
    ledger.push({
      id: inv.id,
      date: new Date(inv.invoiceDate),
      type: 'invoice',
      reference: `Invoice ${inv.documentNumber}`,
      amount: parseFloat(inv.total),
      status: inv.status,
    });
  });

  allPayments.forEach((pay) => {
    ledger.push({
      id: pay.id,
      date: new Date(pay.date),
      type: 'payment',
      reference: pay.description || 'Payment Received',
      amount: parseFloat(pay.amount),
    });
  });

  // Sort by date ascending (oldest first) to calculate running balance
  ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const ledgerWithBalance = ledger.map((tx) => {
    if (tx.type === 'invoice') {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    return {
      ...tx,
      runningBalance,
    };
  });

  // Filter based on the selected period
  const filteredLedger = ledgerWithBalance.filter((tx) => {
    if (currentPeriod === 'all') return true;
    const txDate = tx.date;
    const now = new Date();
    if (currentPeriod === 'current') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (currentPeriod === 'previous') {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      return txDate.getMonth() === prev.getMonth() && txDate.getFullYear() === prev.getFullYear();
    }
    if (currentPeriod === 'past3') {
      const limit = new Date();
      limit.setMonth(limit.getMonth() - 3);
      return txDate >= limit;
    }
    if (currentPeriod === 'past6') {
      const limit = new Date();
      limit.setMonth(limit.getMonth() - 6);
      return txDate >= limit;
    }
    return true;
  });

  // Sort descending (newest first) for UI presentation
  filteredLedger.reverse();

  const periods = [
    { label: 'All History', value: 'all' },
    { label: 'Current Month', value: 'current' },
    { label: 'Previous Month', value: 'previous' },
    { label: 'Last 3 Months', value: 'past3' },
    { label: 'Last 6 Months', value: 'past6' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Account Statement</h1>
          <p className="text-xs text-muted-foreground mt-1">
            View your current statement of account, payment history, and ageing summary.
          </p>
        </div>

        <PrintButton
          type="statement"
          id={`${client.id}?monthPeriod=${currentPeriod}`}
        />
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2 print:hidden max-w-4xl mx-auto">
        {periods.map((p) => {
          const isActive = currentPeriod === p.value;
          return (
            <Link
              key={p.value}
              href={`/statements?period=${p.value}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* Printable Statement Layout */}
      <Card className="bg-[#0a0f1d] border-white/5 shadow-xl max-w-4xl mx-auto print:bg-white print:text-black print:border-0 print:shadow-none">
        <CardContent className="p-8 sm:p-12 print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-8 border-b border-white/5 print:border-black/10">
            <div>
              {divSettings?.logoUrl ? (
                <img
                  src={divSettings.logoUrl}
                  alt={division?.name || 'Division Logo'}
                  className="h-10 w-auto object-contain mb-2 print:invert-0"
                />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-black tracking-wider text-white print:text-black">
                    {division ? division.name.split(' ')[0].toUpperCase() : 'PLAYHOUSE'}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-600 text-white print:bg-black">
                    {division ? division.name.split(' ').slice(1).join(' ').toUpperCase() : 'MEDIA'}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground print:text-black/60 leading-relaxed mt-2">
                {division ? division.name : 'Playhouse Media Group (Pty) Ltd'}<br />
                {divSettings?.salesRepEmail || 'billing@playhousemedia.co.za'}<br />
                {divSettings?.salesRepPhone && <span>{divSettings.salesRepPhone}<br /></span>}
                {divSettings?.divisionWebsite && (
                  <a
                    href={divSettings.divisionWebsite.startsWith('http') ? divSettings.divisionWebsite : `https://${divSettings.divisionWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-400 print:text-black"
                  >
                    {divSettings.divisionWebsite}
                  </a>
                )}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-xl font-bold text-white print:text-black tracking-tight">STATEMENT OF ACCOUNT</h2>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground print:text-black/70">
                <span>Statement Date:</span>
                <span className="font-medium text-white print:text-black">{formatDate(today.toISOString())}</span>
                <span>Account Number:</span>
                <span className="font-medium text-white print:text-black">{client.name.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Client & Payment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-white/5 print:border-black/10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 print:text-black/50 mb-2">
                Statement For
              </p>
              <p className="text-xs font-bold text-white print:text-black">{client.businessName || client.name}</p>
              <p className="text-xs text-muted-foreground print:text-black/70 mt-1 leading-relaxed">
                {client.name}<br />
                {client.email}<br />
                {client.phone}
              </p>
            </div>

            <div className="flex flex-col sm:items-end">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 print:text-black/50 mb-2 w-full text-left sm:text-right">
                Payment Info (EFT)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground print:text-black/70 w-full max-w-xs">
                <span className="text-left sm:text-right">Bank:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankName || 'Standard Bank'}
                </span>
                <span className="text-left sm:text-right">Account Name:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankAccountName || 'Playhouse Media Group'}
                </span>
                <span className="text-left sm:text-right">Account Number:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankAccountNumber || '10123456789'}
                </span>
                <span className="text-left sm:text-right">Branch Code:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankBranchCode || '051001'}
                </span>
                <span className="text-left sm:text-right">Reference:</span>
                <span className="font-semibold text-blue-400 print:text-black text-right">
                  {client.name.substring(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Ageing Table */}
          <div className="py-8">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 print:text-black/50 mb-4">
              Ageing Summary
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 text-center text-xs">
              <div className="rounded-lg border border-white/5 p-3 print:border-black/10">
                <p className="text-muted-foreground print:text-black/60 font-medium">Current</p>
                <p className="mt-1 font-bold text-white print:text-black">{formatCurrency(current)}</p>
              </div>
              <div className="rounded-lg border border-white/5 p-3 print:border-black/10">
                <p className="text-muted-foreground print:text-black/60 font-medium">30 Days</p>
                <p className="mt-1 font-bold text-amber-400 print:text-black">{formatCurrency(age30)}</p>
              </div>
              <div className="rounded-lg border border-white/5 p-3 print:border-black/10">
                <p className="text-muted-foreground print:text-black/60 font-medium">60 Days</p>
                <p className="mt-1 font-bold text-orange-400 print:text-black">{formatCurrency(age60)}</p>
              </div>
              <div className="rounded-lg border border-white/5 p-3 print:border-black/10">
                <p className="text-muted-foreground print:text-black/60 font-medium">90 Days+</p>
                <p className="mt-1 font-bold text-red-400 print:text-black">{formatCurrency(age90)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-lg border border-red-500/20 bg-red-500/5 p-3 print:border-black/10 print:bg-black/5">
                <p className="text-red-400 print:text-black font-bold">Total Due</p>
                <p className="mt-1 font-extrabold text-red-400 print:text-black">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="py-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 print:text-black/50 mb-4">
              Ledger Transactions
            </p>
            {filteredLedger.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No transactions found for this period.</p>
            ) : (
              <>
              <div className="overflow-x-auto hidden md:block print:block">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 print:border-black/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 print:text-black/60">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Charge (Debit)</th>
                    <th className="py-3 px-4 text-right">Payment (Credit)</th>
                    <th className="py-3 pl-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-black/10 text-xs">
                  {filteredLedger.map((tx) => {
                    const isInvoice = tx.type === 'invoice';
                    return (
                      <tr key={tx.id}>
                        <td className="py-4 pr-4 text-muted-foreground print:text-black/70">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-4 px-4 font-semibold text-white print:text-black">
                          {tx.reference}
                          {tx.status && tx.status !== 'paid' && (
                            <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.2 ml-2 rounded bg-amber-500/10 text-amber-400 print:border">
                              {tx.status}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-white print:text-black">
                          {isInvoice ? formatCurrency(tx.amount) : '—'}
                        </td>
                        <td className="py-4 px-4 text-right text-emerald-400 print:text-emerald-600 font-semibold">
                          {!isInvoice ? `-${formatCurrency(tx.amount)}` : '—'}
                        </td>
                        <td className="py-4 pl-4 text-right font-bold text-white print:text-black">
                          {formatCurrency(tx.runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden print:hidden divide-y divide-white/5">
                {filteredLedger.map((tx) => {
                  const isInvoice = tx.type === 'invoice';
                  return (
                    <div key={tx.id} className="py-4 hover:bg-white/[0.02] px-4 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{tx.reference}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.date)}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className={`text-sm font-bold ${isInvoice ? 'text-white' : 'text-emerald-400'}`}>
                            {isInvoice ? formatCurrency(tx.amount) : `-${formatCurrency(tx.amount)}`}
                          </p>
                          {tx.status && tx.status !== 'paid' && (
                            <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 mt-1">
                              {tx.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-white/5">
                        <span className="text-muted-foreground">Running Balance</span>
                        <span className="font-bold text-white">{formatCurrency(tx.runningBalance)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
