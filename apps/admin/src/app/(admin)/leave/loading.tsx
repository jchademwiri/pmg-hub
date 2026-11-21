import { Skeleton } from '@/components/ui/skeleton';

export default function LeaveLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-[34rem] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
