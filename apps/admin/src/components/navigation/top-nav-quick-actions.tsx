'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getQuickActionsForPath } from '@/components/navigation/quick-actions';

/**
 * Right-aligned quick-create action buttons for /dashboard and group overview pages.
 * Renders inline buttons on lg+ viewports and collapses into a compact dropdown on smaller screens.
 */
export function TopNavQuickActions() {
  const pathname = usePathname();
  const actions = getQuickActionsForPath(pathname);

  if (actions.length === 0) return null;

  return (
    <>
      {/* Desktop inline quick-create buttons (flowing right-to-left before total/ThemeToggle) */}
      <nav aria-label="Quick create actions" className="hidden lg:flex items-center gap-1.5">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            size="sm"
            asChild
            className="h-7 px-2.5 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
          >
            <Link href={action.href}>
              <Plus className="size-3.5 shrink-0" />
              <span>{action.label}</span>
            </Link>
          </Button>
        ))}
      </nav>

      {/* Mobile / tablet compact dropdown */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs font-medium gap-1"
              aria-label="Quick create"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {actions.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href} className="flex items-center gap-2 cursor-pointer">
                  <action.icon className="size-4 text-muted-foreground" />
                  <span>New {action.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
