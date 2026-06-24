'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Filter, Archive, Trash2, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { TenderScheduleEntry } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  cancelTenderScheduleEntry,
  transitionTenderStatusAction,
} from '@/app/actions/tender-schedule'
import { bulkArchiveTenders, bulkDeleteTenders } from '@/app/actions/tender-schedule-bulk'
import { TenderStatusBadge } from '@/components/scheduling/tender-status-badge'
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string
  name: string
  businessName: string | null
  email: string | null
}

interface ScheduleListClientProps {
  entries: TenderScheduleEntry[]
  clients: ClientSummary[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScheduleListClient({ entries, clients }: ScheduleListClientProps) {
  const router = useRouter()
  const clientMap = React.useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')
  const [dateFilter, setDateFilter] = React.useState<string>('all')
  const [cancelId, setCancelId] = React.useState<string | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = React.useState<'archive' | 'delete' | null>(null)
  const [isBulkPending, setIsBulkPending] = React.useState(false)

  // Filtered entries
  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      const client = clientMap.get(e.clientId)

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchClient = client?.name.toLowerCase().includes(q)
        const matchRef = e.tenderReference.toLowerCase().includes(q)
        if (!matchClient && !matchRef) return false
      }

      // Status filter
      if (statusFilter !== 'all' && e.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false

      // Date range filter
      if (dateFilter !== 'all') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const closing = new Date(e.closingDate)
        const daysToClose = Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        switch (dateFilter) {
          case 'overdue':
            if (closing >= today || e.status === 'submitted' || e.status === 'completed') return false
            break
          case 'this_week':
            if (daysToClose > 7 || daysToClose < 0) return false
            break
          case 'this_month':
            if (daysToClose > 30 || daysToClose < 0) return false
            break
          case 'future':
            if (daysToClose <= 30) return false
            break
        }
      }

      return true
    })
  }, [entries, searchQuery, statusFilter, priorityFilter, dateFilter, clientMap])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setDateFilter('all')
  }

  const hasFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all'

  // Toggle select all / individual
  const allFilteredIds = React.useMemo(() => filtered.map((e) => e.id), [filtered])
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  async function handleCancel(id: string) {
    const result = await cancelTenderScheduleEntry(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Tender cancelled')
      router.refresh()
    }
    setCancelId(null)
  }

  async function handleBulkArchive() {
    setIsBulkPending(true)
    const result = await bulkArchiveTenders(Array.from(selectedIds))
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.count} tender${result.count !== 1 ? 's' : ''} archived`)
      setSelectedIds(new Set())
      router.refresh()
    }
    setIsBulkPending(false)
    setBulkAction(null)
  }

  async function handleBulkDelete() {
    setIsBulkPending(true)
    const result = await bulkDeleteTenders(Array.from(selectedIds))
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.count} tender${result.count !== 1 ? 's' : ''} permanently deleted`)
      setSelectedIds(new Set())
      router.refresh()
    }
    setIsBulkPending(false)
    setBulkAction(null)
  }

  return (
    <>
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open) => { if (!open) setCancelId(null) }}
        onConfirm={() => cancelId && handleCancel(cancelId)}
        title="Cancel tender?"
        description="This will mark the tender as cancelled."
        confirmText="Cancel Tender"
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkAction === 'archive'}
        onOpenChange={(open) => { if (!open) setBulkAction(null) }}
        onConfirm={handleBulkArchive}
        title={`Archive ${selectedIds.size} tender${selectedIds.size !== 1 ? 's' : ''}?`}
        description="Archived tenders will be cancelled and removed from active views."
        confirmText="Archive"
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkAction === 'delete'}
        onOpenChange={(open) => { if (!open) setBulkAction(null) }}
        onConfirm={handleBulkDelete}
        title={`Permanently delete ${selectedIds.size} tender${selectedIds.size !== 1 ? 's' : ''}?`}
        description="This action cannot be undone. Only cancelled tenders should be deleted."
        confirmText="Delete"
        variant="destructive"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All Tender Schedule Entries ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search client or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                <SelectItem value="planned" className="text-xs">Planned</SelectItem>
                <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
                <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All priorities</SelectItem>
                <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                <SelectItem value="high" className="text-xs">High</SelectItem>
                <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                <SelectItem value="low" className="text-xs">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All dates</SelectItem>
                <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
                <SelectItem value="this_week" className="text-xs">This week</SelectItem>
                <SelectItem value="this_month" className="text-xs">This month</SelectItem>
                <SelectItem value="future" className="text-xs">Future</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
              <CheckSquare className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground flex-1">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={isBulkPending}
                onClick={() => setBulkAction('archive')}
              >
                <Archive className="size-3 mr-1" />
                Archive
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive disabled:text-muted-foreground/50 disabled:opacity-50"
                disabled={isBulkPending || !Array.from(selectedIds).every(id => {
                  const entry = entries.find(e => e.id === id)
                  return entry?.status === 'cancelled'
                })}
                onClick={() => setBulkAction('delete')}
              >
                <Trash2 className="size-3 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Filter className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No tenders match your filters</p>
              {hasFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Closes</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Effort</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => {
                  const client = clientMap.get(entry.clientId)
                  const isSelected = selectedIds.has(entry.id)
                  return (
                    <TableRow
                      key={entry.id}
                      className={`${entry.status === 'cancelled' ? 'opacity-60' : ''} ${isSelected ? 'bg-muted/30' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(entry.id)}
                          aria-label={`Select ${entry.tenderReference}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs">{client?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{entry.tenderReference}</TableCell>
                      <TableCell><TenderStatusBadge status={entry.status} /></TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{entry.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(entry.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{new Date(entry.targetCompletionDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{new Date(entry.closingDate).toLocaleDateString()}</TableCell>
                      <TableCell><TenderRiskBadge tender={entry} /></TableCell>
                      <TableCell className="text-xs">{entry.effortDays}d</TableCell>
                      <TableCell className="text-xs">{entry.actualEffortDays ? `${entry.actualEffortDays}d` : '—'}</TableCell>
                      <TableCell className="text-xs capitalize">{entry.outcome ?? '—'}</TableCell>
                      <TableCell>
                        {entry.status !== 'submitted' && entry.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setCancelId(entry.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
