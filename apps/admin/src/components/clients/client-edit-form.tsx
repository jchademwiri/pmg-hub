'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@pmg/db'
import { Button } from '@/components/ui/button'
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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="client-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="client-name"
          name="name"
          type="text"
          defaultValue={client.name}
          required
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="client-business-name" className="text-sm font-medium">
          Business Name
        </label>
        <Input
          id="client-business-name"
          name="businessName"
          type="text"
          placeholder="Optional"
          defaultValue={client.businessName ?? ''}
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="client-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="client-email"
          name="email"
          type="email"
          placeholder="Optional"
          defaultValue={client.email ?? ''}
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="client-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="client-phone"
          name="phone"
          type="text"
          placeholder="Optional"
          defaultValue={client.phone ?? ''}
          disabled={isPending}
          className="w-40"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
