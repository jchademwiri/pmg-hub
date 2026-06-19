'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, PowerOff, Power } from 'lucide-react'
import { toast } from 'sonner'
import type { ClientWithIncomeCount } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ClientsTableProps {
  clients: ClientWithIncomeCount[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>
}

export function ClientsTable({ clients, deleteAction, toggleActiveAction }: ClientsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [pendingToggleId, setPendingToggleId] = React.useState<string | null>(null)

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteAction(deleteId)
    if (result.error) {
      toast.error(result.error)
    }
    setDeleteId(null)
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
    <>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        onConfirm={handleDelete}
        title="Delete client?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
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
            <TableRow
              key={client.id}
              className={`cursor-pointer ${!client.isActive ? 'opacity-60' : ''}`}
              onClick={() => router.push('/relationships/clients/' + client.id)}
            >
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
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pendingToggleId === client.id}
                        onClick={() => handleToggleActive(client.id, client.isActive)}
                      >
                        {client.isActive ? (
                          <PowerOff data-icon className="text-muted-foreground" />
                        ) : (
                          <Power data-icon className="text-green-500" />
                        )}
                        <span className="sr-only">{client.isActive ? 'Disable' : 'Activate'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {client.isActive ? 'Disable client' : 'Activate client'}
                    </TooltipContent>
                  </Tooltip>

                  {client.incomeCount === 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(client.id)}
                    >
                      <Trash2 data-icon />
                      <span className="sr-only">Delete</span>
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" disabled>
                          <Trash2 data-icon className="text-muted-foreground/30" />
                          <span className="sr-only">Delete (disabled - has income records)</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cannot delete a client with income records</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
