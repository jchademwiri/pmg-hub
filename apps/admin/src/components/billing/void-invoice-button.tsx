'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface VoidInvoiceButtonProps {
  invoiceId: string;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function VoidInvoiceButton({ invoiceId, voidAction }: VoidInvoiceButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm('Void this invoice? This cannot be undone.');
    if (!confirmed) return;

    setIsPending(true);
    try {
      const result = await voidAction(invoiceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Invoice voided.');
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? 'Voiding…' : 'Void Invoice'}
    </Button>
  );
}
