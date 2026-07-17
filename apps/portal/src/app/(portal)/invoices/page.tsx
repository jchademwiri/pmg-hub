import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, invoices, paymentAllocations } from '@pmg/db';
import { eq, and, ne, desc, inArray } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye } from 'lucide-react';
import Link from 'next/link';

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { client } = await getPortalSessionOrRedirect();
  const { status } = await searchParams;
  const db = getDb();

  // Fetch invoices (excluding drafts and voided)
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

  // Filter based on query param
  const filteredInvoices = allInvoices.filter((inv) => {
    if (!status || status === 'all') return true;
    if (status === 'unpaid') return ['issued', 'partially_paid', 'overdue'].includes(inv.status);
    return inv.status === status;
  });

  // Calculate counts for each tab
  const allCount = allInvoices.length;
  const unpaidCount = allInvoices.filter((inv) => ['issued', 'partially_paid', 'overdue'].includes(inv.status)).length;
  const paidCount = allInvoices.filter((inv) => inv.status === 'paid').length;
  const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length;

  const tabs = [
    { label: 'All', value: 'all', count: allCount },
    { label: 'Unpaid', value: 'unpaid', count: unpaidCount },
    { label: 'Paid', value: 'paid', count: paidCount },
    { label: 'Overdue', value: 'overdue', count: overdueCount },
  ];

  const currentTab = status || 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Invoices</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review and download your Playhouse Media Group invoices.
        </p>
      </div>

      {/* Premium Pill Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/invoices?status=${tab.value}`}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.05] text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Invoice Table */}
      <Card className="bg-[#0a0f1d] border-white/5">
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-white">No invoices found</p>
              <p className="text-xs text-muted-foreground mt-1">
                There are no invoices matching the selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse hidden md:table">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-white/[0.01]">
                    <th className="px-6 py-3">Invoice #</th>
                    <th className="px-6 py-3">Issue Date</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="relative hover:bg-white/[0.02] transition-colors group cursor-pointer">
                      <td className="px-6 py-4 font-semibold text-white">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="absolute inset-0 z-10"
                          title={`View Invoice ${inv.documentNumber}`}
                        >
                          <span className="sr-only">View Invoice {inv.documentNumber}</span>
                        </Link>
                        <span>{inv.documentNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {formatCurrency(inv.total)}
                        {inv.status === 'partially_paid' && (
                          <span className="block text-[10px] text-muted-foreground font-medium mt-0.5">
                            {formatCurrency(getInvoiceBalance(inv))} remaining
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                          inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-white/5">
                {filteredInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between py-4 hover:bg-white/[0.02] px-4 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{inv.documentNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">Issued {formatDate(inv.invoiceDate)}</p>
                      {inv.dueDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">Due {formatDate(inv.dueDate)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatCurrency(inv.total)}</p>
                      {inv.status === 'partially_paid' && (
                        <span className="block text-[10px] text-muted-foreground font-medium mt-0.5">
                          {formatCurrency(getInvoiceBalance(inv))} remaining
                        </span>
                      )}
                      <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-1.5 ${
                        inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                        inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
