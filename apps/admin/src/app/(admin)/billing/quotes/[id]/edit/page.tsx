import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllDivisions, getAllClients, getActiveItems, getQuotationById, getAllDivisionBillingSettings } from '@pmg/db';
import { QuoteFormClient } from '../../new/quote-form-client';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit Quotation' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditQuotePage({ params }: Props) {
  const { id } = await params;

  const [quote, divisions, clients, activeItems, billingSettings] = await Promise.all([
    getQuotationById(id),
    getAllDivisions(),
    getAllClients(),
    getActiveItems(),
    getAllDivisionBillingSettings(),
  ]);

  if (!quote) notFound();

  // Only draft, sent, and accepted quotes can be edited
  if (!['draft', 'sent', 'accepted'].includes(quote.status)) notFound();

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value={`Edit ${quote.documentNumber}`} />
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
          <Link href={`/billing/quotes/${id}`}>
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div>
          <h2 className="text-lg font-semibold">Edit {quote.documentNumber}</h2>
          <p className="text-sm text-muted-foreground">Update this quotation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
          <CardDescription>Changes will be saved to the existing quotation</CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteFormClient
            divisions={divisions}
            clients={clients}
            activeItems={activeItems}
            initialData={quote}
            editId={id}
            billingSettings={billingSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
