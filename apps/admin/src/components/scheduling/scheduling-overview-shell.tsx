'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, AlertTriangle, ListOrdered, Plus, Search, Flame, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { TenderScheduleEntry } from '@pmg/db'
import {
  transitionTenderStatusAction,
} from '@/app/actions/tender-schedule'
import { TenderFormDialog } from '@/components/scheduling/tender-form-dialog'
import { TenderEditDialog } from '@/components/scheduling/tender-edit-dialog'
import { DraggableUpNext } from '@/components/scheduling/draggable-up-next'
import { TenderStatusBadge } from '@/components/scheduling/tender-status-badge'
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string
  name: string
  businessName: string | null
  email: string | null
}

interface DivisionSummary {
  id: string
  name: string
}

interface OverlapWarning {
  tenderA: TenderScheduleEntry
  tenderB: TenderScheduleEntry
  overlapDays: number
}

interface SchedulingOverviewClientProps {
  inProgress: TenderScheduleEntry | null
  planned: TenderScheduleEntry[]
  allEntries: TenderScheduleEntry[]
  atRiskTenders: TenderScheduleEntry[]
  overlaps: OverlapWarning[]
  clients: ClientSummary[]
  divisions: DivisionSummary[]
}

// ── Sort config ───────────────────────────────────────────────────────────────

type SortField = 'client' | 'reference' | 'status' | 'priority' | 'startDate' | 'targetCompletionDate' | 'closingDate' | 'effortDays'
type SortDir = 'asc' | 'desc'

