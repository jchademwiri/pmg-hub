'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { WithdrawalRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatZAR } from '@/lib/format'

interface WithdrawalsTableProps {
  entries: WithdrawalRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}

export function WithdrawalsTable({ entries, deleteAction }: WithdrawalsTableProps) {
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
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.date}</TableCell>
            <TableCell>{formatZAR(Number(entry.amount))}</TableCell>
            <TableCell>{entry.description ?? ''}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={'/withdrawals/' + entry.id}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Link>
                </Button>

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
