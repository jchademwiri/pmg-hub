'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ExpenseRow } from '@pmg/db'
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

interface ExpenseTableProps {
  entries: ExpenseRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}

export function ExpenseTable({ entries, deleteAction }: ExpenseTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [inFlightId, setInFlightId] = React.useState<string | null>(null)

  function handleConfirmDelete(id: string) {
    setInFlightId(id)
    startTransition(() => {
      deleteAction(id).then((r) => {
        if (r?.error) toast.error(r.error)
        setInFlightId(null)
      })
    })
    setPendingDeleteId(null)
  }

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
        {entries.map((entry) => {
          const isInFlight = isPending && inFlightId === entry.id
          return (
            <TableRow
              key={entry.id}
              className={isInFlight ? 'opacity-50 pointer-events-none' : undefined}
            >
              <TableCell>{entry.date}</TableCell>
              <TableCell>{entry.divisionName}</TableCell>
              <TableCell>{entry.category}</TableCell>
              <TableCell>{entry.description ?? ''}</TableCell>
              <TableCell>{formatZAR(Number(entry.amount))}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="icon">
                    <Link href={'/expenses/' + entry.id}>
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
          )
        })}
      </TableBody>
    </Table>
  )
}
