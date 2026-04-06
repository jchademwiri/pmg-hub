'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { updateUserRole, revokeUser } from '@/app/actions/users'

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

const ROLES = ['super_admin', 'admin', 'viewer'] as const
type Role = (typeof ROLES)[number]

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

function UserTableRow({
  user,
}: {
  user: UserRow
}) {
  const [isRoleChanging, startRoleTransition] = React.useTransition()
  const [isRevoking, startRevokeTransition] = React.useTransition()

  function handleRoleChange(newRole: Role) {
    startRoleTransition(async () => {
      const fd = new FormData()
      fd.set('role', newRole)
      const result = await updateUserRole(user.id, fd)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Role updated')
      }
    })
  }

  function handleRevoke() {
    startRevokeTransition(async () => {
      const result = await revokeUser(user.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('User revoked')
      }
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
      </TableCell>
      <TableCell>
        {user.isActive ? (
          <Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Select
            defaultValue={user.role}
            onValueChange={(v) => handleRoleChange(v as Role)}
            disabled={isRoleChanging}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevoke}
            disabled={!user.isActive || isRevoking}
          >
            {isRevoking ? 'Revoking…' : 'Revoke'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

interface UserTableProps {
  users: UserRow[]
}

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
    )
  }

  return (
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
        {users.map((user) => (
          <UserTableRow key={user.id} user={user} />
        ))}
      </TableBody>
    </Table>
  )
}
