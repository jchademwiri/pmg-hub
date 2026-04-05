'use client'

import * as React from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { ExpenseRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatZAR } from '@/lib/format'

const today = new Date().toISOString().split('T')[0]!

interface ExpenseTableProps {
  entries: ExpenseRow[]
  divisions: { id: string; name: string }[]
  categories: string[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}

function ExpenseTableRow({
  entry, divisions, categories, deleteAction, updateAction,
}: {
  entry: ExpenseRow
  divisions: { id: string; name: string }[]
  categories: string[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}) {
  const [mode, setMode] = React.useState<'display' | 'edit' | 'confirm-delete'>('display')
  const [editDate, setEditDate] = React.useState(entry.date)
  const [editDivisionId, setEditDivisionId] = React.useState(entry.divisionId)
  const [editCategory, setEditCategory] = React.useState(entry.category)
  const [editDesc, setEditDesc] = React.useState(entry.description ?? '')
  const [editAmount, setEditAmount] = React.useState(entry.amount)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, startSaveTransition] = React.useTransition()
  const [isDeleting, setIsDeleting] = React.useState(false)

  function startEdit() {
    setEditDate(entry.date); setEditDivisionId(entry.divisionId)
    setEditCategory(entry.category); setEditDesc(entry.description ?? '')
    setEditAmount(entry.amount); setError(null); setMode('edit')
  }

  function handleSave() {
    setError(null)
    startSaveTransition(async () => {
      const fd = new FormData()
      fd.set('date', editDate); fd.set('divisionId', editDivisionId)
      fd.set('category', editCategory); fd.set('description', editDesc)
      fd.set('amount', editAmount)
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
          <TableCell>
            <Input type="date" value={editDate} max={today} onChange={(e) => setEditDate(e.target.value)} className="w-36" disabled={isSaving} />
          </TableCell>
          <TableCell>
            <Select value={editDivisionId} onValueChange={setEditDivisionId} disabled={isSaving}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Input type="text" list="edit-category-list" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-36" disabled={isSaving} />
            <datalist id="edit-category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </TableCell>
          <TableCell>
            <Input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional" className="w-44" disabled={isSaving} />
          </TableCell>
          <TableCell>
            <Input type="number" min="0.01" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-28" disabled={isSaving} />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Check className="h-4 w-4 mr-1" />{isSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode('display')} disabled={isSaving}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {error && (
          <TableRow>
            <TableCell colSpan={6} className="py-1">
              <p className="text-sm text-destructive">{error}</p>
            </TableCell>
          </TableRow>
        )}
      </>
    )
  }

  return (
    <TableRow>
      <TableCell>{entry.date}</TableCell>
      <TableCell>{entry.divisionName}</TableCell>
      <TableCell>{entry.category}</TableCell>
      <TableCell>{entry.description ?? ''}</TableCell>
      <TableCell className="tabular-nums font-medium text-amber-500">−{formatZAR(Number(entry.amount))}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={startEdit}>
            <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
          </Button>
          {mode === 'confirm-delete' ? (
            <>
              <Button variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? 'Deleting…' : 'Confirm'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode('display')}>Cancel</Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setMode('confirm-delete')}>
              <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ExpenseTable({ entries, divisions, categories, deleteAction, updateAction }: ExpenseTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <ExpenseTableRow
            key={entry.id} entry={entry}
            divisions={divisions} categories={categories}
            deleteAction={deleteAction} updateAction={updateAction}
          />
        ))}
      </TableBody>
    </Table>
  )
}
