import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Tabs bar */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm" className="rounded-xl border border-border/60 shadow-none">
            <CardHeader className="pb-1">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="pt-0.5">
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project schedule */}
      <Skeleton className="h-32 w-full rounded-xl" />

      {/* Aging grid */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Revenue chart */}
      <Skeleton className="hidden md:block h-80 w-full rounded-xl" />

      {/* Revenue by division + leads */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>

      {/* Expense breakdown */}
      <Skeleton className="hidden md:block h-40 w-full rounded-xl" />
    </div>
  );
}
