'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Send, Ban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDate, fmtDateTime, fmtMonthYear } from '@/lib/format'
import { toast } from 'sonner'
import type { JournalEntry } from '@pmg/db'

interface JournalsTableProps {
  entries: JournalEntry[]
  postAction: (id: string) => Promise<{ error?: string }>
  voidAction: (id: string, reason: string) => Promise<{ error?: string }>
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-600',
  posted: 'bg-emerald-500/15 text-emerald-600',
  void: 'bg-zinc-500/15 text-zinc-600',
}

export function JournalsTable({
  entries,
  postAction,
  voidAction,
}: JournalsTableProps) {
  const router = useRouter()
  const [processing, setProcessing] = React.useState<string | null>(null)

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
      {entries.length === 0 ? (
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
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm font-mono">{entry.entryNumber}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(entry.entryDate)}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate" title={entry.description}>
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-sm">{fmtMonthYear(entry.period)}</TableCell>
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
        </>
      )}
    </div>
  )
}
