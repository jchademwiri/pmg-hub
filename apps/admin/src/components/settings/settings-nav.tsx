'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Database, Receipt, Shield, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const settingsNavItems = [
  { href: '/settings/organisation', label: 'Organisation', icon: Building2 },
  { href: '/settings/billing', label: 'Billing', icon: Receipt },
  { href: '/settings/users', label: 'Users', icon: Users },
  { href: '/settings/security', label: 'Security', icon: Shield, badge: 'Soon' },
  { href: '/settings/data', label: 'Data', icon: Database, badge: 'Soon' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {settingsNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-w-fit items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="shrink-0" />
              {item.label}
            </span>
            {item.badge ? (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