function daysBetween(a: string, b: string): number {
  const start = new Date(a)
  const end = new Date(b)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function SchedulingSummaryCards({
  activeEntries,
  atRiskCount,
}: {
  activeEntries: TenderScheduleEntry[]
  atRiskCount: number
}) {
  const urgentCount = activeEntries.filter((entry) => entry.priority === 'urgent').length
  const nextClosing = activeEntries
    .filter((entry) => entry.status !== 'completed' && entry.status !== 'submitted')
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))[0]

  const cards = [
    {
      label: 'Active Tenders',
      value: activeEntries.length,
      hint: 'planned or in progress',
      icon: ListOrdered,
    },
    {
      label: 'Urgent',
      value: urgentCount,
      hint: 'scheduled first',
      icon: Flame,
    },
    {
      label: 'Next Closing',
      value: nextClosing ? new Date(nextClosing.closingDate).toLocaleDateString() : 'None',
      hint: nextClosing?.tenderReference ?? 'no active deadline',
      icon: Clock,
    },
    {
      label: 'At Risk',
      value: atRiskCount,
      hint: 'needs attention',
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label} size="sm">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 truncate text-xl font-semibold tabular-nums">{card.value}</p>
                <p className="truncate text-xs text-muted-foreground">{card.hint}</p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ── Current Workload Card ─────────────────────────────────────────────────────

function CurrentWorkloadCard({
  tender,
  onStatusChange,
}: {
  tender: TenderScheduleEntry | null
  onStatusChange: (id: string, status: string) => Promise<string | undefined>
}) {
  if (!tender) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <CardTitle>Now Working</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing in progress</p>
            <p className="text-xs text-muted-foreground">
              Start a planned tender from the queue below.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const daysToClosing = Math.ceil(
    (new Date(tender.closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-blue-500" />
          <CardTitle>Now Working</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{tender.tenderReference}</p>
            <p className="text-xs text-muted-foreground">
              Closes: {new Date(tender.closingDate).toLocaleDateString()} ·{' '}
              {daysToClosing > 0
                ? `${daysToClosing} day${daysToClosing !== 1 ? 's' : ''} remaining`
                : daysToClosing === 0
                  ? 'Closing today'
                  : `Overdue by ${Math.abs(daysToClosing)} day${Math.abs(daysToClosing) !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Target:</span>
            <span className="text-xs">
              {new Date(tender.targetCompletionDate).toLocaleDateString()}
            </span>
            <TenderRiskBadge tender={tender} />
          </div>
          {tender.blockers && (
            <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">{tender.blockers}</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => onStatusChange(tender.id, 'completed')}
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(tender.id, 'cancelled')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Warnings Panel ────────────────────────────────────────────────────────────

function WarningsPanel({
  atRiskTenders,
  overlaps,
}: {
  atRiskTenders: TenderScheduleEntry[]
  overlaps: OverlapWarning[]
}) {
  if (atRiskTenders.length === 0 && overlaps.length === 0) return null

  return (
    <Card size="sm" className="border-amber-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          <CardTitle>Warnings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Start overdue warnings */}
        {atRiskTenders
          .filter(
            (t) =>
              t.status === 'planned' && new Date(t.startDate) < new Date(),
          )
          .map((t) => (
            <Alert key={`start-${t.id}`} variant="warning" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-sm">Start overdue</AlertTitle>
              <AlertDescription className="text-xs">
                &quot;{t.tenderReference}&quot; — recommended start was{' '}
                {new Date(t.startDate).toLocaleDateString()}. Consider reducing buffer or starting
                immediately.
              </AlertDescription>
            </Alert>
          ))}

        {/* At risk / tight buffer warnings */}
        {atRiskTenders
          .filter(
            (t) =>
              t.status !== 'submitted' &&
              t.status !== 'completed' &&
              new Date(t.targetCompletionDate) > new Date(t.closingDate),
          )
          .map((t) => (
            <Alert key={`impossible-${t.id}`} variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-sm">Impossible deadline</AlertTitle>
              <AlertDescription className="text-xs">
                &quot;{t.tenderReference}&quot; is scheduled to finish after its closing date.
                Reduce effort, increase urgency, or renegotiate the deadline.
              </AlertDescription>
            </Alert>
          ))}

        {atRiskTenders
          .filter((t) => {
            const gap = daysBetween(t.targetCompletionDate, t.closingDate)
            return (
              t.status !== 'submitted' &&
              t.status !== 'completed' &&
              gap >= 0 &&
              gap < t.bufferDays
            )
          })
          .map((t) => (
            <Alert key={`tight-${t.id}`} variant="warning" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-sm">Tight buffer</AlertTitle>
              <AlertDescription className="text-xs">
                &quot;{t.tenderReference}&quot; leaves {daysBetween(t.targetCompletionDate, t.closingDate)} day
                {daysBetween(t.targetCompletionDate, t.closingDate) !== 1 ? 's' : ''} before closing,
                below the configured {t.bufferDays} day buffer.
              </AlertDescription>
            </Alert>
          ))}

        {atRiskTenders
          .filter((t) => t.status === 'in_progress' && new Date(t.targetCompletionDate) < new Date())
          .map((t) => (
            <Alert key={`risk-${t.id}`} variant="warning" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-sm">Past target completion</AlertTitle>
              <AlertDescription className="text-xs">
                &quot;{t.tenderReference}&quot; was due for completion by{' '}
                {new Date(t.targetCompletionDate).toLocaleDateString()} but is still in progress.
              </AlertDescription>
            </Alert>
          ))}

        {/* Overdue warnings */}
        {atRiskTenders
          .filter(
            (t) =>
              t.status !== 'submitted' &&
              t.status !== 'completed' &&
              new Date(t.closingDate) < new Date(),
          )
          .map((t) => (
            <Alert key={`overdue-${t.id}`} variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-sm">Overdue</AlertTitle>
              <AlertDescription className="text-xs">
                &quot;{t.tenderReference}&quot; closed on{' '}
                {new Date(t.closingDate).toLocaleDateString()} but has not been submitted.
              </AlertDescription>
            </Alert>
          ))}

        {/* Workload overlap warnings */}
        {overlaps.map((o, i) => (
          <Alert key={`overlap-${i}`} variant="warning" className="py-2">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-sm">Workload overlap</AlertTitle>
            <AlertDescription className="text-xs">
              &quot;{o.tenderA.tenderReference}&quot; and &quot;{o.tenderB.tenderReference}&quot;
              overlap by {o.overlapDays} day{o.overlapDays !== 1 ? 's' : ''}. Consider adjusting
              schedules.
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Schedule Table (with sort & filter) ──────────────────────────────────────

function ScheduleTable({
  entries,
  clients,
  divisions,
}: {
  entries: TenderScheduleEntry[]
  clients: ClientSummary[]
  divisions: DivisionSummary[]
}) {
  const clientMap = React.useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

  // Sorting
  const [sortField, setSortField] = React.useState<SortField>('startDate')
  const [sortDir, setSortDir] = React.useState<SortDir>('asc')
  // Filtering
  const [filterStatus, setFilterStatus] = React.useState<string>('active')
  const [searchTerm, setSearchTerm] = React.useState('')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function sortDirIcon(field: SortField): string {
    if (sortField !== field) return 'text-muted-foreground/30'
    return sortDir === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'
  }

  // Filter + sort
  const processed = React.useMemo(() => {
    let filtered = entries

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((e) => e.status !== 'submitted' && e.status !== 'cancelled')
    } else if (filterStatus !== 'all') {
      filtered = filtered.filter((e) => e.status === filterStatus)
    }

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter((e) => {
        const client = clientMap.get(e.clientId)
        return client?.name.toLowerCase().includes(q) || e.tenderReference.toLowerCase().includes(q)
      })
    }

    // Sort
    const sorted = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      const clientA = clientMap.get(a.clientId)?.name ?? ''
      const clientB = clientMap.get(b.clientId)?.name ?? ''

      switch (sortField) {
        case 'client': return clientA.localeCompare(clientB) * dir
        case 'reference': return a.tenderReference.localeCompare(b.tenderReference) * dir
        case 'status': return a.status.localeCompare(b.status) * dir
        case 'priority': {
          const order = { urgent: 0, high: 1, normal: 2, low: 3 }
          return ((order[a.priority] ?? 2) - (order[b.priority] ?? 2)) * dir
        }
        case 'startDate': return a.startDate.localeCompare(b.startDate) * dir
        case 'targetCompletionDate': return a.targetCompletionDate.localeCompare(b.targetCompletionDate) * dir
        case 'closingDate': return a.closingDate.localeCompare(b.closingDate) * dir
        case 'effortDays': return (a.effortDays - b.effortDays) * dir
        default: return 0
      }
    })
    return sorted
  }, [entries, filterStatus, searchTerm, sortField, sortDir, clientMap])

  // Edit dialog state
  const [editingTender, setEditingTender] = React.useState<TenderScheduleEntry | null>(null)

  if (entries.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>All Tenders</CardTitle>
          <CardDescription>Schedule and track your tender preparation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarClock className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tenders scheduled yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first tender to start tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Tenders ({processed.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 w-36 pl-7 text-xs"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="all" className="text-xs">All</SelectItem>
                  <SelectItem value="planned" className="text-xs">Planned</SelectItem>
                  <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                  <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                  <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
                  <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('client')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('client')}`}>▼</span> Client
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('reference')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('reference')}`}>▼</span> Reference
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('status')}`}>▼</span> Status
                </TableHead>
                <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('priority')}`}>▼</span> Priority
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('startDate')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('startDate')}`}>▼</span> Start
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('targetCompletionDate')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('targetCompletionDate')}`}>▼</span> Target
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('closingDate')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('closingDate')}`}>▼</span> Closes
                </TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('effortDays')}>
                  <span className={`inline-block transition-transform ${sortDirIcon('effortDays')}`}>▼</span> Effort
                </TableHead>
                <TableHead className="hidden lg:table-cell">Actual</TableHead>
                <TableHead className="hidden lg:table-cell">Outcome</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processed.map((entry) => {
                const client = clientMap.get(entry.clientId)
                return (
                  <TableRow key={entry.id} className={entry.status === 'cancelled' ? 'opacity-60' : ''}>
                    <TableCell className="font-medium text-xs">{client?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{entry.tenderReference}</TableCell>
                    <TableCell><TenderStatusBadge status={entry.status} /></TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={entry.priority === 'urgent' ? 'destructive' : 'secondary'}
                        className="text-xs capitalize"
                      >
                        {entry.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{new Date(entry.startDate).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{new Date(entry.targetCompletionDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{new Date(entry.closingDate).toLocaleDateString()}</TableCell>
                    <TableCell><TenderRiskBadge tender={entry} /></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">{entry.effortDays}d</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{entry.actualEffortDays ? `${entry.actualEffortDays}d` : '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs capitalize">{entry.outcome ?? '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingTender(entry)}>
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingTender && (
        <TenderEditDialog
          tender={editingTender}
          clients={clients}
          divisions={divisions}
          key={editingTender.id}
          onClose={() => setEditingTender(null)}
        />
      )}
    </>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────

export function SchedulingOverviewClient({
  inProgress,
  planned,
  allEntries,
  atRiskTenders,
  overlaps,
  clients,
  divisions,
}: SchedulingOverviewClientProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = React.useState(false)
  const activeEntries = React.useMemo(
    () => [inProgress, ...planned].filter(Boolean) as TenderScheduleEntry[],
    [inProgress, planned],
  )

  async function handleStatusChange(id: string, newStatus: string): Promise<string | undefined> {
    try {
      const result = await transitionTenderStatusAction(id, newStatus)
      if (result.error) {
        toast.error(result.error)
        return result.error
      }
      const label =
        newStatus === 'completed'
          ? 'Marked as complete'
          : newStatus === 'in_progress'
            ? 'Started'
            : newStatus === 'cancelled'
              ? 'Cancelled'
              : `Moved to ${newStatus}`
      toast.success(`Tender ${label.toLowerCase()}`)
      router.refresh()
      return undefined
    } finally {
      // no-op
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add Tender button */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          New Tender
        </Button>
      </div>

      <SchedulingSummaryCards
        activeEntries={activeEntries}
        atRiskCount={atRiskTenders.length}
      />

      {/* Workload: current anchor + automatic waterfall */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <CurrentWorkloadCard
          tender={inProgress}
          onStatusChange={handleStatusChange}
        />
        <DraggableUpNext
          tenders={planned}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Warnings */}
      <WarningsPanel atRiskTenders={atRiskTenders} overlaps={overlaps} />

      {/* Schedule Table */}
      <ScheduleTable entries={allEntries} clients={clients} divisions={divisions} />

      {/* Tender Form Dialog */}
      <TenderFormDialog
        clients={clients}
        divisions={divisions}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}
