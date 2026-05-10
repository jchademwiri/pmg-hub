import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllInvoices } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { InvoicesClient } from './invoices-client';
import { issueInvoice, voidInvoice } from '@/app/actions/billing-invoices';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoices' };

interface InvoicesPageProps {
  searchParams: Promise<{ divisionId?: string; status?: string; page?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { divisionId, status, page } = await searchParams;

  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, allResult] = await Promise.all([
    getAllInvoices({ divisionId, status }, { page: currentPage, pageSize }),
    getAllInvoices(),
  ]);

  // Stats from full unfiltered result
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidThisMonth = allResult.data.filter(
    (inv) => inv.status === 'paid' && inv.invoiceDate.startsWith(thisMonth),
  ).length;
  const overdueCount = allResult.data.filter((inv) => inv.status === 'overdue').length;
  const pendingCount = allResult.data.filter(
    (inv) => inv.status === 'issued' || inv.status === 'overdue',
  ).length;

  const stats = [
    { label: 'Total Invoices', value: String(allResult.total), icon: FileText, description: 'All time' },
    { label: 'Pending', value: String(pendingCount), icon: Clock, description: 'Awaiting payment' },
    { label: 'Paid', value: String(paidThisMonth), icon: CheckCircle, description: 'This month' },
    { label: 'Overdue', value: String(overdueCount), icon: AlertCircle, description: 'Past due date' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.outstanding)} variant="amber" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">Manage and track client invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/billing/invoices/new">
              <Plus className="size-4" />
              New Invoice
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

      {/* Invoices table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices across clients</CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4">
          <InvoicesClient
            entries={result.data}
            total={result.total}
            currentPage={currentPage}
            pageSize={pageSize}
            divisionId={divisionId}
            status={status}
            issueAction={issueInvoice}
            voidAction={voidInvoice}
          />
        </CardContent>
      </Card>
    </div>
  );
}
