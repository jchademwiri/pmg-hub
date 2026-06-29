import { Skeleton } from '@/components/ui/skeleton';

export default function GeneralLedgerLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-9 w-40" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-1/5" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/6" />
          <Skeleton className="h-10 w-1/6" />
          <Skeleton className="h-10 w-1/6" />
        </div>
      ))}
    </div>
  );
}
