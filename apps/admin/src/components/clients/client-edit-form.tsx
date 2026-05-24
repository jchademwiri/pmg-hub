'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@pmg/db'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldGroup className="flex-row flex-wrap items-end gap-3">
        <Field>
          <FieldLabel htmlFor="client-name">Name</FieldLabel>
          <Input
            id="client-name"
            name="name"
            type="text"
            defaultValue={client.name}
            required
            disabled={isPending}
            className="w-48"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-business-name">Business Name</FieldLabel>
          <Input
            id="client-business-name"
            name="businessName"
            type="text"
            placeholder="Optional"
            defaultValue={client.businessName ?? ''}
            disabled={isPending}
            className="w-48"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input
            id="client-email"
            name="email"
            type="email"
            placeholder="Optional"
            defaultValue={client.email ?? ''}
            disabled={isPending}
            className="w-48"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-phone">Phone</FieldLabel>
          <Input
            id="client-phone"
            name="phone"
            type="text"
            placeholder="Optional"
            defaultValue={client.phone ?? ''}
            disabled={isPending}
            className="w-40"
          />
        </Field>

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </Field>
      </FieldGroup>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
