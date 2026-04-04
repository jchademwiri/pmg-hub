'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const today = new Date().toISOString().split('T')[0]

interface ExpenseAddFormProps {
  divisions: { id: string; name: string }[]
  categories: string[]
  createAction: (formData: FormData) => Promise<{ error?: string }>
}

export function ExpenseAddForm({ divisions, categories, createAction }: ExpenseAddFormProps) {
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
        toast.success('Expense added')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="expense-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="expense-date"
          name="date"
          type="date"
          required
          disabled={isPending}
          className="w-40"
          defaultValue={today}
          max={today}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expense-division" className="text-sm font-medium">
          Division
        </label>
        <Select name="divisionId" required disabled={isPending}>
          <SelectTrigger id="expense-division" className="w-44">
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((division) => (
              <SelectItem key={division.id} value={division.id}>
                {division.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expense-category" className="text-sm font-medium">
          Category
        </label>
        <Input
          id="expense-category"
          name="category"
          type="text"
          list="category-suggestions"
          required
          disabled={isPending}
          className="w-44"
        />
        <datalist id="category-suggestions">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expense-description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="expense-description"
          name="description"
          type="text"
          placeholder="Optional"
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expense-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="expense-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          disabled={isPending}
          className="w-36"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add Expense'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
