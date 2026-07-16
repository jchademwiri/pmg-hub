'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface GeneralLedgerFilterBarProps {
  accounts: { id: string; name: string; code: string }[]
  currentAccountId?: string
  baseUrl?: string
}

export function GeneralLedgerFilterBar({
  accounts,
  currentAccountId,
  baseUrl = '/accounting/general-ledger',
}: GeneralLedgerFilterBarProps) {
  const router = useRouter()

  function handleAccountChange(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('accountId', value)
    router.push(`${baseUrl}?` + params.toString())
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={currentAccountId ?? 'all'}
        onValueChange={handleAccountChange}
      >
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.code} — {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
