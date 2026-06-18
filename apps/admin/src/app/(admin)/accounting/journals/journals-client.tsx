'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Send, Ban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { toast } from 'sonner'
import type { JournalEntry } from '@pmg/db'

interface JournalsClientProps {
  data: JournalEntry[]
  total: number
  currentPage: number
  pageSize: number
  filters: {
    status?: string
    period?: string
  }
  periods: string[]
  postAction: (id: string) => Promise<{ error?: string }>
  voidAction: (id: string, reason: string) => Promise<{ error?: string }>
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-600',
  posted: 'bg-emerald-500/15 text-emerald-600',
  void: 'bg-zinc-500/15 text-zinc-600',
}

export function JournalsClient({
  data,
  total,
  currentPage,
  pageSize,
  filters,
  periods,
  postAction,
  voidAction,
}: JournalsClientProps) {
  const router = useRouter()
  const [processing, setProcessing] = React.useState<string | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    if (key !== 'status' && filters.status) params.set('status', filters.status)
    if (key !== 'period' && filters.period) params.set('period', filters.period)
    if (value) params.set(key, value)
    router.push(`/accounting/journals?${params.toString()}`, { scroll: false })
  }

  function clearFilters() {
    router.push('/accounting/journals', { scroll: false })
  }

  const hasFilters = filters.status || filters.period

  async function handlePost(id: string) {
    setProcessing(id)
    const result = await postAction(id)
    setProcessing(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Journal entry posted')
      router.refresh()
    }
  }

  async function handleVoid(id: string) {
    const reason = prompt('Reason for voiding this entry (optional):')
    setProcessing(id)
    const result = await voidAction(id, reason ?? '')
    setProcessing(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Journal entry voided')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.period || 'all'}
          onValueChange={(v) => updateFilter('period', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="flex-1" />

        <Button size="sm" asChild>
          <a href="/accounting/journals/new">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Entry
          </a>
        </Button>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
          No journal entries found.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm font-mono">{entry.entryNumber}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(entry.entryDate)}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate" title={entry.description}>
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-sm">{entry.period}</TableCell>
                  <TableCell>
                    {entry.sourceModule && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-500">
                        {entry.sourceModule}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status] ?? ''}`}>
                      {entry.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {entry.status === 'draft' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handlePost(entry.id)}
                            disabled={processing === entry.id}
                            title="Post entry"
                          >
                            <Send className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleVoid(entry.id)}
                            disabled={processing === entry.id}
                            title="Void entry"
                          >
                            <Ban className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?${new URLSearchParams({
                      ...(filters.status ? { status: filters.status } : {}),
                      ...(filters.period ? { period: filters.period } : {}),
                      page: String(currentPage - 1),
                    }).toString()}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < total && (
                  <a
                    href={`?${new URLSearchParams({
                      ...(filters.status ? { status: filters.status } : {}),
                      ...(filters.period ? { period: filters.period } : {}),
                      page: String(currentPage + 1),
                    }).toString()}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
