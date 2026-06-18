import { Skeleton } from '@/components/ui/skeleton'

export default function FinanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Revenue by Division + Expenses by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-16 mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-16 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Income + Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40 mb-1" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20 shrink-0 ml-4" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40 mb-1" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20 shrink-0 ml-4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
