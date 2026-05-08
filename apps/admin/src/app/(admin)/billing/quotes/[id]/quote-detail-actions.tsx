'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConvertToInvoiceButton } from '@/components/billing/convert-to-invoice-button';
import { convertQuoteToInvoice } from '@/app/actions/billing-invoices';

interface QuoteDetailActionsProps {
  quote: {
    id: string;
    status: string;
    convertedInvoiceId: string | null;
  };
  updateStatusAction: (
    id: string,
    status: 'sent' | 'accepted' | 'declined' | 'cancelled',
  ) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

export function QuoteDetailActions({
  quote,
  updateStatusAction,
  deleteAction,
}: QuoteDetailActionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isPending, setIsPending] = useState(false);

  function handleStatus(status: 'sent' | 'accepted' | 'declined' | 'cancelled') {
    setIsPending(true);
    startTransition(async () => {
      const result = await updateStatusAction(quote.id, status);
      setIsPending(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Quote marked as ${status}.`);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!window.confirm('Delete this draft quote? This cannot be undone.')) return;
    setIsPending(true);
    startTransition(async () => {
      const result = await deleteAction(quote.id);
      setIsPending(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Quote deleted.');
        router.push('/billing/quotes');
      }
    });
  }

  const { status, convertedInvoiceId } = quote;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      {status === 'draft' && (
        <>
          <Button onClick={() => handleStatus('sent')} disabled={isPending}>
            Mark Sent
          </Button>
          <Button
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </Button>
        </>
      )}

      {status === 'sent' && (
        <>
          <Button onClick={() => handleStatus('accepted')} disabled={isPending}>
            Mark Accepted
          </Button>
          <Button
            variant="outline"
            onClick={() => handleStatus('declined')}
            disabled={isPending}
          >
            Mark Declined
          </Button>
          <Button
            variant="outline"
            onClick={() => handleStatus('cancelled')}
            disabled={isPending}
          >
            Cancel
          </Button>
        </>
      )}

      {status === 'accepted' && (
        <ConvertToInvoiceButton quotationId={quote.id} convertAction={convertQuoteToInvoice} />
      )}

      {status === 'converted' && convertedInvoiceId && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            This quote has been converted to an invoice.
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/billing/invoices/${convertedInvoiceId}`}>View Invoice →</Link>
          </Button>
        </div>
      )}

      {(status === 'declined' || status === 'cancelled' || status === 'expired') && (
        <p className="text-sm text-muted-foreground">No further actions available.</p>
      )}
    </div>
  );
}
