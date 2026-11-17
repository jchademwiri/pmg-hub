'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CloseMonthWizard } from '@/components/dashboard/close-month-wizard';
import { getPeriodSummary } from '@/app/actions/snapshots';
import { fmtMonthYear } from '@/lib/format';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CloseMonthButtonProps {
  period: string;
}

export default function CloseMonthButton({ period }: CloseMonthButtonProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<{
    revenue: number;
    expenses: number;
    pmgShare: number;
    profitPool: number;
  } | null>(null);
  const periodLabel = fmtMonthYear(period);

  async function handleClick() {
    setIsLoading(true);
    try {
      const result = await getPeriodSummary(period);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setSummary(result);
      setWizardOpen(true);
    } catch {
      toast.error('Failed to load period summary.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant="outline"
        className="h-9 px-3.5 rounded-lg text-xs font-semibold gap-1.5 whitespace-nowrap"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        Close {periodLabel}
      </Button>
      {summary && (
        <CloseMonthWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          period={period}
          summary={summary}
        />
      )}
    </>
  );
}
