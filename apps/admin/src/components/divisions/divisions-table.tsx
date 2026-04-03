'use client'

import * as React from 'react'
import type { DivisionRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatZAR } from '@/lib/format'

interface DivisionsTableProps {
  divisions: DivisionRow[]
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  deleteAction: (id: string) => Promise<{ error?: string }>
}

interface RowState {
  mode: 'display' | 'edit' | 'confirm-delete'
  editName: string
  editError: string | null
  deleteError: string | null
}

function DivisionTableRow({
  division,
  updateAction,
  deleteAction,
}: {
  division: DivisionRow
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  deleteAction: (id: string) => Promise<{ error?: string }>
}) {
  const [mode, setMode] = React.useState<'display' | 'edit' | 'confirm-delete'>('display')
  const [editName, setEditName] = React.useState(division.name)
  const [editError, setEditError] = React.useState<string | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isRenamePending, startRenameTransition] = React.useTransition()
  const [isDeletePending, startDeleteTransition] = React.useTransition()

  function handleEditClick() {
    setEditName(division.name)
    setEditError(null)
    setMode('edit')
  }

  function handleEditCancel() {
    setMode('display')
    setEditError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  function handleSave() {
    setEditError(null)
    startRenameTransition(async () => {
      const fd = new FormData()
      fd.set('name', editName)
      const result = await updateAction(division.id, fd)
      if (result.error) {
        setEditError(result.error)
      } else {
        setMode('display')
      }
    })
  }

  function handleDeleteClick() {
    setDeleteError(null)
    setMode('confirm-delete')
  }

  function handleDeleteCancel() {
    setMode('display')
    setDeleteError(null)
  }

  function handleConfirmDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteAction(division.id)
      if (result.error) {
        setDeleteError(result.error)
        setMode('confirm-delete')
      }
    })
  }

  const netProfitClass =
    division.netProfit > 0 ? 'text-green-600' : 'text-red-600'

  return (
    <TableRow>
      <TableCell>
        {mode === 'edit' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRenamePending}
                className="w-48"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isRenamePending}
              >
                {isRenamePending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditCancel}
                disabled={isRenamePending}
              >
                Cancel
              </Button>
            </div>
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
        ) : (
          division.name
        )}
      </TableCell>
      <TableCell>{formatZAR(division.totalIncome)}</TableCell>
      <TableCell>{formatZAR(division.totalExpenses)}</TableCell>
      <TableCell className={netProfitClass}>{formatZAR(division.netProfit)}</TableCell>
      <TableCell>{division.leadCount}</TableCell>
      <TableCell>
        {mode === 'confirm-delete' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Delete &quot;{division.name}&quot;?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeletePending}
              >
                {isDeletePending ? 'Deleting…' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeletePending}
              >
                Cancel
              </Button>
            </div>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              disabled={mode === 'edit'}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

export function DivisionsTable({ divisions, updateAction, deleteAction }: DivisionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Total Income</TableHead>
          <TableHead>Total Expenses</TableHead>
          <TableHead>Net Profit</TableHead>
          <TableHead>Lead Count</TableHead>
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
          />
        ))}
      </TableBody>
    </Table>
  )
}
