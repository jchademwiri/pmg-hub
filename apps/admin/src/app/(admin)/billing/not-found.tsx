'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function BillingNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl font-semibold tracking-tight text-muted-foreground/40">404</span>
        <h2 className="text-xl font-semibold tracking-tight">Record not found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This record doesn't exist or may have been deleted.
        </p>
      </div>

      <Separator className="w-32" />

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          ← Go back
        </Button>
        <Button asChild variant="outline">
          <Link href="/billing/quotes">Quotes</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/billing/invoices">Invoices</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
