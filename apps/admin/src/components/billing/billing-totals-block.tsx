import { Separator } from '@/components/ui/separator';
import { formatZAR } from '@/lib/format';

interface BillingTotalsBlockProps {
  subtotal: number;
  vatAmount: number;
  total: number;
}

export function BillingTotalsBlock({ subtotal, vatAmount, total }: BillingTotalsBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">{formatZAR(subtotal)}</span>
      </div>
      {vatAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT (15%)</span>
          <span className="tabular-nums">{formatZAR(vatAmount)}</span>
        </div>
      )}
      <Separator />
      <div className="flex justify-between text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatZAR(total)}</span>
      </div>
    </div>
  );
}
