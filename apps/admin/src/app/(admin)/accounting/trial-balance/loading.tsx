import { Skeleton } from '@/components/ui/skeleton';

export default function TrialBalanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-9 w-40" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      ))}
      <div className="flex gap-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-12 w-1/4" />
      </div>
    </div>
  );
}
