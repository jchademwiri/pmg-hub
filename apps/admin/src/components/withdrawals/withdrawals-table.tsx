'use client'

import * as React from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { WithdrawalRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatZAR } from '@/lib/format'
import { ACCOUNT_LABELS } from '@/lib/accounts'

const today = new Date().toISOString().split('T')[0]!

function formatDefaultDescription(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return `Salary withdrawal — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

interface WithdrawalsTableProps {
  entries: WithdrawalRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}

function WithdrawalTableRow({ entry, deleteAction, updateAction }: {
  entry: WithdrawalRow
  deleteAction: (id: string) => Promise<{ error?: string }>
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}) {
  const [mode, setMode] = React.useState<'display' | 'edit' | 'confirm-delete'>('display')
  const [editDate, setEditDate] = React.useState(entry.date)
  const [editAmount, setEditAmount] = React.useState(entry.amount)
  const [editDesc, setEditDesc] = React.useState(entry.description ?? '')
  const [editAccount, setEditAccount] = React.useState(entry.account)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, startSaveTransition] = React.useTransition()
  const [isDeleting, setIsDeleting] = React.useState(false)

  function startEdit() {
    setEditDate(entry.date); setEditAmount(entry.amount)
    setEditDesc(entry.description ?? ''); setEditAccount(entry.account)
    setError(null); setMode('edit')
  }

  function handleSave() {
    setError(null)
    startSaveTransition(async () => {
      const fd = new FormData()
      fd.set('date', editDate); fd.set('amount', editAmount)
      fd.set('description', editDesc); fd.set('account', editAccount)
      const result = await updateAction(entry.id, fd)
      if (result.error) setError(result.error)
      else setMode('display')
    })
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await deleteAction(entry.id)
      if (result.error) { toast.error(result.error); setMode('display') }
    } finally { setIsDeleting(false) }
  }

  if (mode === 'edit') {
    return (
      <>
        <TableRow className="bg-muted/30">
          <TableCell><Input type="date" value={editDate} max={today} onChange={(e) => setEditDate(e.target.value)} className="w-36" disabled={isSaving} /></TableCell>
          <TableCell>
            <Select value={editAccount} onValueChange={setEditAccount} disabled={isSaving}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell><Input type="number" min="0.01" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-32" disabled={isSaving} /></TableCell>
          <TableCell><Input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder={formatDefaultDescription(editDate)} className="w-64" disabled={isSaving} /></TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving}><Check className="h-4 w-4 mr-1" />{isSaving ? 'Saving…' : 'Save'}</Button>
              <Button size="sm" variant="outline" onClick={() => setMode('display')} disabled={isSaving}><X className="h-4 w-4" /></Button>
            </div>
          </TableCell>
        </TableRow>
        {error && <TableRow><TableCell colSpan={5} className="py-1"><p className="text-sm text-destructive">{error}</p></TableCell></TableRow>}
      </>
    )
  }

  return (
    <TableRow>
      <TableCell>{entry.date}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{ACCOUNT_LABELS[entry.account] ?? entry.account}</TableCell>
      <TableCell className="tabular-nums font-medium text-amber-500">−{formatZAR(Number(entry.amount))}</TableCell>
      <TableCell>{entry.description ?? ''}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={startEdit}><Pencil className="h-4 w-4" /></Button>
          {mode === 'confirm-delete' ? (
            <>
              <Button variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>{isDeleting ? 'Deleting…' : 'Confirm'}</Button>
              <Button variant="outline" size="sm" onClick={() => setMode('display')}>Cancel</Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setMode('confirm-delete')}><Trash2 className="h-4 w-4" /></Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function WithdrawalsTable({ entries, deleteAction, updateAction }: WithdrawalsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <WithdrawalTableRow key={entry.id} entry={entry} deleteAction={deleteAction} updateAction={updateAction} />
        ))}
      </TableBody>
    </Table>
  )
}
