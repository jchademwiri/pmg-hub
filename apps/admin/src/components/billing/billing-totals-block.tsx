import { Separator } from '@/components/ui/separator';
import { formatZAR } from '@/lib/format';

interface BillingTotalsBlockProps {
  subtotal: number;
  discountAmount?: number;
  vatEnabled?: boolean;
  vatAmount: number;
  total: number;
}

export function BillingTotalsBlock({
  subtotal,
  discountAmount = 0,
  vatEnabled = false,
  vatAmount,
  total,
}: BillingTotalsBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">{formatZAR(subtotal)}</span>
      </div>

      {/* Discount — only shown when a discount is applied */}
      {discountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <span className="tabular-nums text-amber-600 dark:text-amber-400">
            −{formatZAR(discountAmount)}
          </span>
        </div>
      )}

      {/* VAT — only shown when vatEnabled is true */}
      {vatEnabled && vatAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT (15%)</span>
          <span className="tabular-nums">{formatZAR(vatAmount)}</span>
        </div>
      )}

      <Separator />

      {/* Total */}
      <div className="flex justify-between text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatZAR(total)}</span>
      </div>
    </div>
  );
}
