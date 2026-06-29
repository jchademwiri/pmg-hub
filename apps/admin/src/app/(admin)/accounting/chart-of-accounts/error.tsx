'use client'

import { RouteError } from '@/components/ui/route-error'

export default function ChartOfAccountsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError routeName="the Chart of Accounts" error={error} reset={reset} />
}
