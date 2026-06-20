import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getClientById, getClientOutstandingInvoices } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { ClientAgingDetailClient } from './client-aging-detail-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ clientId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) return { title: 'AR Client Detail' };
  return { title: `AR Detail - ${client.businessName ?? client.name}` };
}

export default async function ClientAgingDetailPage({ params }: Props) {
  const { clientId } = await params;
  
  const [client, outstandingInvoices] = await Promise.all([
    getClientById(clientId),
    getClientOutstandingInvoices(clientId),
  ]);

  if (!client) notFound();

  const totalOutstanding = outstandingInvoices.reduce((s, inv) => {
    const outstanding = Number(inv.total) - Number(inv.allocatedAmount);
    return s + outstanding;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalOutstanding)} variant="red" />

      {/* Back button + title */}
      <div className="flex flex-col gap-2">
        <Link href="/billing/aging">
          <Button variant="ghost" size="sm" className="-ml-3 gap-1 h-8 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
            Back to Aging Report
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">{client.businessName || client.name}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
            <span>Detailed AR aging analysis</span>
            {client.email && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="font-medium text-foreground/80">{client.email}</span>
              </>
            )}
            {client.phone && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="font-medium text-foreground/80">{client.phone}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <ClientAgingDetailClient
        client={client}
        invoices={outstandingInvoices}
        totalOutstanding={totalOutstanding}
      />
    </div>
  );
}
