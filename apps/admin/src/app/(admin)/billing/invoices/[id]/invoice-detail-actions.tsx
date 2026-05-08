'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MarkPaidButton } from '@/components/billing/mark-paid-button';
import { VoidInvoiceButton } from '@/components/billing/void-invoice-button';
import { LinkPaymentButton } from '@/components/billing/link-payment-button';

interface UnlinkedIncomeRow {
  id: string;
  date: string;
  description: string | null;
  amount: string;
}

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
  linkPaymentAction: (invoiceId: string, incomeId: string) => Promise<{ error?: string }>;
  unlinkedIncome: UnlinkedIncomeRow[];
}

export function InvoiceDetailActions({
  invoice,
  issueAction,
  markPaidAction,
  voidAction,
  linkPaymentAction,
  unlinkedIncome,
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
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      {/* Overdue banner */}
      {(status === 'issued' || status === 'overdue') && isOverdue && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
          ⚠ This invoice is overdue.
        </div>
      )}

      <div className="flex flex-wrap items-start gap-3">
        {status === 'draft' && (
          <>
            <Button onClick={handleIssue}>Issue Invoice</Button>
            <VoidInvoiceButton invoiceId={invoice.id} voidAction={voidAction} />
            {/* Link Payment — shown first so it's visually distinct from Mark Paid */}
            {unlinkedIncome.length > 0 && (
              <LinkPaymentButton
                invoiceId={invoice.id}
                invoiceTotal={invoice.total}
                unlinkedIncome={unlinkedIncome}
                linkAction={linkPaymentAction}
              />
            )}
          </>
        )}

        {(status === 'issued' || status === 'overdue') && (
          <>
            {/* Link Payment appears before Mark Paid to prevent accidental duplicates */}
            {unlinkedIncome.length > 0 && (
              <LinkPaymentButton
                invoiceId={invoice.id}
                invoiceTotal={invoice.total}
                unlinkedIncome={unlinkedIncome}
                linkAction={linkPaymentAction}
              />
            )}
            <MarkPaidButton
              invoiceId={invoice.id}
              hasClient={!!invoice.clientId}
              markPaidAction={markPaidAction}
            />
            <VoidInvoiceButton invoiceId={invoice.id} voidAction={voidAction} />
          </>
        )}

        {status === 'paid' && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-green-600 dark:text-green-400">
              Paid on{' '}
              {invoice.paidAt
                ? new Date(invoice.paidAt).toLocaleDateString('en-ZA', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
              . Revenue posted to income.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/finance/income">View in Income →</Link>
            </Button>
          </div>
        )}

        {status === 'void' && (
          <p className="text-sm text-muted-foreground">This invoice has been voided.</p>
        )}
      </div>
    </div>
  );
}
