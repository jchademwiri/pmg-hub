'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, AlertTriangle, ListOrdered, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  cancelTenderScheduleEntry,
  transitionTenderStatusAction,
} from '@/app/actions/tender-schedule'
import { TenderFormDialog } from '@/components/scheduling/tender-form-dialog'
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

// ── Up Next Card ──────────────────────────────────────────────────────────────

function UpNextCard({
  tenders,
  onStatusChange,
}: {
  tenders: TenderScheduleEntry[]
  onStatusChange: (id: string, status: string) => Promise<string | undefined>
}) {
  if (tenders.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-muted-foreground" />
            <CardTitle>Up Next</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">No upcoming tenders</p>
            <p className="text-xs text-muted-foreground">Add a new tender to build your queue.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" />
          <CardTitle>Up Next ({tenders.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {tenders.slice(0, 5).map((tender) => {
          const startOverdue =
            tender.status === 'planned' &&
            new Date(tender.startDate) < new Date()

          return (
            <div
              key={tender.id}
              className="flex items-center justify-between border-b py-2.5 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tender.tenderReference}</p>
                <p className="text-xs text-muted-foreground">
                  Closes: {new Date(tender.closingDate).toLocaleDateString()} · Effort:{' '}
                  {tender.effortDays}d
                  {startOverdue && (
                    <span className="ml-1 text-amber-500">· Start overdue</span>
                  )}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-2 shrink-0">
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

// ── Schedule Table ────────────────────────────────────────────────────────────

function ScheduleTable({
  entries,
  clients,
  onCancel,
}: {
  entries: TenderScheduleEntry[]
  clients: ClientSummary[]
  onCancel: (id: string) => Promise<string | undefined>
}) {
  const clientMap = React.useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

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
    <Card size="sm">
      <CardHeader>
        <CardTitle>All Tenders ({entries.length})</CardTitle>
        <CardDescription>Active tenders sorted by priority and closing date</CardDescription>
      </CardHeader>
      <CardContent className="p-0 px-6 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Closes</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Effort</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const client = clientMap.get(entry.clientId)
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{client?.name ?? '—'}</TableCell>
                  <TableCell>{entry.tenderReference}</TableCell>
                  <TableCell>
                    <TenderStatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {entry.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(entry.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(entry.targetCompletionDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(entry.closingDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <TenderRiskBadge tender={entry} />
                  </TableCell>
                  <TableCell className="text-xs">{entry.effortDays}d</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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

  async function handleCancel(id: string): Promise<string | undefined> {
    try {
      const result = await cancelTenderScheduleEntry(id)
      if (result.error) {
        toast.error(result.error)
        return result.error
      }
      toast.success('Tender cancelled')
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

      {/* Workload: Now Working + Up Next */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CurrentWorkloadCard
          tender={inProgress}
          onStatusChange={handleStatusChange}
        />
        <UpNextCard
          tenders={planned}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Warnings */}
      <WarningsPanel atRiskTenders={atRiskTenders} overlaps={overlaps} />

      {/* Schedule Table */}
      <ScheduleTable entries={allEntries} clients={clients} onCancel={handleCancel} />

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
