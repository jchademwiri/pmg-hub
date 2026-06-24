import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<
  string,
  { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }
> = {
  planned: { variant: 'secondary', label: 'Planned' },
  in_progress: { variant: 'default', label: 'In Progress' },
  completed: { variant: 'outline', label: 'Completed' },
  submitted: { variant: 'outline', label: 'Submitted' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
}

interface TenderStatusBadgeProps {
  status: string
}

export function TenderStatusBadge({ status }: TenderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { variant: 'secondary' as const, label: status }
  return (
    <Badge variant={config.variant} className="text-xs capitalize">
      {config.label}
    </Badge>
  )
}
