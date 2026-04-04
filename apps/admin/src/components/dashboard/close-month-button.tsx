'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { closeMonth } from '@/app/actions/snapshots'
import { Button } from '@/components/ui/button'

export default function CloseMonthButton({ period }: { period: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await closeMonth(period)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Closing…' : 'Close Month'}
    </Button>
  )
}
