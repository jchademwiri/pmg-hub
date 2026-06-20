import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SettingsPageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function SettingsPageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  backHref = '/settings',
  backLabel = 'Settings',
}: SettingsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href={backHref}>
            <ChevronLeft data-icon="inline-start" />
            {backLabel}
          </Link>
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <div className="flex min-w-0 items-start gap-2">
          <Icon className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              {badge ? (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
