'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadAddForm } from '@/components/leads/lead-add-form';
import { LeadsTable } from '@/components/leads/leads-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { LeadRow } from '@pmg/db';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LeadsPageClientProps {
  entries: LeadRow[];
  divisions: { id: string; name: string }[];
  status?: string;
  divisionId?: string;
  source?: string;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

export default function LeadsPageClient({
  entries,
  divisions,
  status,
  divisionId,
  source,
  createAction,
  deleteAction,
}: LeadsPageClientProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Leads</h2>
          <p className="text-sm text-muted-foreground">Monitor sales pipelines, prospective clients, and conversions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Capture prospective client details, services of interest, and sales referral sources.
                </DialogDescription>
              </DialogHeader>

              <LeadAddForm
                divisions={divisions}
                createAction={async (fd) => {
                  const result = await createAction(fd);
                  if (!result.error) setIsOpen(false);
                  return result;
                }}
                onCancel={() => setIsOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table or empty state */}
      {entries.length === 0 && !isOpen ? (
        <EmptyState
          message={
            status || divisionId || source ? 'No leads match the current filters.' : 'No leads yet.'
          }
          filtered={!!(status || divisionId || source)}
        />
      ) : (
        <LeadsTable entries={entries} deleteAction={deleteAction} />
      )}
    </div>
  );
}
