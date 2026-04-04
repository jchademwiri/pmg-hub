'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ExpenseRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ExpenseEditFormProps {
  entry: ExpenseRow
  divisions: { id: string; name: string }[]
  categories: string[]
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export function ExpenseEditForm({ entry, divisions, categories, updateAction }: ExpenseEditFormProps) {
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
        toast.success('Expense updated')
        router.push('/expenses')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="expense-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="expense-date"
          name="date"
          type="date"
          defaultValue={entry.date}
          max={new Date().toISOString().split('T')[0]}
          required
          disabled={isPending}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expense-division" className="text-sm font-medium">
          Division
        </label>
        <Select name="divisionId" defaultValue={entry.divisionId} required disabled={isPending}>
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
          defaultValue={entry.category}
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
          defaultValue={entry.description ?? ''}
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
          defaultValue={entry.amount}
          required
          disabled={isPending}
          className="w-36"
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
