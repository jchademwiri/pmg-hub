'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface WriteOffInvoiceButtonProps {
  invoiceId: string;
  writeOffAction: (id: string, reason: string) => Promise<{ error?: string }>;
}

export function WriteOffInvoiceButton({ invoiceId, writeOffAction }: WriteOffInvoiceButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    const reason = window.prompt('Enter a reason for writing off this invoice:');
    if (reason === null) return; // User cancelled
    if (reason.trim() === '') {
      toast.error('A reason is required to write off an invoice.');
      return;
    }

    setIsPending(true);
    try {
      const result = await writeOffAction(invoiceId, reason.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Invoice written off successfully.');
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full text-amber-600 border-amber-600/50 hover:bg-amber-600/10 dark:text-amber-500 dark:border-amber-500/50 dark:hover:bg-amber-500/10"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? 'Writing off…' : 'Write Off Invoice'}
    </Button>
  );
}
