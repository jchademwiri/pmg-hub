'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSASTToday, formatZAR } from '@/lib/format'
import { toast } from 'sonner'
import type { ChartAccount, Division } from '@pmg/db'

interface JournalEntryFormProps {
  accounts: ChartAccount[]
  divisions: Division[]
  createAction: (data: {
    divisionId: string
    entryDate: string
    description: string
    lines: { accountId: string; debit?: number; credit?: number; description?: string }[]
  }) => Promise<{ error?: string; entryId?: string }>
}

interface LineRow {
  id: string
  accountId: string
  debit: string
  credit: string
  description: string
}

function newLine(): LineRow {
  return { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15), accountId: '', debit: '', credit: '', description: '' }
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
}

export function JournalEntryForm({ accounts, divisions, createAction }: JournalEntryFormProps) {
  const router = useRouter()
  const [divisionId, setDivisionId] = React.useState(divisions[0]?.id || '')
  const [entryDate, setEntryDate] = React.useState(getSASTToday())
  const [description, setDescription] = React.useState('')
  const [lines, setLines] = React.useState<LineRow[]>([newLine(), newLine()])
  const [saving, setSaving] = React.useState(false)

  // Filter to posting accounts only
  const postingAccounts = React.useMemo(
    () => accounts.filter((a) => a.isPostingAccount && a.isActive),
    [accounts]
  )

  // Real-time balance calculation
  const totalDebits = React.useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0),
    [lines]
  )
  const totalCredits = React.useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0),
    [lines]
  )
  const difference = Math.abs(totalDebits - totalCredits)
  const isBalanced = totalDebits > 0 && difference < 0.01

  // Validation
  const isValid = React.useMemo(() => {
    if (!divisionId || !entryDate || !description.trim()) return false
    if (lines.length < 2) return false
    for (const line of lines) {
      if (!line.accountId) return false
      const d = parseFloat(line.debit) || 0
      const c = parseFloat(line.credit) || 0
      if (d <= 0 && c <= 0) return false
      if (d > 0 && c > 0) return false
    }
    return isBalanced
  }, [divisionId, entryDate, description, lines, isBalanced])

  function updateLine(id: string, field: keyof LineRow, value: string) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const updated = { ...l, [field]: value }
        // Enforce mutual exclusivity: clearing debit allows credit and vice versa
        if (field === 'debit' && value && parseFloat(value) > 0) {
          updated.credit = ''
        }
        if (field === 'credit' && value && parseFloat(value) > 0) {
          updated.debit = ''
        }
        return updated
      })
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()])
  }

  function removeLine(id: string) {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setSaving(true)
    try {
      const result = await createAction({
        divisionId,
        entryDate,
        description: description.trim(),
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || undefined,
          credit: parseFloat(l.credit) || undefined,
          description: l.description.trim() || undefined,
        })),
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Journal entry created as draft')
        router.push('/accounting/journals')
      }
    } catch {
      toast.error('Failed to create journal entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Header fields */}
      <div className="rounded-xl border bg-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="divisionId">Division *</Label>
            <Select value={divisionId} onValueChange={setDivisionId}>
              <SelectTrigger id="divisionId">
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entryDate">Entry Date *</Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Record sales revenue for January"
              required
            />
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Journal Lines</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each line must have a debit or credit amount, not both. At least 2 lines required.
          </p>
        </div>

        <div className="divide-y">
          {lines.map((line, index) => {
            const lineDebit = parseFloat(line.debit) || 0
            const lineCredit = parseFloat(line.credit) || 0
            const hasError = line.accountId && lineDebit === 0 && lineCredit === 0

            return (
              <div key={line.id} className="px-5 py-3 flex items-end gap-3">
                <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 pt-2.5">
                  {index + 1}
                </span>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_1fr_auto] gap-2 items-end">
                  {/* Account Select */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Account *</Label>
                    <Select
                      value={line.accountId}
                      onValueChange={(v) => updateLine(line.id, 'accountId', v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(
                          postingAccounts.reduce(
                            (acc, a) => {
                              ;(acc[a.type] ??= []).push(a)
                              return acc
                            },
                            {} as Record<string, ChartAccount[]>
                          )
                        ).map(([type, accts]) => (
                          <React.Fragment key={type}>
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              {TYPE_LABELS[type] ?? type}
                            </div>
                            {accts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                <span className="font-mono text-xs mr-1.5">{a.code}</span>
                                {a.name}
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Debit */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Debit (R)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                      placeholder="0.00"
                      className="h-9 text-sm tabular-nums"
                    />
                  </div>

                  {/* Credit */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Credit (R)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                      placeholder="0.00"
                      className="h-9 text-sm tabular-nums"
                    />
                  </div>

                  {/* Line Description */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Note</Label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      placeholder="Optional"
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Remove */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length <= 2}
                    className="shrink-0 mb-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add line */}
        <div className="px-5 py-2 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={addLine} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Line
          </Button>
        </div>
      </div>

      {/* Balance indicator & submit */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        {!isBalanced && (totalDebits > 0 || totalCredits > 0) && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-destructive/5 border border-destructive/20 text-destructive p-4 rounded-xl text-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <p className="font-semibold flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Unbalanced Entry
            </p>
            <p className="opacity-90">
              Debits and Credits must be equal to maintain a balanced double-entry ledger. Currently off by{' '}
              <span className="font-bold">{formatZAR(difference)}</span>.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Total Debits:</span>{' '}
              <span className="font-semibold tabular-nums">{formatZAR(totalDebits)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Credits:</span>{' '}
              <span className="font-semibold tabular-nums">{formatZAR(totalCredits)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Difference:</span>{' '}
              <span className={`font-semibold tabular-nums ${isBalanced ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatZAR(difference)}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isBalanced
              ? 'bg-emerald-500/10 text-emerald-600'
              : totalDebits > 0 || totalCredits > 0
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground'
          }`}>
            {isBalanced ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Balanced
              </>
            ) : totalDebits > 0 || totalCredits > 0 ? (
              <>
                <X className="h-3.5 w-3.5" />
                Out of balance
              </>
            ) : (
              'Enter amounts'
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
          <Button type="submit" disabled={saving || !isValid}>
            {saving ? 'Creating...' : 'Create Journal Entry'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/accounting/journals')}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
