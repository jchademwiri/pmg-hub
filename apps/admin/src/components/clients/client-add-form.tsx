'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ClientAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>
}

export function ClientAddForm({ createAction }: ClientAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(formRef.current!)
      const result = await createAction(fd)
      if (result.error) {
        setErrorMessage(result.error)
      } else {
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="client-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="client-name"
          name="name"
          type="text"
          placeholder="Client name"
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
          disabled={isPending}
          className="w-40"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add Client'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
