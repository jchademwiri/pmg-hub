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
import type { QuotationRow } from '@pmg/db';

interface MobileQuoteCardProps {
  quote: QuotationRow;
  handleStatusChange: (id: string, newStatus: 'sent' | 'accepted' | 'declined' | 'cancelled') => void;
  handleDelete: (id: string, docNumber: string) => void;
  handleDuplicate: (id: string) => void;
  statusColors: Record<string, string>;
}

export function MobileQuoteCard({ quote, handleStatusChange, handleDelete, handleDuplicate, statusColors }: MobileQuoteCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const canSend = quote.status === 'draft';
  const canDelete = quote.status === 'draft';

  const swipeHandlers = useSwipe({
    onSwipedLeft: () => {
      if (canDelete) {
        handleDelete(quote.id, quote.documentNumber);
      }
      setSwipeOffset(0);
    },
    onSwipedRight: () => {
      if (canSend) {
        handleStatusChange(quote.id, 'sent');
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
          {canSend && <><Send className="size-4 mr-2" /> Send</>}
        </div>
        <div className="flex items-center text-destructive font-medium text-sm">
          {canDelete && <><Trash className="size-4 ml-2" /> Delete</>}
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
          href={`/billing/quotes/${quote.id}`}
          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          aria-label={`View quote ${quote.documentNumber}`}
        />
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-foreground">{quote.documentNumber}</p>
            <p className="text-sm text-muted-foreground">{quote.clientName ?? 'No client'}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`font-bold tabular-nums ${statusColors[quote.status] || ''}`}>
              {formatZAR(Number(quote.total))}
            </span>
            <BillingStatusBadge status={quote.status} />
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
          <span>Expires {fmtDate(quote.expiryDate)}</span>
          <div className="relative z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="touch" className="h-8 w-8 min-h-0 min-w-0 p-0" title="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/billing/quotes/${quote.id}`}>View</Link>
                </DropdownMenuItem>
                {quote.status === 'draft' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'sent')}>
                    Mark Sent
                  </DropdownMenuItem>
                )}
                {quote.status === 'sent' && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'accepted')}>
                      Mark Accepted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'declined')}>
                      Mark Declined
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDuplicate(quote.id)}>
                  Duplicate
                </DropdownMenuItem>
                {(quote.status === 'draft' || quote.status === 'sent') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(quote.id, quote.documentNumber)}
                      disabled={quote.status !== 'draft'}
                    >
                      Delete
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
