'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, PowerOff, Power, Mail, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ClientWithIncomeCount } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataList } from '@/components/ui/data-list'
import { sendPortalInvitation } from '@/app/actions/clients'
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
  const desktopView = (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Business Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Income Records</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Portal Access</TableHead>
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
                <Badge
                  variant="secondary"
                  className={`border font-medium shadow-none ${
                    client.isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {client.isActive ? 'Active' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <PortalStatusCell client={client} />
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
    </div>
  )

  const mobileView = (
    <div className="flex flex-col gap-3">
      {clients.map((client) => (
        <div
          key={client.id}
          className={`relative flex flex-col p-4 border border-border rounded-lg bg-card shadow-sm transition-shadow ${!client.isActive ? 'opacity-60' : ''}`}
        >
          <div
            className="absolute inset-0 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => router.push('/relationships/clients/' + client.id)}
            role="button"
            tabIndex={0}
            aria-label={`View client ${client.name}`}
          />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <p className="font-semibold text-foreground leading-tight">{client.name}</p>
              {client.businessName && <p className="text-sm text-muted-foreground">{client.businessName}</p>}
            </div>
            <Badge
              variant="secondary"
              className={`border font-medium shadow-none ${
                client.isActive
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {client.isActive ? 'Active' : 'Disabled'}
            </Badge>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-3 relative z-10">
            {client.email && <div className="flex items-center gap-2"><Mail className="size-3" /> {client.email}</div>}
            {client.phone && <div className="flex items-center gap-2">Phone: {client.phone}</div>}
          </div>

          <div className="flex justify-between items-center text-sm border-t border-border/50 pt-3 relative z-10">
            <PortalStatusCell client={client} />
            
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="touch"
                    className="h-8 w-8 min-h-0 min-w-0 p-0"
                    disabled={pendingToggleId === client.id}
                    onClick={() => handleToggleActive(client.id, client.isActive)}
                  >
                    {client.isActive ? (
                      <PowerOff data-icon className="text-muted-foreground size-4" />
                    ) : (
                      <Power data-icon className="text-green-500 size-4" />
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
                  size="touch"
                  className="h-8 w-8 min-h-0 min-w-0 p-0"
                  onClick={() => setDeleteId(client.id)}
                >
                  <Trash2 data-icon className="size-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="touch" className="h-8 w-8 min-h-0 min-w-0 p-0" disabled>
                      <Trash2 data-icon className="text-muted-foreground/30 size-4" />
                      <span className="sr-only">Delete (disabled - has income records)</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cannot delete a client with income records</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

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
      <DataList desktop={desktopView} mobile={mobileView} />
    </>
  )
}

function PortalStatusCell({ client }: { client: ClientWithIncomeCount }) {
  const [isSending, setIsSending] = React.useState(false)
  const router = useRouter()

  const handleInvite = async () => {
    if (!client.email) {
      toast.error('Client does not have an email address.')
      return
    }
    setIsSending(true)
    try {
      const res = await sendPortalInvitation(client.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(client.portalInvitationSentAt ? 'Portal invitation resent!' : 'Portal invitation sent!')
        router.refresh()
      }
    } catch (err: any) {
      console.error('handleInvite failed:', err)
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSending(false)
    }
  }

  if (client.userId) {
    return (
      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-none">
        Registered
      </Badge>
    )
  }

  if (client.portalInvitationSentAt) {
    const sentDate = new Date(client.portalInvitationSentAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-none">
          Invited ({sentDate})
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={isSending}
              onClick={handleInvite}
            >
              {isSending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resend Invitation</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs px-2.5 gap-1"
      disabled={isSending || !client.email}
      onClick={handleInvite}
    >
      {isSending ? (
        <>
          <Loader2 className="size-3 animate-spin mr-1" />
          Inviting
        </>
      ) : (
        <>
          <Mail className="size-3 mr-1" />
          Invite
        </>
      )}
    </Button>
  )
}
