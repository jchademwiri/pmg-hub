import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatZAR } from '@/lib/format';
import { BillingStatusBadge } from './billing-status-badge';

interface MobileItemCardProps {
  id: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unitLabel: string | null;
  status: string;
}

export function MobileItemCard({
  id,
  name,
  description,
  unitPrice,
  unitLabel,
  status,
}: MobileItemCardProps) {
  return (
    <Link
      href={`/billing/items/${id}`}
      className="block bg-card rounded-xl border border-border shadow-sm p-4 active:scale-[0.99] transition-transform relative overflow-hidden"
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">{name}</span>
            </div>
            {description && (
              <span className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </span>
            )}
          </div>
          <BillingStatusBadge status={status} />
        </div>

        <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatZAR(Number(unitPrice))}
            </span>
            {unitLabel && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                per {unitLabel}
              </span>
            )}
          </div>
          <div className="text-muted-foreground bg-muted/50 rounded-full p-1.5">
            <ChevronRight className="size-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
