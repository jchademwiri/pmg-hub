'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PowerOff, Power, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DivisionRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatZAR } from '@/lib/format'

interface DivisionsTableProps {
  divisions: DivisionRow[]
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  deleteAction: (id: string) => Promise<{ error?: string }>
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>
}

function DivisionTableRow({
  division, updateAction, deleteAction, toggleActiveAction,
}: {
  division: DivisionRow
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  deleteAction: (id: string) => Promise<{ error?: string }>
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'display' | 'edit' | 'confirm-delete'>('display')
  const [editName, setEditName] = React.useState(division.name)
  const [editError, setEditError] = React.useState<string | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isRenamePending, startRenameTransition] = React.useTransition()
  const [isPendingDelete, setIsPendingDelete] = React.useState(false)
  const [isPendingToggle, setIsPendingToggle] = React.useState(false)

  const hasRecords = division.totalIncome > 0 || division.totalExpenses > 0

  function handleSave() {
    setEditError(null)
    startRenameTransition(async () => {
      const fd = new FormData()
      fd.set('name', editName)
      const result = await updateAction(division.id, fd)
      if (result.error) setEditError(result.error)
      else setMode('display')
    })
  }

  async function handleToggleActive(e: React.MouseEvent) {
    e.stopPropagation()
    setIsPendingToggle(true)
    try {
      const result = await toggleActiveAction(division.id, !division.isActive)
      if (result.error) toast.error(result.error)
      else toast.success(division.isActive ? 'Division disabled' : 'Division activated')
    } finally {
      setIsPendingToggle(false)
    }
  }

  async function handleConfirmDelete() {
    setDeleteError(null)
    setIsPendingDelete(true)
    try {
      const result = await deleteAction(division.id)
      if (result.error) { setDeleteError(result.error); setMode('confirm-delete') }
    } finally {
      setIsPendingDelete(false)
    }
  }

  const netProfitClass = division.netProfit >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <TableRow
      className={`cursor-pointer ${!division.isActive ? 'opacity-60' : ''}`}
      onClick={() => mode === 'display' && router.push('/divisions/' + division.id)}
    >
      <TableCell onClick={mode === 'edit' ? (e) => e.stopPropagation() : undefined}>
        {mode === 'edit' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setMode('display')}
                disabled={isRenamePending}
                className="w-48"
                autoFocus
              />
              <Button size="sm" onClick={handleSave} disabled={isRenamePending}>
                {isRenamePending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode('display')} disabled={isRenamePending}>
                Cancel
              </Button>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
        ) : (
          division.name
        )}
      </TableCell>
      <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(division.totalIncome)}</TableCell>
      <TableCell className="text-amber-500 tabular-nums font-medium">{formatZAR(division.totalExpenses)}</TableCell>
      <TableCell className={`tabular-nums font-medium ${netProfitClass}`}>{formatZAR(division.netProfit)}</TableCell>
      <TableCell>{division.leadCount}</TableCell>
      <TableCell>
        <Badge variant={division.isActive ? 'default' : 'secondary'}>
          {division.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {mode === 'confirm-delete' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Delete &quot;{division.name}&quot;?</span>
              <Button size="sm" variant="destructive" onClick={handleConfirmDelete} disabled={isPendingDelete}>
                {isPendingDelete ? 'Deleting…' : 'Confirm'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode('display')} disabled={isPendingDelete}>
                Cancel
              </Button>
            </div>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditName(division.name); setEditError(null); setMode('edit') }}>
              Rename
            </Button>
            <Button
              variant="ghost" size="icon"
              disabled={isPendingToggle}
              onClick={handleToggleActive}
              title={division.isActive ? 'Disable division' : 'Activate division'}
            >
              {division.isActive
                ? <PowerOff className="h-4 w-4 text-muted-foreground" />
                : <Power className="h-4 w-4 text-green-500" />}
            </Button>
            {hasRecords ? (
              <Button variant="ghost" size="icon" disabled title="Cannot delete - has financial records">
                <Trash2 className="h-4 w-4 text-muted-foreground/30" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteError(null); setMode('confirm-delete') }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

export function DivisionsTable({ divisions, updateAction, deleteAction, toggleActiveAction }: DivisionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Total Income</TableHead>
          <TableHead>Total Expenses</TableHead>
          <TableHead>Net Profit</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {divisions.map((division) => (
          <DivisionTableRow
            key={division.id}
            division={division}
            updateAction={updateAction}
            deleteAction={deleteAction}
            toggleActiveAction={toggleActiveAction}
          />
        ))}
      </TableBody>
    </Table>
  )
}
