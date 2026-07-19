'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { ProjectScheduleEntry } from '@pmg/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge, getNextStatuses } from '@/components/projects/project-status-badge'
import { ProjectRiskBadge } from '@/components/projects/project-risk-badge'
import { transitionProjectStatusAction } from '@/app/actions/project-schedule'
import { toast } from 'sonner'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string
  name: string
  businessName: string | null
  email: string | null
}

interface TimelineClientProps {
  entries: ProjectScheduleEntry[]
  clients: ClientSummary[]
  progressMap?: Record<string, { total: number; completed: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-sky-500/70 hover:bg-sky-500',
  in_progress: 'bg-blue-600/80 hover:bg-blue-600',
  completed: 'bg-emerald-500/60 hover:bg-emerald-500',
  submitted: 'bg-emerald-600/50',
  cancelled: 'bg-muted/40',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  planned: 'bg-sky-500',
  in_progress: 'bg-blue-600',
  completed: 'bg-emerald-500',
  submitted: 'bg-emerald-600',
  cancelled: 'bg-muted-foreground',
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

export function TimelineClient({ entries, clients, progressMap = {} }: TimelineClientProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState<string | null>(null)

  const handleStatusTransition = async (id: string, newStatus: string) => {
    setIsPending(id)
    const res = await transitionProjectStatusAction(id, newStatus)
    setIsPending(null)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
      router.refresh()
    }
  }

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
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-border">
          <h3 className="text-sm font-semibold">Schedule Timeline</h3>
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
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
        <div>
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 relative group">
          <div 
            className="relative pb-4 min-w-full md:min-w-[var(--desktop-min-width)]" 
            style={{ '--desktop-min-width': `${Math.max(totalDays * 8, 800)}px` } as React.CSSProperties}
          >
            {/* Week headers and Grid lines (hidden on mobile) */}
            <div className="hidden md:block">
              {/* Week headers */}
              <div className="relative mb-1 flex h-6 w-full">
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
            </div>

            {/* Tender rows */}
            <div className="relative flex flex-col gap-3 md:gap-1.5 before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-border md:before:hidden">
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
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    className="group relative flex items-center gap-3 rounded-lg md:rounded-md px-3 md:px-1 py-3 md:py-2 bg-card border border-border shadow-sm md:bg-transparent md:border-transparent md:shadow-none hover:bg-muted/30 cursor-pointer pl-10 md:pl-1 ml-0 md:ml-0"
                    onClick={() => router.push(`/projects/${entry.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/projects/${entry.id}`);
                      }
                    }}
                  >
                    {/* Mobile Timeline Dot */}
                    <div className={`md:hidden absolute left-[7px] top-1/2 -translate-y-1/2 size-[10px] rounded-full border-2 border-background z-10 ${STATUS_DOT_COLORS[entry.status] || 'bg-muted-foreground'}`} />

                    {/* Label */}
                    <div className="flex-1 min-w-0 md:w-56 md:flex-none md:shrink-0 truncate flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium leading-tight">
                          {client?.name ?? '—'}
                        </p>
                        {entry.priority === 'urgent' && (
                          <Badge variant="destructive" className="hidden md:inline-flex shrink-0 text-xs">Urgent</Badge>
                        )}
                      </div>
                      <div className="flex items-start justify-between mt-0.5">
                        <div className="flex flex-col gap-1">
                          <p className="truncate text-[11px] text-muted-foreground leading-tight">
                            {entry.projectReference}
                          </p>
                          <p className="md:hidden text-[10px] text-muted-foreground leading-none">
                            {formatDate(entry.startDate)} → {formatDate(entry.targetCompletionDate)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-0.5 ml-2">
                          {(() => {
                            const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                            const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                            if (progress.total === 0) return null;
                            return (
                              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded shrink-0 leading-none">
                                {percent}%
                              </span>
                            );
                          })()}
                          <span className="md:hidden text-[9px] text-muted-foreground leading-none capitalize mt-0.5">
                            {entry.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Progress Bar */}
                      {(() => {
                        const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                        const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                        if (progress.total === 0) return null;
                        return (
                          <div className="md:hidden mt-2.5 w-full bg-muted rounded-full h-1 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Mobile Chevron */}
                    <div className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                      <ChevronDown className="size-4 -rotate-90" />
                    </div>

                    {/* Bar area with Tooltip */}
                    <div className="hidden md:block relative flex-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative w-full cursor-help" style={{ height: '28px' }}>
                            {/* Main work bar */}
                            <div
                              className={`absolute top-1 h-5 rounded-sm transition-all ${STATUS_COLORS[entry.status] ?? 'bg-muted'} hover:brightness-110 active:scale-[0.99] flex items-center justify-end pr-1`}
                              style={{
                                left: `${(startOffset / totalDays) * 100}%`,
                                width: `${(workDays / totalDays) * 100}%`,
                                minWidth: '4px',
                              }}
                            >
                              {(() => {
                                const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                                const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                                if (percent === 0) return null;
                                return (
                                  <span className="text-[9px] font-bold text-white/90 select-none hidden sm:inline">
                                    {percent}%
                                  </span>
                                );
                              })()}
                            </div>

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
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-xs flex flex-col gap-1.5 bg-popover text-popover-foreground border shadow-md">
                          <p className="font-semibold text-xs">{client?.name ?? 'Unknown Client'}</p>
                          {(() => {
                            const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                            const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                            return (
                              <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span>Reference:</span>
                                <span className="font-medium text-foreground text-right">{entry.projectReference}</span>
                                
                                {progress.total > 0 && (
                                  <>
                                    <span>Progress:</span>
                                    <span className="font-medium text-emerald-500 text-right">{percent}% ({progress.completed}/{progress.total})</span>
                                  </>
                                )}

                                <span>Working Window:</span>
                                <span className="font-medium text-foreground text-right">
                                  {formatDate(entry.startDate)} → {formatDate(entry.targetCompletionDate)}
                                </span>

                                <span>Closing Date:</span>
                                <span className="font-medium text-red-500 text-right">{formatDate(entry.closingDate)}</span>

                                <span>Effort:</span>
                                <span className="font-medium text-foreground text-right">{workDays} days</span>

                                <span>Buffer:</span>
                                <span className={`font-medium text-right ${bufferDays < entry.bufferDays ? 'text-amber-500 font-semibold' : 'text-foreground'}`}>
                                  {bufferDays} days (req: {entry.bufferDays}d)
                                </span>
                              </div>
                            );
                          })()}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Status + Risk badges */}
                    <div
                      className="hidden md:flex shrink-0 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getNextStatuses(entry.status).length === 0 ? (
                        <ProjectStatusBadge status={entry.status} />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-auto p-1 font-normal hover:bg-muted/50 gap-1"
                              disabled={isPending === entry.id}
                            >
                              <ProjectStatusBadge status={entry.status} />
                              <ChevronDown className="size-3 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getNextStatuses(entry.status).map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => handleStatusTransition(entry.id, opt.value)}
                                className="text-xs"
                              >
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <ProjectRiskBadge tender={entry} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X-axis markers at bottom */}
            <div className="hidden md:flex relative mt-1 h-5 text-[10px] text-muted-foreground">
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
          {/* Subtle fade gradient overlay on the right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
