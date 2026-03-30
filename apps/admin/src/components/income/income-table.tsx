'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { IncomeRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface IncomeTableProps {
  entries: IncomeRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}

export function IncomeTable({ entries, deleteAction }: IncomeTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

  async function handleConfirmDelete(id: string) {
    const result = await deleteAction(id)
    if (result.error) {
      toast.error(result.error)
    }
    setPendingDeleteId(null)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.date}</TableCell>
            <TableCell>{entry.divisionName}</TableCell>
            <TableCell>{entry.clientName ?? ''}</TableCell>
            <TableCell>{entry.description ?? ''}</TableCell>
            <TableCell>{entry.amount}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={'/income/' + entry.id}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Link>
                </Button>

                {pendingDeleteId === entry.id ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleConfirmDelete(entry.id)}
                    >
                      Confirm
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
