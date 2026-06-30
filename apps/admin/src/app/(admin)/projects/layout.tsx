'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Overview', href: '/projects' },
    { label: 'All Projects', href: '/projects/list' },
    { label: 'Timeline', href: '/projects/timeline' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Scheduling</h2>
          <p className="text-sm text-muted-foreground">
            Plan, track, and manage project preparation deadlines
          </p>
        </div>
        <Button size="sm" asChild className="self-end sm:self-auto">
          <Link href="/projects/new">
            <Plus className="size-4 mr-1" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-border pb-px print:hidden">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
