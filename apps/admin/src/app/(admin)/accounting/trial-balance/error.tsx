'use client'

import { RouteError } from '@/components/ui/route-error'

export default function TrialBalanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError routeName="the Trial Balance" error={error} reset={reset} />
}
