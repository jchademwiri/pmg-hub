import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, quotations, billingLineItems, divisions, divisionBillingSettings, eq, and } from '@pmg/db';
import { notFound } from 'next/navigation';
import { BillingDocumentView } from '@/components/billing-document-view';
import { QuoteActionsClient } from './quote-actions-client';
import { CheckCircle2, XCircle } from 'lucide-react';

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { client } = await getPortalSessionOrRedirect();
  const { id } = await params;
  const db = getDb();

  // Fetch the quote
  const [quote] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id), eq(quotations.clientId, client.id)))
    .limit(1);

  if (!quote || quote.status === 'draft') {
    notFound();
  }

  // Fetch division details
  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, quote.divisionId))
    .limit(1);

  const [divSettings] = await db
    .select()
    .from(divisionBillingSettings)
    .where(eq(divisionBillingSettings.divisionId, quote.divisionId))
    .limit(1);

  // Fetch line items
  const lineItems = await db
    .select()
    .from(billingLineItems)
    .where(
      and(
        eq(billingLineItems.documentType, 'quote'),
        eq(billingLineItems.documentId, quote.id)
      )
    )
    .orderBy(billingLineItems.sortOrder);

  // Construct Status Banner
  let statusBanner: React.ReactNode = null;
  if (quote.status === 'accepted') {
    statusBanner = (
      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0" />
          <div>
            <p className="text-xs font-semibold">You accepted this quotation</p>
            {quote.acceptedAt && (
              <p className="text-[10px] text-emerald-400/80 mt-0.5">
                Accepted on {formatDate(quote.acceptedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  } else if (quote.status === 'declined') {
    statusBanner = (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400">
        <div className="flex items-start gap-3">
          <XCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">You declined this quotation</p>
            {quote.declinedAt && (
              <p className="text-[10px] text-red-400/80 mt-0.5">
                Declined on {formatDate(quote.declinedAt)}
              </p>
            )}
            {quote.declineReason && (
              <p className="text-[10px] text-red-400/70 mt-1.5 bg-red-500/5 rounded-md p-2 border border-red-500/10">
                Reason: {quote.declineReason}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <BillingDocumentView
      type="quote"
      document={{
        id: quote.id,
        documentNumber: quote.documentNumber,
        date: quote.quoteDate,
        dueDateOrExpiry: quote.expiryDate,
        status: quote.status,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        vatAmount: quote.vatAmount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms,
      }}
      client={client}
      division={division}
      divSettings={divSettings}
      lineItems={lineItems}
      statusBanner={statusBanner}
      actionButtons={
        quote.status === 'sent' ? <QuoteActionsClient quoteId={quote.id} /> : null
      }
    />
  );
}
