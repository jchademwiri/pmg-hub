import { Badge } from '@/components/ui/badge';
import { formatStatusLabel } from '@/lib/billing-status';

interface BillingStatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground border-border',
  sent:      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  accepted:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  declined:  'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  expired:   'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  converted: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  issued:    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  partially_paid: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  paid:      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  overdue:   'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  void:      'bg-muted text-muted-foreground border-border',
  written_off: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
};

export function BillingStatusBadge({ status }: BillingStatusBadgeProps) {
  const styles = statusStyles[status] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <Badge variant="secondary" className={`gap-1.5 border font-medium shadow-none ${styles}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {formatStatusLabel(status)}
    </Badge>
  );
}
