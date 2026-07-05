import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, invoices, billingLineItems, divisions, divisionBillingSettings, eq, and } from '@pmg/db';
import { notFound } from 'next/navigation';
import { BillingDocumentView } from '@/components/billing-document-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { client } = await getPortalSessionOrRedirect();
  const { id } = await params;
  const db = getDb();

  // Fetch the invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.clientId, client.id)))
    .limit(1);

  if (!invoice || invoice.status === 'draft') {
    notFound();
  }

  // Fetch division details
  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, invoice.divisionId))
    .limit(1);

  const [divSettings] = await db
    .select()
    .from(divisionBillingSettings)
    .where(eq(divisionBillingSettings.divisionId, invoice.divisionId))
    .limit(1);

  // Fetch line items
  const lineItems = await db
    .select()
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, 'invoice'),
        eq(billingLineItems.documentId, invoice.id)
      )
    )
    .orderBy(billingLineItems.sortOrder);

  return (
    <BillingDocumentView
      type="invoice"
      document={{
        id: invoice.id,
        documentNumber: invoice.documentNumber,
        date: invoice.invoiceDate,
        dueDateOrExpiry: invoice.dueDate,
        status: invoice.status,
        subtotal: invoice.subtotal,
        discountAmount: invoice.discountAmount,
        vatAmount: invoice.vatAmount,
        total: invoice.total,
        notes: invoice.notes,
        terms: invoice.terms,
      }}
      client={client}
      division={division}
      divSettings={divSettings}
      lineItems={lineItems}
    />
  );
}
