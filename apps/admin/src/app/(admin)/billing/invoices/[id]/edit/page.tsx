import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllDivisions, getAllClients, getActiveItems, getInvoiceById, getAllDivisionBillingSettings } from '@pmg/db';
import { getMinAllowedDate } from '@/lib/date-rules';
import { InvoiceFormClient } from '../../new/invoice-form-client';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit Invoice' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;

  const [invoice, divisions, clients, activeItems, minDate, billingSettings] = await Promise.all([
    getInvoiceById(id),
    getAllDivisions(),
    getAllClients(),
    getActiveItems(),
    getMinAllowedDate(),
    getAllDivisionBillingSettings(),
  ]);

  if (!invoice) notFound();

  // Paid, voided, and written-off invoices cannot be edited
  if (['paid', 'void', 'written_off'].includes(invoice.status)) {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto mt-20 text-center items-center">
        <div className="size-16 bg-muted/50 rounded-full flex items-center justify-center mb-2">
          <FileX className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Cannot Edit Invoice</h2>
        <p className="text-muted-foreground text-sm">
          This invoice is marked as <strong className="capitalize">{invoice.status.replace('_', ' ')}</strong>. Documents in this state are locked for accounting integrity and can no longer be modified.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/billing/invoices/${id}`}>
            <ChevronLeft className="size-4 mr-2" />
            Back to Invoice Details
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value={`Edit ${invoice.documentNumber}`} />
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
          <Link href={`/billing/invoices/${id}`}>
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div>
          <h2 className="text-lg font-semibold">Edit {invoice.documentNumber}</h2>
          <p className="text-sm text-muted-foreground">Update this invoice</p>
        </div>
      </div>

      <InvoiceFormClient
        divisions={divisions}
        clients={clients}
        activeItems={activeItems}
        minDate={minDate}
        initialData={invoice}
        editId={id}
        billingSettings={billingSettings}
      />
    </div>
  );
}
