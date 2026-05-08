'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface NotFoundLink {
  label: string;
  href: string;
}

interface NotFoundViewProps {
  /** Short description of what wasn't found, e.g. "client" or "invoice" */
  noun?: string;
  /** Quick-nav links relevant to this section */
  links: NotFoundLink[];
}

export function NotFoundView({ noun = 'record', links }: NotFoundViewProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl font-semibold tracking-tight text-muted-foreground/40">404</span>
        <h2 className="text-xl font-semibold tracking-tight">
          {noun.charAt(0).toUpperCase() + noun.slice(1)} not found
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This {noun} doesn't exist or may have been deleted.
        </p>
      </div>

      <Separator className="w-32" />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          ← Go back
        </Button>
        {links.map((link) => (
          <Button key={link.href} asChild variant="outline">
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
