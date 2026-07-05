'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';

interface VoidInvoiceButtonProps {
  invoiceId: string;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function VoidInvoiceButton({ invoiceId, voidAction }: VoidInvoiceButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    const confirmed = await confirm({
      title: 'Void Invoice',
      description: 'Are you sure you want to void this invoice? This action cannot be undone.',
      confirmText: 'Void Invoice',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setIsPending(true);
    try {
      const result = await voidAction(invoiceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Invoice voided.');
        router.refresh();
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
