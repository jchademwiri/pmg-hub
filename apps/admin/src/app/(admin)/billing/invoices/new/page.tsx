import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllDivisions, getAllClients, getActiveItems } from '@pmg/db';
import { getMinAllowedDate } from '@/lib/date-rules';
import { InvoiceFormClient } from './invoice-form-client';

export const metadata: Metadata = { title: 'New Invoice' };

export default async function NewInvoicePage() {
  const [divisions, clients, activeItems, minDate] = await Promise.all([
    getAllDivisions(),
    getAllClients(),
    getActiveItems(),
    getMinAllowedDate(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/invoices">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">New Invoice</h2>
          <p className="text-sm text-muted-foreground">Create a new client invoice</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Fill in the details for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceFormClient divisions={divisions} clients={clients} activeItems={activeItems} minDate={minDate} />
        </CardContent>
      </Card>
    </div>
  );
}
