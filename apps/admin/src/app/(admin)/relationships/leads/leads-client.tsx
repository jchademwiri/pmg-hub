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
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Leads</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <LeadAddForm
            divisions={divisions}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
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
