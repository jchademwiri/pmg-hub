'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConvertToInvoiceButton } from '@/components/billing/convert-to-invoice-button';
import { confirm } from '@/components/ui/confirm-dialog';
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
      
      if (result.error) {
        setIsPending(false);
        toast.error(result.error);
        return;
      }

      if (status === 'accepted') {
        const convertResult = await convertQuoteToInvoice(quote.id);
        setIsPending(false);
        
        if (convertResult.error) {
          toast.error(`Quote accepted, but failed to create invoice: ${convertResult.error}`);
          router.refresh();
        } else {
          toast.success('Quote accepted and auto-converted to invoice.');
          router.push(`/billing/invoices/${convertResult.id}/edit`);
        }
        return;
      }

      setIsPending(false);
      toast.success(`Quote marked as ${status}.`);
      router.refresh();
    });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Delete this draft quote?',
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
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
    <div className="flex flex-col gap-2 pt-2">
      {status === 'draft' && (
        <>
          <Button className="w-full" onClick={() => handleStatus('sent')} disabled={isPending}>
            Mark Sent
          </Button>
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </Button>
        </>
      )}

      {status === 'sent' && (
        <>
          <Button className="w-full" onClick={() => handleStatus('accepted')} disabled={isPending}>
            Mark Accepted
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleStatus('declined')}
            disabled={isPending}
          >
            Mark Declined
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleStatus('cancelled')}
            disabled={isPending}
          >
            Cancel
          </Button>
        </>
      )}

      {status === 'accepted' && (
        <div className="w-full">
          <ConvertToInvoiceButton quotationId={quote.id} convertAction={convertQuoteToInvoice} />
        </div>
      )}

      {status === 'converted' && convertedInvoiceId && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Converted to an invoice.</p>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/billing/invoices/${convertedInvoiceId}`}>View Invoice →</Link>
          </Button>
        </div>
      )}

      {(status === 'declined' || status === 'cancelled' || status === 'expired') && (
        <p className="text-xs text-muted-foreground">No further actions available.</p>
      )}
    </div>
  );
}
