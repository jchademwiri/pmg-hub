'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Trash, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { formatZAR, fmtDate } from '@/lib/format';
import { useSwipe } from '@/hooks/use-swipe';
import type { InvoiceRow } from '@pmg/db';

interface MobileInvoiceCardProps {
  inv: InvoiceRow;
  handleIssue: (id: string, docNumber: string) => void;
  handleVoid: (id: string, docNumber: string) => void;
}

export function MobileInvoiceCard({ inv, handleIssue, handleVoid }: MobileInvoiceCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const canIssue = inv.status === 'draft';
  const canVoid = inv.status === 'draft' || inv.status === 'issued' || inv.status === 'overdue';

  const swipeHandlers = useSwipe({
    onSwipedLeft: () => {
      if (canVoid) {
        handleVoid(inv.id, inv.documentNumber);
      }
      setSwipeOffset(0);
    },
    onSwipedRight: () => {
      if (canIssue) {
        handleIssue(inv.id, inv.documentNumber);
      }
      setSwipeOffset(0);
    },
  });

  const handleTouchStart = (e: React.TouchEvent) => swipeHandlers.onTouchStart(e);
  const handleTouchMove = (e: React.TouchEvent) => swipeHandlers.onTouchMove(e);
  const handleTouchEnd = () => swipeHandlers.onTouchEnd();

  return (
    <div className="relative overflow-hidden rounded-lg bg-muted/50 border border-border">
      {/* Background Action Indicators */}
      <div className="absolute inset-0 flex justify-between items-center px-4">
        <div className="flex items-center text-primary font-medium text-sm">
          {canIssue && <><Send className="size-4 mr-2" /> Issue</>}
        </div>
        <div className="flex items-center text-destructive font-medium text-sm">
          {canVoid && <><Trash className="size-4 ml-2" /> Void</>}
        </div>
      </div>

      {/* Foreground Card */}
      <div
        className="relative flex flex-col p-4 bg-card shadow-sm transition-transform active:scale-[0.98]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          href={`/billing/invoices/${inv.id}`}
          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          aria-label={`View invoice ${inv.documentNumber}`}
        />
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-foreground">{inv.documentNumber}</p>
            <p className="text-sm text-muted-foreground">{inv.clientName ?? 'No client'}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-bold tabular-nums">{formatZAR(Number(inv.total))}</span>
            <BillingStatusBadge status={inv.status} />
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
          <span>Due {fmtDate(inv.dueDate)}</span>
          <div className="relative z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="touch" className="h-8 w-8 min-h-0 min-w-0 p-0" title="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/billing/invoices/${inv.id}`}>View</Link>
                </DropdownMenuItem>
                {!['paid', 'void', 'written_off'].includes(inv.status) && (
                  <DropdownMenuItem asChild>
                    <Link href={`/billing/invoices/${inv.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                )}
                {canIssue && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleIssue(inv.id, inv.documentNumber)}>
                      Mark Issued
                    </DropdownMenuItem>
                  </>
                )}
                {canVoid && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleVoid(inv.id, inv.documentNumber)}
                    >
                      Void
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
