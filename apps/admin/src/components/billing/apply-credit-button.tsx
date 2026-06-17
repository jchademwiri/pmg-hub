'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApplyCreditDialog } from './apply-credit-dialog';
import { formatZAR } from '@/lib/format';

interface ApplyCreditButtonProps {
  invoiceId: string;
  availableCredit: number;
  outstandingBalance: number;
  clientId: string;
}

export function ApplyCreditButton({
  invoiceId,
  availableCredit,
  outstandingBalance,
  clientId,
}: ApplyCreditButtonProps) {
  const [open, setOpen] = useState(false);

  if (availableCredit <= 0 || outstandingBalance <= 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        onClick={() => setOpen(true)}
      >
        Apply Credit ({formatZAR(availableCredit)})
      </Button>
      <ApplyCreditDialog
        invoiceId={invoiceId}
        availableCredit={availableCredit}
        outstandingBalance={outstandingBalance}
        clientId={clientId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
