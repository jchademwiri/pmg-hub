'use client'

import * as React from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LeadRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
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
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

export function LeadsTable({ entries, deleteAction }: LeadsTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [isPendingDelete, setIsPendingDelete] = React.useState(false)

  async function handleConfirmDelete(id: string) {
    setIsPendingDelete(true)
    try {
      const result = await deleteAction(id)
      if (result.error) {
        toast.error(result.error)
      }
      setPendingDeleteId(null)
    } finally {
      setIsPendingDelete(false)
    }
  }

  return (
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
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses[entry.status] ?? 'bg-gray-100 text-gray-800'}`}
              >
                {entry.status}
              </span>
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
              <div className="flex items-center gap-2">
                {pendingDeleteId === entry.id ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPendingDelete}
                      onClick={() => handleConfirmDelete(entry.id)}
                    >
                      {isPendingDelete ? 'Deleting…' : 'Confirm'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDeleteId(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
