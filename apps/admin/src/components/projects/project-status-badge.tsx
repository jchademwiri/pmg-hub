import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: {
    label: 'Planned',
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

interface ProjectStatusBadgeProps {
  status: string;
}

export const STATUS_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  planned: [
    { value: 'in_progress', label: 'Start Work' },
    { value: 'cancelled', label: 'Cancel' },
  ],
  in_progress: [
    { value: 'completed', label: 'Complete' },
    { value: 'cancelled', label: 'Cancel' },
    { value: 'planned', label: 'Re-plan' },
  ],
  completed: [
    { value: 'submitted', label: 'Submit' },
    { value: 'cancelled', label: 'Cancel' },
    { value: 'planned', label: 'Re-plan' },
  ],
  submitted: [],
  cancelled: [
    { value: 'planned', label: 'Reinstate' },
  ],
};

export function getNextStatuses(status: string) {
  return STATUS_TRANSITIONS[status] ?? [];
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
