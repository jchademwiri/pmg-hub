'use client';

import * as React from 'react';
import type { OnboardingRow } from '@pmg/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OnboardingReviewDrawer } from './onboarding-review-drawer';
import { Sparkles, Eye, CheckCircle2 } from 'lucide-react';

interface OnboardingTableProps {
  entries: OnboardingRow[];
}

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  converted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

export function OnboardingTable({ entries }: OnboardingTableProps) {
  const [selectedEntry, setSelectedEntry] = React.useState<OnboardingRow | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  function handleOpenReview(entry: OnboardingRow) {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg bg-card">
        No onboarding submissions found matching the selected filter.
      </div>
    );
  }

  return (
    <>
      <OnboardingReviewDrawer
        entry={selectedEntry}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company & Contact</TableHead>
              <TableHead>Contact Details</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/40 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-xs">
                      {entry.companyName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{entry.contactName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs">
                    <span className="text-foreground">{entry.email}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {entry.phone}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-muted-foreground">
                    {entry.divisionName || 'Playhouse Media Group'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`border font-medium text-[11px] shadow-none capitalize ${statusBadgeClasses[entry.status] ?? 'border-border text-muted-foreground'}`}
                  >
                    {entry.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {entry.status === 'pending' ? (
                    <Button
                      size="sm"
                      onClick={() => handleOpenReview(entry)}
                      className="h-8 px-3 gap-1.5 text-xs font-bold shadow-sm"
                    >
                      <Sparkles className="size-3.5 text-amber-300" />
                      <span>Review & Save</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReview(entry)}
                      className="h-8 px-3 gap-1.5 text-xs font-medium"
                    >
                      <Eye className="size-3.5" />
                      <span>View</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
