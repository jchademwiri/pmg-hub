import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllQuotations } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { QuotesClient } from './quotes-client';
import { deleteQuotation, updateQuotationStatus } from '@/app/actions/billing-quotes';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quotations' };

interface QuotesPageProps {
  searchParams: Promise<{ divisionId?: string; status?: string; page?: string }>;
}

const VALID_QUOTE_STATUSES = new Set([
  'draft',
  'sent',
  'accepted',
  'declined',
  'cancelled',
  'expired',
  'converted',
]);

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const { divisionId, status, page } = await searchParams;

  const parsedPage = Number.parseInt(page ?? '1', 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const normalizedStatus = status && VALID_QUOTE_STATUSES.has(status) ? status : undefined;
  const pageSize = 20;

  const now = new Date();
  const currentFY = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

  const [result, allResult] = await Promise.all([
    getAllQuotations(
      { divisionId, status: normalizedStatus, year: currentFY },
      { page: currentPage, pageSize },
    ),
    getAllQuotations({ year: currentFY }),
  ]);

  const totalCount = allResult.total;
  const pendingCount = allResult.data.filter(
    (q) => q.status === 'sent',
  ).length;
  const acceptedCount = allResult.data.filter(
    (q) => q.status === 'accepted' || q.status === 'converted',
  ).length;
  const declinedCount = allResult.data.filter((q) => q.status === 'declined').length;

  const stats = [
    { label: 'Total Quotes', value: String(totalCount), icon: FileText, description: 'Year to Date' },
    { label: 'Pending', value: String(pendingCount), icon: Clock, description: 'Awaiting response' },
    { label: 'Accepted', value: String(acceptedCount), icon: CheckCircle, description: 'Accepted or converted' },
    { label: 'Declined', value: String(declinedCount), icon: XCircle, description: 'Not accepted' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="green" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground">Create and manage client quotes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/billing/quotes/new">
              <Plus className="size-4" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quotes table */}
      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
          <CardDescription>A list of all quotes sent to clients</CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4">
          <QuotesClient
            entries={result.data}
            total={result.total}
            currentPage={currentPage}
            pageSize={pageSize}
            divisionId={divisionId}
            status={normalizedStatus}
            deleteAction={deleteQuotation}
            updateStatusAction={updateQuotationStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
}
