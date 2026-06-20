'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resendInvitation, deleteInvitation } from '@/app/actions/users'

export interface PendingInvitationRow {
  id: string
  name: string
  email: string
  role: string
  expiresAt: Date
}

function roleBadgeVariant(role: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  if (role === 'super_admin') return 'destructive'
  if (role === 'admin') return 'default'
  return 'secondary'
}

function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return 'Viewer'
}

function formatRelativeTime(date: Date): string {
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity]
  const units: Intl.RelativeTimeFormatUnit[] = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year']
  const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds))
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex] as Intl.RelativeTimeFormatUnit)
}

function PendingRow({ invite }: { invite: PendingInvitationRow }) {
  const [isResending, startResendTransition] = React.useTransition()
  const [isDeleting, startDeleteTransition] = React.useTransition()

  const isExpired = new Date() > new Date(invite.expiresAt)

  function handleResend() {
    startResendTransition(async () => {
      const result = await resendInvitation(invite.id)
      if (result.error) toast.error(result.error)
      else toast.success('Invitation resent successfully')
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteInvitation(invite.id)
      if (result.error) toast.error(result.error)
      else toast.success('Invitation revoked')
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{invite.name}</TableCell>
      <TableCell>{invite.email}</TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(invite.role)}>{roleLabel(invite.role)}</Badge>
      </TableCell>
      <TableCell>
        {isExpired ? (
          <span className="text-destructive font-medium text-sm">Expired</span>
        ) : (
          <span className="text-muted-foreground text-sm">
            Expires {formatRelativeTime(new Date(invite.expiresAt))}
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending || isDeleting}
          >
            {isResending ? 'Resending…' : 'Resend'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isResending || isDeleting}
          >
            {isDeleting ? 'Revoking…' : 'Revoke'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function PendingInvitationsTable({ pending }: { pending: PendingInvitationRow[] }) {
  if (pending.length === 0) {
    return null
  }

  return (
    <div className="mb-8 flex flex-col gap-4">
      <h2 className="border-b pb-2 text-lg font-semibold">Pending Invitations</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending.map((invite) => (
            <PendingRow key={invite.id} invite={invite} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
