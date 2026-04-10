'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ExpenseCategoryAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>
}

export function ExpenseCategoryAddForm({ createAction }: ExpenseCategoryAddFormProps) {
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
        <label htmlFor="category-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="category-name"
          name="name"
          type="text"
          placeholder="Category name"
          required
          disabled={isPending}
          className="w-48"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add Category'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
