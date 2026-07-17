import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, invoices, quotations, paymentAllocations, projectScheduleEntries, complianceDocuments } from '@pmg/db';
import { eq, and, ne, desc, inArray } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileSpreadsheet, Landmark, PiggyBank, ArrowUpRight, ShieldAlert, CalendarDays } from 'lucide-react';
import Link from 'next/link';

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function DashboardPage() {
  const { client } = await getPortalSessionOrRedirect();
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

  // Fetch quotes (excluding drafts)
  const allQuotes = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.clientId, client.id), ne(quotations.status, 'draft')))
    .orderBy(desc(quotations.quoteDate));

  // Fetch active projects for client
  const activeProjects = await db
    .select()
    .from(projectScheduleEntries)
    .where(
      and(
        eq(projectScheduleEntries.clientId, client.id),
        inArray(projectScheduleEntries.status, ['planned', 'in_progress'])
      )
    )
    .orderBy(desc(projectScheduleEntries.updatedAt));

  // Fetch compliance documents
  const complianceDocs = await db
    .select()
    .from(complianceDocuments)
    .where(eq(complianceDocuments.clientId, client.id));

  // Fetch payment allocations for these invoices to calculate exact paid/due balances
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

  // Calculations
  const totalInvoiced = allInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
  
  const paidToDate = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount), 0);

  const outstandingBalance = allInvoices
    .filter((inv) => ['issued', 'partially_paid', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => {
      const paid = allocationMap.get(inv.id) || 0;
      const total = parseFloat(inv.total);
      return sum + Math.max(0, total - paid);
    }, 0);

  const pendingQuotesCount = allQuotes.filter((q) => q.status === 'sent').length;

  const recentInvoices = allInvoices.slice(0, 5);
  const recentQuotes = allQuotes.slice(0, 3);

  // Check expiring/missing documents
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  
  const complianceIssues = complianceDocs.filter(doc => {
    const expiry = new Date(doc.expiryDate);
    return expiry < thirtyDaysFromNow;
  });
  
  // Get active project
  const primaryProject = activeProjects[0];
  let projectProgress = 0;
  if (primaryProject && primaryProject.startDate && primaryProject.targetCompletionDate) {
    const start = new Date(primaryProject.startDate).getTime();
    const end = new Date(primaryProject.targetCompletionDate).getTime();
    const current = now.getTime();
    if (current > end) projectProgress = 100;
    else if (current < start) projectProgress = 0;
    else projectProgress = Math.round(((current - start) / (end - start)) * 100);
  }

  const stats = [
    { label: 'Outstanding Balance', value: formatCurrency(outstandingBalance), icon: Landmark, color: 'text-red-400' },
    { label: 'Paid to Date', value: formatCurrency(paidToDate), icon: PiggyBank, color: 'text-emerald-400' },
    { label: 'Total Invoiced', value: formatCurrency(totalInvoiced), icon: FileText, color: 'text-blue-400' },
    { label: 'Pending Quotes', value: pendingQuotesCount, icon: FileSpreadsheet, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Welcome back! Here is a summary of your relationship with PMG.
        </p>
      </div>

      {/* Compliance Reminder Banner */}
      {complianceIssues.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Compliance Action Required</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You have {complianceIssues.length} document(s) expiring soon or already expired. Please update them to avoid delays.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/compliance"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                View Documents
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminder Banner */}
      {outstandingBalance > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-red-500/10 bg-red-500/5 p-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <Landmark className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Payment Reminder</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You have an outstanding balance of <span className="font-bold text-red-400">{formatCurrency(outstandingBalance)}</span>. Please settle this balance or view your statement.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/statements"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                View Statement
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} size="sm" className="bg-[#0a0f1d] border-white/5">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className={`mt-1 text-lg font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-white/[0.02] border border-white/5">
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Project Progress Bar */}
        {primaryProject && (
          <Card className="bg-[#0a0f1d] border-white/5">
            <CardContent className="p-4 py-3">
              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                <div className="flex items-center gap-2 truncate">
                  <CalendarDays className="size-4 text-blue-400 shrink-0" />
                  <span className="text-white font-medium truncate">{primaryProject.projectReference}</span>
                  <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
                    {primaryProject.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="font-bold text-blue-400 shrink-0">
                  {projectProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-500"
                  style={{ width: `${projectProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>Started: {formatDate(primaryProject.startDate)}</span>
                <span>Target: {formatDate(primaryProject.targetCompletionDate)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Progress Bar */}
        <Card className="bg-[#0a0f1d] border-white/5">
          <CardContent className="p-4 py-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white font-medium">Payment Progress</span>
              <span className="font-bold text-emerald-400">
                {totalInvoiced > 0 ? Math.round((paidToDate / totalInvoiced) * 100) : 100}% Paid
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-500"
                style={{ width: `${totalInvoiced > 0 ? (paidToDate / totalInvoiced) * 100 : 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>Paid: {formatCurrency(paidToDate)}</span>
              <span>Invoiced: {formatCurrency(totalInvoiced)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card className="bg-[#0a0f1d] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="size-4 text-blue-400" />
              Recent Invoices
            </CardTitle>
            <Link
              href="/invoices"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {recentInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No invoices found.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-white/[0.02] -mx-4 px-4 rounded-lg transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">{inv.documentNumber}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Issued {formatDate(inv.invoiceDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{formatCurrency(inv.total)}</p>
                      <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-1 ${
                        inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                        inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card className="bg-[#0a0f1d] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-purple-400" />
              Recent Quotes
            </CardTitle>
            <Link
              href="/quotes"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {recentQuotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No quotes found.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentQuotes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-white/[0.02] -mx-4 px-4 rounded-lg transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors">{q.documentNumber}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Created {formatDate(q.quoteDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{formatCurrency(q.total)}</p>
                      <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-1 ${
                        q.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                        q.status === 'declined' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'
                      }`}>
                        {q.status === 'sent' ? 'Awaiting Response' : q.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
