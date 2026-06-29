'use client'

import * as React from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LeadRow } from '@pmg/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LeadsTableProps {
  entries: LeadRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  contacted: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  converted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  lost: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

export function LeadsTable({ entries, deleteAction }: LeadsTableProps) {
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isPendingDelete, setIsPendingDelete] = React.useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setIsPendingDelete(true)
    try {
      const result = await deleteAction(deleteId)
      if (result.error) {
        toast.error(result.error)
      }
      setDeleteId(null)
    } finally {
      setIsPendingDelete(false)
    }
  }

  return (
    <>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        onConfirm={handleDelete}
        title="Delete lead?"
        description="This action cannot be undone."
        confirmText={isPendingDelete ? 'Deleting…' : 'Delete'}
        variant="destructive"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.name ?? ''}</TableCell>
              <TableCell>{entry.email ?? entry.phone ?? ''}</TableCell>
              <TableCell>{entry.divisionName ?? ''}</TableCell>
              <TableCell>{entry.source ?? ''}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`border font-medium shadow-none capitalize ${statusBadgeClasses[entry.status] ?? 'border-border text-muted-foreground'}`}
                >
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Link
                  href={`/leads/${entry.id}`}
                  className="text-sm font-medium underline underline-offset-4 hover:text-foreground/80"
                >
                  View
                </Link>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(entry.id)}
                >
                  <Trash2 data-icon />
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
