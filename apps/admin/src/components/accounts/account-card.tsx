'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatZAR } from '@/lib/format'

const today = new Date().toISOString().split('T')[0]!

interface AccountCardProps {
  accountKey: string
  label: string
  earned: number
  withdrawn: number
  balance: number
  historyCount: number
  recordAction: (formData: FormData) => Promise<{ error?: string }>
}

export function AccountCard({
  accountKey, label, earned, withdrawn, balance, historyCount, recordAction,
}: AccountCardProps) {
  const [showForm, setShowForm] = React.useState(false)
  const [date, setDate] = React.useState(today)
  const [amount, setAmount] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const isNegative = balance < 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('account', accountKey)
      fd.set('date', date)
      fd.set('amount', amount)
      fd.set('description', description)
      const result = await recordAction(fd)
      if (result.error) {
        setError(result.error)
      } else {
        toast.success(`${label} withdrawal recorded`)
        setAmount('')
        setDescription('')
        setDate(today)
        setShowForm(false)
      }
    })
  }

  return (
    <Card className="rounded-xl border shadow-none flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Link
            href={`/accounts/${accountKey}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            History{historyCount > 0 ? ` (${historyCount})` : ''}
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Balance */}
        <div>
          <p className={`text-2xl font-bold tabular-nums ${isNegative ? 'text-red-500' : 'text-foreground'}`}>
            {formatZAR(balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">available balance</p>
        </div>

        {/* Breakdown */}
        <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Earned YTD</span>
            <span className="tabular-nums font-medium">{formatZAR(earned)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-muted-foreground">Withdrawn YTD</span>
            <span className={`tabular-nums font-medium ${withdrawn > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {withdrawn > 0 ? `−${formatZAR(withdrawn)}` : formatZAR(0)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
            <span>Balance</span>
            <span className={`tabular-nums ${isNegative ? 'text-red-500' : ''}`}>{formatZAR(balance)}</span>
          </div>
        </div>

        {/* Record withdrawal */}
        {!showForm ? (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Record Withdrawal
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} disabled={isPending} className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Amount</label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required disabled={isPending} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Description (optional)</label>
              <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={`${label} withdrawal`} disabled={isPending} className="h-8 text-sm" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(null) }} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
