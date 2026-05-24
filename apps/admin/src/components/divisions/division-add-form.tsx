'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface DivisionAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>
}

export function DivisionAddForm({ createAction }: DivisionAddFormProps) {
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
        toast.success('Division created')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldGroup className="flex-row flex-wrap items-end gap-3">
        <Field>
          <FieldLabel htmlFor="division-name">Name</FieldLabel>
          <Input
            id="division-name"
            name="name"
            type="text"
            required
            disabled={isPending}
            className="w-64"
          />
        </Field>

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add Division'}
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
