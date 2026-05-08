import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllDivisions, getAllClients, getActiveItems, getQuotationById } from '@pmg/db';
import { QuoteFormClient } from '../../new/quote-form-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit Quotation' };

interface Props {
  params: Promise<{ id: string }>;
}

const EDITABLE_STATUSES = ['draft', 'sent', 'accepted'];

export default async function EditQuotePage({ params }: Props) {
  const { id } = await params;

  const [quote, divisions, clients, activeItems] = await Promise.all([
    getQuotationById(id),
    getAllDivisions(),
    getAllClients(),
    getActiveItems(),
  ]);

  if (!quote) notFound();

  // Terminal statuses cannot be edited
  if (!EDITABLE_STATUSES.includes(quote.status)) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/billing/quotes/${id}`}>
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">Edit Quotation</h2>
          <p className="text-sm text-muted-foreground">{quote.documentNumber}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
          <CardDescription>Update the details for this quotation</CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteFormClient
            divisions={divisions}
            clients={clients}
            activeItems={activeItems}
            initialData={quote}
            editId={id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
