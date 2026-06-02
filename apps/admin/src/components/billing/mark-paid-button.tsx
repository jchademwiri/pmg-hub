'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';
import {
  Tooltip,
  TooltipContent,
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
    const confirmed = await confirm({
      title: 'Mark invoice as paid?',
      description:
        "This will post revenue to the income ledger using today's date. This cannot be undone.",
      confirmText: 'Mark Paid',
    });
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
    );
  }

  return (
    <Button className="w-full" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Processing…' : 'Mark Paid'}
    </Button>
  );
}
