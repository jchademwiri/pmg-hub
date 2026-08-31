'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';

interface RestoreWriteOffButtonProps {
  invoiceId: string;
  restoreWriteOffAction: (id: string) => Promise<{ error?: string }>;
}

export function RestoreWriteOffButton({
  invoiceId,
  restoreWriteOffAction,
}: RestoreWriteOffButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleRestore() {
    const confirmed = await confirm({
      title: 'Remove Write-off?',
      description:
        'This will remove the write-off record, reverse the bad debt entry, and restore the invoice to its original billing status.',
      confirmText: 'Remove Write-off',
      cancelText: 'Cancel',
      variant: 'default',
    });

    if (!confirmed) return;

    setIsPending(true);
    try {
      const result = await restoreWriteOffAction(invoiceId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Write-off removed and invoice status restored.');
        router.refresh();
      }
    } catch (err) {
      toast.error('An unexpected error occurred while removing the write-off.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleRestore}
      disabled={isPending}
      className="w-full text-emerald-600 border-emerald-600/50 hover:bg-emerald-600/10 dark:text-emerald-500 dark:border-emerald-500/50 dark:hover:bg-emerald-500/10"
    >
      {isPending ? 'Removing Write-off...' : 'Remove Write-off'}
    </Button>
  );
}
