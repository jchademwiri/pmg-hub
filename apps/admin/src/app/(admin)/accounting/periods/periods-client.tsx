'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Unlock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDateTime } from '@/lib/format'
import { toast } from 'sonner'
import type { AccountingPeriod } from '@pmg/db'

interface PeriodsClientProps {
  periods: AccountingPeriod[]
  closeAction: (period: string) => Promise<{ error?: string }>
  lockAction: (period: string) => Promise<{ error?: string }>
  reopenAction: (period: string) => Promise<{ error?: string }>
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-600',
  closed: 'bg-amber-500/15 text-amber-600',
  locked: 'bg-zinc-500/15 text-zinc-600',
}

export function PeriodsClient({ periods, closeAction, lockAction, reopenAction }: PeriodsClientProps) {
  const router = useRouter()
  const [processing, setProcessing] = React.useState<string | null>(null)

  async function handleAction(action: 'close' | 'lock' | 'reopen', period: string) {
    const labels = { close: 'Close', lock: 'Lock', reopen: 'Reopen' }
    if (action === 'lock' && !confirm(`Permanently lock period ${period}? This cannot be undone.`)) return

    setProcessing(period)
    let result: { error?: string }
    if (action === 'close') result = await closeAction(period)
    else if (action === 'lock') result = await lockAction(period)
    else result = await reopenAction(period)
    setProcessing(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Period ${period} ${action === 'close' ? 'closed' : action === 'lock' ? 'locked' : 'reopened'}`)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {periods.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
          No accounting periods found. Periods are created automatically when journal entries are posted.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closed At</TableHead>
              <TableHead>Closed By</TableHead>
              <TableHead>Locked At</TableHead>
              <TableHead>Locked By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="text-sm font-semibold">{period.period}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[period.status] ?? ''}`}>
                    {period.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{period.closedAt ? fmtDateTime(period.closedAt) : '—'}</TableCell>
                <TableCell className="text-sm">{period.closedBy ?? '—'}</TableCell>
                <TableCell className="text-sm">{period.lockedAt ? fmtDateTime(period.lockedAt) : '—'}</TableCell>
                <TableCell className="text-sm">{period.lockedBy ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {period.status === 'open' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleAction('close', period.period)}
                        disabled={processing === period.period}
                        title="Close period"
                      >
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                      </Button>
                    )}
                    {period.status === 'closed' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleAction('reopen', period.period)}
                          disabled={processing === period.period}
                          title="Reopen period"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleAction('lock', period.period)}
                          disabled={processing === period.period}
                          title="Lock period permanently"
                        >
                          <Lock className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                    {period.status === 'locked' && (
                      <span className="text-xs text-muted-foreground px-2">Permanent</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
