'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadAddForm } from '@/components/leads/lead-add-form';
import { LeadsTable } from '@/components/leads/leads-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { LeadRow } from '@pmg/db';

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
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Leads</h2>
          <p className="text-sm text-muted-foreground">Monitor sales pipelines, prospective clients, and conversions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Add New Lead</h3>
            <p className="text-xs text-muted-foreground">Capture prospective client details, services of interest, and sales referral sources</p>
          </div>
          <LeadAddForm
            divisions={divisions}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Table or empty state */}
      {entries.length === 0 && !isAdding ? (
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
