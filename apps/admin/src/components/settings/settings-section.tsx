import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  layout?: 'stacked' | 'sidebar';
}

export function SettingsSection({
  title,
  description,
  children,
  headerAction,
  className,
  layout = 'stacked',
}: SettingsSectionProps) {
  if (layout === 'sidebar') {
    return (
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Card className={cn('lg:col-span-2 border bg-card', className)}>
          <CardContent className="flex flex-col gap-4 pt-6">{children}</CardContent>
        </Card>
      </section>
    );
  }

  return (
    <Card className={cn('border bg-card shadow-xs', className)}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b bg-muted/10 pb-4">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-6">{children}</CardContent>
    </Card>
  );
}
