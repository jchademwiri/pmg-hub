import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import {
  getAllLeads,
  getLeadCountsByStatus,
  getAllDivisions,
  getDistinctLeadSources,
} from '@pmg/db';
import { createLead, deleteLead } from '@/app/actions/leads';
import { LeadAddForm } from '@/components/leads/lead-add-form';
import { LeadStatusTabs } from '@/components/leads/lead-status-tabs';
import { LeadsFilterBar } from '@/components/leads/leads-filter-bar';
import { LeadsTable } from '@/components/leads/leads-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leads' };

interface LeadsPageProps {
  searchParams: Promise<{ status?: string; divisionId?: string; source?: string }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { status, divisionId, source } = await searchParams;

  const [entries, counts, divisions, sources] = await Promise.all([
    getAllLeads({ status, divisionId, source }),
    getLeadCountsByStatus(),
    getAllDivisions(),
    getDistinctLeadSources(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <LeadStatusTabs
        counts={counts}
        currentStatus={status}
        currentDivisionId={divisionId}
        currentSource={source}
      />

      <LeadsFilterBar
        divisions={divisions}
        sources={sources}
        currentDivisionId={divisionId}
        currentSource={source}
        currentStatus={status}
      />

      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Leads</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Lead
        </Button>
      </div>

      <div id="lead-add-form">
        <LeadAddForm divisions={divisions} createAction={createLead} />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          message={
            status || divisionId || source ? 'No leads match the current filters.' : 'No leads yet.'
          }
          filtered={!!(status || divisionId || source)}
        />
      ) : (
        <LeadsTable entries={entries} deleteAction={deleteLead} />
      )}
    </div>
  );
}
