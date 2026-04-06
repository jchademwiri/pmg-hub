'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteUser } from '@/app/actions/users'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
] as const

type Role = (typeof ROLES)[number]['value']

export function InviteUserForm() {
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<Role>('viewer')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set('email', email)
    formData.set('role', role)

    startTransition(async () => {
      const result = await inviteUser(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Invitation sent to ${email}`)
        setEmail('')
        setRole('viewer')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium leading-none">
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium leading-none">
          Role
        </label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isPending}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send Invitation'}
      </Button>
    </form>
  )
}
