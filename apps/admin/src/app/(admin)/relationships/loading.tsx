import { Skeleton } from '@/components/ui/skeleton'

export default function RelationshipsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-20 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Division Performance + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-28 mb-1" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <Skeleton className="h-4 w-20 mb-0.5" />
                  <Skeleton className="h-3 w-12" />
                </div>
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
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-5 w-14 rounded-full shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
