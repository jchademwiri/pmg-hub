'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@pmg/db'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface ClientEditFormProps {
  client: Client
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export function ClientEditForm({ client, updateAction }: ClientEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(e.currentTarget)
      const result = await updateAction(fd)
      if (result.error) {
        setErrorMessage(result.error)
      } else {
        router.push('/relationships/clients')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field>
          <FieldLabel htmlFor="client-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="client-name"
            name="name"
            type="text"
            defaultValue={client.name}
            required
            disabled={isPending}
            placeholder="e.g. Acme Corp"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-business-name">Business Name</FieldLabel>
          <Input
            id="client-business-name"
            name="businessName"
            type="text"
            placeholder="e.g. Acme Pty Ltd"
            defaultValue={client.businessName ?? ''}
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email Address</FieldLabel>
          <Input
            id="client-email"
            name="email"
            type="email"
            placeholder="e.g. billing@acme.com"
            defaultValue={client.email ?? ''}
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-phone">Phone Number</FieldLabel>
          <Input
            id="client-phone"
            name="phone"
            type="text"
            placeholder="e.g. +27 82 123 4567"
            defaultValue={client.phone ?? ''}
            disabled={isPending}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
