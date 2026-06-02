'use client'

import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
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
  const [name, setName] = React.useState('')
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
    formData.set('name', name)
    formData.set('email', email)
    formData.set('role', role)

    startTransition(async () => {
      const result = await inviteUser(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Invitation sent to ${email}`)
        setName('')
        setEmail('')
        setRole('viewer')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="name">
            Full Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="name"
            type="text"
            required
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="email"
            type="email"
            required
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="role">
            Role <span className="text-destructive">*</span>
          </FieldLabel>
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
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send Invitation'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mt-2">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
