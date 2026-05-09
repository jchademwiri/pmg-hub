'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkPaidButtonProps {
  invoiceId: string;
  hasClient: boolean;
  markPaidAction: (id: string) => Promise<{ error?: string }>;
}

export function MarkPaidButton({ invoiceId, hasClient, markPaidAction }: MarkPaidButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm(
      'Mark this invoice as paid? This will post the revenue to the income ledger using today\'s date as the payment date. This cannot be undone.',
    );
    if (!confirmed) return;

    setIsPending(true);
    try {
      const result = await markPaidAction(invoiceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Invoice marked as paid. Revenue posted to income.');
      }
    } finally {
      setIsPending(false);
    }
  }

  if (!hasClient) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-full">
              <Button disabled className="w-full">Mark Paid</Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Add a client to this invoice before marking as paid.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button className="w-full" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Processing…' : 'Mark Paid'}
    </Button>
  );
}
