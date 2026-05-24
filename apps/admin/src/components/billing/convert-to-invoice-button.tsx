'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';

interface ConvertToInvoiceButtonProps {
  quotationId: string;
  convertAction: (id: string) => Promise<{ error?: string; id?: string }>;
}

export function ConvertToInvoiceButton({
  quotationId,
  convertAction,
}: ConvertToInvoiceButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    const confirmed = await confirm({
      title: 'Convert to invoice?',
      description: 'The quote will be marked as converted.',
      confirmText: 'Convert',
    });
    if (!confirmed) return;

    setIsPending(true);
    try {
      const result = await convertAction(quotationId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.id) {
        toast.success('Invoice created.');
        router.push(`/billing/invoices/${result.id}/edit`);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      <CheckCircle data-icon="inline-start" />
      {isPending ? 'Converting…' : 'Convert to Invoice'}
    </Button>
  );
}
