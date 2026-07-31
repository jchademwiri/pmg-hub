'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Database, Landmark, Mail, Receipt, Shield, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SettingsNavItem {
  href: string;
  label: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const settingsNavItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}[] = [
  { href: '/settings/organisation', label: 'Organisation', icon: Building2 },
  { href: '/settings/billing', label: 'Billing & Taxes', icon: Receipt },
  { href: '/settings/billing/banking', label: 'Banking Accounts', icon: Landmark },
  { href: '/settings/billing/email', label: 'Email Delivery', icon: Mail },
  { href: '/settings/users', label: 'Users', icon: Users },
  { href: '/settings/security', label: 'Security', icon: Shield },
  { href: '/settings/data', label: 'Data & Exports', icon: Database },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-13 z-30 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:flex-col lg:overflow-visible lg:bg-transparent lg:p-0"
    >
      {settingsNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/settings/billing' && pathname.startsWith(`${item.href}/`));
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
              <Icon className="size-4 shrink-0" />
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
