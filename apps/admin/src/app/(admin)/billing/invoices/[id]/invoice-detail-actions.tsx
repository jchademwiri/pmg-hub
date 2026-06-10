'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fmtDate } from '@/lib/format';
import { MarkPaidButton } from '@/components/billing/mark-paid-button';
import { VoidInvoiceButton } from '@/components/billing/void-invoice-button';

interface InvoiceDetailActionsProps {
  invoice: {
    id: string;
    status: string;
    clientId: string | null;
    dueDate: string | null;
    paidAt: Date | null;
    incomeId: string | null;
    total: string;
  };
  issueAction: (id: string) => Promise<{ error?: string }>;
  markPaidAction: (id: string) => Promise<{ error?: string }>;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function InvoiceDetailActions({
  invoice,
  issueAction,
  markPaidAction,
  voidAction,
}: InvoiceDetailActionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0]!;
  const isOverdue = invoice.dueDate ? invoice.dueDate < today : false;

  function handleIssue() {
    startTransition(async () => {
      const result = await issueAction(invoice.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Invoice issued.');
        router.refresh();
      }
    });
  }

  const { status } = invoice;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Overdue banner */}
      {(status === 'issued' || status === 'overdue') && isOverdue && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
          ⚠ This invoice is overdue.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {status === 'draft' && (
          <>
            <Button className="w-full" onClick={handleIssue}>Issue Invoice</Button>
            <VoidInvoiceButton invoiceId={invoice.id} voidAction={voidAction} />
          </>
        )}

        {(status === 'issued' || status === 'overdue') && (
          <>
            <MarkPaidButton
              invoiceId={invoice.id}
              hasClient={!!invoice.clientId}
              markPaidAction={markPaidAction}
            />
            <VoidInvoiceButton invoiceId={invoice.id} voidAction={voidAction} />
          </>
        )}

        {status === 'paid' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-green-600 dark:text-green-400">
              Paid on{' '}
              {fmtDate(invoice.paidAt ?? undefined)}. Revenue posted to income.
            </p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/billing/payments">View in Payments →</Link>
            </Button>
          </div>
        )}

        {status === 'void' && (
          <p className="text-xs text-muted-foreground">This invoice has been voided.</p>
        )}
      </div>
    </div>
  );
}