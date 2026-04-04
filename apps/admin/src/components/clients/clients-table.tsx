'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pencil, Trash2, PowerOff, Power } from 'lucide-react'
import { toast } from 'sonner'
import type { ClientWithIncomeCount } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>
}

export function ClientsTable({ clients, deleteAction, toggleActiveAction }: ClientsTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [pendingToggleId, setPendingToggleId] = React.useState<string | null>(null)

  async function handleConfirmDelete(id: string) {
    const result = await deleteAction(id)
    if (result.error) {
      toast.error(result.error)
    }
    setPendingDeleteId(null)
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    setPendingToggleId(id)
    try {
      const result = await toggleActiveAction(id, !currentlyActive)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(currentlyActive ? 'Client disabled' : 'Client activated')
      }
    } finally {
      setPendingToggleId(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Business Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Income Records</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id} className={!client.isActive ? 'opacity-60' : ''}>
            <TableCell>{client.name}</TableCell>
            <TableCell>{client.businessName ?? ''}</TableCell>
            <TableCell>{client.email ?? ''}</TableCell>
            <TableCell>{client.phone ?? ''}</TableCell>
            <TableCell>{client.incomeCount}</TableCell>
            <TableCell>
              <Badge variant={client.isActive ? 'default' : 'secondary'}>
                {client.isActive ? 'Active' : 'Disabled'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={'/clients/' + client.id}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Link>
                </Button>

                {/* Disable / Activate toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pendingToggleId === client.id}
                  onClick={() => handleToggleActive(client.id, client.isActive)}
                  title={client.isActive ? 'Disable client' : 'Activate client'}
                >
                  {client.isActive ? (
                    <PowerOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Power className="h-4 w-4 text-green-500" />
                  )}
                  <span className="sr-only">{client.isActive ? 'Disable' : 'Activate'}</span>
                </Button>

                {/* Delete — only allowed if no income records */}
                {client.incomeCount === 0 ? (
                  pendingDeleteId === client.id ? (
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
                  )
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled
                    title="Cannot delete a client with income records"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground/30" />
                    <span className="sr-only">Delete (disabled — has income records)</span>
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
