'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { OnboardingRow } from '@pmg/db';
import { OnboardingTable } from '@/components/onboarding/onboarding-table';
import { ShareOnboardingLinkDialog } from '@/components/onboarding/share-onboarding-link-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';

interface OnboardingClientProps {
  entries: OnboardingRow[];
  counts: {
    all: number;
    pending: number;
    converted: number;
    rejected: number;
    archived: number;
  };
  divisions: { id: string; name: string }[];
}

export function OnboardingClient({ entries, counts, divisions }: OnboardingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'pending';

  function handleTabChange(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`/relationships/onboarding?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="size-6 text-primary" />
            <span>Client Onboarding</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review self-onboarding submissions and convert prospects into active clients with 1
            click.
          </p>
        </div>

        <div>
          <ShareOnboardingLinkDialog divisions={divisions} />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={currentStatus} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 sm:flex h-9 bg-muted/60 p-1">
            <TabsTrigger value="pending" className="text-xs font-semibold gap-1.5 px-3">
              <span>Pending</span>
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300"
              >
                {counts.pending}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="converted" className="text-xs font-semibold gap-1.5 px-3">
              <span>Converted</span>
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              >
                {counts.converted}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="all" className="text-xs font-semibold gap-1.5 px-3">
              <span>All Submissions</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {counts.all}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Onboarding Submissions Table */}
      <OnboardingTable entries={entries} />
    </div>
  );
}
