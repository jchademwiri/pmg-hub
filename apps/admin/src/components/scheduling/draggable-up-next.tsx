'use client'

import type { TenderScheduleEntry } from '@pmg/db'
import { CalendarDays, ListOrdered } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge'

interface DraggableUpNextProps {
  tenders: TenderScheduleEntry[]
  onStatusChange: (id: string, status: string) => Promise<string | undefined>
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a)
  const end = new Date(b)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function DraggableUpNext({ tenders, onStatusChange }: DraggableUpNextProps) {
  if (tenders.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-muted-foreground" />
            <CardTitle>Waterfall Queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">No upcoming tenders</p>
            <p className="text-xs text-muted-foreground">
              Add a tender to build the automatic queue.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-muted-foreground" />
            <CardTitle>Waterfall Queue ({tenders.length})</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">Auto ordered</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {tenders.map((tender, index) => {
          const startOverdue =
            tender.status === 'planned' && new Date(tender.startDate) < new Date()
          const bufferGap = daysBetween(tender.targetCompletionDate, tender.closingDate)

          return (
            <div
              key={tender.id}
              className="flex items-center justify-between border-b py-3 last:border-0"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{tender.tenderReference}</p>
                    {tender.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDate(tender.startDate)} to {formatDate(tender.targetCompletionDate)}
                    </span>
                    <span>Effort: {tender.effortDays}d</span>
                    <span>Buffer: {Math.max(0, bufferGap)}d / {tender.bufferDays}d</span>
                    <span>Closes: {formatDate(tender.closingDate)}</span>
                    {startOverdue && <span className="text-amber-500">Start overdue</span>}
                  </div>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <TenderRiskBadge tender={tender} />
                {tender.status === 'planned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(tender.id, 'in_progress')}
                  >
                    Start
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
