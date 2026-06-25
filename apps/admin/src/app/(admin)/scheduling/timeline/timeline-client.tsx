'use client'

import * as React from 'react'
import type { TenderScheduleEntry } from '@pmg/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TenderStatusBadge } from '@/components/scheduling/tender-status-badge'
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string
  name: string
  businessName: string | null
  email: string | null
}

interface TimelineClientProps {
  entries: TenderScheduleEntry[]
  clients: ClientSummary[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-sky-500/70 hover:bg-sky-500',
  in_progress: 'bg-blue-600/80 hover:bg-blue-600',
  completed: 'bg-emerald-500/60 hover:bg-emerald-500',
  submitted: 'bg-emerald-600/50',
  cancelled: 'bg-muted/40',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.ceil((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Timeline Client ───────────────────────────────────────────────────────────

export function TimelineClient({ entries, clients }: TimelineClientProps) {
  const clientMap = React.useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">No active tenders to display</p>
            <p className="text-xs text-muted-foreground">
              Add a tender from the Scheduling Overview page to see it here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate the date range for the timeline
  const today = new Date().toISOString().split('T')[0]
  let minDate = today
  let maxDate = today

  for (const e of entries) {
    if (e.startDate < minDate) minDate = e.startDate
    if (e.closingDate > maxDate) maxDate = e.closingDate
  }

  // Add padding: 5 days before first start, 5 days after last closing
  const timelineStart = new Date(minDate)
  timelineStart.setDate(timelineStart.getDate() - 5)
  const timelineEnd = new Date(maxDate)
  timelineEnd.setDate(timelineEnd.getDate() + 5)

  const totalDays = daysBetween(
    timelineStart.toISOString().split('T')[0],
    timelineEnd.toISOString().split('T')[0],
  )

  // Generate week markers
  const weekMarkers: { day: number; label: string }[] = []
  const cursor = new Date(timelineStart)
  while (cursor <= timelineEnd) {
    const dayOffset = daysBetween(
      timelineStart.toISOString().split('T')[0],
      cursor.toISOString().split('T')[0],
    )
    weekMarkers.push({
      day: dayOffset,
      label: cursor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    })
    cursor.setDate(cursor.getDate() + 7)
  }

  // Today marker position
  const todayOffset = daysBetween(
    timelineStart.toISOString().split('T')[0],
    today,
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Schedule Timeline</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-sky-500" /> Planned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-600" /> In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" /> Closing date
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Week headers */}
            <div className="relative mb-1 flex h-6" style={{ width: `${totalDays * 24}px` }}>
              {weekMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-[10px] text-muted-foreground"
                  style={{ left: `${(marker.day / totalDays) * 100}%`, transform: 'translateX(-50%)' }}
                >
                  {marker.label}
                </div>
              ))}
            </div>

            {/* Grid lines */}
            <div className="relative h-0">
              {weekMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-border/30"
                  style={{ left: `${(marker.day / totalDays) * 100}%`, zIndex: 0 }}
                />
              ))}
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 h-full border-l-2 border-dashed border-red-400"
                  style={{ left: `${(todayOffset / totalDays) * 100}%`, zIndex: 5 }}
                />
              )}
            </div>

            {/* Tender rows */}
            <div className="flex flex-col gap-1.5">
              {entries.map((entry) => {
                const client = clientMap.get(entry.clientId)
                const startOffset = daysBetween(
                  timelineStart.toISOString().split('T')[0],
                  entry.startDate,
                )
                const workDays = daysBetween(entry.startDate, entry.targetCompletionDate)
                const bufferDays = daysBetween(entry.targetCompletionDate, entry.closingDate)

                // Closing date marker position
                const closeOffset = daysBetween(
                  timelineStart.toISOString().split('T')[0],
                  entry.closingDate,
                )
                const closeDayPct = (closeOffset / totalDays) * 100

                return (
                  <div key={entry.id} className="group relative flex items-center gap-3 rounded-md px-1 py-2 hover:bg-muted/30">
                    {/* Label */}
                    <div className="w-48 shrink-0 truncate">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium leading-tight">
                          {client?.name ?? '—'}
                        </p>
                        {entry.priority === 'urgent' && (
                          <Badge variant="destructive" className="shrink-0 text-xs">Urgent</Badge>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground leading-tight">
                        {entry.tenderReference}
                      </p>
                    </div>

                    {/* Bar area */}
                    <div className="relative flex-1" style={{ height: '28px' }}>
                      {/* Main work bar */}
                      <div
                        className={`absolute top-1 h-5 rounded-sm transition-all ${STATUS_COLORS[entry.status] ?? 'bg-muted'}`}
                        style={{
                          left: `${(startOffset / totalDays) * 100}%`,
                          width: `${(workDays / totalDays) * 100}%`,
                          minWidth: '4px',
                        }}
                      />

                      {/* Buffer extension */}
                      {bufferDays > 0 && entry.status !== 'submitted' && (
                        <div
                          className="absolute top-1 h-5 rounded-sm border border-dashed border-amber-400/40 bg-amber-400/10"
                          style={{
                            left: `${((startOffset + workDays) / totalDays) * 100}%`,
                            width: `${(bufferDays / totalDays) * 100}%`,
                            minWidth: '4px',
                          }}
                        />
                      )}

                      {/* Closing date marker */}
                      <div
                        className="absolute top-0.5 h-6 w-0.5 bg-red-500"
                        style={{ left: `${closeDayPct}%`, zIndex: 10 }}
                        title={`Closes: ${new Date(entry.closingDate).toLocaleDateString()}`}
                      />

                      {/* Date labels on hover */}
                      <div className="absolute -bottom-4 left-0 right-0 flex text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>{formatDate(entry.startDate)}</span>
                        <span className="ml-auto">{formatDate(entry.targetCompletionDate)}</span>
                        <span className="ml-auto text-red-500">{formatDate(entry.closingDate)}</span>
                      </div>
                    </div>

                    {/* Status + Risk badges */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <TenderStatusBadge status={entry.status} />
                      <TenderRiskBadge tender={entry} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X-axis markers at bottom */}
            <div className="relative mt-1 flex h-5 text-[10px] text-muted-foreground">
              {weekMarkers.filter((_, i) => i % 2 === 0).map((marker, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{ left: `${(marker.day / totalDays) * 100}%`, transform: 'translateX(-50%)' }}
                >
                  {marker.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
