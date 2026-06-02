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
  new: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  contacted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  converted: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  lost: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
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
                  className={statusBadgeClasses[entry.status] ?? 'border border-border'}
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
