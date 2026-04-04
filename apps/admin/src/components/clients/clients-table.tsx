'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ClientWithIncomeCount } from '@pmg/db'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ClientsTableProps {
  clients: ClientWithIncomeCount[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}

export function ClientsTable({ clients, deleteAction }: ClientsTableProps) {
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
          <TableHead>Name</TableHead>
          <TableHead>Business Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Income Count</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>{client.name}</TableCell>
            <TableCell>{client.businessName ?? ''}</TableCell>
            <TableCell>{client.email ?? ''}</TableCell>
            <TableCell>{client.phone ?? ''}</TableCell>
            <TableCell>{client.incomeCount}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={'/clients/' + client.id}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Link>
                </Button>

                {pendingDeleteId === client.id ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleConfirmDelete(client.id)}
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
                    onClick={() => setPendingDeleteId(client.id)}
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
