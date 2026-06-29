'use client'

import { RouteError } from '@/components/ui/route-error'

export default function GeneralLedgerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError routeName="the General Ledger" error={error} reset={reset} />
}
