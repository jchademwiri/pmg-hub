import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
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

  const now = new Date();
  const currentFY = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

  const result = await getAllInvoices(
    { divisionId, status, year: currentFY },
    { page: currentPage, pageSize },
  );

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
