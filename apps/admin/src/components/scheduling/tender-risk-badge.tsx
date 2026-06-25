import type { TenderScheduleEntry } from '@pmg/db'
import { Badge } from '@/components/ui/badge'

interface TenderRiskBadgeProps {
  tender: TenderScheduleEntry
}

function calculateRisk(
  tender: TenderScheduleEntry,
): { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const closing = new Date(tender.closingDate)
  const target = new Date(tender.targetCompletionDate)
  const start = new Date(tender.startDate)

  // Submitted/completed — no risk
  if (tender.status === 'submitted' || tender.status === 'completed') {
    return { label: 'Done', variant: 'default' }
  }

  // Cancelled — no risk
  if (tender.status === 'cancelled') {
    return { label: 'Cancelled', variant: 'secondary' }
  }

  // Overdue: past closing date (submitted/completed already handled above)
  if (today > closing) {
    return { label: 'Overdue', variant: 'destructive' }
  }

  // Past target completion but still active
  if (today > target && tender.status === 'in_progress') {
    return { label: 'At Risk', variant: 'warning' }
  }

  if (target > closing) {
    return { label: 'Impossible', variant: 'destructive' }
  }

  // Start overdue: past start date but still planned
  if (today > start && tender.status === 'planned') {
    return { label: 'Start Due', variant: 'warning' }
  }

  // Tight buffer: target completion does not leave the configured buffer.
  const bufferStart = new Date(closing)
  bufferStart.setDate(bufferStart.getDate() - tender.bufferDays)
  if (target > bufferStart) {
    return { label: 'Tight', variant: 'warning' }
  }

  // On track
  return { label: 'On Track', variant: 'default' }
}

export function TenderRiskBadge({ tender }: TenderRiskBadgeProps) {
  const risk = calculateRisk(tender)
  return (
    <Badge variant={risk.variant === 'warning' ? 'secondary' : risk.variant} className="text-xs">
      {risk.label}
    </Badge>
  )
}
