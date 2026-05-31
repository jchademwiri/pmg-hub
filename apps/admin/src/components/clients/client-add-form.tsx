'use client'

import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        <Field>
          <FieldLabel htmlFor="client-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="client-name"
            name="name"
            type="text"
            placeholder="Client name"
            required
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-business-name">Business Name</FieldLabel>
          <Input
            id="client-business-name"
            name="businessName"
            type="text"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input
            id="client-email"
            name="email"
            type="email"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-phone">Phone</FieldLabel>
          <Input
            id="client-phone"
            name="phone"
            type="text"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <div className="flex">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Adding…' : 'Add Client'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
