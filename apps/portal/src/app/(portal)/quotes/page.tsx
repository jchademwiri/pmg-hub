import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, quotations } from '@pmg/db';
import { eq, and, ne, desc } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { FileSpreadsheet, Eye } from 'lucide-react';
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

export default async function QuotesPage({ searchParams }: PageProps) {
  const { client } = await getPortalSessionOrRedirect();
  const { status } = await searchParams;
  const db = getDb();

  // Fetch quotes (excluding drafts)
  const allQuotes = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.clientId, client.id), ne(quotations.status, 'draft')))
    .orderBy(desc(quotations.quoteDate));

  // Filter based on query param
  const filteredQuotes = allQuotes.filter((q) => {
    if (!status || status === 'all') return true;
    return q.status === status;
  });

  // Calculate counts for each tab
  const allCount = allQuotes.length;
  const pendingCount = allQuotes.filter((q) => q.status === 'sent').length;
  const acceptedCount = allQuotes.filter((q) => q.status === 'accepted').length;
  const declinedCount = allQuotes.filter((q) => q.status === 'declined').length;
  const convertedCount = allQuotes.filter((q) => q.status === 'converted').length;

  const tabs = [
    { label: 'All', value: 'all', count: allCount },
    { label: 'Pending', value: 'sent', count: pendingCount },
    { label: 'Accepted', value: 'accepted', count: acceptedCount },
    { label: 'Declined', value: 'declined', count: declinedCount },
    { label: 'Converted', value: 'converted', count: convertedCount },
  ];

  const currentTab = status || 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Quotes</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review, approve, or decline your Playhouse Media Group quotes.
        </p>
      </div>

      {/* Premium Pill Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/quotes?status=${tab.value}`}
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

      {/* Quotes Table */}
      <Card className="bg-[#0a0f1d] border-white/5">
        <CardContent className="p-0">
          {filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSpreadsheet className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-white">No quotes found</p>
              <p className="text-xs text-muted-foreground mt-1">
                There are no quotes matching the selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-white/[0.01]">
                    <th className="px-6 py-3">Quote #</th>
                    <th className="px-6 py-3">Quote Date</th>
                    <th className="px-6 py-3">Expiry Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} className="relative hover:bg-white/[0.02] transition-colors group cursor-pointer">
                      <td className="px-6 py-4 font-semibold text-white">
                        <Link
                          href={`/quotes/${q.id}`}
                          className="absolute inset-0 z-10"
                          title={`View Quote ${q.documentNumber}`}
                        >
                          <span className="sr-only">View Quote {q.documentNumber}</span>
                        </Link>
                        <span>{q.documentNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(q.quoteDate)}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {q.expiryDate ? formatDate(q.expiryDate) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">{formatCurrency(q.total)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          q.status === 'accepted' || q.status === 'converted' ? 'bg-emerald-500/10 text-emerald-400' :
                          q.status === 'declined' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {q.status === 'sent' ? 'Awaiting Response' : q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
