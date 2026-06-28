import { cn } from '@/lib/utils';
import type { TenderScheduleEntry } from '@pmg/db';

interface TenderRiskBadgeProps {
  tender: TenderScheduleEntry;
}

interface RiskResult {
  label: string;
  className: string;
}

function calculateRisk(tender: TenderScheduleEntry): RiskResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closing = new Date(tender.closingDate);
  const target = new Date(tender.targetCompletionDate);
  const start = new Date(tender.startDate);

  if (tender.status === 'submitted' || tender.status === 'completed') {
    return { label: 'Done', className: 'bg-muted text-muted-foreground border-border' };
  }

  if (tender.status === 'cancelled') {
    return { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' };
  }

  if (today > closing) {
    return {
      label: 'Overdue',
      className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    };
  }

  if (today > target && tender.status === 'in_progress') {
    return {
      label: 'At Risk',
      className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    };
  }

  if (target > closing) {
    return {
      label: 'Impossible',
      className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    };
  }

  if (today > start && tender.status === 'planned') {
    return {
      label: 'Start Due',
      className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    };
  }

  const bufferStart = new Date(closing);
  bufferStart.setDate(bufferStart.getDate() - tender.bufferDays);
  if (target > bufferStart) {
    return {
      label: 'Tight',
      className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    };
  }

  return {
    label: 'On Track',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  };
}

export function TenderRiskBadge({ tender }: TenderRiskBadgeProps) {
  const risk = calculateRisk(tender);
  return (
    <span
      data-testid="badge"
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        risk.className,
      )}
    >
      {risk.label}
    </span>
  );
}
