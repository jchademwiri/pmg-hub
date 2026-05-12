interface BillingStatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  sent:      'bg-blue-500/15 text-blue-500',
  accepted:  'bg-green-500/15 text-green-500',
  declined:  'bg-red-500/15 text-red-500',
  expired:   'bg-orange-500/15 text-orange-500',
  converted: 'bg-purple-500/15 text-purple-500',
  cancelled: 'bg-muted text-muted-foreground',
  issued:    'bg-blue-500/15 text-blue-500',
  paid:      'bg-green-500/15 text-green-500',
  overdue:   'bg-red-500/15 text-red-500',
  void:      'bg-muted text-muted-foreground',
};

export function BillingStatusBadge({ status }: BillingStatusBadgeProps) {
  const styles = statusStyles[status] ?? 'bg-muted text-muted-foreground';
  const label = status === 'converted' ? 'Invoiced' : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
