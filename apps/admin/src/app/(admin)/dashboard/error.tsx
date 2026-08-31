'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-16">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Couldn&apos;t load the dashboard</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3">
          <span>Something went wrong while loading dashboard data. You can try again.</span>
          <Button variant="outline" size="sm" onClick={() => unstable_retry()} className="w-fit">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
