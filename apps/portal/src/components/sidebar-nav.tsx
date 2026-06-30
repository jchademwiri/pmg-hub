'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Receipt,
  PiggyBank,
  User,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Quotes', href: '/quotes', icon: FileSpreadsheet },
  { label: 'Statements', href: '/statements', icon: Receipt },
  { label: 'Credit Notes', href: '/credits', icon: PiggyBank },
  { label: 'My Profile', href: '/profile', icon: User },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-4 py-6">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        // Highlight link if it matches the current path exactly or is a subroute (e.g. /invoices/123 -> Invoices)
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-500/10 text-blue-400 font-semibold'
                : 'text-muted-foreground hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Icon className={`size-4 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-muted-foreground/75'}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
