import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  getAllDivisions,
  getActiveClients,
  getActiveItems,
  getAllDivisionBillingSettings,
  getOrganisationSettings,
} from '@pmg/db';
import { getMinAllowedDate } from '@/lib/date-rules';
import { InvoiceFormClient } from './invoice-form-client';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const metadata: Metadata = { title: 'New Invoice' };

export default async function NewInvoicePage() {
  const [divisions, clients, activeItems, minDate, billingSettings, orgSettings] = await Promise.all([
    getAllDivisions(),
    getActiveClients(),
    getActiveItems(),
    getMinAllowedDate(),
    getAllDivisionBillingSettings(),
    getOrganisationSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value="New Invoice" />
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
          <Link href="/billing/invoices">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div>
          <h2 className="text-lg font-semibold">New Invoice</h2>
          <p className="text-sm text-muted-foreground">Create a new client invoice</p>
        </div>
      </div>

      <InvoiceFormClient
        divisions={divisions}
        clients={clients}
        activeItems={activeItems}
        minDate={minDate}
        billingSettings={billingSettings}
        orgVatNumber={orgSettings?.vatNumber ?? null}
      />
    </div>
  );
}
