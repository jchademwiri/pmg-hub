'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WriteOffInvoiceButtonProps {
  invoiceId: string;
  writeOffAction: (id: string, reason: string) => Promise<{ error?: string }>;
}

export function WriteOffInvoiceButton({ invoiceId, writeOffAction }: WriteOffInvoiceButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (reason.trim() === '') {
      setError('A reason is required to write off an invoice.');
      return;
    }
    setError('');
    setIsPending(true);
    try {
      const result = await writeOffAction(invoiceId, reason.trim());
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Invoice written off successfully.');
        setIsOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error('An unexpected error occurred while writing off the invoice.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-amber-600 border-amber-600/50 hover:bg-amber-600/10 dark:text-amber-500 dark:border-amber-500/50 dark:hover:bg-amber-500/10"
        >
          Write Off Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write Off Invoice</DialogTitle>
          <DialogDescription>
            Are you sure you want to write off this invoice? This action will adjust your bad debt expense and close the invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for write-off</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Client bankrupt, uncollectable..."
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Writing off...' : 'Confirm Write Off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
